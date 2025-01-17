const socket = io();

const promptInput = document.getElementById('prompt');
const outputContainer = document.getElementById('output');
const sessionsContainer = document.getElementById('sessions');

// Queue to hold words to be typed
let wordQueue = [];
let isTyping = false;
let currentMessageElement = null;
let currentSessionId = null;
let responseInProgress = false;

// Get userId
function registerUser() {
	// ToDo: Implement user registration
	let userId = localStorage.getItem('userId');
	if (!userId) {
		userId = `user_${Date.now()}`;
		localStorage.setItem('userId', userId);
	}
	// Create user and load sessions
	socket.emit('registerUser', userId);
}


function sendMessage() {
	if (responseInProgress) return;

	const message = promptInput.value.trim();
	if (message) {
		if (!currentSessionId)
			startSession(() => sendUserMessage(message));
		else sendUserMessage(message);
	}
}

function sendUserMessage(message) {
	responseInProgress = true;
	socket.emit('sendMessage', message, currentSessionId);
	appendMessage('user', message);
	promptInput.value = '';
}

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
	outputContainer.scrollTop = outputContainer.scrollHeight;
}

// Function to type a word from the queue
async function typeNextWord() {
	while (wordQueue.length > 0) {
		const word = wordQueue.shift();
		for (const char of word) {
			if (!currentMessageElement) return;
			currentMessageElement.textContent += char;
			// ToDo: Calculate incoming word speed and adjust timeout
			await new Promise(resolve => setTimeout(resolve, 40));
		}
	}
	isTyping = false;
}

// Append message from current session
socket.on('receiveMessage', (message, done, sessionId) => {
	if (sessionId !== currentSessionId) return;
	appendMessage('ai', message, done, true);
});

socket.on('loadSessions', (sessions) => {
	sessionsContainer.innerHTML = '';
	sessions.forEach(addSessionToUI);
});

// Load messages from session
socket.on('loadMessages', (messages) => {
	outputContainer.innerHTML = '';
	messages.forEach(msg => appendMessage(msg.role, msg.content));
	isTyping = false;
	currentMessageElement = null;
});

// Get session id and load
socket.on('sessionStarted', (sessionId) => {
	currentSessionId = sessionId;
	addSessionToUI(sessionId);
});

promptInput.addEventListener('keydown', (event) => {
	if (event.key === 'Enter' && !event.shiftKey) {
		event.preventDefault();
		sendMessage();
	}
});

function startSession(callback) {
	stopResponse();
	currentSessionId = null;
	outputContainer.innerHTML = '';
	isTyping = false;
	socket.emit('startSession');
	socket.once('sessionStarted', (sessionId) => {
		currentSessionId = sessionId;
		callback();
	});
}

function addSessionToUI(sessionId) {
	const sessionElement = document.createElement('div');
	sessionElement.classList.add('session-item');

	const sessionNameElement = document.createElement('span');
	sessionNameElement.textContent = sessionId;
	sessionNameElement.classList.add('session-name');
	sessionElement.appendChild(sessionNameElement);

	// ToDo: Add option to edit session name
	const editButton = document.createElement('button');
	editButton.textContent = 'Edit';
	editButton.classList.add('edit-button');
	editButton.addEventListener('click', (event) => {
		event.stopPropagation();
	});
	sessionElement.appendChild(editButton);

	const deleteButton = document.createElement('button');
	deleteButton.textContent = 'Delete';
	deleteButton.classList.add('delete-button');
	deleteButton.addEventListener('click', (event) => {
		event.stopPropagation();
		socket.emit('deleteSession', sessionId);
		if (currentSessionId === sessionId) {
			stopResponse();
			outputContainer.innerHTML = '';
			currentSessionId = null;
		}
	});
	sessionElement.appendChild(deleteButton);

	sessionElement.addEventListener('click', () => loadSession(sessionId));
	sessionsContainer.appendChild(sessionElement);
}

function loadSession(sessionId) {
	// ToDo: When swtiching sessions, do not stop generating, just don't send it
	// ToDo: When connected to old session, listen to word stream
	stopResponse();
	currentSessionId = sessionId;
	socket.emit('loadSession', sessionId);
}

function stopResponse() {
	socket.emit('stopResponse', currentSessionId);
	isTyping = false;
	responseInProgress = false;
	wordQueue = [];
	currentMessageElement = null;
}

registerUser();
