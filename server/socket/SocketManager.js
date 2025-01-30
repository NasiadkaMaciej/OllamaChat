const AuthHandler = require('./handlers/AuthHandler');
const ChatHandler = require('./handlers/ChatHandler');
const SessionHandler = require('./handlers/SessionHandler');

function requireAuth(socket, next) {
	const user = socket.request.session.user;
	if (!user) return next(new Error('Unauthorized'));
	next();
}

class SocketManager {
	static initialize(io) {

		io.on('connection', socket => {
			const chatHandler = new ChatHandler(socket);

			// Authentication

			socket.on('auth:login', data => AuthHandler.handleLogin(socket, data));
			socket.on('auth:register', data => AuthHandler.handleRegister(socket, data));


			// Check if user is authorized for all other events
			socket.use((packet, next) => {
				if (!['auth:login', 'auth:register'].includes(packet[0]))
					requireAuth(socket, next);
				else next();
			});

			// Sessions

			socket.on('session:create', () => SessionHandler.handleCreate(socket))
			socket.on('session:open', sessionId => SessionHandler.handleOpen(socket, sessionId))
			socket.on('session:load', () => SessionHandler.handleList(socket))
			socket.on('session:rename', (sessionId, newName) => SessionHandler.handleRename(socket, sessionId, newName))
			socket.on('session:regenerateTitle', (sessionId) => SessionHandler.handleRegenerateTitle(socket, sessionId))
			socket.on('session:search', (query) => SessionHandler.handleSearch(socket, query))
			socket.on('session:delete', (sessionId) => SessionHandler.handleDelete(socket, sessionId))

			// Chat

			socket.on('chat:send', (message, sessionId, modelName) => chatHandler.handleMessage(message, sessionId, modelName))
			socket.on('chat:stop', sessionId => chatHandler.stopResponse(sessionId))



			socket.on('disconnect', () => chatHandler.cleanup());
		});

		return io;
	}
}

module.exports = SocketManager;