export class ModelManager {
	constructor(socket, ui) {
		this.socket = socket;
		this.ui = ui;
		this.models = [];
		this.loadingModels = new Set();
		this.currentModel = 'qwen2.5-coder:32b';
		this.currentModelSize = 0;
		this.refreshInterval = null;
		this.initializeModel();
	}

	// ToDo: Favorite models?

	initializeModel() {
		const lastSelectedModel = getCookie('lastSelectedModel');
		if (lastSelectedModel) this.currentModel = lastSelectedModel;
		this.startUpdates();
	}

	startUpdates() { // Update memory and models info every 3 seconds
		this.updateSystemInfo();
		this.refreshInterval = setInterval(() => this.updateSystemInfo(), 3000);
	}

	cleanup() { if (this.refreshInterval) clearInterval(this.refreshInterval); }

	async updateSystemInfo() {
		try {
			await this.updateMemoryInfo();
			await this.updateModelsInfo();
		} catch (error) {
			console.error('Error updating system info:', error.message);
		}
	}

	async updateMemoryInfo() {
		const memoryResponse = await fetch('/api/memory');
		const memoryData = await memoryResponse.json();
		const usedPercentage = (memoryData.used / memoryData.total) * 100;

		document.getElementById('memory-info').innerHTML = `
            <div class="memory-progress">
                <div class="progress-bar" style="width: ${usedPercentage}%"></div>
                <span class="used-memory">${memoryData.used} GB</span>
                <span class="free-memory">${memoryData.free} GB</span>
            </div>
        `;
	}

	async updateModelsInfo() {
		const modelsResponse = await fetch('/api/models');
		this.models = await modelsResponse.json();
		this.models.sort((a, b) => { // Sort loaded models first, then alphabetically
			if (a.isLoaded === b.isLoaded) return a.name.localeCompare(b.name);
			return b.isLoaded - a.isLoaded;
		});

		// Set initial size for current model
		const currentModelData = this.models.find(m => m.name === this.currentModel);
		if (currentModelData) this.currentModelSize = currentModelData.size;

		this.renderModels();
	}

	renderModels() {
		// ToDo: No "Use" and "Load" buttons. Just status and action depending on it
		const modelsList = this.models.map(model => `
            <div class="model-item">
                <div class="model-header">
                    <span class="model-name">${model.name}</span>
                    <span class="model-size">${model.size} GB</span>
                </div>
                <div class="buttons-wrapper">
                    <button class="use-button ${model.name === this.currentModel ? 'selected' : ''}" 
                            onclick="window.modelManager.selectModel('${model.name}')"
                            ${!model.isLoaded || this.loadingModels.has(model.name) ? 'disabled' : ''}>
                        Use
                    </button>
                    <button class="${model.isLoaded ? 'unload-button' : 'load-button'}" 
                            onclick="${model.isLoaded ? 'window.modelManager.unloadModel' : 'window.modelManager.loadModel'}('${model.name}')"
                            ${this.loadingModels.has(model.name) ? 'disabled' : ''}>
                        ${model.isLoaded ? 'Unload' : 'Load'}
                    </button>
                </div>
            </div>
        `).join('');

		document.getElementById('models-info').innerHTML = `
            <div class="models-list">${modelsList}</div>
        `;
	}

	async loadModel(modelName) {
		try {
			this.loadingModels.add(modelName);
			this.updateSystemInfo();

			const response = await fetch('/api/models/load', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ model: modelName }),
				credentials: 'include'
			});
			if (response.status === 403) throw new Error('You are not authorized to load models');
			if (!response.ok) throw new Error('Failed to load model');

			const modelIndex = this.models.findIndex(m => m.name === modelName);
			if (modelIndex >= 0) this.models[modelIndex].isLoaded = true;
			this.ui.showToast('Model loaded successfully', false);
		} catch (error) {
			console.error('Error loading model:', error.message);
			this.ui.showToast(error.message || 'Failed to load model');
		} finally {
			this.loadingModels.delete(modelName);
			this.updateSystemInfo();
		}
	}

	async unloadModel(modelName) {
		try {
			this.loadingModels.add(modelName);
			this.updateSystemInfo();

			const response = await fetch('/api/models/unload', {
				method: 'DELETE',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ model: modelName }),
				credentials: 'include'
			});
			if (response.status === 403) throw new Error('You are not authorized to unload models');
			if (!response.ok) throw new Error('Failed to unload model');

			const modelIndex = this.models.findIndex(m => m.name === modelName);
			if (modelIndex >= 0) this.models[modelIndex].isLoaded = false;
			this.ui.showToast('Model unloaded successfully', false);
		} catch (error) {
			console.error('Error unloading model:', error.message);
			this.ui.showToast(error.message || 'Failed to unload model');
		} finally {
			this.loadingModels.delete(modelName);
			this.updateSystemInfo();
		}
	}

	// After login, set the last selected model from cookie
	selectModel(modelName) {
		this.currentModel = modelName;
		const selectedModel = this.models.find(model => model.name === modelName);
		if (selectedModel) this.currentModelSize = selectedModel.size;
		setCookie('lastSelectedModel', modelName);
		this.updateSystemInfo();
	}

	getCurrentModelSize() { return this.currentModelSize; }
}