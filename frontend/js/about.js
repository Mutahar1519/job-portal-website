document.addEventListener("DOMContentLoaded", () => {
  // Modal registry for about page features
  const modals = {
    "trustedPostings": {
      title: "Trusted Postings",
      icon: "fa-badge-check",
      content: `
        <h3>How We Ensure Trusted Postings</h3>
        <p><strong>Verification Process:</strong></p>
        <ul style="margin-left: 20px; line-height: 1.8;">
          <li><strong>Employer Verification:</strong> We verify company identity and legitimacy</li>
          <li><strong>Email Validation:</strong> Company email domain registration check</li>
          <li><strong>Business Registration:</strong> Legal business entity confirmation</li>
          <li><strong>History Review:</strong> Track record of previous postings and hires</li>
        </ul>
        <p style="margin-top: 16px;"><strong>Spam Prevention:</strong></p>
        <ul style="margin-left: 20px; line-height: 1.8;">
          <li>AI-powered scanning detects suspicious patterns</li>
          <li>Red flags: unrealistic pay, "make money fast," multi-level schemes</li>
          <li>Manual review by our trust team for all flagged content</li>
          <li>Repeat offenders permanently banned</li>
        </ul>
        <p style="margin-top: 16px; background: rgba(59, 130, 246, 0.1); padding: 12px; border-radius: 8px;">
          <i class="fa-solid fa-shield"></i> <strong>Your Safety:</strong> We're committed to keeping the platform spam-free and safe for all users.
        </p>
      `
    },
    "escrowBackedShifts": {
      title: "Escrow-Backed Shifts",
      icon: "fa-lock",
      content: `
        <h3>Escrow Protection for Shift Workers</h3>
        <p><strong>What is Escrow?</strong></p>
        <ul style="margin-left: 20px; line-height: 1.8;">
          <li>A secure, third-party system that holds payment until work is confirmed complete</li>
          <li>Protects both workers and employers</li>
          <li>Ensures fair treatment for everyone</li>
        </ul>
        <p style="margin-top: 16px;"><strong>How It Works:</strong></p>
        <ul style="margin-left: 20px; line-height: 1.8;">
          <li><strong>1. Booking:</strong> Worker accepts shift, employer funds escrow</li>
          <li><strong>2. Work:</strong> Worker completes the shift assignment</li>
          <li><strong>3. Confirmation:</strong> Employer confirms work was completed satisfactorily</li>
          <li><strong>4. Payment:</strong> Funds released directly to worker's account</li>
        </ul>
        <p style="margin-top: 16px;"><strong>Why Escrow Matters:</strong></p>
        <ul style="margin-left: 20px; line-height: 1.8;">
          <li>✓ Workers guaranteed payment for completed work</li>
          <li>✓ Employers protected from fraudulent claims</li>
          <li>✓ Disputes resolved fairly by our team</li>
          <li>✓ No surprise non-payment or rejection</li>
        </ul>
      `
    },
    "fastScreening": {
      title: "Fast Screening",
      icon: "fa-zap",
      content: `
        <h3>Streamlined Screening & Quick Hiring</h3>
        <p><strong>Traditional Hiring is Slow:</strong></p>
        <ul style="margin-left: 20px; line-height: 1.8;">
          <li>Hundreds of unqualified applications</li>
          <li>Days waiting for responses</li>
          <li>Multiple interview rounds with slow feedback</li>
          <li>Quality candidates disappear while you decide</li>
        </ul>
        <p style="margin-top: 16px;"><strong>Our Approach:</strong></p>
        <ul style="margin-left: 20px; line-height: 1.8;">
          <li><strong>Pre-verified candidates:</strong> Profiles already checked and validated</li>
          <li><strong>Smart filtering:</strong> Find the right fit in seconds, not days</li>
          <li><strong>Direct messaging:</strong> Chat with candidates immediately—no email delays</li>
          <li><strong>One-click scheduling:</strong> Quick interviews, fast decisions</li>
          <li><strong>Profile signals:</strong> Ratings, skills, and history visible upfront</li>
        </ul>
        <p style="margin-top: 16px;"><strong>Results:</strong></p>
        <ul style="margin-left: 20px; line-height: 1.8;">
          <li>Fill positions 3-5x faster than traditional job boards</li>
          <li>Higher quality matches from the first look</li>
          <li>Stronger hires that stick</li>
        </ul>
      `
    },
    "actionReadyWorkflows": {
      title: "Action-Ready Workflows",
      icon: "fa-bolt",
      content: `
        <h3>Everything You Need, In One Place</h3>
        <ul style="margin-left: 20px; line-height: 1.8;">
          <li><strong>Shortlist:</strong> Save candidates or jobs with one click</li>
          <li><strong>Chat:</strong> Message employers or applicants directly on the platform</li>
          <li><strong>Schedule:</strong> Arrange interviews without leaving JobPortal</li>
          <li><strong>Pipeline stages:</strong> Move candidates from Pending → Reviewed → Accepted/Rejected</li>
          <li><strong>Shift management:</strong> Post, book, and confirm shift work end-to-end</li>
        </ul>
        <p style="margin-top: 16px;">No external tools required — the entire hiring journey lives here.</p>
      `
    },
    "fairAccess": {
      title: "Fair Access",
      icon: "fa-scale-balanced",
      content: `
        <h3>Open to Everyone</h3>
        <ul style="margin-left: 20px; line-height: 1.8;">
          <li>Browse all approved jobs without creating an account</li>
          <li>Create a free candidate account in under 2 minutes</li>
          <li>No premium tier required to apply for jobs</li>
          <li>Equal visibility for all candidates</li>
        </ul>
        <p style="margin-top: 16px;"><strong>Built to be accessible:</strong> JobPortal works on mobile and low-bandwidth connections. Your opportunity should not depend on your device.</p>
      `
    },
    "speedWithTrust": {
      title: "Speed with Trust",
      icon: "fa-gauge-high",
      content: `
        <h3>Fast Decisions, Safe Hires</h3>
        <ul style="margin-left: 20px; line-height: 1.8;">
          <li><strong>Employer verification:</strong> Every employer is reviewed before posting</li>
          <li><strong>AI moderation:</strong> Listings scored for quality before going live</li>
          <li><strong>Manual review:</strong> Flagged content reviewed by a human within 24 hours</li>
          <li><strong>Escrow payments:</strong> Shift workers paid only after confirmed completion</li>
        </ul>
        <p style="margin-top: 16px;">Speed should never come at the cost of safety. Trust controls run in the background on every action.</p>
      `
    },
    "simpleWorkflows": {
      title: "Simple Workflows",
      icon: "fa-diagram-project",
      content: `
        <h3>One Coherent Flow</h3>
        <p>The full journey — from discovering a job to receiving an offer — is designed as a single, smooth path:</p>
        <ol style="margin-left: 20px; line-height: 1.8; margin-top: 12px;">
          <li>Search and filter jobs on the Jobs page</li>
          <li>Shortlist interesting roles to save for later</li>
          <li>Apply with your profile and CV in one click</li>
          <li>Track all your applications from the Dashboard</li>
          <li>Chat directly with the employer if needed</li>
          <li>Get notified of status changes instantly</li>
        </ol>
        <p style="margin-top: 16px;">No scattered emails, no lost updates, no confusion about next steps.</p>
      `
    },
    "betterOutcomes": {
      title: "Better Outcomes",
      icon: "fa-trophy",
      content: `
        <h3>Higher Quality Matches</h3>
        <ul style="margin-left: 20px; line-height: 1.8;">
          <li><strong>Job signals:</strong> Clear salary, type, category, and deadline on every listing</li>
          <li><strong>Profile signals:</strong> Candidate skills, experience, and resume visible to employers</li>
          <li><strong>Rating system:</strong> Transparent company reviews from real candidates</li>
          <li><strong>Alert matching:</strong> Job alerts delivered when roles match your preferences</li>
        </ul>
        <p style="margin-top: 16px;">Both sides of the hiring equation get better information — resulting in fewer mismatches and faster, more confident decisions.</p>
      `
    },
    "hiringPartners": {
      title: "For Hiring Partners",
      icon: "fa-handshake",
      content: `
        <h3>Built for Hiring Teams</h3>
        <ul style="margin-left: 20px; line-height: 1.8;">
          <li><strong>Post jobs fast:</strong> Fill out a structured form — live in minutes after approval</li>
          <li><strong>Company profile:</strong> A dedicated page candidates can browse</li>
          <li><strong>Pipeline view:</strong> See all applicants and move them through stages</li>
          <li><strong>Shift jobs:</strong> Post short-term shifts with hourly rates and escrow payment</li>
          <li><strong>Analytics:</strong> Track views, applications, and pipeline conversion</li>
          <li><strong>Messaging:</strong> Chat directly with shortlisted candidates</li>
        </ul>
        <p style="margin-top: 16px;">Go to <a href="post-jobs.html" style="color:var(--primary,#2563eb);">Post a Job</a> to get started.</p>
      `
    },
    "jobSeekers": {
      title: "For Job Seekers",
      icon: "fa-user-tie",
      content: `
        <h3>Your Job Search, Simplified</h3>
        <ul style="margin-left: 20px; line-height: 1.8;">
          <li><strong>Free account:</strong> Create a profile with skills, experience, and resume</li>
          <li><strong>Apply easily:</strong> One-click apply with your saved profile</li>
          <li><strong>Job alerts:</strong> Get notified when matching roles are posted</li>
          <li><strong>Shift work:</strong> Browse and apply for short-term paid shift jobs</li>
          <li><strong>Resume parser:</strong> Upload your CV and let the platform extract your skills</li>
          <li><strong>Track progress:</strong> See all your applications and their status in one dashboard</li>
        </ul>
        <p style="margin-top: 16px;"><a href="register.html" style="color:var(--primary,#2563eb);">Create your free account →</a></p>
      `
    },
    "operations": {
      title: "Operations & Compliance",
      icon: "fa-clipboard-list",
      content: `
        <h3>Audit-Friendly Platform</h3>
        <ul style="margin-left: 20px; line-height: 1.8;">
          <li><strong>Shift logs:</strong> Complete audit trail of shift creation, booking, and payment</li>
          <li><strong>Escrow records:</strong> Every payment held and released is logged</li>
          <li><strong>Moderation history:</strong> All content decisions tracked with reason and score</li>
          <li><strong>Dispute resolution:</strong> Admins can freeze, dispute, or refund escrow payments</li>
          <li><strong>Admin controls:</strong> Full control over users, jobs, reviews, and platform data</li>
        </ul>
        <p style="margin-top: 16px;">Designed to be transparent — every action has a paper trail.</p>
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

  // Map feature cards to modals
  const featureMap = {
    "Trusted postings": "trustedPostings",
    "Action-ready workflows": "actionReadyWorkflows",
    "Fair access": "fairAccess",
    "Speed with trust": "speedWithTrust",
    "Simple workflows": "simpleWorkflows",
    "Better outcomes": "betterOutcomes",
    "Hiring partners": "hiringPartners",
    "Job seekers": "jobSeekers",
    "Operations": "operations"
  };

  // Map the pill row items
  const pillMap = {
    "Verified employers": "trustedPostings",
    "Escrow-backed shifts": "escrowBackedShifts",
    "Fast screening": "fastScreening"
  };

  // Attach to pills in hero section
  document.querySelectorAll(".pill").forEach((pill) => {
    const text = pill.textContent.trim();
    const key = pillMap[text];

    if (key) {
      const btn = document.createElement("button");
      btn.className = "btn-icon info-button";
      btn.setAttribute("title", "Learn more");
      btn.innerHTML = '<i class="fa-solid fa-circle-info"></i>';
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        createModal(key);
      });

      pill.style.position = "relative";
      pill.appendChild(btn);
    }
  });

  // Attach to feature cards (Why/Mission sections) and team menu-cards
  document.querySelectorAll(".feature-card, .menu-card").forEach((card) => {
    const title = card.querySelector("h3")?.textContent;
    const key = featureMap[title];

    if (key) {
      const btn = document.createElement("button");
      btn.className = "btn-icon info-button";
      btn.setAttribute("title", "Learn more");
      btn.innerHTML = '<i class="fa-solid fa-circle-info"></i>';
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        createModal(key);
      });

      card.style.position = "relative";
      card.appendChild(btn);
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

    .pill:hover .info-button,
    .feature-card:hover .info-button {
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
