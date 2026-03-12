document.addEventListener("DOMContentLoaded", () => {
  // Modal registry for future expansion
  const modals = {
    "gettingStarted": {
      title: "Getting Started",
      icon: "fa-graduation-cap",
      content: `
        <h3>How to Get Started</h3>
        <p><strong>For Candidates:</strong></p>
        <ul style="margin-left: 20px; line-height: 1.8;">
          <li>Create a free account with your email</li>
          <li>Build your profile with your resume and skills</li>
          <li>Browse jobs and apply to positions that match you</li>
          <li>Chat directly with employers to clarify details</li>
          <li>Create job alerts to get notified about new opportunities</li>
        </ul>
        <p style="margin-top: 16px;"><strong>For Employers:</strong></p>
        <ul style="margin-left: 20px; line-height: 1.8;">
          <li>Verify your employer account</li>
          <li>Post a job with clear requirements and pay</li>
          <li>Receive applications and shortlist candidates</li>
          <li>Schedule interviews and hire directly</li>
          <li>For shift jobs, escrow ensures payment security</li>
        </ul>
      `
    },
    "paymentEscrow": {
      title: "Payment & Escrow",
      icon: "fa-credit-card",
      content: `
        <h3>How Payment & Escrow Works</h3>
        <p><strong>For Shift Jobs:</strong></p>
        <ul style="margin-left: 20px; line-height: 1.8;">
          <li><strong>Escrow:</strong> Payment is held securely until work completion</li>
          <li><strong>Fee:</strong> Standard 10% fee covers platform, security, and insurance</li>
          <li><strong>Example:</strong> $100 shift + $10 fee = $110 total held in escrow</li>
          <li><strong>Release:</strong> Worker completes shift → Employer confirms → Payment released</li>
        </ul>
        <p style="margin-top: 16px;"><strong>Security Benefits:</strong></p>
        <ul style="margin-left: 20px; line-height: 1.8;">
          <li>Workers guaranteed payment for completed work</li>
          <li>Employers protected from fraudulent claims</li>
          <li>Disputes resolved fairly by platform team</li>
        </ul>
      `
    },
    "shiftRates": {
      title: "Shift Rates & Escrow",
      icon: "fa-hourglass-end",
      content: `
        <h3>Understanding Shift Rates</h3>
        <p><strong>Rate Structure:</strong></p>
        <ul style="margin-left: 20px; line-height: 1.8;">
          <li>Rates are posted as hourly pay (e.g., $25/hour)</li>
          <li>Duration is specified for each shift posting</li>
          <li>Example: 6-hour shift at $25/hour = $150 payment</li>
        </ul>
        <p style="margin-top: 16px;"><strong>Escrow Fee Calculation:</strong></p>
        <ul style="margin-left: 20px; line-height: 1.8;">
          <li>Default fee: 10% of hourly rate</li>
          <li>Example: $25/hour + $2.50 fee = $27.50/hour held in escrow</li>
          <li>Total for 6-hour shift: $165 (150 payment + 15 fee)</li>
          <li>Employer funds escrow before shift begins</li>
        </ul>
        <p style="margin-top: 16px; background: rgba(59, 130, 246, 0.1); padding: 12px; border-radius: 8px;">
          <i class="fa-solid fa-lightbulb"></i> <strong>Tip:</strong> Filter shifts by minimum hourly rate to find roles that match your budget.
        </p>
      `
    },
    "verification": {
      title: "Employer Verification",
      icon: "fa-badge-check",
      content: `
        <h3>How Employer Verification Works</h3>
        <p><strong>Verification Process:</strong></p>
        <ul style="margin-left: 20px; line-height: 1.8;">
          <li><strong>Email:</strong> Company email address check</li>
          <li><strong>Business:</strong> Company registration verification</li>
          <li><strong>References:</strong> Previous hiring history on platform</li>
          <li><strong>Reviews:</strong> Candidate and worker feedback</li>
        </ul>
        <p style="margin-top: 16px;"><strong>What the Badge Means:</strong></p>
        <ul style="margin-left: 20px; line-height: 1.8;">
          <li>✓ Employer identity confirmed</li>
          <li>✓ Legitimate business registered</li>
          <li>✓ History of successful hires</li>
          <li>✓ Platform stands behind this employer</li>
        </ul>
      `
    },
    "moderation": {
      title: "Content Moderation Policy",
      icon: "fa-shield",
      content: `
        <h3>How We Keep the Platform Safe</h3>
        <p><strong>Automatic Moderation:</strong></p>
        <ul style="margin-left: 20px; line-height: 1.8;">
          <li>AI scans all job postings for spam and fraud</li>
          <li>Red flags: suspicious pay, MLM schemes, paid-to-apply jobs</li>
          <li>Posts from verified employers get faster approval</li>
        </ul>
        <p style="margin-top: 16px;"><strong>Manual Review:</strong></p>
        <ul style="margin-left: 20px; line-height: 1.8;">
          <li>Flagged content reviewed by human team</li>
          <li>Appeals processed within 24 hours</li>
          <li>Repeat offenders removed from platform</li>
        </ul>
        <p style="margin-top: 16px;"><strong>Reporting:</strong></p>
        <ul style="margin-left: 20px; line-height: 1.8;">
          <li>Found suspicious content? Report it immediately</li>
          <li>We investigate all reports within 12 hours</li>
          <li>Your safety is our top priority</li>
        </ul>
      `
    },
    "dataPreferences": {
      title: "Data Preferences",
      icon: "fa-database",
      content: `
        <h3>What Data We Store</h3>
        <p><strong>Account data:</strong></p>
        <ul style="margin-left: 20px; line-height: 1.8;">
          <li>Name, email, and password (encrypted)</li>
          <li>Profile details: job title, skills, experience</li>
          <li>Uploaded CV and resume files</li>
          <li>Application history and saved jobs</li>
        </ul>
        <p style="margin-top: 16px;"><strong>Local browser data:</strong></p>
        <ul style="margin-left: 20px; line-height: 1.8;">
          <li>Login token (session JWT, auto-expires in 24h)</li>
          <li>User preferences such as theme and palette</li>
          <li>Draft job posts (employers only)</li>
        </ul>
        <p style="margin-top: 16px;"><strong>Your rights:</strong></p>
        <ul style="margin-left: 20px; line-height: 1.8;">
          <li>Download your data from your Profile page</li>
          <li>Request full deletion from your Account Settings</li>
          <li>Contact support@jobportal.com for data inquiries</li>
        </ul>
      `
    },
    "cookieSettings": {
      title: "Cookie Settings",
      icon: "fa-cookie-bite",
      content: `
        <h3>How We Use Storage</h3>
        <p>JobPortal uses <strong>localStorage</strong> (not cookies) for essential session data only. No third-party trackers or advertising cookies are used.</p>
        <p style="margin-top: 16px;"><strong>What is stored:</strong></p>
        <ul style="margin-left: 20px; line-height: 1.8;">
          <li><strong>token</strong> — your login JWT, expires in 24 hours</li>
          <li><strong>user</strong> — your basic profile for UI display</li>
          <li><strong>theme / palette</strong> — appearance preferences</li>
          <li><strong>jobPostDraft.v1</strong> — draft job post (employers)</li>
        </ul>
        <p style="margin-top: 16px;">To clear all local data, log out and clear your browser storage. This will sign you out of the platform.</p>
      `
    }
  };

  const createModal = (key) => {
    const data = modals[key];
    if (!data) return;

    const modal = document.createElement("div");
    modal.className = "modal";
    modal.innerHTML = `
      <div class="modal-content glass-card">
        <div class="modal-header">
          <h3><i class="fa-solid ${data.icon}"></i> ${data.title}</h3>
          <button class="modal-close" onclick="this.closest('.modal').remove()">&times;</button>
        </div>
        <div class="modal-body">
          ${data.content}
        </div>
        <div class="modal-footer">
          <button class="btn btn-primary" onclick="this.closest('.modal').remove()">Got it</button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);
    modal.addEventListener("click", (e) => {
      if (e.target === modal) {
        modal.remove();
      }
    });
  };

  // Attach click handlers to menu cards
  const infoButtons = {
    "Getting started": "gettingStarted",
    "Payment & escrow": "paymentEscrow",
    "Shift rates": "shiftRates",
    "Verification": "verification",
    "Moderation": "moderation"
  };

  // Privacy cards get direct click action (not info popup - they ARE the action)
  const privacyActions = {
    "Data preferences": () => {
      createModal("dataPreferences");
    },
    "Cookie settings": () => {
      createModal("cookieSettings");
    },
    "Delete account": () => {
      const token = localStorage.getItem("token");
      if (!token) {
        alert("You must be logged in to delete your account. Please log in first.");
        window.location.href = "login.html";
        return;
      }
      window.location.href = "profile.html#account-settings";
    }
  };

  // Find all menu cards and add info button popups
  document.querySelectorAll(".menu-card").forEach((card) => {
    const title = card.querySelector("h3")?.textContent?.trim();
    const key = infoButtons[title];
    const privacyAction = privacyActions[title];

    if (privacyAction) {
      card.style.cursor = "pointer";
      card.addEventListener("click", privacyAction);
      const arrow = document.createElement("span");
      arrow.style.cssText = "position:absolute;top:12px;right:12px;color:var(--muted);font-size:14px;";
      arrow.innerHTML = '<i class="fa-solid fa-arrow-right"></i>';
      card.style.position = "relative";
      card.appendChild(arrow);
    } else if (key) {
      const infoBtn = document.createElement("button");
      infoBtn.className = "btn-icon info-button";
      infoBtn.setAttribute("title", "Learn more");
      infoBtn.innerHTML = '<i class="fa-solid fa-circle-info"></i>';
      infoBtn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        createModal(key);
      });

      card.style.position = "relative";
      card.appendChild(infoBtn);
    }
  });

  // Style the info buttons
  const style = document.createElement("style");
  style.textContent = `
    .info-button {
      position: absolute;
      top: 12px;
      right: 12px;
      width: 32px;
      height: 32px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 50%;
      background: var(--surface-2);
      border: 1px solid var(--border);
      color: var(--muted);
      cursor: pointer;
      transition: all 0.2s;
      opacity: 0;
    }

    .menu-card:hover .info-button {
      opacity: 1;
      color: var(--primary);
      background: rgba(59, 130, 246, 0.1);
    }

    .info-button:hover {
      transform: scale(1.1);
    }

    .modal {
      display: flex;
      align-items: center;
      justify-content: center;
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.5);
      z-index: 1000;
      animation: fadeIn 0.2s;
    }

    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
  `;
  document.head.appendChild(style);
});
