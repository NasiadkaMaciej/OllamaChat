const express = require('express');
const axios = require('axios');
const os = require('os');
const app = express();
const router = express.Router();

app.use('/api', router);

router.get('/memory', (req, res) => {
	const totalMemory = os.totalmem();
	const freeMemory = os.freemem();
	const usedMemory = totalMemory - freeMemory;

	res.json({
		total: Math.round(totalMemory / 1024 / 1024 / 1024), // Needed for progress bar
		free: Math.round(freeMemory / 1024 / 1024 / 1024),
		used: Math.round(usedMemory / 1024 / 1024 / 1024)
	});
});

// Get available AI models
router.get('/models', async (req, res) => {
	try {
		const response = await axios.get('http://127.0.0.1:11434/api/tags');
		const models = response.data.models.map(model => ({
			name: model.name,
			size: Math.round(model.size / 1024 / 1024 / 1024 * 100) / 100, // Convert to GB with 2 decimals
		}));
		res.json(models);
	} catch (error) {
		console.error('Error fetching models:', error);
		res.status(500).json({ error: 'Failed to fetch models' });
	}
});

// ToDo: Loaded models
// ToDo: Storing favorites?
// ToDo: Search models?
// ToDo: Renaming models?
// ToDo: Loading and unloading models
// ToDo: Status of loaded models
// ToDo: Using models

app.listen(3002, () => {
	console.log('API Server is running on http://localhost:3002');
});