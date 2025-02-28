// models/Activity.js
const mongoose = require('mongoose');

const activitySchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false }, // Changed to false
  lastLogin: { type: Date, default: Date.now },
  failedAttempts: { type: Number, default: 0 },
  isLoggedIn: { type: Boolean, default: false },
  email: { type: String, required: false } // Added to track failed attempts by email
});

const Activity = mongoose.model('Activity', activitySchema);
module.exports = Activity;