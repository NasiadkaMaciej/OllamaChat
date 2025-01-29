const axios = require('axios');
const config = require('./config');

class ModelManager {
	static async getLoadedModels() {
		const response = await axios.get('http://127.0.0.1:11434/api/ps');
		return response.data.models.map(model => model.name);
	}

	static async listModels() {
		const [tagsResponse, loadedModelNames] = await Promise.all([
			axios.get('http://127.0.0.1:11434/api/tags'),
			this.getLoadedModels()
		]);

		return tagsResponse.data.models.map(model => ({
			name: model.name,
			size: Math.round(model.size / 1024 / 1024 / 1024 * 100) / 100,
			isLoaded: loadedModelNames.includes(model.name)
		}));
	}

	static async loadModel(modelName) {
		const response = await axios.post('http://127.0.0.1:11434/api/generate', {
			model: modelName
		});
		return response.data.done && response.data.done_reason === 'load';
	}

	static async unloadModel(modelName) {
		const response = await axios.post('http://127.0.0.1:11434/api/generate', {
			model: modelName,
			keep_alive: 0
		});
		return response.data.done && response.data.done_reason === 'unload';
	}
	static async getLoadedModels() {
		try {
			const response = await axios.get(`${config.OLLAMA_API_URL}/ps`);
			return response.data.models.map(model => model.name);
		} catch (error) {
			console.error('Error fetching loaded models:', error);
			throw new Error('Failed to fetch loaded models');
		}
	}
}

module.exports = ModelManager;