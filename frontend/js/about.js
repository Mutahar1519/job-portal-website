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
    "Action-ready workflows": null, // No modal needed
    "Fair access": null,
    "Speed with trust": null,
    "Simple workflows": null,
    "Better outcomes": null
  };

  // Plus the "Why" section features
  const whyFeatureMap = {
    "Trusted postings": "trustedPostings",
    "Action-ready workflows": null,
    "Fair access": null
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

  // Attach to feature cards in "Why" section
  document.querySelectorAll(".feature-card").forEach((card) => {
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
