export class Auth {
    constructor(socket, ui) {
        this.socket = socket;
        this.ui = ui;
        this.bindEvents();
    }

    bindEvents() { // Set up listeners for buttons and responses from the server
        document.getElementById('loginForm').addEventListener('submit', e => this.handleLogin(e));
        document.getElementById('registerForm').addEventListener('submit', e => this.handleRegister(e));

        this.socket.on('auth:loginSuccess', () => this.onLoginSuccess());
        this.socket.on('auth:success', msg => this.ui.showToast(msg, false));
        this.socket.on('auth:failed', msg => this.ui.showToast(msg, true));
    }

    validateInputs(username, password) {
        if (!username || !password) {
            this.ui.showToast('Username and password are required.');
            return false;
        }
        return true;
    }

    handleLogin(event) {
        event.preventDefault();
        const username = document.getElementById('username').value.trim();
        const password = document.getElementById('password').value.trim();
        if (!this.validateInputs(username, password)) return;
        this.socket.emit('auth:login', { username, password });
    }

    handleRegister(event) {
        event.preventDefault();
        const username = document.getElementById('regUsername').value.trim();
        const password = document.getElementById('regPassword').value.trim();
        const confirmPassword = document.getElementById('regConfirmPassword').value.trim();
        
        if (!this.validateInputs(username, password)) return;
        if (password !== confirmPassword) {
            this.ui.showToast('Passwords do not match!');
            return;
        }
        this.socket.emit('auth:register', { username, password });
    }

    onLoginSuccess() {
		// ToDo: Correct session handling
        const username = document.getElementById('username').value;
        setCookie('username', username);
        this.ui.showChat();
        this.socket.emit('session:load');
    }
}