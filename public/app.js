const socket = io();

const promptInput = document.getElementById('prompt');
const outputContainer = document.getElementById('output');

// Queue to hold words to be typed
let wordQueue = [];
let isTyping = false;

let currentMessageElement = null;

function sendMessage() {
	const message = promptInput.value.trim();
	if (message) {
		socket.emit('sendMessage', message);
		appendMessage('user', message);
		promptInput.value = '';
	}
}

function appendMessage(role, message) {
	if (role === 'ai') {
		// Add the word to the queue
		wordQueue.push(message);
		// If not currently typing, start typing the next word in the queue
		if (!isTyping) {
			isTyping = true;
			typeNextWord(); // Start typing the words from the queue

		}
	} else if (role === 'user') {
		const messageElement = document.createElement('div');
		messageElement.classList.add('message', role);
		messageElement.textContent = message;
		outputContainer.appendChild(messageElement);
	}
	outputContainer.scrollTop = outputContainer.scrollHeight;
}

// Function to type a word from the queue
async function typeNextWord() {
	// While there are words in the queue, type them one by one
	while (wordQueue.length > 0) {
		const word = wordQueue.shift(); // Get the next word from the queue
		let currentText = currentMessageElement ? currentMessageElement.textContent : ''; // Start with the existing text

		for (let char of word) {
			currentText += char; // Append the character to the current text
			if (!currentMessageElement) {
				currentMessageElement = document.createElement('div');
				currentMessageElement.classList.add('message', 'ai');
				outputContainer.appendChild(currentMessageElement);
			}
			currentMessageElement.textContent = currentText; // Update the text content
			await new Promise(resolve => setTimeout(resolve, 40));
		}
	}
	// Mark typing as finished
	isTyping = false;
}

// Listen for words from the backend and add them to the queue
socket.on('receiveMessage', (message) => {
	appendMessage('ai', message);
});

// Handle stream completion
socket.on('done', () => {
	promptInput.value = '';
	currentMessageElement = null;
});

// Handle errors
socket.on('error', (errorMessage) => {
	outputContainer.textContent = `Error: ${errorMessage}`;
});

// Listen for the Enter key press to send the message
promptInput.addEventListener('keydown', (event) => {
	if (event.key === 'Enter' && !event.shiftKey) {
		event.preventDefault(); // Prevent newline in the input)
		sendMessage();
	}
});

function stopResponse() {
	socket.emit('stopResponse');
}