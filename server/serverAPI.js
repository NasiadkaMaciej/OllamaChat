const express = require('express');
const axios = require('axios');
const os = require('os');
const app = express();
const router = express.Router();

app.use('/api', router);

router.get('/memory', (req, res) => {
	res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
	const totalMemory = os.totalmem();
	const freeMemory = os.freemem();
	const usedMemory = totalMemory - freeMemory;

	res.json({
		total: Math.round(totalMemory / 1024 / 1024 / 1024), // Needed for progress bar
		free: Math.round(freeMemory / 1024 / 1024 / 1024),
		used: Math.round(usedMemory / 1024 / 1024 / 1024),
		timestamp: Date.now() // Prevent cache
	});
});

async function getLoadedModels() {
	try {
		const response = await axios.get('http://127.0.0.1:11434/api/ps');
		return response.data.models.map(model => model.name);
	} catch (error) {
		console.error('Error fetching loaded models:', error);
		return [];
	}
}

// Get available AI models
router.get('/models', async (req, res) => {
	res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
	try {
		const [tagsResponse, loadedModelNames] = await Promise.all([
			axios.get('http://127.0.0.1:11434/api/tags'),
			getLoadedModels()
		]);

		const models = tagsResponse.data.models.map(model => ({
			name: model.name,
			size: Math.round(model.size / 1024 / 1024 / 1024 * 100) / 100,
			isLoaded: loadedModelNames.includes(model.name),
			timestamp: Date.now() // Prevent cache

		}));
		res.json(models);
	} catch (error) {
		console.error('Error fetching models:', error);
		res.status(500).json({ error: 'Failed to fetch models' });
	}
});

// ToDo: Storing favorites?
// ToDo: Search models?
// ToDo: Loading and unloading models
// ToDo: Status of loaded models
// ToDo: Using models

app.listen(3002, () => {
	console.log('API Server is running on http://localhost:3002');
});