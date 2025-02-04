module.exports = {
	PORT: 3003,
	MONGODB_URI: 'mongodb://127.0.0.1:27017/OllamaChat',
	OLLAMA_API_URL: 'http://127.0.0.1:11434/api',
	SESSION_SECRET: 'VerySecretKey',
	JWT_SECRET: 'VerySecretKey',
	COOKIE_OPTIONS: {
		path: '/',
		httpOnly: true,
		secure: true,
		sameSite: 'strict',
		maxAge: 7 * 24 * 60 * 60 * 1000
	},
	ADMIN_USERNAME: 'Maciej',
	SESSION_NAME_MODEL: 'llama3.2:latest'
};