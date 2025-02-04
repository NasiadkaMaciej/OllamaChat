const ChatService = require('../../services/ChatService');
const ModelService = require('../../services/ModelService');
const Session = require('../../models/Session');

class ChatHandler {
	constructor(socket) {
		this.socket = socket;
		this.activeResponses = new Map();
	}

	async handleMessage(message, sessionId, modelName) {
		console.log('Received message:', message);
		try {
			const session = await Session.findOne({
				_id: sessionId,
				userId: this.socket.user.id
			  });
			if (!session) throw new Error('Invalid session');

			const isLoaded = await ModelService.isModelLoaded(modelName);
			if (!isLoaded) throw new Error('Selected model is not loaded');

			session.messages.push({ role: 'user', content: message });
			await session.save();

			if (session.messages.length === 1) {
				try {
					const generatedName = await ChatService.generateSessionName(message);
					session.name = generatedName;
					await session.save();

					// When new session (first message), update list of sessions
					const allSessions = await Session.find({ userId: session.userId })
						.sort({ updatedAt: -1 });
					this.socket.emit('session:list', allSessions.map(s => ({
						id: s._id,
						name: s.name
					})));
				}
				catch (error) {
					console.error('Error generating session name:', error);
				}
				await session.save();
			}

			await session.save();
			const response = await ChatService.generateResponse(session, modelName);
			this.activeResponses.set(sessionId, response);

			response.data.on('data', async chunk => {
				try {
					const lines = chunk.toString().split('\n');
					for (const line of lines) {
						if (line.trim()) {
							const json = JSON.parse(line);
							console.log('Sent response:', json.message.content);
							this.socket.emit('chat:message', json.message.content, json.done, sessionId);
							session.messages.push({role: 'ai', content: json.message.content, done: json.done});
							await session.save();
						}
					}
				} catch (error) {
					console.error('Error processing response chunk:', error);
				}
			});

			response.data.on('error', (error) => {
				console.error('Stream error:', error);
				this.socket.emit('error', 'Error in response stream');
				this.activeResponses.delete(sessionId);
			});

			response.data.on('end', () => {
				this.activeResponses.delete(sessionId);
			});

		} catch (error) {
			console.error('Error handling message:', error);
			this.socket.emit('error', 'Failed to generate response');
		}
	}

	stopResponse(sessionId) {
		const response = this.activeResponses.get(sessionId);
		if (response) {
			response.data.destroy();
			this.activeResponses.delete(sessionId);
		}
	}
	cleanup() {
		for (const [sessionId, response] of this.activeResponses) {
			this.stopResponse(sessionId);
		}
	}
}

module.exports = ChatHandler;