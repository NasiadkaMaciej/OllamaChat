const mongoose = require('mongoose');
const config = require('../config/config');

async function connectDatabase() {
	try {
		await mongoose.connect(config.MONGODB_URI);
		console.log('Connected to MongoDB');
	} catch (error) {
		console.error('MongoDB connection error:', error.message);
		process.exit(1);
	}
}

module.exports = { connectDatabase };