# Ollama Chat

Ollama Chat is a full-featured web application for chatting with self-hosted Ollama AI models. It provides a clean, intuitive interface for interacting with large language models while offering advanced features like conversation management, model switching, and memory monitoring.

| Chat Screen | Login Page |
| ------------------------------------------------- | ------------------------------------------------- |
| ![](https://nasiadka.pl/projects/OllamaChat/default.png) | ![](https://nasiadka.pl/projects/OllamaChat/login.png) |

## Features

- **Self-hosted Models**: Connect to locally running Ollama models
- **User Authentication**: Secure login/registration system with email verification
- **Session Management**: Create, rename, search, and delete conversation sessions
- **AI Generated Session Names**: Automatically create contextual session names from conversation content
- **Real-time Chat**: Stream AI responses with typing animation
- **Memory Monitoring**: Track system memory usage during model inference
- **Model Management**: Load/unload models dynamically (admin only)
- **Password Recovery**: Reset passwords via email verification

## How does it work?

1. **Create an Account**: Register with email verification or login to an existing account
2. **Select or Load Models**: Choose from available models or load new ones (admin privileges required)
3. **Start Conversations**: Create new sessions to chat with the selected AI model
4. **Manage Sessions**: Search, rename, or delete previous conversations
5. **Real-time Responses**: Experience streaming AI responses with natural typing animations

## Technical Architecture

The application uses:
- **Backend**: Node.js with Express.js server
- **Real-time Communication**: Socket.IO for bidirectional chat
- **Database**: MongoDB for storing user accounts and chat sessions
- **Authentication**: JWT tokens with secure HTTP-only cookies
- **Email**: Sendgrid integration for verification and password reset
- **Frontend**: Vanilla JavaScript with modular components and SCSS styling

## Setup Instructions

### Prerequisites
- Node.js and npm
- MongoDB database
- Ollama running locally or on accessible server

### Installation

1. Clone the repository
2. Install server dependencies:
   ```bash
   cd server
   npm install
   ```

3. Create a `.env` file in the server directory with the following variables:
   ```
   PORT=3003
   MONGODB_URI=mongodb://127.0.0.1:27017/OllamaChat
   OLLAMA_API_URL=http://127.0.0.1:11434/api
   JWT_SECRET=your_jwt_secret_here
   SESSION_SECRET=your_session_secret_here
   ADMIN_USERNAME=your_admin_username
   SESSION_NAME_MODEL=llama3.2:latest
   SENDGRID_API_KEY=your_sendgrid_api_key
   ```

4. Start the server:
   ```bash
   node server.js
   ```

5. Access the application at `http://localhost:3003`

## FAQ

### What models can I use with Ollama Chat?
You can use any model that's compatible with Ollama. The application shows all available models and allows you to load/unload them as needed.

### How do I load new models?
Admin users can load models directly from the interface. Non-admin users can only use models that have already been loaded.

### Is my chat data secure?
All chat sessions are stored in your MongoDB database and associated with your user account. Communications use secure protocols with JWT authentication.

### What's the typing animation based on?
The typing speed is proportional to the size of the model to make typing match speed of answer generating.

### Can I self-host this application?
Yes! This application is designed to be self-hosted alongside your Ollama instance, giving you full control over your AI interactions.

### Can I test it before deploying it on my server?
Of course! Take look at: [https://ai.nasiadka.pl/](https://ai.nasiadka.pl/)  

## License

This project is licensed under the MIT License - see the LICENSE file for details.