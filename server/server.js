const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const config = require('./config/config');
const { connectDatabase } = require('./utils/Database');
const SocketManager = require('./socket/SocketManager');
const apiRouter = require('./routes/api');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');

async function startServer() {
	const app = express();
	const server = http.createServer(app);
	const io = new Server(server, {
		cors: {
			origin: "*",
			methods: ["GET", "POST"],
			credentials: true
		},
		transports: ['websocket', 'polling'],
		cookie: true
	});

	app.use(bodyParser.json());
	app.use(bodyParser.urlencoded({ extended: true }));
	app.use(cookieParser());
	app.set("trust proxy", true);

	app.use('/api', apiRouter);

	await connectDatabase();

	SocketManager.initialize(io);

	server.listen(config.PORT, () => {
		console.log(`Server is running on http://localhost:${config.PORT}`);
	});
}

startServer().catch(console.error);