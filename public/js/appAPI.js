let refreshInterval;
let currentModel = 'qwen2.5-coder:32b'; // Default model
let currentModelSize = 0;
let models = [];
const loadingModels = new Set();

async function updateSystemInfo() {
	try {
		const memoryResponse = await fetch('https://ai.nasiadka.pl/api/memory');
		const memoryData = await memoryResponse.json();

		// Percentage for progress bar
		const usedPercentage = (memoryData.used / memoryData.total) * 100;

		// Update memory display with progress bar
		document.getElementById('memory-info').innerHTML = `
			<div class="memory-progress">
				<div class="progress-bar" style="width: ${usedPercentage}%"></div>
				<span class="used-memory">${memoryData.used} GB</span>
				<span class="free-memory">${memoryData.free} GB</span>
			</div>
		`;

		const modelsResponse = await fetch('https://ai.nasiadka.pl/api/models');
		models = await modelsResponse.json();
		models.sort((a, b) => { // Sort loaded models first, then alphabetically
			if (a.isLoaded === b.isLoaded)
				return a.name.localeCompare(b.name);
			return b.isLoaded - a.isLoaded;
		});

		// ToDo: No "Use" and "Load" buttons. Just status and action depending on it
		const modelsList = models.map(model => `
			<div class="model-item">
				<div class="model-header">
					<span class="model-name">${model.name}</span>
					<span class="model-size">${model.size} GB</span>
				</div>
				<div class="buttons-wrapper">
					<button class="use-button ${model.name === currentModel ? 'selected' : ''}" 
							onclick="selectModel('${model.name}')"
							${!model.isLoaded || loadingModels.has(model.name) ? 'disabled' : ''}>
						Use
					</button>
					<button class="${model.isLoaded ? 'unload-button' : 'load-button'}" 
							onclick="${model.isLoaded ? 'unloadModel' : 'loadModel'}('${model.name}')"
							${loadingModels.has(model.name) ? 'disabled' : ''}>
						${model.isLoaded ? 'Unload' : 'Load'}
					</button>
				</div>
			</div>
		`).join('');

		document.getElementById('models-info').innerHTML = `
			<div class="models-list">
				${modelsList}
			</div>
		`;
	} catch (error) {
		console.error('Error updating system info:', error);
	}
}

async function loadModel(modelName) {
	try {
		loadingModels.add(modelName);
		updateSystemInfo();

		const response = await fetch('https://ai.nasiadka.pl/api/models/load', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({
				model: modelName,
				username: getCookie('username')
			})
		});

		const result = await response.json();

		// Only mark as loaded if we get success response
		if (result.success) {
			const modelIndex = models.findIndex(m => m.name === modelName);
			if (modelIndex >= 0) models[modelIndex].isLoaded = true;
			showToast('Model loaded successfully', false);
		} else throw new Error(result.error || 'Failed to load model');
	} catch (error) {
		console.error('Error loading model:', error);
		showToast(error.message || 'Failed to load model', true);
	} finally {
		loadingModels.delete(modelName);
		updateSystemInfo();
	}
}


async function unloadModel(modelName) {
	try {
		loadingModels.add(modelName);
		updateSystemInfo();

		const response = await fetch('https://ai.nasiadka.pl/api/models/unload', {
			method: 'DELETE',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({
				model: modelName,
				username: getCookie('username')
			})
		});

		const result = await response.json();

		if (result.success) {
			const modelIndex = models.findIndex(m => m.name === modelName);
			if (modelIndex >= 0) models[modelIndex].isLoaded = false;
			showToast('Model unloaded successfully', false);
		} else throw new Error(result.error || 'Failed to unload model');
	} catch (error) {
		console.error('Error unloading model:', error);
		showToast(error.message || 'Failed to unload model', true);
	} finally {
		loadingModels.delete(modelName);
		updateSystemInfo();
	}
}

function selectModel(modelName) {
	currentModel = modelName;
	const selectedModel = models.find(model => model.name === modelName);
	if (selectedModel) currentModelSize = selectedModel.size; // Get size for speed calculation
	setCookie('lastSelectedModel', modelName);
	updateSystemInfo();
}

const lastSelectedModel = getCookie('lastSelectedModel');
if (lastSelectedModel) currentModel = lastSelectedModel;

updateSystemInfo();

// Update every 3 seconds
refreshInterval = setInterval(updateSystemInfo, 3000);

// Clean up on page unload
window.addEventListener('unload', () => {
	if (refreshInterval) {
		clearInterval(refreshInterval);
	}
});