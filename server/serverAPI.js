const express = require('express');
const axios = require('axios');
const os = require('os');
const bodyParser = require('body-parser');
const app = express();
const router = express.Router();

app.use(bodyParser.json());
app.use('/api', router);

router.get('/memory', (req, res) => {
	try {
		res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
		const totalMemory = os.totalmem();
		const freeMemory = os.freemem();
		const usedMemory = totalMemory - freeMemory;

		res.status(200).json({
			total: Math.round(totalMemory / 1024 / 1024 / 1024), // Needed for progress bar
			free: Math.floor(freeMemory / 1024 / 1024 / 1024),
			used: Math.ceil(usedMemory / 1024 / 1024 / 1024),
			timestamp: Date.now() // Prevent cache
		});
	} catch (error) {
		console.error('Error fetching memory info:', error);
		res.status(500).json({ error: 'Failed to fetch memory info' });
	}
});

async function getLoadedModels() {
	try {
		const response = await axios.get('http://127.0.0.1:11434/api/ps');
		return response.data.models.map(model => model.name);
	} catch (error) {
		console.error('Error fetching loaded models:', error);
		throw new Error('Failed to fetch loaded models');
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
		res.status(200).json(models);
	} catch (error) {
		console.error('Error fetching models:', error);
		res.status(500).json({ error: 'Failed to fetch models' });
	}
});

router.post('/models/load', async (req, res) => {
	const { model } = req.body;
	try {
		await axios.post('http://127.0.0.1:11434/api/generate', { model });
		res.status(200).json({ message: 'Model loaded successfully' });
	} catch (error) {
		console.error('Error loading model:', error);
		res.status(500).json({ error: 'Failed to load model' });
	}
});

router.delete('/models/unload', async (req, res) => {
	const { model } = req.body;
	try {
		await axios.post('http://127.0.0.1:11434/api/generate', { model, keep_alive: 0 });
		res.status(200).json({ message: 'Model unloaded successfully' });
	} catch (error) {
		console.error('Error unloading model:', error);
		res.status(500).json({ error: 'Failed to unload model' });
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