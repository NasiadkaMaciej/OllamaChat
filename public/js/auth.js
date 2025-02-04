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
		document.getElementById('logoutButton').addEventListener('click', () => this.handleLogout());
		document.getElementById('forgotPasswordLink').addEventListener('click', e => this.handleForgotPasswordLink(e));
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

	validateInputsEmail(username, password, email) {
		if (!this.validateInputs(username, password)) return false;
		if (!email) {
			this.ui.showToast('Email is required.');
			return false;
		}
		const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
		if (!emailRegex.test(email)) {
			this.ui.showToast('Please enter a valid email address.');
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
				this.socket.emit('session:load');
			} else this.ui.showToast(data.error || 'Login failed');
		} catch (error) {
			console.error('Login error:', error.message);
			this.ui.showToast('Network error occurred');
		}
	}

	async handleRegister(event) {
		event.preventDefault();
		const username = document.getElementById('regUsername').value.trim();
		const email = document.getElementById('regEmail').value.trim();
		const password = document.getElementById('regPassword').value.trim();
		const confirmPassword = document.getElementById('regConfirmPassword').value.trim();

		console.log(username, email, password, confirmPassword);

		if (!this.validateInputsEmail(username, password, email)) return;
		if (password !== confirmPassword) {
			this.ui.showToast('Passwords do not match!');
			return;
		}

		try {
			const response = await fetch('/api/auth/register', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ username, password, email })
			});

			const data = await response.json();

			if (response.ok) {
				this.ui.showToast('Registration successful! Please check your email to verify your account.', false);
				// Clear registration form
				document.getElementById('regUsername').value = '';
				document.getElementById('regEmail').value = '';
				document.getElementById('regPassword').value = '';
				document.getElementById('regConfirmPassword').value = '';
			} else this.ui.showToast(data.error || 'Registration failed');
		} catch (error) {
			console.error('Registration error:', error.message);
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
			console.error('Logout error:', error.message);
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
			console.error('Auth check failed:', error.message);
			this.ui.showAuth();
		}
	}

	async handleForgotPassword(email) {
		try {
			const response = await fetch('/api/auth/forgot-password', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ email })
			});

			const data = await response.json();

			if (response.ok) this.ui.showToast('Password reset email sent', false);
			else this.ui.showToast(data.error || 'Failed to send reset email');
		} catch (error) {
			console.error('Forgot password error:', error.message);
			this.ui.showToast('Network error occurred');
		}
	}

	async handleForgotPasswordLink(e) {
		e.preventDefault();
		const email = prompt('Enter your email address:');
		if (email) this.handleForgotPassword(email);
	};

}