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
			console.error('Error generating response:', error.message);
			throw new Error('Failed to generate chat response');
		}
	}

	static async generateSessionName(message, modelName) {
		const modelToUse = modelName || config.SESSION_NAME_MODEL;
		try {
			console.log("Generating session name using:", modelToUse);
			const isLoaded = await ModelService.isModelLoaded(modelToUse);
			if (!isLoaded) throw new Error('Selected model is not loaded');

			const response = await axios.post(`${config.OLLAMA_API_URL}/generate`, {
				model: modelToUse,
				prompt: `Create a concise title for the AI conversation based on the topic below.
						Most importantly, only include the title, absolutely nothing else.
						Limit your response to a maximum of 5 words.
						Don't answer the question, do not even think about it.
						You are only to provide a short title, nothing more.
						Just create a title for this message: ${message}`,
				stream: false
			});
			return response.data.response.trim().replace(/"/g, '').trim();
		} catch (error) {
			console.error('Error generating session name:', error.message);
			return 'New Conversation';
		}
	}
}

module.exports = ChatService;