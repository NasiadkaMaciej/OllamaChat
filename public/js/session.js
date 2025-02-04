export class SessionManager {
	constructor(socket, ui) {
		this.socket = socket;
		this.ui = ui;
		this.bindEvents();
	}

	bindEvents() {
		document.getElementById('searchInput').addEventListener('input', () => {
			this.searchSessions();
		});

		this.socket.on('session:list', sessions => {
			this.ui.renderSessions(sessions);
			// Keep current session highlighted
			if (this.ui.currentSessionId) this.ui.highlightActiveSession(this.ui.currentSessionId);
		});

		this.socket.on('session:created', (sessionId, sessionName) => {
			this.ui.currentSessionId = sessionId;
			this.socket.emit('session:load');
			this.ui.renderSessionItem(sessionId, sessionName);
			this.ui.highlightActiveSession(sessionId);
		});
	}

	searchSessions() {
		const query = document.getElementById('searchInput').value.trim();
		this.socket.emit(query ? 'session:search' : 'session:load', query);
	}
}