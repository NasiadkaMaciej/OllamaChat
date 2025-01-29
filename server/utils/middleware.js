const session = require('express-session');
const MongoStore = require('connect-mongo');
const bodyParser = require('body-parser');
const config = require('../config/config');

const sessionMiddleware = session({
	secret: config.SESSION_SECRET,
	resave: false,
	saveUninitialized: true,
	store: MongoStore.create({ mongoUrl: config.MONGODB_URI })
});

function initializeMiddleware(app, io) {
	app.use(bodyParser.json());
	app.use(sessionMiddleware);
	app.set("trust proxy", true);

	io.use((socket, next) => {
		sessionMiddleware(socket.request, socket.request.res || {}, next);
	});
}

module.exports = { initializeMiddleware };