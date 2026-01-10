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
					const generatedName = await ChatService.generateSessionName(message, modelName);
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
					console.error('Error generating session name:', error.message);
				}
			}

			await session.save();
			const response = await ChatService.generateResponse(session, modelName);

			let fullResponse = '';
			let isSaved = false;

			this.activeResponses.set(sessionId, {
				data: response.data,
				savePartial: async () => {
					if (!isSaved && fullResponse) {
						session.messages.push({ role: 'ai', content: fullResponse, done: false });
						await session.save();
						isSaved = true;
					}
				}
			});

			let buffer = '';
			response.data.on('data', async chunk => {
				buffer += chunk.toString();
				const lines = buffer.split('\n');
				buffer = lines.pop();

				for (const line of lines) {
					if (!line.trim()) continue;
					try {
						const json = JSON.parse(line);
						const content = (json.message && json.message.content) || '';
						const done = json.done || false;

						if (content) fullResponse += content;
						if (content || done) this.socket.emit('chat:message', content, done, sessionId);

						if (done && !isSaved) {
							session.messages.push({ role: 'ai', content: fullResponse, done: true });
							await session.save();
							isSaved = true;
						}
					} catch (error) {
						console.error('Error processing response chunk:', error.message);
					}
				}
			});

			response.data.on('error', (error) => {
				console.error('Stream error:', error.message);
				this.socket.emit('error', 'Error in response stream');
				this.activeResponses.delete(sessionId);
			});

			response.data.on('end', () => {
				this.activeResponses.delete(sessionId);
			});

		} catch (error) {
			console.error('Error handling message:', error.message);
			this.socket.emit('error', 'Failed to generate response');
		}
	}

	stopResponse(sessionId) {
		const active = this.activeResponses.get(sessionId);
		if (active) {
			active.data.destroy();
			active.savePartial();
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