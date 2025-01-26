let refreshInterval;
let currentModel = 'qwen2.5-coder:32b'; // Default model
let currentModelSize = 0;
let models = [];

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

		// ToDo: Implement loading and unloading models
		const modelsList = models.map(model => `
			<div class="model-item">
				<div class="model-header">
					<span class="model-name">${model.name}</span>
					<span class="model-size">${model.size} GB</span>
				</div>
				<div class="buttons-wrapper">
					<button class="use-button ${model.name === currentModel ? 'selected' : ''}" 
							onclick="selectModel('${model.name}')"
							${!model.isLoaded ? 'disabled' : ''}>Use</button>
					${model.isLoaded
				? `<button class="unload-button">Unload</button>`
				: `<button class="load-button">Load</button>`
			}
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

function selectModel(modelName) {
    currentModel = modelName;
    const selectedModel = models.find(model => model.name === modelName);
    if (selectedModel) currentModelSize = selectedModel.size; // Get size for speed calculation
    setCookie('lastSelectedModel', modelName, 1);
    updateSystemInfo();
}

const lastSelectedModel = getCookie('lastSelectedModel');
if (lastSelectedModel) currentModel = lastSelectedModel;

updateSystemInfo();

// Update every 10 seconds
refreshInterval = setInterval(updateSystemInfo, 10000);

// Clean up on page unload
window.addEventListener('unload', () => {
	if (refreshInterval) {
		clearInterval(refreshInterval);
	}
});