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
			await new Promise(resolve => setTimeout(resolve, 50));
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
		alert("Username and password are required.");
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
		currentMessageElement = document.createElement('div');
		currentMessageElement.classList.add('message', role);
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
	const sessionElement = document.createElement('div');
	sessionElement.classList.add('session-item');

	const sessionNameElement = document.createElement('span');
	sessionNameElement.textContent = sessionName;
	sessionNameElement.classList.add('session-name');
	sessionElement.appendChild(sessionNameElement);

	const buttonsWrapper = document.createElement('div');
	buttonsWrapper.classList.add('buttons-wrapper');

	const regenerateButton = document.createElement('button');
	regenerateButton.textContent = 'Renew';
	regenerateButton.title = 'Regenerate title';
	regenerateButton.classList.add('regenerate-button');
	regenerateButton.addEventListener('click', (event) => {
		event.stopPropagation();
		socket.emit('session:regenerateTitle', sessionId);
	});
	buttonsWrapper.appendChild(regenerateButton);

	const editButton = document.createElement('button');
	editButton.textContent = 'Edit';
	editButton.classList.add('edit-button');
	editButton.addEventListener('click', (event) => {
		event.stopPropagation();
		const newName = prompt('Enter new session name:', sessionName);
		if (newName) socket.emit('session:rename', sessionId, newName);
	});
	buttonsWrapper.appendChild(editButton);

	const deleteButton = document.createElement('button');
	deleteButton.textContent = 'Delete';
	deleteButton.classList.add('delete-button');
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
	isTyping = false;
	socket.emit('session:create');
	socket.once('session:created', (sessionId) => {
		currentSessionId = sessionId;
		callback();
	});
}

// Open session
function openSession(sessionId) {
	stopCurrentResponse();
	currentSessionId = sessionId;
	socket.emit('session:open', sessionId);
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
		alert("Passwords do not match!");
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
});

// List sessions
socket.on('session:list', (sessions) => {
	sessionsContainer.innerHTML = '';
	sessions.forEach((s) => renderSessionItem(s.id, s.name));
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
	renderSessionItem(sessionId, sessionName);
});

// Authentication handlers
socket.on('auth:loginSuccess', () => {
	authContainer.style.display = 'none';
	chatContainer.style.display = 'flex';
	socket.emit('session:load');
});

socket.on('auth:success', (msg) => alert(msg));
socket.on('auth:failed', (msg) => alert(msg));

// ToDo: Some error toasts