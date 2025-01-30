import { Auth } from './auth.js';
import { Chat } from './chat.js';
import { SessionManager } from './session.js';
import { UI } from './ui.js';
import { ModelManager } from './models.js';

class App {
	constructor() {
		window.app = this;
		this.socket = io();
		this.ui = new UI(this.socket);
		this.auth = new Auth(this.socket, this.ui);
		this.sessionManager = new SessionManager(this.socket, this.ui);
		this.modelManager = new ModelManager(this.socket, this.ui);
		this.chat = new Chat(this.socket, this.ui, this.modelManager);

		window.modelManager = this.modelManager;

		this.socket.on('error', message => this.ui.showToast(message));

	}
}

document.addEventListener('DOMContentLoaded', () => {
	new App();
});