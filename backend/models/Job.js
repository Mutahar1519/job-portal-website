const mongoose = require('mongoose');

const JobSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Please provide a job title'],
      trim: true,
      maxlength: [150, 'Title cannot exceed 150 characters'],
    },
    description: {
      type: String,
      required: [true, 'Please provide a job description'],
    },
    company: {
      type: String,
      required: [true, 'Please provide a company name'],
      trim: true,
    },
    location: {
      type: String,
      required: [true, 'Please provide a location'],
      trim: true,
    },
    jobType: {
      type: String,
      enum: ['full-time', 'part-time', 'contract', 'internship', 'remote'],
      default: 'full-time',
    },
    category: {
      type: String,
      required: [true, 'Please provide a job category'],
      trim: true,
    },
    salary: {
      min: { type: Number },
      max: { type: Number },
      currency: { type: String, default: 'USD' },
    },
    requirements: [String],
    skills: [String],
    employer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    deadline: {
      type: Date,
    },
    applicationsCount: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

// Text index for search
JobSchema.index({ title: 'text', description: 'text', company: 'text', location: 'text' });

module.exports = mongoose.model('Job', JobSchema);
