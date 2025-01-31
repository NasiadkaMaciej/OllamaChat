export class UI {
	constructor(socket) {
		this.socket = socket;
		this.currentSessionId = null;
		this.outputContainer = document.getElementById('output');
		this.sessionsContainer = document.getElementById('sessions');
		this.bindButtons();
	}

	showChat() {
		document.getElementById('auth-container').style.display = 'none';
		document.getElementById('chat-container').style.display = 'flex';
	}

	showToast(message, error = true) {
		const toast = document.createElement('div');
		toast.className = `toast ${error ? 'error' : ''}`;
		toast.textContent = message;
		document.body.appendChild(toast);
		setTimeout(() => toast.remove(), 5000);
	}

	renderSessions(sessions) {
		this.sessionsContainer.innerHTML = '';
		sessions.forEach(s => this.renderSessionItem(s.id, s.name));
	}

	renderSessionItem(sessionId, sessionName) {
		const sessionElement = createElement('div', ['session-item'], '', { 'data-session-id': sessionId });
		sessionElement.innerHTML = `
            <span class="session-name">${sessionName}</span>
            <div class="buttons-wrapper">
                <button class="regenerate-button" title="Regenerate title">Renew</button>
                <button class="edit-button">Edit</button>
                <button class="delete-button">Delete</button>
            </div>
        `;

		this.bindSessionEvents(sessionElement, sessionId, sessionName);
		this.sessionsContainer.appendChild(sessionElement);
	}

	bindSessionEvents(element, sessionId, sessionName) {
		element.querySelector('.regenerate-button').onclick = e => {
			e.stopPropagation();
			this.socket.emit('session:regenerateTitle', sessionId);
		};

		element.querySelector('.edit-button').onclick = e => {
			e.stopPropagation();
			const newName = prompt('Enter new session name:', sessionName);
			if (newName) this.socket.emit('session:rename', sessionId, newName);
		};

		element.querySelector('.delete-button').onclick = e => {
			e.stopPropagation();
			this.socket.emit('session:delete', sessionId);
			if (this.currentSessionId === sessionId)
				this.clearSession();
		};

		element.onclick = () => this.openSession(sessionId);
	}

	openSession(sessionId) {
		window.app.chat.stopCurrentResponse()
		this.currentSessionId = sessionId;
		setCookie('lastOpenedSession', sessionId);
		this.socket.emit('session:open', sessionId);
		this.highlightActiveSession(sessionId);
	}

	highlightActiveSession(sessionId) {
		const sessionItems = document.querySelectorAll('.session-item');
		sessionItems.forEach(item => item.classList.remove('active'));
		if (sessionId) {
			const activeItem = document.querySelector(`.session-item[data-session-id="${sessionId}"]`);
			if (activeItem) activeItem.classList.add('active');
		}
	}

	clearSession() {
		// Stop any active response before clearing
		window.app.chat.stopCurrentResponse();
		this.currentSessionId = null;
		this.outputContainer.innerHTML = '';
		this.highlightActiveSession(null);
		deleteCookie('lastOpenedSession');
	}

	createNewSession(callback) {
		window.app.chat.stopCurrentResponse();
		this.clearSession();
		this.socket.emit('session:create');
		this.socket.once('session:created', sessionId => {
			if (!sessionId) {
				this.showToast('Failed to create session.');
				return;
			}
			this.currentSessionId = sessionId;
			setCookie('lastOpenedSession', sessionId);
			callback();
		});
	}
	bindButtons() {
		// Clear button
		document.querySelector('.clearButton').addEventListener('click', () => {
			window.app.chat.stopCurrentResponse();
			this.clearSession();
			this.outputContainer.innerHTML = '';
		});

		// Send button
		document.querySelector('.sendButton').addEventListener('click', () => {
			window.app.chat.handleSendMessage();
		});

		// Stop button  
		document.querySelector('.stopButton').addEventListener('click', () => {
			window.app.chat.stopCurrentResponse();
		});
	}
}