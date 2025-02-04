const nodemailer = require('nodemailer');
const config = require('../config/config.js');

let transporter = nodemailer.createTransport({
	host: 'smtp.sendgrid.net',
	port: 587,
	auth: {
		user: "apikey",
		pass: config.SENDGRID_API_KEY
	}
});

const styles = `
					:root {
                        --primary-color: #4caf50;
                        --secondary-color: #2196f3;
                        --background-light: #e6e6e6;
                        --background-lighter: #eeeeee;
                        --background-lightest: #f8f8f8;
                        --text-color: #666;
                        --text-color-dark: #333;
                        --border-color: #ddd;
                    }
                    
                    body {
                        font-family: Arial, sans-serif;
                        background-color: var(--background-light);
                        margin: 0;
                        padding: 20px;
                        color: var(--text-color-dark);
                    }
                    
                    .container {
                        max-width: 600px;
                        margin: 0 auto;
                        background-color: #fff;
                        padding: 2rem;
                        border-radius: 10px;
                        box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
                        border: 1px solid var(--border-color);
                    }
                    
                    .header {
                        text-align: center;
                        margin-bottom: 2rem;
                    }
                    
                    .logo {
                        font-size: 24px;
                        font-weight: bold;
                        color: var(--primary-color);
                    }
                    
                    .content {
                        background-color: var(--background-lightest);
                        padding: 1.5rem;
                        border-radius: 6px;
                        margin: 1.5rem 0;
                    }
                    
                    .button {
                        display: block;
                        width: fit-content;
                        margin: 2rem auto;
                        padding: 0.8rem 1.6rem;
                        background-color: var(--primary-color);
                        color: white;
                        text-decoration: none;
                        border-radius: 5px;
                        text-transform: uppercase;
                        font-weight: bold;
                        text-align: center;
                    }
                    
                    .footer {
                        margin-top: 2rem;
                        text-align: center;
                        font-size: 0.9rem;
                        color: var(--text-color);
                    }
                    
                    .url-fallback {
                        word-break: break-all;
                        margin-top: 1rem;
                        padding: 1rem;
                        background-color: var(--background-lighter);
                        border-radius: 5px;
                        font-size: 0.9rem;
                    }`

const sendVerificationEmail = async (email, token) => {
	const verificationUrl = `https://ai.nasiadka.pl/verify-email.html?token=${token}`;
	const mailOptions = {
		from: 'maciej@nasiadka.pl',
		to: email,
		subject: 'Email Verification',
		text: ``,
		html: `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Email Verification</title>
                <style>
                    ${styles}
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <div class="logo">Ollama Chat</div>
                    </div>
                    
                    <div class="content">
                        <h2>Welcome!</h2>
                        <p>Thank you for signing up. To complete your registration and start chatting with AI, please verify your email address.</p>
                    </div>
                    
                    <a href="${verificationUrl}" class="button">Verify Email</a>
                    
                    <div class="url-fallback">
                        If the button doesn't work, copy this URL into your browser:<br>
                        ${verificationUrl}
                    </div>
                    
                    <div class="footer">
                        <p>If you didn't create an account, you can safely ignore this email.</p>
                        <p>&copy; ${new Date().getFullYear()} Ollama Chat. All rights reserved.</p>
                    </div>
                </div>
            </body>
            </html>`
	};

	await transporter.sendMail(mailOptions);
};

const sendResetEmail = async (email, token) => {
	const resetUrl = `https://ai.nasiadka.pl/reset-password.html?token=${token}`;
	const mailOptions = {
		from: 'maciej@nasiadka.pl',
		to: email,
		subject: 'Password Reset',
		html: `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <style>
                    ${styles}
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <div class="logo">Ollama Chat</div>
                    </div>
                    
                    <div class="content">
                        <h2>Password Reset</h2>
                        <p>You requested to reset your password. Click the button below to set a new password.</p>
                    </div>
                    
                    <a href="${resetUrl}" class="button">Reset Password</a>
                    
                    <div class="url-fallback">
                        If the button doesn't work, copy this URL into your browser:<br>
                        ${resetUrl}
                    </div>
                    
                    <div class="footer">
                        <p>If you didn't request a password reset, you can safely ignore this email.</p>
                        <p>&copy; ${new Date().getFullYear()} Ollama Chat. All rights reserved.</p>
                    </div>
                </div>
            </body>
            </html>`
	};

	await transporter.sendMail(mailOptions);
};

module.exports = { sendVerificationEmail, sendResetEmail };