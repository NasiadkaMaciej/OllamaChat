const dotenv = require('dotenv');
dotenv.config();

module.exports = {
	PORT: process.env.PORT || 3003,
	MONGODB_URI: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/OllamaChat',
	OLLAMA_API_URL: process.env.OLLAMA_API_URL || 'http://127.0.0.1:11434/api',
	SESSION_SECRET: process.env.SESSION_SECRET,
	JWT_SECRET: process.env.JWT_SECRET,
	COOKIE_OPTIONS: {
		path: '/',
		httpOnly: true,
		secure: true,
		sameSite: 'strict',
		maxAge: 7 * 24 * 60 * 60 * 1000
	},
	ADMIN_USERNAME: process.env.ADMIN_USERNAME || 'Maciej',
	SESSION_NAME_MODEL: process.env.SESSION_NAME_MODEL || 'llama3.2:latest',
	SENDGRID_API_KEY: process.env.SENDGRID_API_KEY
};