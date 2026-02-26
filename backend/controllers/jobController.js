const Job = require('../models/Job');

// @desc    Get all jobs (with search & filters)
// @route   GET /api/jobs
// @access  Public
const getJobs = async (req, res) => {
  try {
    const { search, location, jobType, category, page = 1, limit = 10 } = req.query;

    const query = { isActive: true };

    if (search) {
      query.$text = { $search: search };
    }
    if (location) {
      query.location = { $regex: location, $options: 'i' };
    }
    if (jobType) {
      query.jobType = jobType;
    }
    if (category) {
      query.category = { $regex: category, $options: 'i' };
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const total = await Job.countDocuments(query);
    const jobs = await Job.find(query)
      .populate('employer', 'name company')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    res.json({
      success: true,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit)),
      jobs,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc    Get single job
// @route   GET /api/jobs/:id
// @access  Public
const getJob = async (req, res) => {
  try {
    const job = await Job.findById(req.params.id).populate('employer', 'name company email');
    if (!job) {
      return res.status(404).json({ success: false, message: 'Job not found' });
    }
    res.json({ success: true, job });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc    Create a job
// @route   POST /api/jobs
// @access  Private (employer)
const createJob = async (req, res) => {
  try {
    req.body.employer = req.user.id;
    if (!req.body.company) {
      req.body.company = req.user.company;
    }
    const job = await Job.create(req.body);
    res.status(201).json({ success: true, job });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc    Update a job
// @route   PUT /api/jobs/:id
// @access  Private (employer who owns the job)
const updateJob = async (req, res) => {
  try {
    let job = await Job.findById(req.params.id);
    if (!job) {
      return res.status(404).json({ success: false, message: 'Job not found' });
    }
    if (job.employer.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Not authorized to update this job' });
    }
    job = await Job.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    res.json({ success: true, job });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc    Delete a job
// @route   DELETE /api/jobs/:id
// @access  Private (employer who owns the job)
const deleteJob = async (req, res) => {
  try {
    const job = await Job.findById(req.params.id);
    if (!job) {
      return res.status(404).json({ success: false, message: 'Job not found' });
    }
    if (job.employer.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Not authorized to delete this job' });
    }
    await job.deleteOne();
    res.json({ success: true, message: 'Job removed' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc    Get jobs posted by the logged-in employer
// @route   GET /api/jobs/my
// @access  Private (employer)
const getMyJobs = async (req, res) => {
  try {
    const jobs = await Job.find({ employer: req.user.id }).sort({ createdAt: -1 });
    res.json({ success: true, jobs });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = { getJobs, getJob, createJob, updateJob, deleteJob, getMyJobs };
