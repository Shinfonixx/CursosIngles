const mongoose = require('mongoose');

const courseSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  level: { type: String, required: true, enum: ['Beginner', 'Intermediate', 'Advanced'] },
  duration: { type: Number, required: true }, // in weeks
  price: { type: Number, required: true },
  image: { type: String },
  instructor: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  students: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]
});

const Course = mongoose.model('Course', courseSchema);
module.exports = Course;