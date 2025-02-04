const config = require('../config/config');
const jwt = require('jsonwebtoken');

const authMiddleware = (req, res, next) => {
	const token = req.cookies.token;

	if (!token) return res.status(401).json({ error: 'No token provided' });

	try {
		req.user = jwt.verify(token, config.JWT_SECRET);
		next();
	} catch (error) {
		res.clearCookie('token');
		return res.status(401).json({ error: 'Invalid token' });
	}
};

module.exports = { authMiddleware };