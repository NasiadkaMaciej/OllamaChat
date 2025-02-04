const axios = require('axios');
const config = require('../config/config');

class ModelService {
	static async getLoadedModels() {
		try {
			const response = await axios.get(`${config.OLLAMA_API_URL}/ps`);
			return response.data.models.map(m => m.name);
		} catch (error) {
			console.error('Error fetching loaded models:', error.message);
			throw new Error('Failed to fetch loaded models');
		}
	}
	static async loadModel(modelName) {
		try {
			const response = await axios.post(`${config.OLLAMA_API_URL}/generate`, {
				model: modelName
			});
			return response.data;
		}
		catch (error) {
			console.error('Error loading model:', error.message);
			throw new Error('Failed to load model');
		}
	}
	static async unloadModel(modelName) {
		try {
			const response = await axios.post(`${config.OLLAMA_API_URL}/generate`, {
				model: modelName,
				keep_alive: 0
			});
			return response.data;
		}
		catch (error) {
			console.error('Error unloading model:', error.message);
			throw new Error('Failed to unload model');
		}
	}
	static async isModelLoaded(modelName) {
		try {
			const loadedModels = await this.getLoadedModels();
			return loadedModels.includes(modelName);
		}
		catch (error) {
			console.error('Error checking if model is loaded:', error.message);
			throw new Error('Failed to check if model is loaded');
		}
	}
}

module.exports = ModelService;