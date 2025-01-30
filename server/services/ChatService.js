const axios = require('axios');
const config = require('../config/config');
const ModelService = require('./ModelService');

class ChatService {
	static async generateResponse(session, modelName) {
		try {
			const response = await axios.post(`${config.OLLAMA_API_URL}/chat`, {
				model: modelName,
				messages: session.messages,
			}, {
				headers: { 'Content-Type': 'application/json' },
				responseType: 'stream'
			});
			return response;
		} catch (error) {
			console.error('Error generating response:', error);
			throw new Error('Failed to generate chat response');
		}
	}

	static async generateSessionName(message) {
		const modelName = 'llama3.2:latest';
		try {
			console.log("Generating session name");
			const isLoaded = await ModelService.isModelLoaded(modelName);
			if (!isLoaded) throw new Error('Selected model is not loaded');

			const response = await axios.post(`${config.OLLAMA_API_URL}/generate`, {
				model: modelName,
				prompt: `Create a concise title for the AI conversation based on the topic below.
						Most importantly, only include the title, absolutely nothing else.
						Don't answer the question, just create a title for this message ${message}`,
				stream: false
			});
			return response.data.response.trim().replace(/"/g, '').trim();
		} catch (error) {
			console.error('Error generating session name:', error);
			return 'New Conversation';
		}
	}
}

module.exports = ChatService;