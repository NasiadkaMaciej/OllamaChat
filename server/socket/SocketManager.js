const ChatHandler = require('./handlers/ChatHandler');
const SessionHandler = require('./handlers/SessionHandler');
const jwt = require('jsonwebtoken');
const cookie = require('cookie');
const config = require('../config/config');

class SocketManager {
	static initialize(io) {
		io.use((socket, next) => {
			try {
				const cookies = cookie.parse(socket.handshake.headers.cookie || '');
				const token = cookies.token;

				if (!token) return next(new Error('Authentication required'));

				socket.user = jwt.verify(token, config.JWT_SECRET);
				next();
			} catch (err) {
				next(new Error('Invalid token'));
			}
		});

		io.on('connection', socket => {
			const chatHandler = new ChatHandler(socket);

			socket.on('session:create', () => SessionHandler.handleCreate(socket));
			socket.on('session:open', sessionId => SessionHandler.handleOpen(socket, sessionId));
			socket.on('session:load', () => SessionHandler.handleList(socket));
			socket.on('session:rename', (sessionId, newName) => SessionHandler.handleRename(socket, sessionId, newName));
			socket.on('session:regenerateTitle', (sessionId) => SessionHandler.handleRegenerateTitle(socket, sessionId));
			socket.on('session:search', (query) => SessionHandler.handleSearch(socket, query));
			socket.on('session:delete', (sessionId) => SessionHandler.handleDelete(socket, sessionId));

			socket.on('chat:send', (message, sessionId, modelName) => chatHandler.handleMessage(message, sessionId, modelName));
			socket.on('chat:stop', sessionId => chatHandler.stopResponse(sessionId));

			socket.on('disconnect', () => chatHandler.cleanup());
		});
	}
}

module.exports = SocketManager;