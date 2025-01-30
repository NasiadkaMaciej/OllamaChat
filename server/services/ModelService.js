const axios = require('axios');
const config = require('../config/config');

class ModelService {
	static async getLoadedModels() {
		try {
			const response = await axios.get(`${config.OLLAMA_API_URL}/ps`);
			return response.data.models.map(m => m.name);
		} catch (error) {
			console.error('Error fetching loaded models:', error);
			throw new Error('Failed to fetch loaded models');
		}
	}
	static async loadModel(modelName) {
		const response = await axios.post(`${config.OLLAMA_API_URL}/generate`, {
			model: modelName
		});
		return response.data;
	}

	static async unloadModel(modelName) {
		const response = await axios.post(`${config.OLLAMA_API_URL}/generate`, {
			model: modelName,
			keep_alive: 0
		});
		return response.data;
	}
	static async isModelLoaded(modelName) {
		const loadedModels = await this.getLoadedModels();
		return loadedModels.includes(modelName);
	}
}

module.exports = ModelService;