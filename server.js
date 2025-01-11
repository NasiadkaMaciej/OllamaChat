const express = require('express');
const socketIo = require('socket.io');
const axios = require('axios');
const http = require('http');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);
app.set("trust proxy", true);


io.on('connection', (socket) => {
	console.log('User connected');

	// Handle the prompt from the frontend
	socket.on('sendPrompt', async (prompt) => {
		console.log('Received prompt:', prompt);

		// Call Ollama API to generate the response stream
		try {
			const response = await axios.post('http://127.0.0.1:11434/api/generate', {
				model: 'dolphin-mixtral',
				prompt: prompt
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
							if (json.response){
								console.log('Sent response:', json.response)
								socket.emit('receiveWord', json.response); // Send the word to the frontend
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
		console.log('User disconnected');
	});
});

// Start the server
server.listen(3003, () => {
	console.log(`Server is running on http://localhost:${3003}`);
});
