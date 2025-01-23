const express = require('express');
const socketIo = require('socket.io');
const axios = require('axios');
const http = require('http');
const { v4: uuidv4 } = require('uuid');
const session = require('express-session');
const app = express();
const server = http.createServer(app);
const io = socketIo(server);
const bcrypt = require('bcrypt');
const mongoose = require('mongoose');
const MongoStore = require('connect-mongo');
const User = require('./schema/user');
const Session = require('./schema/session');

mongoose.connect('mongodb://localhost:27017/ollama-chat');

const sessionMiddleware = session({
	secret: 'VerySecretKey',
	resave: false,
	saveUninitialized: true,
	store: MongoStore.create({ mongoUrl: 'mongodb://127.0.0.1:27017/ollama-chat' })
});

app.use(sessionMiddleware);
io.use((socket, next) => {
	sessionMiddleware(socket.request, socket.request.res || {}, next);
});
app.set("trust proxy", true);

const activeResponses = {}; // Store responses for stopping later

function checkIfLoggedIn(userId) {
	if (!userId) {
		socket.emit('loginFail', 'Not logged in.');
		return false;
	}
	return true;
}

io.on('connection', (socket) => {
	socket.on('register', async ({ username, password }) => {
		try {
			const hashedPassword = await bcrypt.hash(password, 10);
			const user = new User({ username, password: hashedPassword });
			await user.save();
			socket.emit('registerSuccess');
		} catch (error) {
			socket.emit('registerFail', 'Username already taken.');
		}
	});

	socket.on('login', async ({ username, password }) => {
		const user = await User.findOne({ username });
		const passwordMatch = await bcrypt.compare(password, user.password);
		if (!passwordMatch) {
			socket.emit('loginFail', 'Invalid username or password.');
		} else {
			socket.request.session.user = user._id;
			socket.request.session.save();
			socket.emit('loginSuccess');
		}
	});

	socket.on('loadSessions', async () => {
		const userId = socket.request.session.user;
		if (!checkIfLoggedIn(userId)) return;
		const sessions = await Session.find({ userId }).sort({ dateModified: -1 });
		socket.emit('loadSessions', sessions.map(s => ({ id: s._id, name: s.name })));
	});

	// Create session
	socket.on('startSession', async () => {
		const userId = socket.request.session.user;
		if (!checkIfLoggedIn(userId)) return;
		// ToDo: AI generated name?
		const session = new Session({ userId, name: uuidv4(), messages: [] });
		await session.save();
		socket.emit('sessionStarted', session._id, session.name);
	});

	// Load messages
	socket.on('loadSession', async (sessionId) => {
		const userId = socket.request.session.user;
		if (!checkIfLoggedIn(userId)) return;

		const session = await Session.findById(sessionId);
		if (session.userId.toString() !== userId.toString()) {
			socket.emit('loginFail', 'Unauthorized.');
			return;
		}
		socket.emit('loadMessages', session.messages);
	});

	socket.on('sendMessage', async (message, sessionId) => {
		console.log('Received message:', message);
		const userId = socket.request.session.user;
		if (!checkIfLoggedIn(userId)) return;

		const session = await Session.findById(sessionId);
		if (!session || session.userId.toString() !== userId.toString()) {
			socket.emit('loginFail', 'Unauthorized.');
			return;
		}
		session.messages.push({ role: 'user', content: message });
		session.dateModified = Date.now();
		await session.save();

		try { // Call Ollama API to generate the chat response
			const response = await axios.post('http://127.0.0.1:11434/api/chat', {
				model: 'qwen2.5-coder:32b',
				messages: session.messages
			}, {
				headers: { 'Content-Type': 'application/json' },
				responseType: 'stream'
			});

			activeResponses[sessionId] = response;
			// Process the stream and send each word to the frontend
			response.data.on('data', async (chunk) => {
				const lines = chunk.toString().split('\n'); // Split chunk by new lines
				for (const line of lines) {
					if (line.trim()) {
						try {
							const json = JSON.parse(line);
							console.log('Sent response:', json.message.content);
							socket.emit('receiveMessage', json.message.content, json.done, sessionId);
							session.messages.push({ role: 'ai', content: json.message.content, done: json.done });
							session.dateModified = Date.now();
							await session.save();
						} catch (error) {
							console.error('Error parsing JSON:', error);
						}
					}
				};
			});

			// Handle end of stream
			response.data.on('end', async () => {
				delete activeResponses[sessionId];
			});

		} catch (error) {
			console.error('Error during API call:', error);
		}
	});

	socket.on('search', async (query) => {
		const userId = socket.request.session.user;
		if (!checkIfLoggedIn(userId)) return;

		const sessions = await Session.find({
			userId,
			'messages.content': { $regex: query, $options: 'i' }
		}).sort({ dateModified: -1 });
		socket.emit('loadSessions', sessions.map(s => ({ id: s._id, name: s.name })));
	});

	function delActiveResponses(sid) {
		if (activeResponses[sid]) {
			activeResponses[sid].data.destroy();
			delete activeResponses[sid];
		}
	}

	socket.on('disconnect', async () => {
		const userId = socket.request.session?.user;
		if (userId) {
			const sessions = await Session.find({ userId });
			sessions.forEach(s => delActiveResponses(s._id));
		}
	});

	socket.on('stopResponse', (sessionId) => {
		delActiveResponses(sessionId);
	});

	socket.on('deleteSession', async (sessionId) => {
		const userId = socket.request.session.user;
		if (!checkIfLoggedIn(userId)) return;
		await Session.deleteOne({ _id: sessionId, userId });
		const sessions = await Session.find({ userId }).sort({ dateModified: -1 });;;
		socket.emit('loadSessions', sessions.map(s => ({ id: s._id, name: s.name })));
	});

	socket.on('renameSession', async (sessionId, newName) => {
		const userId = socket.request.session.user;
		if (!checkIfLoggedIn(userId)) return;
		await Session.updateOne({ _id: sessionId, userId }, { name: newName });
		const sessions = await Session.find({ userId }).sort({ dateModified: -1 });;;
		socket.emit('loadSessions', sessions.map(s => ({ id: s._id, name: s.name })));
	});

});

// Start the server
server.listen(3003, () => {
	console.log(`Server is running on http://localhost:3003`);
});
