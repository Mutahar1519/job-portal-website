/**
 * Frontend Error & Notification UI Utility
 * Provides consistent error, success, and warning messages across the application
 * Replaces scattered alert() calls with a professional error banner
 */

(function() {
  // Create error banner element if it doesn't exist
  function initializeErrorBanner() {
    if (document.getElementById('errorBanner')) {
      return; // Already initialized
    }

    const banner = document.createElement('div');
    banner.id = 'errorBanner';
    banner.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      padding: 16px 24px;
      background: linear-gradient(135deg, #dc2626 0%, #991b1b 100%);
      color: white;
      font-size: 14px;
      font-weight: 500;
      z-index: 9999;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      display: none;
      animation: slideDown 0.3s ease-out;
    `;

    // Add close button
    const closeBtn = document.createElement('button');
    closeBtn.innerHTML = '&times;';
    closeBtn.style.cssText = `
      position: absolute;
      right: 16px;
      top: 50%;
      transform: translateY(-50%);
      background: none;
      border: none;
      color: white;
      font-size: 24px;
      cursor: pointer;
      padding: 0;
      line-height: 1;
    `;
    closeBtn.onclick = closeErrorBanner;

    banner.appendChild(closeBtn);
    banner.appendChild(document.createTextNode(''));
    document.body.insertBefore(banner, document.body.firstChild);

    // Add animation styles
    const style = document.createElement('style');
    style.textContent = `
      @keyframes slideDown {
        from {
          transform: translateY(-100%);
          opacity: 0;
        }
        to {
          transform: translateY(0);
          opacity: 1;
        }
      }
      @keyframes slideUp {
        from {
          transform: translateY(0);
          opacity: 1;
        }
        to {
          transform: translateY(-100%);
          opacity: 0;
        }
      }
      #errorBanner.hide {
        animation: slideUp 0.3s ease-out forwards;
      }
    `;
    document.head.appendChild(style);
  }

  function closeErrorBanner() {
    const banner = document.getElementById('errorBanner');
    if (banner) {
      banner.classList.add('hide');
      setTimeout(() => {
        banner.style.display = 'none';
        banner.classList.remove('hide');
      }, 300);
    }
  }

  /**
   * Show an error message
   * @param {string} message - The error message to display
   * @param {number} duration - How long to show (ms), 0 for permanent
   */
  window.showError = function(message, duration = 5000) {
    initializeErrorBanner();
    const banner = document.getElementById('errorBanner');
    if (!banner) return;

    banner.style.background = 'linear-gradient(135deg, #dc2626 0%, #991b1b 100%)';
    banner.childNodes[1].textContent = message;
    banner.style.display = 'block';

    if (duration > 0) {
      setTimeout(closeErrorBanner, duration);
    }
  };

  /**
   * Show a success message
   * @param {string} message - The success message to display
   * @param {number} duration - How long to show (ms)
   */
  window.showSuccess = function(message, duration = 3000) {
    initializeErrorBanner();
    const banner = document.getElementById('errorBanner');
    if (!banner) return;

    banner.style.background = 'linear-gradient(135deg, #10b981 0%, #059669 100%)';
    banner.childNodes[1].textContent = message;
    banner.style.display = 'block';

    if (duration > 0) {
      setTimeout(closeErrorBanner, duration);
    }
  };

  /**
   * Show a warning message
   * @param {string} message - The warning message to display
   * @param {number} duration - How long to show (ms)
   */
  window.showWarning = function(message, duration = 4000) {
    initializeErrorBanner();
    const banner = document.getElementById('errorBanner');
    if (!banner) return;

    banner.style.background = 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)';
    banner.childNodes[1].textContent = message;
    banner.style.display = 'block';

    if (duration > 0) {
      setTimeout(closeErrorBanner, duration);
    }
  };

  /**
   * Handle API error responses consistently
   * @param {Object} error - The error object or API response
   * @param {string} fallbackMessage - Default message if no error details
   * @returns {string} The error message
   */
  window.handleApiError = function(error, fallbackMessage = 'An error occurred') {
    let message = fallbackMessage;

    if (typeof error === 'string') {
      message = error;
    } else if (error && error.message) {
      message = error.message;
    } else if (error && error.error) {
      message = error.error;
    }

    showError(message);
    return message;
  };

  // Backward-compatible bridge: convert legacy alert calls to banner notifications.
  if (typeof window.alert === 'function' && !window.__nativeAlert) {
    window.__nativeAlert = window.alert.bind(window);
    window.alert = function(message) {
      showError(String(message || 'Notification'));
    };
  }

  // Initialize banner on page load if DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeErrorBanner);
  } else {
    initializeErrorBanner();
  }
})();
