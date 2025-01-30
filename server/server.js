const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const config = require('./config/config');
const { connectDatabase } = require('./utils/Database');
const SocketManager = require('./socket/SocketManager');
const apiRouter = require('./routes/api');
const { initializeMiddleware } = require('./utils/middleware');

async function startServer() {
	const app = express();
	const server = http.createServer(app);
    const io = new Server(server, {
        transports: ['websocket', 'polling'],
        cookie: true
    });

	initializeMiddleware(app, io);

	app.use('/api', apiRouter);

	await connectDatabase();

	SocketManager.initialize(io);

	server.listen(config.PORT, () => {
		console.log(`Server is running on http://localhost:${config.PORT}`);
	});
}

startServer().catch(console.error);