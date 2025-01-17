const express = require('express');
const socketIo = require('socket.io');
const axios = require('axios');
const http = require('http');
const { v4: uuidv4 } = require('uuid');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);
app.set("trust proxy", true);

const users = {}; // Store users and sessions
const activeResponses = {}; // Store responses for stopping later

io.on('connection', (socket) => {
	// ToDo: Implement user registration
	// Create user and load sessions
	socket.on('registerUser', (userId) => {
		if (!users[userId]) users[userId] = { sessions: {} };
		socket.userId = userId;
		socket.emit('loadSessions', Object.keys(users[userId].sessions));
	});

	// Create session
	socket.on('startSession', () => {
		const sessionId = `session_${uuidv4()}`;
		users[socket.userId].sessions[sessionId] = [];
		socket.emit('sessionStarted', sessionId);
	});

	// Load messages
	socket.on('loadSession', (sessionId) => {
		const sessionData = users[socket.userId].sessions[sessionId] || [];
		socket.emit('loadMessages', sessionData);
	});

	socket.on('sendMessage', async (message, sessionId) => {
		console.log('Received message:', message);

		// Add user message to session
		const session = users[socket.userId].sessions[sessionId];
		session.push({ role: 'user', content: message });

		try { // Call Ollama API to generate the chat response
			const response = await axios.post('http://127.0.0.1:11434/api/chat', {
				model: 'qwen2.5-coder:32b-instruct-q8_0',
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
		const userId = socket.userId;
		const matchingSessions = {};
	
		// Filter sessions containing the query
		for (const sessionId in users[userId].sessions) {
			const messages = users[userId].sessions[sessionId];
			const matchedMessages = messages.filter(message =>
				message.content.includes(query)
			);
	
			if (matchedMessages.length > 0)
				matchingSessions[sessionId] = matchedMessages;
		}
	
		socket.emit('loadSessions', Object.keys(matchingSessions));
	});


	function delActiveResponses(sessionId) {
		if (activeResponses[sessionId]) {
			activeResponses[sessionId].data.destroy();
			delete activeResponses[sessionId];
		}
	}

	socket.on('disconnect', () => {
		if (socket.userId) {
			Object.keys(users[socket.userId].sessions).forEach((sessionId) => {
				delActiveResponses(sessionId);
			});
		}
	});

	socket.on('stopResponse', (sessionId) => {
		delActiveResponses(sessionId);
	});

	socket.on('deleteSession', (sessionId) => {
		delete users[socket.userId].sessions[sessionId];
		socket.emit('loadSessions', Object.keys(users[socket.userId].sessions));
		delActiveResponses(sessionId);
	});
});

// Start the server
server.listen(3003, () => {
	console.log(`Server is running on http://localhost:${3003}`);
});
