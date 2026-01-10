export class Chat {
	constructor(socket, ui, modelManager) {
		this.socket = socket;
		this.ui = ui;
		this.outputContainer = this.ui.outputContainer;
		this.wordQueue = [];
		this.isTyping = false;
		this.currentMessageElement = null;
		this.responseInProgress = false;
		this.modelManager = modelManager;
		this.bindEvents();
	}

	bindEvents() { // Set up listeners for buttons and responses from the server
		const promptInput = document.getElementById('prompt');
		// Send message on Enter key
		promptInput.addEventListener('keydown', e => {
			if (e.key === 'Enter' && !e.shiftKey) {
				e.preventDefault();
				this.handleSendMessage();
			}
		});

		this.socket.on('chat:message', (message, done, sessionId) => {
			if (sessionId === this.ui.currentSessionId)
				this.appendMessage('ai', message, done, true);
		});

		this.socket.on('chat:history', messages => {
			this.outputContainer.innerHTML = '';
			messages.forEach(msg => this.appendMessage(msg.role, msg.content));
		});
		document.querySelector('.stopButton').addEventListener('click', () => {
			this.stopCurrentResponse();
		});

		this.socket.on('error', () => {
			this.responseInProgress = false;
			this.isTyping = false;
		});
	}

	// Type words from queue with delay
	async typeNextWord() {
		while (this.wordQueue.length > 0) {
			const word = this.wordQueue.shift();
			for (const char of word) {
				if (!this.currentMessageElement) return;
				this.currentMessageElement.textContent += char;
				// Get current model size from ModelManager
				// ToDo: calculate tokens speed?
				const modelSize = this.modelManager.getCurrentModelSize();
				const timeout = parseInt(modelSize) * 2;
				await new Promise(resolve => setTimeout(resolve, timeout));
			}
		}
		this.isTyping = false;
	}

	stopCurrentResponse() {
		if (this.ui.currentSessionId) {
			this.socket.emit('chat:stop', this.ui.currentSessionId);
			this.isTyping = false;
			this.responseInProgress = false;
			this.wordQueue = [];
			this.currentMessageElement = null;
		}
	}

	appendMessage(role, message, done = false, animate = false) {
		if (done && role === 'ai') {
			this.currentMessageElement = null;
			this.responseInProgress = false;
			return;
		}

		if (!this.currentMessageElement || !this.currentMessageElement.classList.contains(role)) {
			this.currentMessageElement = createElement('div', ['message', role]);
			this.ui.outputContainer.appendChild(this.currentMessageElement);
		}

		if (animate) {
			this.wordQueue.push(message);
			if (!this.isTyping) {
				this.isTyping = true;
				this.typeNextWord();
			}
		} else this.currentMessageElement.textContent += message;
	}

	handleSendMessage() {
		if (this.responseInProgress) return;
		const message = document.getElementById('prompt').value.trim();
		if (!message) return;

		if (!this.ui.currentSessionId)
			this.ui.createNewSession(() => this.sendChatMessage(message));
		else this.sendChatMessage(message);
	}

	sendChatMessage(message) {
		this.responseInProgress = true;
		this.socket.emit('chat:send', message, this.ui.currentSessionId, modelManager.currentModel);
		this.appendMessage('user', message);
		document.getElementById('prompt').value = '';
	}
}