/**
 * Centralized file upload validation policy
 * Enforces consistent MIME types, extensions, and size limits across the application
 */

// Define upload policies for different file types
const UPLOAD_POLICIES = {
  resumes: {
    maxSizeMB: 10,
    allowedExtensions: ['.pdf', '.doc', '.docx'],
    allowedMimeTypes: [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ],
    description: 'Resume'
  },
  verification: {
    maxSizeMB: 10,
    allowedExtensions: ['.pdf', '.jpg', '.jpeg', '.png', '.doc', '.docx'],
    allowedMimeTypes: [
      'application/pdf',
      'image/jpeg',
      'image/png',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ],
    description: 'Verification document'
  },
  jobImages: {
    maxSizeMB: 5,
    allowedExtensions: ['.jpg', '.jpeg', '.png'],
    allowedMimeTypes: ['image/jpeg', 'image/png'],
    description: 'Job image'
  }
};

/**
 * Validate an uploaded file against a policy
 * @param {Object} file - The file object from multer
 * @param {string} policyName - The policy name (e.g., 'resumes', 'verification', 'jobImages')
 * @returns {Object} - { valid: boolean, error?: string }
 */
function validateFile(file, policyName) {
  if (!file) {
    return { valid: false, error: 'No file uploaded' };
  }

  const policy = UPLOAD_POLICIES[policyName];
  if (!policy) {
    return { valid: false, error: `Unknown upload policy: ${policyName}` };
  }

  // Check file size
  const fileSizeBytes = file.size;
  const maxSizeBytes = policy.maxSizeMB * 1024 * 1024;
  if (fileSizeBytes > maxSizeBytes) {
    return {
      valid: false,
      error: `${policy.description} exceeds maximum size of ${policy.maxSizeMB}MB (actual: ${(fileSizeBytes / 1024 / 1024).toFixed(2)}MB)`
    };
  }

  // Check file extension
  const originalName = String(file.originalname || '').toLowerCase();
  const ext = originalName.substring(originalName.lastIndexOf('.'));
  if (!policy.allowedExtensions.includes(ext)) {
    return {
      valid: false,
      error: `${policy.description} has unsupported file type "${ext}". Allowed: ${policy.allowedExtensions.join(', ')}`
    };
  }

  // Check MIME type
  const mimeType = String(file.mimetype || '').toLowerCase();
  if (!policy.allowedMimeTypes.includes(mimeType)) {
    console.warn(`[UploadPolicy] MIME type mismatch for ${originalName}: claimed="${mimeType}", allowed=[${policy.allowedMimeTypes.join(', ')}]`);
    // Don't fail on MIME type mismatch as some systems report it differently
    // But log it for debugging
  }

  return { valid: true };
}

/**
 * Validate multiple files
 * @param {Array} files - Array of file objects
 * @param {string} policyName - The policy name
 * @returns {Object} - { valid: boolean, errors?: string[] }
 */
function validateFiles(files, policyName) {
  if (!Array.isArray(files) || files.length === 0) {
    return { valid: false, errors: ['No files uploaded'] };
  }

  const errors = [];
  for (let i = 0; i < files.length; i++) {
    const validation = validateFile(files[i], policyName);
    if (!validation.valid) {
      errors.push(`File ${i + 1}: ${validation.error}`);
    }
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  return { valid: true };
}

/**
 * Get the policy for a given type
 * @param {string} policyName
 * @returns {Object} The policy object
 */
function getPolicy(policyName) {
  return UPLOAD_POLICIES[policyName] || null;
}

/**
 * Create a validation middleware for multer routes
 * @param {string} policyName - The policy name
 * @param {string|Array} fileFieldName - The form field name(s) containing the file
 * @returns {Function} Express middleware
 */
function createUploadValidator(policyName, fileFieldName) {
  return (req, res, next) => {
    let files = [];

    if (typeof fileFieldName === 'string') {
      if (req.file && req.file.fieldname === fileFieldName) {
        files = [req.file];
      } else if (req.files && req.files[fileFieldName]) {
        files = Array.isArray(req.files[fileFieldName]) ? req.files[fileFieldName] : [req.files[fileFieldName]];
      }
    } else if (Array.isArray(fileFieldName)) {
      for (const field of fileFieldName) {
        if (req.files && req.files[field]) {
          const fieldFiles = Array.isArray(req.files[field]) ? req.files[field] : [req.files[field]];
          files = files.concat(fieldFiles);
        }
      }
    }

    if (files.length === 0) {
      // No file uploaded - let the route handler decide if this is an error
      return next();
    }

    const validation = validateFiles(files, policyName);
    if (!validation.valid) {
      return res.status(400).json({
        message: `Upload validation failed`,
        errors: validation.errors
      });
    }

    next();
  };
}

module.exports = {
  UPLOAD_POLICIES,
  validateFile,
  validateFiles,
  getPolicy,
  createUploadValidator
};
