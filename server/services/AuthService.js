const bcrypt = require('bcrypt');
const crypto = require('crypto');
const User = require('../models/User');
const VerificationToken = require('../models/VerificationToken');
const config = require('../config/config');
const { sendVerificationEmail, sendResetEmail } = require('../utils/Email');

class AuthService {
	static async register(username, password, email) {
		if (!username || !password || !email)
			throw new Error('Username, password and email are required');

		const [existingUser, existingEmail] = await Promise.all([
			User.findOne({ username }),
			User.findOne({ email })
		]);

		if (existingUser) throw new Error('Username already taken');
		if (existingEmail) throw new Error('Email already registered');
		// ToDo: Forgot password?

		const hashedPassword = await bcrypt.hash(password, 10);
		const user = await User.create({
			username,
			password: hashedPassword,
			email,
			isVerified: false
		});

		const verificationToken = crypto.randomBytes(32).toString('hex');
		await VerificationToken.create({
			userId: user._id,
			token: verificationToken
		});

		await sendVerificationEmail(email, verificationToken);

		return {
			_id: user._id,
			username: user.username,
			email: user.email
		};
	}

	static async login(username, password) {
		if (!username || !password) throw new Error('Username and password are required');

		const user = await User.findOne({ username });
		if (!user) throw new Error('Invalid credentials');

		const isValid = await bcrypt.compare(password, user.password);
		if (!isValid) throw new Error('Invalid credentials');

		if (!user.isVerified) throw new Error('Please verify your email before logging in');

		return {
			_id: user._id,
			username: user.username,
			email: user.email
		};
	}

	static async verifyEmail(token) {
		const verificationToken = await VerificationToken.findOne({ token });
		if (!verificationToken) throw new Error('Invalid or expired verification token');

		await Promise.all([ // Update user and delete token
			User.updateOne(
				{ _id: verificationToken.userId },
				{ isVerified: true }
			),
			VerificationToken.deleteOne({ _id: verificationToken._id })
		]);
		return true;
	}

	static async checkPrivileges(userId) {
		const user = await User.findById(userId);
		return user && user.username === config.ADMIN_USERNAME;
	}

	static async sendResetToken(email) {
		const user = await User.findOne({ email });
		if (!user) throw new Error('Email not found');

		const resetToken = crypto.randomBytes(32).toString('hex');
		await VerificationToken.create({
			userId: user._id,
			token: resetToken
		});

		await sendResetEmail(email, resetToken);
	}

	static async resetPassword(token, newPassword) {
		const verificationToken = await VerificationToken.findOne({ token });
		if (!verificationToken) throw new Error('Invalid token');

		const hashedPassword = await bcrypt.hash(newPassword, 10);
		await User.updateOne( // Update user and delete token
			{ _id: verificationToken.userId },
			{ password: hashedPassword }
		);
		await VerificationToken.deleteOne({ _id: verificationToken._id });
		return true;
	}
}

module.exports = AuthService;