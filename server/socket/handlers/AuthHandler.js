const AuthService = require('../../services/AuthService');

class AuthHandler {
	static async handleLogin(socket, { username, password }) {
		try {
			const user = await AuthService.login(username, password);
			if (user) {
				socket.request.session.user = user._id;
				socket.request.session.save();
				socket.emit('auth:loginSuccess');
			}
		} catch (error) {
			console.error('Error in handleLogin:', error);
			socket.emit('error', error.message);
		}
	}

	static async handleRegister(socket, { username, password }) {
		try {
			await AuthService.register(username, password);
			socket.emit('auth:success', 'Registration successful! Please log in');
		} catch (error) {
			console.error('Error in handleRegister:', error);
			socket.emit('auth:failed', error.message);
		}
	}

	// ToDo: Add logout
}

module.exports = AuthHandler;