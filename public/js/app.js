import { Auth } from './auth.js';
import { Chat } from './chat.js';
import { SessionManager } from './session.js';
import { UI } from './ui.js';
import { ModelManager } from './models.js';

// Main application class that orchestrates UI, authentication, sessions, models and chat functionality
class App {
	constructor() {
		window.app = this;
		this.socket = null;
		this.ui = new UI(null);
		this.auth = new Auth(this.ui, this.onAuthSuccess.bind(this));
		this.sessionManager = null;
		this.modelManager = null;
		this.chat = null;
	}

	onAuthSuccess() {
		this.socket = io();
		this.ui.socket = this.socket;
		this.modelManager = new ModelManager(this.socket, this.ui);
		window.modelManager = this.modelManager;
		this.sessionManager = new SessionManager(this.socket, this.ui);
		this.chat = new Chat(this.socket, this.ui, this.modelManager);
		this.socket.on('error', message => this.ui.showToast(message));
		// Immediately load session list so conversations are visible after login
		this.socket.emit('session:load');
	}
}

document.addEventListener('DOMContentLoaded', () => {
	new App();
});