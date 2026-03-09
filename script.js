function loadJobs() {
  fetch("http://localhost:3000/jobs")
    .then(res => res.json())
    .then(data => {
      const ul = document.getElementById("jobs");
      ul.innerHTML = "";
      data.forEach(job => {
        ul.innerHTML += `<li>${job.title} - ${job.location}</li>`;
      });
    });
}

function addJob() {
  const token = localStorage.getItem("token");

  fetch("http://localhost:3000/jobs", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": "Bearer " + token
    },
    body: JSON.stringify({
      title: document.getElementById("title").value,
      location: document.getElementById("location").value,
      job_type: "Full Time",
      category: "IT",
      description: "Frontend added job with proper JWT auth",
      userId: 3,
      is_premium: false
    })
  })
  .then(res => res.json())
  .then(data => alert(data.message))
  .catch(err => console.error(err));
}



function sendMsg() {
  fetch("http://localhost:3000/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      message: document.getElementById("msg").value
    })
  })
  .then(res => res.json())
  .then(data => {
    document.getElementById("reply").innerText = data.reply;
  });
}
