document.addEventListener("DOMContentLoaded", async () => {
  const form = document.getElementById("companyForm");
  const preview = document.getElementById("companyPreview");
  const modeLabel = document.getElementById("companyMode");
  const shareLabel = document.getElementById("companyShare");
  const editor = document.getElementById("companyEditor");

  const fields = {
    name: document.getElementById("companyName"),
    phone: document.getElementById("companyPhone"),
    website: document.getElementById("companyWebsite"),
    location: document.getElementById("companyLocation"),
    address: document.getElementById("companyAddress"),
    size: document.getElementById("companySize"),
    industry: document.getElementById("companyIndustry"),
    founded: document.getElementById("companyFounded"),
    logo_url: document.getElementById("companyLogo"),
    registration: document.getElementById("companyRegistration"),
    linkedin: document.getElementById("companyLinkedIn"),
    taxId: document.getElementById("companyTaxId"),
    description: document.getElementById("companyDescription")
  };

  let currentCompany = null;
  const params = new URLSearchParams(window.location.search);
  const publicCompanyId = params.get("companyId");

  const renderPreview = (data) => {
    if (!preview) return;

    if (!data) {
      preview.innerHTML = "<p class=\"p-muted\">Add details to see a preview.</p>";
      return;
    }

    const logo = data.logo_url
      ? `<img class=\"company-logo\" src=\"${data.logo_url}\" alt=\"${data.name}\" />`
      : "";

    preview.innerHTML = `
      <div class="company-preview-card">
        ${logo}
        <h3>${data.name || ""}</h3>
        <p class="p-muted">${data.industry || ""}${data.industry && data.location ? " • " : ""}${data.location || ""}</p>
        <div class="company-meta">
          ${data.website ? `<a href="${data.website}" target="_blank">${data.website}</a>` : ""}
          ${data.size ? `<span>${data.size}</span>` : ""}
        </div>
        ${data.phone ? `<p class="p-muted">Phone: ${data.phone}</p>` : ""}
        ${data.address ? `<p class="p-muted">Address: ${data.address}</p>` : ""}
        ${data.founded ? `<p class="p-muted">Founded: ${data.founded}</p>` : ""}
        <p>${data.description || ""}</p>
      </div>
    `;
  };

  const setForm = (data) => {
    if (!data) return;
    fields.name.value = data.name || "";
    if (fields.phone) fields.phone.value = data.phone || "";
    fields.website.value = data.website || "";
    fields.location.value = data.location || "";
    if (fields.address) fields.address.value = data.address || "";
    fields.size.value = data.size || "";
    fields.industry.value = data.industry || "";
    if (fields.founded) fields.founded.value = data.founded || "";
    fields.logo_url.value = data.logo_url || "";
    if (fields.registration) fields.registration.value = data.registration || "";
    if (fields.linkedin) fields.linkedin.value = data.linkedin || "";
    if (fields.taxId) fields.taxId.value = data.taxId || "";
    fields.description.value = data.description || "";
  };

  const getPayload = () => {
    return {
      name: fields.name.value.trim(),
      website: fields.website.value.trim(),
      location: fields.location.value.trim(),
      size: fields.size.value.trim(),
      industry: fields.industry.value.trim(),
      logo_url: fields.logo_url.value.trim(),
      description: fields.description.value.trim()
    };
  };

  const getEmployerPayload = () => {
    return {
      company_name: fields.name.value.trim(),
      company_phone: fields.phone?.value.trim() || "",
      company_address: fields.address?.value.trim() || "",
      company_location: fields.location.value.trim(),
      website: fields.website.value.trim(),
      industry: fields.industry.value.trim(),
      company_size: fields.size.value.trim(),
      founded_year: fields.founded?.value.trim() || "",
      description: fields.description.value.trim(),
      registration_number: fields.registration?.value.trim() || "",
      linkedin_url: fields.linkedin?.value.trim() || "",
      tax_id: fields.taxId?.value.trim() || ""
    };
  };

  const updatePreviewFromForm = () => {
    const company = getPayload();
    const employer = getEmployerPayload();
    renderPreview({
      ...company,
      phone: employer.company_phone,
      address: employer.company_address,
      founded: employer.founded_year
    });
  };

  if (publicCompanyId) {
    if (editor) editor.style.display = "none";
    if (modeLabel) modeLabel.textContent = "Public company profile";
    if (shareLabel) shareLabel.textContent = "";

    try {
      const res = await fetch(`${API}/companies/${publicCompanyId}`);
      const data = await res.json();
      if (!res.ok) {
        renderPreview(null);
        if (modeLabel) modeLabel.textContent = data.message || "Company not found";
        return;
      }
      renderPreview(data);
    } catch (err) {
      console.error(err);
      renderPreview(null);
      if (modeLabel) modeLabel.textContent = "Failed to load company profile";
    }

    return;
  }

  const token = localStorage.getItem("token");
  if (!token) {
    alert("Login required");
    window.location.href = "login.html";
    return;
  }

  const loadMyCompany = async () => {
    try {
      const res = await authFetch(`${API}/companies/me`);
      const data = await res.json();

      if (!res.ok) {
        if (modeLabel) modeLabel.textContent = "Create your company profile";
        renderPreview(null);
        return;
      }

      currentCompany = data;
      setForm(data);
      renderPreview(data);
      if (modeLabel) modeLabel.textContent = "Edit your company profile";

      if (shareLabel && data?.id) {
        shareLabel.textContent = `Public link: ${window.location.origin}/company.html?companyId=${data.id}`;
      }
    } catch (err) {
      console.error(err);
      if (modeLabel) modeLabel.textContent = "Failed to load company profile";
      renderPreview(null);
    }
  };

  const loadEmployerProfile = async () => {
    try {
      const res = await authFetch(`${API}/users/employer-profile`);
      const data = await res.json();
      if (!res.ok || !data) return;

      setForm({
        name: data.company_name || fields.name.value,
        phone: data.company_phone || "",
        website: data.website || fields.website.value,
        location: data.company_location || fields.location.value,
        address: data.company_address || "",
        size: data.company_size || fields.size.value,
        industry: data.industry || fields.industry.value,
        founded: data.founded_year || "",
        logo_url: fields.logo_url.value,
        registration: data.registration_number || "",
        linkedin: data.linkedin_url || "",
        taxId: data.tax_id || "",
        description: data.description || fields.description.value
      });
    } catch (err) {
      console.error(err);
    }
  };

  await loadMyCompany();
  await loadEmployerProfile();

  form?.addEventListener("input", updatePreviewFromForm);

  form?.addEventListener("submit", async (event) => {
    event.preventDefault();

    const payload = getPayload();
    if (!payload.name) {
      alert("Company name is required");
      return;
    }

    const employerPayload = getEmployerPayload();

    try {
      const res = await authFetch(`${API}/companies${currentCompany ? "/me" : ""}`, {
        method: currentCompany ? "PUT" : "POST",
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) {
        alert(data.message || "Failed to save company profile");
        return;
      }

      const employerRes = await authFetch(`${API}/users/employer-profile`, {
        method: "PUT",
        body: JSON.stringify(employerPayload)
      });

      const employerData = await employerRes.json();
      if (!employerRes.ok) {
        alert(employerData.message || "Failed to save employer profile");
        return;
      }

      alert(currentCompany ? "Company updated" : "Company created");
      await loadMyCompany();
      await loadEmployerProfile();
    } catch (err) {
      console.error(err);
      alert("Failed to save company profile");
    }
  });
});
