const socket = io();

const promptInput = document.getElementById('prompt');
const outputContainer = document.getElementById('output');

// Queue to hold words
let wordQueue = [];
let isTyping = false;

function sendPrompt() {
	const prompt = promptInput.value.trim();
	if (prompt) {
		socket.emit('sendPrompt', prompt);
		outputContainer.textContent = '';
	}
};

// Function to type a word from the queue
async function typeNextWord() {
	// While there are words in the queue, type them one by one
	while (wordQueue.length > 0) {
		const word = wordQueue.shift(); // Get the next word from the queue
		let currentText = outputContainer.textContent; // Start with the existing text

		for (let char of word) {
			currentText += char; // Append the character to the current text
			outputContainer.textContent = currentText; // Update the text content
			await new Promise(resolve => setTimeout(resolve, 40));
		}
	}
	// Mark typing as finished
	isTyping = false;
}

// Listen for words from the backend and add them to the queue
socket.on('receiveWord', (word) => {
	// Add the word to the queue
	wordQueue.push(word);

	// If we're not currently typing, start typing the next word in the queue
	if (!isTyping) {
		isTyping = true;
		typeNextWord(); // Start typing the words from the queue
	}
});

// Handle stream completion
socket.on('done', () => {
	promptInput.value = '';
});

// Handle errors
socket.on('error', (errorMessage) => {
	outputContainer.textContent = `Error: ${errorMessage}`;
});

