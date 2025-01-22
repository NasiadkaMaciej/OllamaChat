const express = require('express');
const socketIo = require('socket.io');
const axios = require('axios');
const http = require('http');
const { v4: uuidv4 } = require('uuid');
const session = require('express-session');
const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const sessionMiddleware = session({
	secret: 'VerySecretKey',
	resave: false,
	saveUninitialized: true
});

app.use(sessionMiddleware);
io.use((socket, next) => {
	sessionMiddleware(socket.request, socket.request.res || {}, next);
});
app.set("trust proxy", true);

const users = {}; // Store users and sessions
const activeResponses = {}; // Store responses for stopping later
const userCredentials = {};

io.on('connection', (socket) => {
	socket.on('register', ({ username, password }) => {
		if (userCredentials[username])
			socket.emit('registerFail', 'Username already taken.');
		else {
			userCredentials[username] = password;
			socket.emit('registerSuccess');
		}
	});

	socket.on('login', ({ username, password }) => {
		if (!userCredentials[username])
			socket.emit('loginFail', 'User does not exist.');
		else if (password && userCredentials[username] !== password) {
			socket.emit('loginFail', 'Incorrect password.');
		} else {
			socket.request.session.user = username;
			socket.request.session.save();
			socket.emit('loginSuccess');
		}
	});

	socket.on('loadSessions', () => {
		const username = socket.request.session.user;
		if (!username) {
			socket.emit('loginFail', 'Not logged in.');
			return;
		}
		if (!users[username]) users[username] = { sessions: {} };
		socket.emit('loadSessions', Object.entries(users[username].sessions).map(([id, data]) => ({
			id,
			name: data.name
		})));
	});

	// Create session
	socket.on('startSession', () => {
		const username = socket.request.session.user;
		if (!username) {
			socket.emit('loginFail', 'Not logged in.');
			return;
		}
		if (!users[username]) users[username] = { sessions: {} };
		const sessionId = `session_${uuidv4()}`;
		users[username].sessions[sessionId] = { name: sessionId, messages: [] };
		socket.emit('sessionStarted', sessionId);
	});

	// Load messages
	socket.on('loadSession', (sessionId) => {
		const username = socket.request.session.user;
		if (!username) {
			socket.emit('loginFail', 'Not logged in.');
			return;
		}
		const sessionData = users[username].sessions[sessionId]?.messages || [];
		socket.emit('loadMessages', sessionData);
	});

	socket.on('sendMessage', async (message, sessionId) => {
		console.log('Received message:', message);

		const username = socket.request.session.user;
		if (!username) {
			socket.emit('loginFail', 'Not logged in.');
			return;
		}
		if (!users[username]) users[username] = { sessions: {} };
		const session = users[username].sessions[sessionId].messages;
		session.push({ role: 'user', content: message });
		try { // Call Ollama API to generate the chat response
			const response = await axios.post('http://127.0.0.1:11434/api/chat', {
				model: 'qwen2.5-coder:32b',
				messages: session
			}, {
				headers: { 'Content-Type': 'application/json' },
				responseType: 'stream'
			});

			activeResponses[sessionId] = response;
			// Process the stream and send each word to the frontend
			response.data.on('data', (chunk) => {
				const lines = chunk.toString().split('\n'); // Split chunk by new lines
				lines.forEach((line) => {
					if (line.trim()) {
						try {
							const json = JSON.parse(line);
							console.log('Sent response:', json.message.content);
							socket.emit('receiveMessage', json.message.content, json.done, sessionId);
							session.push({ role: 'ai', content: json.message.content, done: json.done });
						} catch (error) {
							console.error('Error parsing JSON:', error);
						}
					}
				});
			});

			// Handle end of stream
			response.data.on('end', () => {
				delete activeResponses[sessionId];
			});

		} catch (error) {
			console.error('Error during API call:', error);
		}
	});

	socket.on('search', (query) => {
		const username = socket.request.session.user;
		if (!username) {
			socket.emit('loginFail', 'Not logged in.');
			return;
		}
		const matchingSessions = {};
		const userSessions = users[username]?.sessions || {};
		// Filter sessions containing the query
		for (const sid in userSessions) {
			const matchedMessages = userSessions[sid].messages.filter(msg => msg.content.includes(query));
			if (matchedMessages.length > 0) {
				matchingSessions[sid] = { ...userSessions[sid], messages: matchedMessages };
			}
		}

		socket.emit('loadSessions', Object.entries(matchingSessions).map(([id, data]) => ({
			id,
			name: data.name
		})));
	});

	function delActiveResponses(sid) {
		if (activeResponses[sid]) {
			activeResponses[sid].data.destroy();
			delete activeResponses[sid];
		}
	}

	socket.on('disconnect', () => {
		const username = socket.request.session?.user;
		if (username && users[username]) {
			for (const sid of Object.keys(users[username].sessions)) {
				delActiveResponses(sid);
			}
		}
	});

	socket.on('stopResponse', (sessionId) => {
		delActiveResponses(sessionId);
	});

	socket.on('deleteSession', (sessionId) => {
		const username = socket.request.session.user;
		if (!username) return;
		delete users[username].sessions[sessionId];
		socket.emit('loadSessions', Object.keys(users[username].sessions));
		delActiveResponses(sessionId);
	});

	socket.on('renameSession', (sessionId, newName) => {
		const username = socket.request.session.user;
		if (!username || !users[username]?.sessions[sessionId]) return;
		users[username].sessions[sessionId].name = newName;
		socket.emit('loadSessions', Object.entries(users[username].sessions).map(
			([id, data]) => ({ id, name: data.name })
		));
	});

});

// Start the server
server.listen(3003, () => {
	console.log(`Server is running on http://localhost:3003`);
});
