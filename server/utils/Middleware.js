const jwt = require('jsonwebtoken');
const config = require('../config/config');

const AuthMiddleware = async (req, res, next) => {
	const token = req.cookies.token;
	if (!token) return res.status(401).json({ error: 'No token provided' });

	try {
		req.user = jwt.verify(token, config.JWT_SECRET);


		const decoded = jwt.verify(token, config.JWT_SECRET);
		if (!decoded || !decoded.id)
			return res.status(401).json({ error: 'Invalid token' });

		req.user = decoded;
		next();
	} catch (error) {
		console.error('Auth middleware error:', error.message);
		return res.status(401).json({ error: 'Authentication failed' });
	}
};

module.exports = AuthMiddleware;