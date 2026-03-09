const defaultReviews = [
  {
    name: "Lena Ortiz",
    role: "Product Designer",
    rating: 5,
    message: "Found a role in a week. The premium listings are super clear and high quality."
  },
  {
    name: "Amir Khan",
    role: "Hiring Manager",
    rating: 4,
    message: "Shortlisted candidates faster than any other board. Clean UI and great reach."
  },
  {
    name: "Riley Chen",
    role: "Frontend Engineer",
    rating: 5,
    message: "The dashboard is the best part. Everything I applied to is tracked in one place."
  }
];

const renderReviews = (reviews) => {
  const grid = document.getElementById("reviewsGrid");
  if (!grid) return;

  grid.innerHTML = "";
  reviews.forEach((review) => {
    const stars = "★★★★★".slice(0, review.rating) + "☆☆☆☆☆".slice(0, 5 - review.rating);
    grid.innerHTML += `
      <article class="review-card">
        <div class="review-header">
          <div>
            <h3>${review.name}</h3>
            <p class="meta">${review.role}</p>
          </div>
          <span class="review-stars">${stars}</span>
        </div>
        <p class="review-message">${review.message}</p>
      </article>
    `;
  });
};

const loadReviews = async () => {
  try {
    const res = await fetch(`${API}/reviews?limit=12`);
    const data = await res.json();
    const apiReviews = Array.isArray(data) ? data : [];
    renderReviews([...apiReviews, ...defaultReviews]);
  } catch (err) {
    renderReviews([...defaultReviews]);
  }
};

const initReviews = () => {
  loadReviews();

  const form = document.getElementById("reviewForm");
  if (!form) return;

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const nameInput = document.getElementById("reviewName");
    const roleInput = document.getElementById("reviewRole");
    const ratingInput = document.getElementById("reviewRating");
    const messageInput = document.getElementById("reviewMessage");

    const name = nameInput.value.trim();
    const role = roleInput.value.trim();
    const rating = Number(ratingInput.value);
    const message = messageInput.value.trim();

    if (!name || !role || !message || Number.isNaN(rating)) {
      alert("Please fill all review fields");
      return;
    }

    const res = await fetch(`${API}/reviews`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, role, rating, message })
    });

    const data = await res.json();
    if (!res.ok) {
      alert(data.message || "Failed to submit review");
      return;
    }

    form.reset();
    alert("Thanks! Your review is pending approval.");
  });
};

document.addEventListener("DOMContentLoaded", initReviews);
