const mongoose = require("mongoose");

const jobSchema = new mongoose.Schema({
  title: String,
  location: String,
  job_type: String,
  category: String,
  description: String,
  slug: {
    type: String,
    unique: true,
    sparse: true
  },
  is_premium: {
    type: Boolean,
    default: false
  }
}, { timestamps: true });

// Generate unique slug before saving
jobSchema.pre('save', function(next) {
  if (!this.slug && this.title) {
    // Simple slug generation: lowercase, replace spaces with hyphens, remove special chars
    this.slug = this.title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim('-');
    
    // Add random suffix if needed for uniqueness
    if (this.slug.length === 0) {
      this.slug = 'job-' + Math.random().toString(36).substr(2, 9);
    }
  }
  next();
});

// ✅ Prevent OverwriteModelError
module.exports = mongoose.models.Job || mongoose.model("Job", jobSchema);
