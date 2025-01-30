const socket = io();

// Chat elements
const promptInput = document.getElementById('prompt');
const outputContainer = document.getElementById('output');
const sessionsContainer = document.getElementById('sessions');
const chatContainer = document.getElementById('chat-container');

// Authentication elements
const passwordInput = document.getElementById('password');
const usernameInput = document.getElementById('username');
const authContainer = document.getElementById('auth-container');
const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');

// Global variables
let wordQueue = [];
let isTyping = false;
let currentMessageElement = null;
let currentSessionId = null;
let responseInProgress = false;

// Type words from queue with delay
async function typeNextWord() {
	while (wordQueue.length > 0) {
		const word = wordQueue.shift();
		for (const char of word) {
			if (!currentMessageElement) return;
			currentMessageElement.textContent += char;
			// ToDo: Check how it behaves when GPU arrives
			const timeout = parseInt(currentModelSize) * 2;
			console.log(timeout);
			await new Promise(resolve => setTimeout(resolve, timeout));
		}
	}
	isTyping = false;
}

// Stop the current AI response
function stopCurrentResponse() {
	if (currentSessionId) {
		socket.emit('chat:stop', currentSessionId);
		isTyping = false;
		responseInProgress = false;
		wordQueue = [];
		currentMessageElement = null;
	}
}

// Clear chat output
function clearOutput() {
	outputContainer.innerHTML = '';
	isTyping = false;
	currentMessageElement = null;
	currentSessionId = null;
	stopCurrentResponse();
}

// Validate username/password inputs
function validateInputs(username, password) {
	if (!username || !password) {
		showToast('Username and password are required.');
		return false;
	}
	return true;
}

// Append a chat message to the output
function appendMessage(role, message, done = false, animate = false) {
	if (done && role === 'ai') { // If done, create new bubble
		currentMessageElement = null;
		responseInProgress = false;
		return;
	}

	// If no message element exists, or the role has changed, create a new message element
	if (!currentMessageElement || !currentMessageElement.classList.contains(role)) {
		currentMessageElement = createElement('div', ['message', role]);
		outputContainer.appendChild(currentMessageElement);
	}
	if (animate) {
		wordQueue.push(message);
		if (!isTyping) {
			isTyping = true;
			typeNextWord();
		}
	} else currentMessageElement.textContent += message;
	socket.emit('loadSessions');
}

// Render a session item in the sessions container
function renderSessionItem(sessionId, sessionName) {
	const sessionElement = createElement('div', ['session-item'], '', { 'data-session-id': sessionId });

	const sessionNameElement = createElement('span', ['session-name'], sessionName);
	sessionElement.appendChild(sessionNameElement);

	const buttonsWrapper = createElement('div', ['buttons-wrapper']);

	const regenerateButton = createElement('button', ['regenerate-button'], 'Renew');
	regenerateButton.title = 'Regenerate title';
	regenerateButton.addEventListener('click', (event) => {
		event.stopPropagation();
		socket.emit('session:regenerateTitle', sessionId);
	});
	buttonsWrapper.appendChild(regenerateButton);

	const editButton = createElement('button', ['edit-button'], 'Edit');
	editButton.addEventListener('click', (event) => {
		event.stopPropagation();
		const newName = prompt('Enter new session name:', sessionName);
		if (newName) socket.emit('session:rename', sessionId, newName);
	});
	buttonsWrapper.appendChild(editButton);

	const deleteButton = createElement('button', ['delete-button'], 'Delete');
	deleteButton.addEventListener('click', (event) => {
		event.stopPropagation();
		socket.emit('session:delete', sessionId);
		if (currentSessionId === sessionId) {
			stopCurrentResponse();
			outputContainer.innerHTML = '';
			currentSessionId = null;
		}
	});
	buttonsWrapper.appendChild(deleteButton);

	sessionElement.appendChild(buttonsWrapper);
	sessionElement.addEventListener('click', () => openSession(sessionId));
	sessionsContainer.appendChild(sessionElement);
}

// Create a new session
function createNewSession(callback) {
	stopCurrentResponse();
	currentSessionId = null;
	outputContainer.innerHTML = '';
	deleteCookie('lastOpenedSession');
	isTyping = false;
	socket.emit('session:create');
	socket.once('session:created', (sessionId) => {
		if (!sessionId) {
			showToast('Failed to create session.');
			return;
		}
		currentSessionId = sessionId;
		setCookie('lastOpenedSession', sessionId);
		callback();
	});
}

