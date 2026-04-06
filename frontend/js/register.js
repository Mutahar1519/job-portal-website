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
  const idDocumentUrl = document.getElementById("idDocumentUrl")?.value.trim();
  const businessCertificateUrl = document.getElementById("businessCertificateUrl")?.value.trim();
  const taxRegistrationNumber = document.getElementById("taxRegistrationNumber")?.value.trim();
  const authorizationLetterUrl = document.getElementById("authorizationLetterUrl")?.value.trim();
  const linkedinProfileUrl = document.getElementById("linkedinProfileUrl")?.value.trim();
  const proofOfAddressUrl = document.getElementById("proofOfAddressUrl")?.value.trim();
  const idDocumentFile = document.getElementById("idDocumentFile")?.files?.[0] || null;
  const businessCertificateFile = document.getElementById("businessCertificateFile")?.files?.[0] || null;
  const proofOfAddressFile = document.getElementById("proofOfAddressFile")?.files?.[0] || null;
  const authorizationLetterFile = document.getElementById("authorizationLetterFile")?.files?.[0] || null;

  const selectedRole = document.querySelector("input[name='accountType']:checked");
  const roleValue = selectedRole?.value === "employer" ? "employer" : "job_seeker";
  const phoneDigitsOnly = /^\d+$/;

  if (!name || !email || !password || !phone) {
    alert("All fields are required");
    return;
  }

  if (!phoneDigitsOnly.test(phone)) {
    alert("Phone number must contain only digits");
    return;
  }

  if (companyPhone && !phoneDigitsOnly.test(companyPhone)) {
    alert("Company phone must contain only digits");
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

  const isValidHttpUrl = (value) => !value || /^https?:\/\/.{4,}/i.test(value);

  if (roleValue === "employer" && ((!idDocumentUrl && !idDocumentFile) || (!businessCertificateUrl && !businessCertificateFile) || !taxRegistrationNumber)) {
    alert("For UK employer verification, provide: Passport or Driving Licence (URL or upload), Certificate of Incorporation or HMRC letter (URL or upload), and VAT Number or UTR.");
    return;
  }

  if (!isValidHttpUrl(companyWebsite) || !isValidHttpUrl(idDocumentUrl) || !isValidHttpUrl(businessCertificateUrl) || !isValidHttpUrl(authorizationLetterUrl) || !isValidHttpUrl(linkedinProfileUrl) || !isValidHttpUrl(proofOfAddressUrl)) {
    alert("Please provide valid http(s) links for website and verification URLs");
    return;
  }

  try {
    const formData = new FormData();
    formData.append("name", name || "");
    formData.append("email", email || "");
    formData.append("password", password || "");
    formData.append("phone", phone || "");
    formData.append("country", country || "");
    formData.append("city", city || "");
    formData.append("role", roleValue);
    formData.append("company_name", companyName || "");
    formData.append("company_website", companyWebsite || "");
    formData.append("company_location", companyLocation || "");
    formData.append("company_phone", companyPhone || "");
    formData.append("company_address", companyAddress || "");
    formData.append("id_document_url", idDocumentUrl || "");
    formData.append("business_certificate_url", businessCertificateUrl || "");
    formData.append("tax_registration_number", taxRegistrationNumber || "");
    formData.append("authorization_letter_url", authorizationLetterUrl || "");
    formData.append("linkedin_profile_url", linkedinProfileUrl || "");
    formData.append("proof_of_address_url", proofOfAddressUrl || "");

    if (idDocumentFile) formData.append("id_document_file", idDocumentFile);
    if (businessCertificateFile) formData.append("business_certificate_file", businessCertificateFile);
    if (proofOfAddressFile) formData.append("proof_of_address_file", proofOfAddressFile);
    if (authorizationLetterFile) formData.append("authorization_letter_file", authorizationLetterFile);

    const res = await fetch(`${API}/users/register`, {
      method: "POST",
      body: formData
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
  const countryCities = {
    "United Kingdom": ["London", "Manchester", "Birmingham", "Leeds", "Glasgow"],
    "United States": ["New York", "Los Angeles", "Chicago", "Houston", "San Francisco"],
    Canada: ["Toronto", "Vancouver", "Montreal", "Calgary", "Ottawa"],
    Australia: ["Sydney", "Melbourne", "Brisbane", "Perth", "Adelaide"],
    India: ["Mumbai", "Delhi", "Bengaluru", "Hyderabad", "Pune"],
    Pakistan: ["Karachi", "Lahore", "Islamabad", "Rawalpindi", "Faisalabad"],
    "United Arab Emirates": ["Dubai", "Abu Dhabi", "Sharjah", "Ajman", "Al Ain"]
  };

  const employerFields = document.getElementById("employerFields");
  const jobSeekerFields = document.getElementById("jobSeekerFields");
  const roleInputs = Array.from(document.querySelectorAll("input[name='accountType']"));
  const country = document.getElementById("country");
  const city = document.getElementById("city");
  const phone = document.getElementById("phone");
  const companyPhone = document.getElementById("companyPhone");

  const sanitizeDigits = (value) => String(value || "").replace(/\D+/g, "");

  const bindDigitsOnlyInput = (input) => {
    if (!input) return;
    input.addEventListener("input", () => {
      const clean = sanitizeDigits(input.value);
      if (clean !== input.value) {
        input.value = clean;
      }
    });
  };

  const pickCountryFromLocale = () => {
    const locale = String(navigator.language || "").toLowerCase();
    const timezone = String(Intl.DateTimeFormat().resolvedOptions().timeZone || "").toLowerCase();

    if (timezone.includes("europe/london") || locale.endsWith("-gb")) return "United Kingdom";
    if (timezone.includes("america/") || locale.endsWith("-us")) return "United States";
    if (timezone.includes("toronto") || timezone.includes("vancouver") || locale.endsWith("-ca")) return "Canada";
    if (timezone.includes("australia/") || locale.endsWith("-au")) return "Australia";
    if (timezone.includes("asia/karachi") || locale.endsWith("-pk")) return "Pakistan";
    if (timezone.includes("asia/dubai") || locale.endsWith("-ae")) return "United Arab Emirates";
    if (timezone.includes("asia/kolkata") || locale.endsWith("-in")) return "India";
    return "";
  };

  const fillCities = (selectedCountry) => {
    if (!city) return;
    const cities = countryCities[selectedCountry] || [];
    const previousValue = city.value;
    city.innerHTML = '<option value="">Select city</option>';
    cities.forEach((cityName) => {
      const option = document.createElement("option");
      option.value = cityName;
      option.textContent = cityName;
      city.appendChild(option);
    });

    if (cities.includes(previousValue)) {
      city.value = previousValue;
    }
  };

  bindDigitsOnlyInput(phone);
  bindDigitsOnlyInput(companyPhone);

  country?.addEventListener("change", () => {
    fillCities(country.value);
  });

  if (country && !country.value) {
    const autoCountry = pickCountryFromLocale();
    if (autoCountry && countryCities[autoCountry]) {
      country.value = autoCountry;
    }
  }

  fillCities(country?.value || "");

  const setRoleState = (role) => {
    const isEmployer = role === "employer";
    if (employerFields) {
      employerFields.classList.toggle("hidden", !isEmployer);
    }
    if (jobSeekerFields) {
      jobSeekerFields.classList.toggle("hidden", isEmployer);
    }

    const companyName = document.getElementById("companyName");
    const companyLocation = document.getElementById("companyLocation");
    const idDocumentUrl = document.getElementById("idDocumentUrl");
    const businessCertificateUrl = document.getElementById("businessCertificateUrl");
    const taxRegistrationNumber = document.getElementById("taxRegistrationNumber");

    if (country) country.required = !isEmployer;
    if (city) city.required = !isEmployer;
    if (companyName) companyName.required = isEmployer;
    if (companyLocation) companyLocation.required = isEmployer;
    if (idDocumentUrl) idDocumentUrl.required = isEmployer;
    if (businessCertificateUrl) businessCertificateUrl.required = isEmployer;
    if (taxRegistrationNumber) taxRegistrationNumber.required = isEmployer;
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
