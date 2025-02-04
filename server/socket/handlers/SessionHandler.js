const Session = require('../../models/Session');
const ChatService = require('../../services/ChatService');

class SessionHandler {
	static async handleCreate(socket) {
		try {
			const session = await Session.create({
				userId: socket.user.id,
				name: 'New Conversation',
				messages: []
			});
			socket.emit('session:created', session._id, session.name);
		} catch (error) {
			console.error('Error in handleCreate:', error.message);
			socket.emit('error', 'Failed to create session');
		}
	}

	static async handleOpen(socket, sessionId) {
		try {
			const session = await Session.findOne({
				_id: sessionId,
				userId: socket.user.id
			});
			if (!session) throw new Error('Session not found');
			socket.emit('chat:history', session.messages);
		} catch (error) {
			console.error('Error in handleOpen:', error.message);
			socket.emit('error', 'Failed to open session');
		}
	}

	static async handleList(socket) {
		try {
			const sessions = await Session.find({ userId: socket.user.id })
				.sort({ updatedAt: -1 });
			socket.emit('session:list', sessions.map(s => ({
				id: s._id,
				name: s.name
			})));
		} catch (error) {
			console.error('Error in handleList:', error.message);
			socket.emit('error', 'Failed to list sessions');
		}
	}

	static async handleRename(socket, sessionId, newName) {
		try {
			await Session.updateOne(
				{ _id: sessionId, userId: socket.user.id },
				{ name: newName }
			);
			await this.handleList(socket);
		} catch (error) {
			console.error('Error in handleRename:', error.message);
			socket.emit('error', 'Failed to rename session');
		}
	}

	static async handleRegenerateTitle(socket, sessionId) {
		try {
			const session = await Session.findOne({
				_id: sessionId,
				userId: socket.request.session.user
			});
			if (!session || session.messages.length === 0) return;

			const firstMessage = session.messages[0].content;
			const generatedName = await ChatService.generateSessionName(firstMessage);
			session.name = generatedName;
			await session.save();

			await this.handleList(socket);
		} catch (error) {
			console.error('Error in handleRegenerateTitle:', error.message);
			socket.emit('error', 'Failed to regenerate session title');
		}
	}

	static async handleSearch(socket, query) {
		try {
			const sessions = await Session.find({
				userId: socket.request.session.user,
				'messages.content': { $regex: query, $options: 'i' }
			}).sort({ updatedAt: -1 });

			socket.emit('session:list', sessions.map(s => ({
				id: s._id,
				name: s.name
			})));
		} catch (error) {
			console.error('Errpr in handleSearch:', error.message);
			socket.emit('error', 'Search failed');
		}
	}

	static async handleDelete(socket, sessionId) {
		try {
			await Session.deleteOne({
				_id: sessionId,
				userId: socket.request.session.user
			});
			await this.handleList(socket);
		} catch (error) {
			console.error('Error in handleDelete:', error.message);
			socket.emit('error', 'Failed to delete session');
		}
	}

}

module.exports = SessionHandler;