// Open session
function openSession(sessionId) {
	stopCurrentResponse();
	currentSessionId = sessionId;
	setCookie('lastOpenedSession', sessionId);
	socket.emit('session:open', sessionId);

	// Highlight active session
	const sessionItems = document.querySelectorAll('.session-item');
	sessionItems.forEach(item => item.classList.remove('active'));
	const activeSessionItem = document.querySelector(`.session-item[data-session-id="${sessionId}"]`);
	if (activeSessionItem) activeSessionItem.classList.add('active');
}

// Search sessions
function searchSessions() {
	const query = document.getElementById('searchInput').value.trim();
	if (query) socket.emit('session:search', query);
	else socket.emit('session:load');
}

// Send message and optionally create new session
function handleSendMessage() {
	if (responseInProgress) return;
	const message = promptInput.value.trim();
	if (!message) return;
	if (!currentSessionId) createNewSession(() => sendChatMessage(message));
	else sendChatMessage(message);
}

// Send chat message and append to output
function sendChatMessage(message) {
	responseInProgress = true;
	socket.emit('chat:send', message, currentSessionId, currentModel);
	appendMessage('user', message);
	promptInput.value = '';
}

// Login form submit
loginForm.addEventListener('submit', (event) => {
	event.preventDefault();
	const username = usernameInput.value.trim();
	const password = passwordInput.value.trim();
	if (!validateInputs(username, password)) return;
	socket.emit('auth:login', { username, password });
});

// Register form submit
registerForm.addEventListener('submit', (event) => {
	event.preventDefault();
	const username = document.getElementById('regUsername').value.trim();
	const password = document.getElementById('regPassword').value.trim();
	const confirmPassword = document.getElementById('regConfirmPassword').value.trim();
	if (!validateInputs(username, password)) return;
	if (password !== confirmPassword) {
		showToast('Passwords do not match!');
		return;
	}
	socket.emit('auth:register', { username, password });
});

// Send message on enter key
promptInput.addEventListener('keydown', (event) => {
	if (event.key === 'Enter' && !event.shiftKey) {
		event.preventDefault();
		handleSendMessage();
	}
});

// Search on search input change
document.getElementById('searchInput').addEventListener('input', () => {
	searchSessions();
});

// Get AI messages from server
socket.on('chat:message', (message, done, sessionId) => {
	if (sessionId !== currentSessionId) return;
	appendMessage('ai', message, done, true);
	setCookie('lastOpenedSession', sessionId);
});

// List sessions
socket.on('session:list', (sessions) => {
	sessionsContainer.innerHTML = '';
	sessions.forEach((s) => renderSessionItem(s.id, s.name));

	const lastOpenedSession = getCookie('lastOpenedSession');
	if (lastOpenedSession) { // Open last opened session, if it doesn't exist, delete cookie
		const sessionExists = sessions.some(s => s.id === lastOpenedSession);
		if (sessionExists) openSession(lastOpenedSession);
		else deleteCookie('lastOpenedSession');
	}
});

// Load chat messages
socket.on('chat:history', (messages) => {
	outputContainer.innerHTML = '';
	messages.forEach(msg => appendMessage(msg.role, msg.content));
	isTyping = false;
	currentMessageElement = null;
});

socket.on('session:created', (sessionId, sessionName) => {
	currentSessionId = sessionId;
	socket.emit('session:load');
	renderSessionItem(sessionId, sessionName);
});

// Authentication handlers
socket.on('auth:loginSuccess', () => {
	setCookie('username', document.getElementById('username').value);
	authContainer.style.display = 'none';
	chatContainer.style.display = 'flex';
	socket.emit('session:load');
});

socket.on('auth:success', (msg) => showToast(msg, false));
socket.on('auth:failed', (msg) => showToast(msg));

socket.on('error', (message) => {
	showToast(message);
});

function showToast(message, error = true) {
	const toast = document.createElement('div');
	toast.className = 'toast';
	if (error) toast.classList.add('error');
	toast.textContent = message;
	document.body.appendChild(toast);
	setTimeout(() => {
		toast.remove();
	}, 5000);
}