const Session = require('../models/session');
const { checkIfLoggedIn } = require('../services/auth');
const bcrypt = require('bcrypt');
const User = require('../models/user');
const axios = require('axios');
const activeResponses = {};
const { generateResponse, generateSessionName, checkIfModelLoaded } = require('../services/services');
const config = require('../config/config');

function initializeSocketHandlers(io) {
	io.on('connection', (socket) => {
		socket.on('auth:register', async ({ username, password }) => {
			try {
				const hashedPassword = await bcrypt.hash(password, 10);
				const user = new User({ username, password: hashedPassword });
				await user.save();
				socket.emit('auth:success', 'Registration successful! Please log in.');
			} catch (error) {
				console.error('Error during registration:', error);
				socket.emit('auth:failed', 'Username already taken.');
			}
		});

		socket.on('auth:login', async ({ username, password }) => {
			try {
				const user = await User.findOne({ username });
				if (!user) {
					socket.emit('auth:failed', 'Invalid username or password.');
					return;
				}
				const passwordMatch = await bcrypt.compare(password, user.password);
				if (!passwordMatch) {
					socket.emit('auth:failed', 'Invalid username or password.');
				} else {
					socket.request.session.user = user._id;
					socket.request.session.save();
					socket.emit('auth:loginSuccess', 'Login successful!');
				}
			} catch (error) {
				console.error('Error during login:', error);
				socket.emit('auth:failed', 'An error occurred during login.');
			}
		});

		socket.on('session:load', async () => {
			const userId = socket.request.session.user;
			if (!checkIfLoggedIn(userId, socket)) return;
			try {
				const sessions = await Session.find({ userId }).sort({ updatedAt: -1 });
				socket.emit('session:list', sessions.map(s => ({ id: s._id, name: s.name })));
			} catch (error) {
				console.error('Error loading sessions:', error);
				socket.emit('error', 'Failed to load sessions.');
			}
		});

		socket.on('session:create', async () => {
			const userId = socket.request.session.user;
			if (!checkIfLoggedIn(userId, socket)) return;
			try {
				const session = new Session({ userId, name: 'New Conversation', messages: [] });
				await session.save();
				socket.emit('session:created', session._id, session.name);
			} catch (error) {
				console.error('Error creating session:', error);
				socket.emit('error', 'Failed to create session.');
			}
		});

		socket.on('session:open', async (sessionId) => {
			const userId = socket.request.session.user;
			if (!checkIfLoggedIn(userId, socket)) return;
			try {
				const session = await Session.findById(sessionId);
				if (!session) {
					console.error('Session not found:', sessionId);
					socket.emit('error', 'Session not found.');
					return;
				}
				if (session.userId.toString() !== userId.toString()) {
					socket.emit('auth:failed', 'Unauthorized.');
					return;
				}
				socket.emit('chat:history', session.messages);
			} catch (error) {
				console.error('Error opening session:', error);
				socket.emit('error', 'Failed to open session.');
			}
		});

		socket.on('model:select', async (modelName) => {
			checkIfModelLoaded(modelName);
		});

		socket.on('chat:send', async (message, sessionId, modelName) => {
			console.log('Received message:', message);
			const userId = socket.request.session.user;
			if (!checkIfLoggedIn(userId, socket)) return;

			try {
				const session = await Session.findById(sessionId);
				if (!session || session.userId.toString() !== userId.toString()) {
					socket.emit('auth:failed', 'Unauthorized.');
					return;
				}

				await checkIfModelLoaded(modelName);
				session.messages.push({ role: 'user', content: message });
				// Generate name if this is the first message
				if (session.messages.length === 1) {
					const generatedName = await generateSessionName(message);
					session.name = generatedName;
					await session.save();
					const sessions = await Session.find({ userId }).sort({ updatedAt: -1 });
					socket.emit('session:list', sessions.map(s => ({ id: s._id, name: s.name })));
				}

				await session.save();

				try { // Call Ollama API to generate the chat response
					const response = await axios.post('http://127.0.0.1:11434/api/chat', {
						model: modelName,
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
									socket.emit('chat:message', json.message.content, json.done, sessionId);
									session.messages.push({ role: 'ai', content: json.message.content, done: json.done });
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
					socket.emit('error', 'Chat generation failed');
				}
			} catch (error) {
				console.error('Error sending chat message:', error);
				socket.emit('error', 'Failed to send chat message.');
			}
		});

		socket.on('session:search', async (query) => {
			try {
				const userId = socket.request.session.user;
				if (!checkIfLoggedIn(userId, socket)) return;

				// Search for sessions with messages containing the query
				// regex with i flag is case insensitive
				// ToDo: Read about indexing in MongoDB
				const sessions = await Session.find({
					userId,
					'messages.content': { $regex: query, $options: 'i' }
				}).sort({ updatedAt: -1 });

				socket.emit('session:list', sessions.map(s => ({ id: s._id, name: s.name })));
			} catch (error) {
				console.error('Search error:', error);
				socket.emit('error', 'Search failed');
			}
		});

		socket.on('session:regenerateTitle', async (sessionId) => {
			const userId = socket.request.session.user;
			if (!checkIfLoggedIn(userId, socket)) return;

			try {
				const session = await Session.findOne({ _id: sessionId, userId });
				if (!session || session.messages.length === 0) return;

				const firstMessage = session.messages[0].content;
				const generatedName = await generateSessionName(firstMessage);
				session.name = generatedName;
				await session.save();

				const sessions = await Session.find({ userId }).sort({ updatedAt: -1 });
				socket.emit('session:list', sessions.map(s => ({ id: s._id, name: s.name })));
			} catch (error) {
				console.error('Error regenerating session title:', error);
				socket.emit('error', 'Failed to regenerate session title.');
			}
		});

		function delActiveResponses(sessionId) {
			if (activeResponses[sessionId])
				try {
					activeResponses[sessionId].data.destroy();
					delete activeResponses[sessionId];
				} catch (error) {
					console.error('Error stopping response:', error);
				}
		}

		socket.on('disconnect', async () => {
			const userId = socket.request.session?.user;
			if (userId) {
				const sessions = await Session.find({ userId });
				sessions.forEach(s => delActiveResponses(s._id));
			}
		});

		socket.on('chat:stop', (sessionId) => {
			delActiveResponses(sessionId);
		});

		socket.on('session:delete', async (sessionId) => {
			const userId = socket.request.session.user;
			if (!checkIfLoggedIn(userId, socket)) return;
			try {
				await Session.deleteOne({ _id: sessionId, userId });
				const sessions = await Session.find({ userId }).sort({ updatedAt: -1 });
				socket.emit('session:list', sessions.map(s => ({ id: s._id, name: s.name })));
			} catch (error) {
				console.error('Error deleting session:', error);
				socket.emit('error', 'Failed to delete session.');
			}
		});

		socket.on('session:rename', async (sessionId, newName) => {
			const userId = socket.request.session.user;
			if (!checkIfLoggedIn(userId, socket)) return;
			try {
				await Session.updateOne({ _id: sessionId, userId }, { name: newName });
				const sessions = await Session.find({ userId }).sort({ updatedAt: -1 });
				socket.emit('session:list', sessions.map(s => ({ id: s._id, name: s.name })));
			} catch (error) {
				console.error('Error renaming session:', error);
				socket.emit('error', 'Failed to rename session.');
			}
		});
	});
}

module.exports = { initializeSocketHandlers };