export class Auth {
	constructor(socket, ui) {
		this.socket = socket;
		this.ui = ui;
		this.bindEvents();
		this.checkAuthState();
	}

	bindEvents() { // Set up listeners for forms
		document.getElementById('loginForm').addEventListener('submit', e => this.handleLogin(e));
		document.getElementById('registerForm').addEventListener('submit', e => this.handleRegister(e));
		document.querySelector('.logoutButton').addEventListener('click', () => this.handleLogout());
	}

	validateInputs(username, password) {
		if (!username || !password) {
			this.ui.showToast('Username and password are required.');
			return false;
		}
		if (password.length < 8) {
			this.ui.showToast('Password must be at least 8 characters long');
			return false;
		}
		return true;
	}


	async handleLogin(event) {
		event.preventDefault();
		const username = document.getElementById('username').value.trim();
		const password = document.getElementById('password').value.trim();
		if (!this.validateInputs(username, password)) return;

		try {
			const response = await fetch('/api/auth/login', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ username, password }),
				credentials: 'include'
			});

			const data = await response.json();

			if (response.ok) {
				setCookie('username', data.user.username);
				this.ui.showChat();
				if (!this.socket.connected) this.socket.connect();
				await window.modelManager.initializeModel();
			} else this.ui.showToast(data.error || 'Login failed');
		} catch (error) {
			console.error('Login error:', error);
			this.ui.showToast('Network error occurred');
		}
	}

	async handleRegister(event) {
		event.preventDefault();
		const username = document.getElementById('regUsername').value.trim();
		const password = document.getElementById('regPassword').value.trim();
		const confirmPassword = document.getElementById('regConfirmPassword').value.trim();

		if (!this.validateInputs(username, password)) return;
		if (password !== confirmPassword) {
			this.ui.showToast('Passwords do not match!');
			return;
		}

		try {
			const response = await fetch('/api/auth/register', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ username, password })
			});

			const data = await response.json();

			if (response.ok) {
				this.ui.showToast('Registration successful! Please log in', false);
				// Clear registration form
				document.getElementById('regUsername').value = '';
				document.getElementById('regPassword').value = '';
				document.getElementById('regConfirmPassword').value = '';
			} else this.ui.showToast(data.error || 'Registration failed');
		} catch (error) {
			console.error('Registration error:', error);
			this.ui.showToast('Network error occurred');
		}
	}

	async handleLogout() {
		try {
			const response = await fetch('/api/auth/logout', {
				method: 'POST',
				credentials: 'include'
			});

			if (response.ok) {
				deleteCookie('token');
				deleteCookie('username');
				window.location.reload();
			}
		} catch (error) {
			console.error('Logout error:', error);
			this.ui.showToast('Logout failed');
		}
	}

	async checkAuthState() {
		try {
			const response = await fetch('/api/auth/verify', {
				credentials: 'include'
			});

			const data = await response.json();

			if (data.authenticated) {
				setCookie('username', data.user.username);
				this.ui.showChat();
				this.socket.emit('session:load');
			} else this.ui.showAuth();
		} catch (error) {
			console.error('Auth check failed:', error);
			this.ui.showAuth();
		}
	}

	async getInitialSessions() {
		return new Promise((resolve) => {
			const timeout = setTimeout(() => resolve([]), 5000); // 5s timeout

			this.socket.once('session:list', (sessions) => {
				clearTimeout(timeout);
				resolve(sessions);
			});

			this.socket.emit('session:load');
		});
	}

}