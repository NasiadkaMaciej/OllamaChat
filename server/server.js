const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const { initializeMiddleware } = require('./utils/middleware');
const { initializeSocketHandlers } = require('./socket/handlers.js');
const { connectDatabase } = require('./utils/database');
const apiRoutes = require('./routes/api');
const config = require('./config/config');

async function startServer() {
	const app = express();
	const server = http.createServer(app);
	const io = socketIo(server);

	await connectDatabase();

	initializeMiddleware(app, io);
	app.use('/api', apiRoutes);
	initializeSocketHandlers(io);

	server.listen(config.PORT, () => {
		console.log(`WebSocket server is running on http://localhost:${config.PORT}`);
	});
}

startServer().catch(console.error);