document.getElementById("registerForm")?.addEventListener("submit", async (event) => {
  event.preventDefault();

  const name = document.getElementById("name")?.value.trim();
  const email = document.getElementById("email")?.value.trim();
  const phone = document.getElementById("phone")?.value.trim();
  const password = document.getElementById("password")?.value.trim();
  const confirmPasswordInput = document.getElementById("confirmPassword");
  const confirmPassword = confirmPasswordInput ? confirmPasswordInput.value.trim() : "";
  const country = document.getElementById("country")?.value.trim();
  const city = document.getElementById("city")?.value.trim();
  const companyName = document.getElementById("companyName")?.value.trim();
  const companyWebsite = document.getElementById("companyWebsite")?.value.trim();
  const companyLocation = document.getElementById("companyLocation")?.value.trim();
  const companyPhone = document.getElementById("companyPhone")?.value.trim();
  const companyAddress = document.getElementById("companyAddress")?.value.trim();

  const selectedRole = document.querySelector("input[name='accountType']:checked");
  const roleValue = selectedRole?.value === "employer" ? "employer" : "job_seeker";

  if (!name || !email || !password || !phone) {
    alert("All fields are required");
    return;
  }

  if (confirmPasswordInput && password !== confirmPassword) {
    alert("Passwords do not match");
    return;
  }

  if (roleValue === "job_seeker" && (!country || !city)) {
    alert("Country and city are required");
    return;
  }

  if (roleValue === "employer" && (!companyName || !companyLocation)) {
    alert("Company name and location are required");
    return;
  }

  try {
    const res = await fetch(`${API}/users/register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        name,
        email,
        password,
        phone,
        country,
        city,
        role: roleValue,
        company_name: companyName,
        company_website: companyWebsite,
        company_location: companyLocation,
        company_phone: companyPhone,
        company_address: companyAddress
      })
    });

    const responseText = await res.text();
    const data = typeof safeParseJson === "function"
      ? safeParseJson(responseText, "registerResponse")
      : (() => {
          try {
            return JSON.parse(responseText);
          } catch (err) {
            return null;
          }
        })();

    if (!data && responseText) {
      console.error("Non-JSON response from register:", responseText);
    }

    if (!res.ok) {
      alert((data && data.message) || "Registration failed");
      return;
    }

    alert("Registration successful. Please check your email to verify your account.");
    window.location.href = "login.html";
  } catch (err) {
    console.error(err);
    alert("Server error");
  }
});

(() => {
  const employerFields = document.getElementById("employerFields");
  const jobSeekerFields = document.getElementById("jobSeekerFields");
  const roleInputs = Array.from(document.querySelectorAll("input[name='accountType']"));

  const setRoleState = (role) => {
    const isEmployer = role === "employer";
    if (employerFields) {
      employerFields.classList.toggle("hidden", !isEmployer);
    }
    if (jobSeekerFields) {
      jobSeekerFields.classList.toggle("hidden", isEmployer);
    }

    const country = document.getElementById("country");
    const city = document.getElementById("city");
    const companyName = document.getElementById("companyName");
    const companyLocation = document.getElementById("companyLocation");

    if (country) country.required = !isEmployer;
    if (city) city.required = !isEmployer;
    if (companyName) companyName.required = isEmployer;
    if (companyLocation) companyLocation.required = isEmployer;
  };

  const initialRole = new URLSearchParams(window.location.search).get("role");
  if (initialRole === "employer" || initialRole === "job_seeker") {
    roleInputs.forEach((input) => {
      input.checked = input.value === (initialRole === "employer" ? "employer" : "job_seeker");
    });
  }

  const selected = roleInputs.find(input => input.checked);
  setRoleState(selected?.value === "employer" ? "employer" : "job_seeker");

  roleInputs.forEach((input) => {
    input.addEventListener("change", () => {
      setRoleState(input.value === "employer" ? "employer" : "job_seeker");
    });
  });
})();
