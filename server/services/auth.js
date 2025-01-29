const User = require('../models/user');

async function checkPrivileges(username) {
	return username === 'Maciej';
}

function checkIfLoggedIn(userId, socket) {
	if (!userId) {
		socket.emit('loginFail', 'Not logged in.');
		return false;
	}
	return true;
}

module.exports = {
	checkPrivileges,
	checkIfLoggedIn
};