const axios = require('axios');
const os = require('os');
const config = require('../config/config');
const { v4: uuidv4 } = require('uuid');

async function getLoadedModels() {
	try {
		const response = await axios.get(`${config.OLLAMA_API_URL}/ps`);
		return response.data.models.map(model => model.name);
	} catch (error) {
		console.error('Error fetching loaded models:', error);
		throw new Error('Failed to fetch loaded models');
	}
}

async function generateSessionName(message) {
	try {
		const question = `
            Create a concise title for the AI conversation based on the topic below.
            Most importantly, only include the title, absolutely nothing else.
            Don't answer the question, just create a title.`

		const response = await axios.post(`${config.OLLAMA_API_URL}/generate`, {
			model: 'llama3.2',
			prompt: question + message,
			stream: false
		});
		return response.data.response.trim().replace(/"/g, '').trim();
	} catch (error) {
		console.error('Error generating session name:', error);
		return uuidv4(); // Fallback to UUID if generation fails
	}
}

function checkIfLoggedIn(userId, socket) {
	// ToDo: Cookies
	if (!userId) {
		socket.emit('loginFail', 'Not logged in.');
		return false;
	}
	return true;
}

async function generateResponse(message, sessionId, modelName, userId) {
	const response = await axios.post(`${config.OLLAMA_API_URL}/chat`, {
		model: modelName,
		messages: message
	}, {
		headers: { 'Content-Type': 'application/json' },
		responseType: 'stream'
	});
	return response;
}

const checkIfModelLoaded = async (modelName) => {
	try {
		const response = await axios.get(`${config.OLLAMA_API_URL}/ps`);
		const loadedModels = response.data.models.map(m => m.name);
		return loadedModels.includes(modelName);
	} catch (error) {
		console.error('Error checking model status:', error);
		throw new Error('Could not verify model status');
	}
};

module.exports = {
	getLoadedModels,
	generateSessionName,
	generateResponse,
	checkIfLoggedIn,
	checkIfModelLoaded
};