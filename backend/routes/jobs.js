const express = require('express');
const router = express.Router();
const { getJobs, getJob, createJob, updateJob, deleteJob, getMyJobs } = require('../controllers/jobController');
const { protect, authorize } = require('../middleware/auth');

router.get('/', getJobs);
router.get('/my', protect, authorize('employer'), getMyJobs);
router.get('/:id', getJob);
router.post('/', protect, authorize('employer'), createJob);
router.put('/:id', protect, authorize('employer'), updateJob);
router.delete('/:id', protect, authorize('employer'), deleteJob);

module.exports = router;
