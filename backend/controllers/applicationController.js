const Application = require('../models/Application');
const Job = require('../models/Job');

// @desc    Apply for a job
// @route   POST /api/applications
// @access  Private (jobseeker)
const applyForJob = async (req, res) => {
  try {
    const { jobId, coverLetter, resumeUrl } = req.body;

    const job = await Job.findById(jobId);
    if (!job) {
      return res.status(404).json({ success: false, message: 'Job not found' });
    }
    if (!job.isActive) {
      return res.status(400).json({ success: false, message: 'This job is no longer active' });
    }

    const existing = await Application.findOne({ job: jobId, applicant: req.user.id });
    if (existing) {
      return res.status(400).json({ success: false, message: 'You have already applied for this job' });
    }

    const application = await Application.create({
      job: jobId,
      applicant: req.user.id,
      coverLetter,
      resumeUrl: resumeUrl || req.user.resumeUrl,
    });

    await Job.findByIdAndUpdate(jobId, { $inc: { applicationsCount: 1 } });

    res.status(201).json({ success: true, application });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc    Get applications for the logged-in jobseeker
// @route   GET /api/applications/my
// @access  Private (jobseeker)
const getMyApplications = async (req, res) => {
  try {
    const applications = await Application.find({ applicant: req.user.id })
      .populate('job', 'title company location jobType')
      .sort({ createdAt: -1 });
    res.json({ success: true, applications });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc    Get applications for a specific job (employer view)
// @route   GET /api/applications/job/:jobId
// @access  Private (employer)
const getJobApplications = async (req, res) => {
  try {
    const job = await Job.findById(req.params.jobId);
    if (!job) {
      return res.status(404).json({ success: false, message: 'Job not found' });
    }
    if (job.employer.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    const applications = await Application.find({ job: req.params.jobId })
      .populate('applicant', 'name email bio skills resumeUrl')
      .sort({ createdAt: -1 });

    res.json({ success: true, applications });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc    Update application status (employer)
// @route   PUT /api/applications/:id/status
// @access  Private (employer)
const updateApplicationStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const application = await Application.findById(req.params.id).populate('job');
    if (!application) {
      return res.status(404).json({ success: false, message: 'Application not found' });
    }
    if (application.job.employer.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }
    application.status = status;
    await application.save();
    res.json({ success: true, application });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = { applyForJob, getMyApplications, getJobApplications, updateApplicationStatus };
