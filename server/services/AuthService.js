const bcrypt = require('bcrypt');
const User = require('../models/User');

class AuthService {
	static async register(username, password) {
		if (!username || !password) throw new Error('Username and password are required');

		const existingUser = await User.findOne({ username });
		if (existingUser) throw new Error('Username already taken');

		const hashedPassword = await bcrypt.hash(password, 10);
		return await User.create({ username, password: hashedPassword });
	}

	static async login(username, password) {
		if (!username || !password) throw new Error('Username and password are required');

		const user = await User.findOne({ username });
		if (!user) throw new Error('Invalid credentials');

		const isValid = await bcrypt.compare(password, user.password);
		if (!isValid) throw new Error('Invalid credentials');

		return { // Not just return user, to avoid sending password hash
			_id: user._id,
			username: user.username
		};
	}

	static async checkPrivileges(username) {
		return username === 'Maciej';
	}
}

module.exports = AuthService;