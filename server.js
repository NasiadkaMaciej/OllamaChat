const express = require('express');
const socketIo = require('socket.io');
const axios = require('axios');
const http = require('http');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);
app.set("trust proxy", true);

const sessions = {}; // Store user sessions

io.on('connection', (socket) => {
	console.log('User connected', socket.id);

	// Initialize session for the user
	sessions[socket.id] = [];
	let response;

	// Handle the prompt from the frontend
	socket.on('sendMessage', async (message) => {
		console.log('Received message:', message);

		// Add user message to session
		sessions[socket.id].push({ role: 'user', content: message });

		// Call Ollama API to generate the chat response
		try {
			response = await axios.post('http://127.0.0.1:11434/api/chat', {
				model: 'qwen2.5-coder:32b-instruct-q8_0',
				messages: sessions[socket.id]
			}, {
				headers: { 'Content-Type': 'application/json' },
				responseType: 'stream'
			});

			// Process the stream and send each word to the frontend
			response.data.on('data', (chunk) => {
				const lines = chunk.toString().split('\n'); // Split chunk by new lines
				lines.forEach((line) => {
					if (line.trim()) {
						try {
							const json = JSON.parse(line);
							if (json.message && json.message.content) {
								console.log('Sent response:', json.message.content)
								socket.emit('receiveMessage', json.message.content ); // Send the word to the frontend
								if (!sessions[socket.id])
									sessions[socket.id] = [];
								sessions[socket.id].push(json.message); // Store assistant response
							}
						} catch (error) {
							console.error('Error parsing JSON:', error);
						}
					}
				});
			});

			// Handle end of stream
			response.data.on('end', () => {
				socket.emit('done'); // Notify that the stream is complete
			});

		} catch (error) {
			console.error('Error during API call:', error);
			socket.emit('error', 'Error generating response');
		}
	});

	socket.on('disconnect', () => {
		console.log('User disconnected', socket.id);
		delete sessions[socket.id]; // Clean up session
	});

	socket.on('stopResponse', () => {
		if (response) response.data.destroy(); // Close the stream
		socket.emit('done');
	});

});

// Start the server
server.listen(3003, () => {
	console.log(`Server is running on http://localhost:${3003}`);
});
