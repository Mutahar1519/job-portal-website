const mongoose = require("mongoose");

const jobSchema = new mongoose.Schema({
  title: String,
  location: String,
  job_type: String,
  category: String,
  description: String,
  is_premium: {
    type: Boolean,
    default: false
  }
}, { timestamps: true });

// ✅ Prevent OverwriteModelError
module.exports = mongoose.models.Job || mongoose.model("Job", jobSchema);
