const express = require('express');
const axios = require('axios');
const config = require('../config/config');
const os = require('os');
const AuthService = require('../services/AuthService');
const ModelService = require('../services/ModelService');
const router = express.Router();
const jwt = require('jsonwebtoken');
const AuthMiddleware = require('../utils/Middleware');

router.get('/auth/verify', (req, res) => {
	const token = req.cookies.token;

	if (!token) return res.json({ authenticated: false });

	try {
		const decoded = jwt.verify(token, config.JWT_SECRET);
		res.json({
			authenticated: true,
			user: {
				username: decoded.username,
				_id: decoded.id
			}
		});
	} catch (error) {
		res.clearCookie('token');
		res.json({ authenticated: false });
	}
});

router.post('/auth/login', async (req, res) => {
	try {
		const { username, password } = req.body;
		const user = await AuthService.login(username, password);
		const token = jwt.sign(
			{ id: user._id, username: user.username },
			config.JWT_SECRET,
			{ expiresIn: '7d' }
		);

		res.cookie('token', token, config.COOKIE_OPTIONS);

		res.json({
			user: {
				username: user.username,
				_id: user._id
			}
		});
	} catch (error) {
		res.status(401).json({ error: error.message });
	}
});

router.post('/auth/register', async (req, res) => {
	try {
		const { username, password } = req.body;
		await AuthService.register(username, password);
		res.json({ message: 'Registration successful' });
	} catch (error) {
		res.status(400).json({ error: error.message });
	}
});

router.post('/auth/logout', (req, res) => {
	res.clearCookie('token');
	res.json({ message: 'Logged out' });
});

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
		console.error('Error fetching memory info:', error.message);
		res.status(500).json({ error: 'Failed to fetch memory info' });
	}
});

// ToDo: Refactor to use ModelService
router.get('/models', async (req, res) => {
	try {
		res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
		const [tagsResponse, loadedModelNames] = await Promise.all([
			axios.get(`${config.OLLAMA_API_URL}/tags`),
			ModelService.getLoadedModels()
		]);

		const models = tagsResponse.data.models.map(model => ({
			name: model.name,
			size: Math.round(model.size / 1024 / 1024 / 1024 * 100) / 100,
			isLoaded: loadedModelNames.includes(model.name),
			timestamp: Date.now()
		}));
		res.status(200).json(models);
	} catch (error) {
		console.error('Error fetching models:', error.message);
		res.status(500).json({ error: 'Failed to fetch models' });
	}
});

router.post('/models/load', AuthMiddleware, async (req, res) => {
	const { model } = req.body;
	if (!await AuthService.checkPrivileges(req.user.id))
		return res.status(403).json({ error: 'You do not have privileges to load models' });

	try {
		await ModelService.loadModel(model);
		res.status(200).json({ message: 'Model loaded successfully' });
	} catch (error) {
		console.error('Error loading model:', error.message);
		res.status(500).json({ error: 'Failed to load model' });
	}
});

router.delete('/models/unload', AuthMiddleware, async (req, res) => {
	const { model } = req.body;
	if (!await AuthService.checkPrivileges(req.user.id))
		return res.status(403).json({ error: 'You do not have privileges to unload models' });

	try {
		await ModelService.unloadModel(model);
		res.status(200).json({ message: 'Model unloaded successfully' });
	} catch (error) {
		console.error('Error unloading model:', error.message);
		res.status(500).json({ error: 'Failed to unload model' });
	}
});

// ToDo: Storing favorites?
// ToDo: Search models?

module.exports = router;