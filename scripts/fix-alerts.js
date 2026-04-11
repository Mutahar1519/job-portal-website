/**
 * Replaces alert() calls in frontend JS files with semantic banner calls:
 *   showSuccess() - for confirmation/success messages
 *   showWarning() - for validation/input-error messages
 *   showError()   - for everything else (failures, access denied)
 * 
 * Only touches files in frontend/js/ (not error-ui.js itself).
 */
const fs = require('fs');
const path = require('path');

const jsDir = path.join(__dirname, '..', 'frontend', 'js');
const skip = new Set(['error-ui.js']);

// Keywords that indicate a SUCCESS outcome
const successWords = [
  'success', 'saved', 'submitted', 'created', 'updated', 'deleted',
  'renewed', 'sent', 'accepted', 'confirmed', 'scheduled', 'ordered',
  'registered', 'verified', 'uploaded', 'boosted', '✅', 'done',
  'password reset', 'email sent', 'applied', 'hired', 'posted',
];

// Keywords that indicate a VALIDATION WARNING (user input issue)
const warnWords = [
  'select', 'choose', 'enter', 'please enter', 'must be', 'required',
  'invalid', 'please choose', 'please select', 'please fill',
  'first', 'cannot be empty', 'too short', 'too long',
];

function classify(msg) {
  const lower = msg.toLowerCase();
  if (successWords.some(w => lower.includes(w))) return 'showSuccess';
  if (warnWords.some(w => lower.includes(w))) return 'showWarning';
  return 'showError';
}

let totalReplaced = 0;

const files = fs.readdirSync(jsDir).filter(f => f.endsWith('.js') && !skip.has(f));

for (const file of files) {
  const filePath = path.join(jsDir, file);
  let src = fs.readFileSync(filePath, 'utf8');
  let replaced = 0;

  // Replace alert(...) calls line by line, preserving structure
  // Match: alert( ... ) where the argument is a simple string literal or template
  src = src.replace(/\balert\s*\(([^)]+)\)/g, (match, arg) => {
    // Determine classification from the argument text
    const fn = classify(arg);
    replaced++;
    return `${fn}(${arg})`;
  });

  if (replaced > 0) {
    fs.writeFileSync(filePath, src, 'utf8');
    console.log(`${file}: replaced ${replaced} alert() call(s)`);
    totalReplaced += replaced;
  }
}

console.log(`\nTotal replaced: ${totalReplaced} alert() calls across ${files.length} files`);
