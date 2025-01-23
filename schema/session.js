const mongoose = require('mongoose');

const sessionSchema = new mongoose.Schema({
	userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
	name: { type: String, required: true },
	messages: [{
		role: { type: String, required: true },
		content: { type: String, required: false },
		done: { type: Boolean, default: false }
	}],
	dateModified: { type: Date, default: Date.now },
});

const Session = mongoose.model('Session', sessionSchema);

module.exports = Session;