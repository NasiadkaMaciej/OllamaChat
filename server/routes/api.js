const express = require('express');
const axios = require('axios');
const { checkPrivileges } = require('../services/auth');
const config = require('../config/config');
const os = require('os');
const { getLoadedModels } = require('../services/services');

const router = express.Router();

router.get('/memory', async (req, res) => {
	try {
		res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
		const totalMemory = os.totalmem();
		const freeMemory = os.freemem();
		const usedMemory = totalMemory - freeMemory;

		res.status(200).json({
			total: Math.round(totalMemory / 1024 / 1024 / 1024),
			free: Math.floor(freeMemory / 1024 / 1024 / 1024),
			used: Math.ceil(usedMemory / 1024 / 1024 / 1024),
			timestamp: Date.now()
		});
	} catch (error) {
		console.error('Error fetching memory info:', error);
		res.status(500).json({ error: 'Failed to fetch memory info' });
	}
});

router.get('/models', async (req, res) => {
	try {
		res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
		const [tagsResponse, loadedModelNames] = await Promise.all([
			axios.get(`${config.OLLAMA_API_URL}/tags`),
			getLoadedModels()
		]);

		const models = tagsResponse.data.models.map(model => ({
			name: model.name,
			size: Math.round(model.size / 1024 / 1024 / 1024 * 100) / 100,
			isLoaded: loadedModelNames.includes(model.name),
			timestamp: Date.now()
		}));
		res.status(200).json(models);
	} catch (error) {
		console.error('Error fetching models:', error);
		res.status(500).json({ error: 'Failed to fetch models' });
	}
});

router.post('/models/load', async (req, res) => {
	const { model, username } = req.body;
	if (!await checkPrivileges(username)) {
		return res.status(403).json({
			success: false,
			error: 'You do not have privileges to load models'
		});
	}
	try {
		const response = await axios.post('http://127.0.0.1:11434/api/generate', {
			model // No prompt, just load the model
		});

		if (response.data.done && response.data.done_reason === 'load') {
			res.status(200).json({
				success: true,
				message: 'Model loaded successfully'
			});
		} else throw new Error();
	} catch (error) {
		console.error('Error loading model:', error);
		res.status(500).json({
			success: false,
			error: 'Failed to load model'
		});
	}
});

router.delete('/models/unload', async (req, res) => {
	const { model, username } = req.body;
	if (!await checkPrivileges(username)) {
		return res.status(403).json({
			success: false,
			error: 'You do not have privileges to unload models'
		});
	}
	try {
		const response = await axios.post('http://127.0.0.1:11434/api/generate', {
			model,
			keep_alive: 0 // Kill the model
		});

		if (response.data.done && response.data.done_reason === 'unload') {
			res.status(200).json({
				success: true,
				message: 'Model unloaded successfully'
			});
		} else throw new Error();
	} catch (error) {
		console.error('Error loading model:', error);
		res.status(500).json({
			success: false,
			error: 'Failed to unload model'
		});
	}
});

// ToDo: Storing favorites?
// ToDo: Search models?


module.exports = router;