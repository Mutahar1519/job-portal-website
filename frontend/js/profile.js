document.addEventListener("DOMContentLoaded", async () => {
  const token = localStorage.getItem("token");
  if (!token) {
    window.location.href = "login.html";
    return;
  }

  const rawUser = localStorage.getItem("user");
  let user = {};
  if (rawUser) {
    try {
      user = JSON.parse(rawUser) || {};
    } catch (err) {
      console.error("Invalid JSON in localStorage.user", err);
      localStorage.removeItem("user");
      user = {};
    }
  }
  const profileKey = "profileData";
  const nameEl = document.getElementById("profileName");
  const emailEl = document.getElementById("profileEmail");
  const roleEl = document.getElementById("profileRole");
  const heroAvatar = document.getElementById("profileHeroAvatar");

  const form = document.getElementById("profileForm");
  const fullNameInput = document.getElementById("profileFullName");
  const phoneInput = document.getElementById("profilePhone");
  const countryInput = document.getElementById("profileCountry");
  const cityInput = document.getElementById("profileCity");
  const dobInput = document.getElementById("profileDob");
  const genderInput = document.getElementById("profileGender");
  const addressInput = document.getElementById("profileAddress");
  const linkedinInput = document.getElementById("profileLinkedIn");
  const portfolioInput = document.getElementById("profilePortfolio");
  const jobTitleInput = document.getElementById("profileJobTitle");
  const skillsInput = document.getElementById("profileSkills");
  const experienceInput = document.getElementById("profileExperience");
  const currentCompanyInput = document.getElementById("profileCurrentCompany");
  const expectedSalaryInput = document.getElementById("profileExpectedSalary");
  const preferredTypeInput = document.getElementById("profilePreferredType");
  const locationInput = document.getElementById("profileLocation");
  const bioInput = document.getElementById("profileBio");
  const photoInput = document.getElementById("profilePhoto");
  const photoFileInput = document.getElementById("profilePhotoFile");
  const resumeInput = document.getElementById("profileResume");

  const previewName = document.getElementById("profilePreviewName");
  const previewTitle = document.getElementById("profilePreviewTitle");
  const previewLocation = document.getElementById("profilePreviewLocation");
  const previewResume = document.getElementById("profilePreviewResume");
  const previewJobType = document.getElementById("profilePreviewJobType");
  const previewSkills = document.getElementById("profilePreviewSkills");
  const previewBio = document.getElementById("profilePreviewBio");
  const avatarWrap = document.getElementById("profileAvatarWrap");
  const jobSeekerFields = document.getElementById("jobSeekerFields");

  const setRoleUi = (currentUser) => {
    if (nameEl) nameEl.textContent = currentUser.name || "Your profile";
    if (emailEl) emailEl.textContent = currentUser.email || "";
    if (roleEl) {
      if (currentUser.is_admin) {
        roleEl.textContent = "Admin";
      } else if (currentUser.role === "employer") {
        roleEl.textContent = "Employer";
      } else {
        roleEl.textContent = "Job seeker";
      }
    }

    if (jobSeekerFields) {
      const showSeeker = currentUser.is_admin || currentUser.role === "job_seeker";
      jobSeekerFields.style.display = showSeeker ? "" : "none";
    }
  };

  setRoleUi(user);

  const getInitials = (value) => {
    if (!value) return "JP";
    const parts = value.trim().split(/\s+/).slice(0, 2);
    return parts.map(part => part[0]?.toUpperCase() || "").join("") || "JP";
  };

  const loadProfileData = () => {
    const raw = localStorage.getItem(profileKey);
    if (!raw) return {};
    try {
      return JSON.parse(raw) || {};
    } catch (err) {
      console.error("Invalid JSON in localStorage.profileData", err);
      localStorage.removeItem(profileKey);
      return {};
    }
  };

  const saveProfileData = (data) => {
    localStorage.setItem(profileKey, JSON.stringify(data));
  };

  const renderAvatar = (profile, displayName) => {
    const photo = profile.photoData || profile.photoUrl || "";
    const initials = getInitials(displayName);

    if (heroAvatar) {
      if (photo) {
        heroAvatar.innerHTML = `<img src="${photo}" alt="${displayName}" />`;
      } else {
        heroAvatar.textContent = initials;
      }
    }

    if (!avatarWrap) return;
    if (photo) {
      avatarWrap.innerHTML = `<img class="profile-avatar-img" src="${photo}" alt="${displayName}" />`;
      return;
    }

    avatarWrap.innerHTML = `<div class="profile-avatar">${initials}</div>`;
  };

  const renderProfile = (profile) => {
    const displayName = profile.name || user.name || "Your name";
    if (nameEl) nameEl.textContent = displayName;
    if (previewName) previewName.textContent = displayName;
    if (previewTitle) previewTitle.textContent = profile.jobTitle || "Open to new roles";
    if (previewLocation) previewLocation.textContent = profile.location || "";
    if (previewJobType) {
      previewJobType.textContent = profile.preferredJobType
        ? `Preferred: ${profile.preferredJobType}`
        : "";
    }
    if (previewBio) previewBio.textContent = profile.about || "";

    if (previewResume) {
      if (profile.resumeLink) {
        previewResume.href = profile.resumeLink;
        previewResume.textContent = "Resume";
        previewResume.style.display = "inline-flex";
      } else {
        previewResume.href = "#";
        previewResume.textContent = "No resume";
        previewResume.style.display = "inline-flex";
      }
    }

    if (previewSkills) {
      const skills = (profile.skills || "")
        .split(",")
        .map(item => item.trim())
        .filter(Boolean)
        .slice(0, 8);

      previewSkills.innerHTML = skills.length
        ? skills.map(skill => `<span class="pill">${skill}</span>`).join("")
        : "<span class=\"p-muted\">Add skills to show strengths</span>";
    }

    renderAvatar(profile, displayName);
  };

  const profileData = {
    name: user.name || "",
    phone: user.phone || "",
    country: user.country || "",
    city: user.city || "",
    dob: "",
    gender: "",
    address: "",
    linkedinUrl: "",
    portfolioUrl: "",
    jobTitle: "",
    skills: "",
    experienceYears: "",
    currentCompany: "",
    expectedSalary: "",
    preferredJobType: "",
    location: "",
    photoUrl: "",
    photoData: "",
    resumeLink: "",
    about: "",
    ...loadProfileData()
  };

  const setFormValues = (data) => {
    if (fullNameInput) fullNameInput.value = data.name || user.name || "";
    if (phoneInput) phoneInput.value = data.phone || "";
    if (countryInput) countryInput.value = data.country || "";
    if (cityInput) cityInput.value = data.city || "";
    if (dobInput) dobInput.value = data.dob || "";
    if (genderInput) genderInput.value = data.gender || "";
    if (addressInput) addressInput.value = data.address || "";
    if (linkedinInput) linkedinInput.value = data.linkedinUrl || "";
    if (portfolioInput) portfolioInput.value = data.portfolioUrl || "";
    if (jobTitleInput) jobTitleInput.value = data.jobTitle || "";
    if (skillsInput) skillsInput.value = data.skills || "";
    if (experienceInput) experienceInput.value = data.experienceYears ?? "";
    if (currentCompanyInput) currentCompanyInput.value = data.currentCompany || "";
    if (expectedSalaryInput) expectedSalaryInput.value = data.expectedSalary || "";
    if (preferredTypeInput) preferredTypeInput.value = data.preferredJobType || "";
    if (locationInput) locationInput.value = data.location || "";
    if (bioInput) bioInput.value = data.about || "";
    if (photoInput) photoInput.value = data.photoUrl || "";
    if (resumeInput) resumeInput.value = data.resumeLink || "";
  };

  const applyUserData = (me) => {
    if (!me) return;
    user = { ...user, ...me };
    profileData.name = me.name || profileData.name || "";
    profileData.phone = me.phone || "";
    profileData.country = me.country || "";
    profileData.city = me.city || "";
    setRoleUi(user);
    localStorage.setItem("user", JSON.stringify(user));
  };

  const applyJobSeekerProfile = (profile) => {
    if (!profile) return;
    profileData.dob = profile.dob || "";
    profileData.gender = profile.gender || "";
    profileData.address = profile.address || "";
    profileData.location = profile.location || "";
    profileData.linkedinUrl = profile.linkedin_url || "";
    profileData.portfolioUrl = profile.portfolio_url || "";
    profileData.jobTitle = profile.job_title || "";
    profileData.skills = profile.skills || "";
    profileData.experienceYears = Number.isFinite(profile.experience_years)
      ? profile.experience_years
      : profileData.experienceYears;
    profileData.currentCompany = profile.current_company || "";
    profileData.expectedSalary = profile.expected_salary || "";
    profileData.preferredJobType = profile.preferred_job_type || "";
    profileData.resumeLink = profile.resume_url || "";
    profileData.about = profile.about || "";
    profileData.photoUrl = profile.photo_url || profileData.photoUrl || "";
  };

  const hydrateProfile = async () => {
    try {
      const meRes = await authFetch(`${API}/users/me`);
      const me = await meRes.json();
      if (meRes.ok) {
        applyUserData(me);
      }
    } catch (err) {
      console.error(err);
    }

    if (user.is_admin || user.role === "job_seeker") {
      try {
        const profileRes = await authFetch(`${API}/users/job-seeker-profile`);
        const profile = await profileRes.json();
        if (profileRes.ok) {
          applyJobSeekerProfile(profile);
        }
      } catch (err) {
        console.error(err);
      }
    }

    setFormValues(profileData);
    renderProfile(profileData);
    saveProfileData(profileData);
  };

  hydrateProfile();

  const setCount = (id, value) => {
    const el = document.getElementById(id);
    if (el) el.textContent = String(value || 0);
  };

  try {
    const appsRes = await authFetch(`${API}/applications/my`);
    const apps = await appsRes.json();
    if (appsRes.ok) setCount("profileApplications", (apps || []).length);
  } catch (err) {
    console.error(err);
  }

  try {
    const savedRes = await authFetch(`${API}/saved-jobs`);
    const saved = await savedRes.json();
    if (savedRes.ok) setCount("profileSaved", (saved || []).length);
  } catch (err) {
    console.error(err);
  }

  try {
    const alertsRes = await authFetch(`${API}/job-alerts/shift-notifications`);
    const alerts = await alertsRes.json();
    if (alertsRes.ok) {
      const unread = (alerts || []).filter(item => !item.is_read).length;
      setCount("profileShiftAlerts", unread);
    }
  } catch (err) {
    console.error(err);
  }

  if (photoFileInput) {
    photoFileInput.addEventListener("change", (event) => {
      const file = event.target.files && event.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        profileData.photoData = reader.result;
        profileData.photoUrl = reader.result;
        renderProfile(profileData);
        saveProfileData(profileData);
      };
      reader.readAsDataURL(file);
    });
  }

  form?.addEventListener("submit", (event) => {
    event.preventDefault();
    profileData.name = fullNameInput?.value.trim() || "";
    profileData.phone = phoneInput?.value.trim() || "";
    profileData.country = countryInput?.value.trim() || "";
    profileData.city = cityInput?.value.trim() || "";
    profileData.dob = dobInput?.value || "";
    profileData.gender = genderInput?.value || "";
    profileData.address = addressInput?.value.trim() || "";
    profileData.linkedinUrl = linkedinInput?.value.trim() || "";
    profileData.portfolioUrl = portfolioInput?.value.trim() || "";
    profileData.jobTitle = jobTitleInput?.value.trim() || "";
    profileData.skills = skillsInput?.value.trim() || "";
    profileData.experienceYears = experienceInput?.value || "";
    profileData.currentCompany = currentCompanyInput?.value.trim() || "";
    profileData.expectedSalary = expectedSalaryInput?.value.trim() || "";
    profileData.preferredJobType = preferredTypeInput?.value || "";
    profileData.location = locationInput?.value.trim() || "";
    profileData.about = bioInput?.value.trim() || "";
    profileData.photoUrl = photoInput?.value.trim() || profileData.photoUrl || "";
    profileData.resumeLink = resumeInput?.value.trim() || "";

    saveProfileData(profileData);
    renderProfile(profileData);

    const saveProfile = async () => {
      try {
        const userRes = await authFetch(`${API}/users/me`, {
          method: "PUT",
          body: JSON.stringify({
            name: profileData.name,
            phone: profileData.phone,
            country: profileData.country,
            city: profileData.city
          })
        });

        const userData = await userRes.json();
        if (!userRes.ok) {
          throw new Error(userData.message || "Failed to update basic info");
        }

        const updatedUser = {
          ...user,
          name: profileData.name || user.name,
          phone: profileData.phone,
          country: profileData.country,
          city: profileData.city
        };
        localStorage.setItem("user", JSON.stringify(updatedUser));
        user = updatedUser;

        if (user.is_admin || user.role === "job_seeker") {
          const parsedExperience = Number(profileData.experienceYears);
          const profileRes = await authFetch(`${API}/users/job-seeker-profile`, {
            method: "PUT",
            body: JSON.stringify({
              photo_url: profileData.photoUrl,
              dob: profileData.dob,
              gender: profileData.gender,
              address: profileData.address,
              location: profileData.location,
              linkedin_url: profileData.linkedinUrl,
              portfolio_url: profileData.portfolioUrl,
              job_title: profileData.jobTitle,
              skills: profileData.skills,
              experience_years: Number.isFinite(parsedExperience) ? parsedExperience : null,
              current_company: profileData.currentCompany,
              expected_salary: profileData.expectedSalary,
              preferred_job_type: profileData.preferredJobType,
              resume_url: profileData.resumeLink,
              about: profileData.about
            })
          });

          const profileDataResp = await profileRes.json();
          if (!profileRes.ok) {
            throw new Error(profileDataResp.message || "Failed to update job seeker profile");
          }
        }

        if (window.toast) {
          window.toast("Profile updated");
        } else {
          alert("Profile updated");
        }
      } catch (err) {
        console.error(err);
        alert(err.message || "Failed to update profile");
      }
    };

    saveProfile();
  });

  // Delete Account Functionality
  const deleteAccountBtn = document.getElementById("deleteAccountBtn");
  const deleteAccountModal = document.getElementById("deleteAccountModal");
  const closeDeleteModal = document.getElementById("closeDeleteModal");
  const cancelDeleteBtn = document.getElementById("cancelDeleteBtn");
  const confirmDeleteBtn = document.getElementById("confirmDeleteBtn");
  const deleteConfirmInput = document.getElementById("deleteConfirmInput");
  const downloadDataBtn = document.getElementById("downloadDataBtn");

  if (deleteAccountBtn) {
    deleteAccountBtn.addEventListener("click", () => {
      deleteAccountModal.classList.remove("hidden");
      deleteConfirmInput.value = "";
      confirmDeleteBtn.disabled = true;
    });
  }

  if (closeDeleteModal) {
    closeDeleteModal.addEventListener("click", () => {
      deleteAccountModal.classList.add("hidden");
    });
  }

  if (cancelDeleteBtn) {
    cancelDeleteBtn.addEventListener("click", () => {
      deleteAccountModal.classList.add("hidden");
    });
  }

  // Enable/disable confirm button based on email match
  if (deleteConfirmInput) {
    deleteConfirmInput.addEventListener("input", (e) => {
      const userEmail = user.email || localStorage.getItem("userEmail") || "";
      confirmDeleteBtn.disabled = e.target.value.trim() !== userEmail;
    });
  }

  if (confirmDeleteBtn) {
    confirmDeleteBtn.addEventListener("click", async () => {
      const userEmail = user.email || localStorage.getItem("userEmail") || "";
      if (deleteConfirmInput.value.trim() !== userEmail) {
        alert("Email does not match");
        return;
      }

      if (!window.confirm("This action is permanent. Are you absolutely sure you want to delete your account?")) {
        return;
      }

      try {
        confirmDeleteBtn.disabled = true;
        confirmDeleteBtn.textContent = "Deleting...";

        const res = await authFetch(`${API}/users/me`, {
          method: "DELETE"
        });

        if (res.ok) {
          localStorage.removeItem("token");
          localStorage.removeItem("user");
          localStorage.removeItem("profileData");
          if (window.toast) {
            window.toast("Account deleted successfully");
          }
          setTimeout(() => {
            window.location.href = "index.html";
          }, 1000);
        } else {
          const error = await res.json();
          throw new Error(error.message || "Failed to delete account");
        }
      } catch (err) {
        console.error(err);
        alert(err.message || "Failed to delete account");
        confirmDeleteBtn.disabled = false;
        confirmDeleteBtn.textContent = "Delete Account Permanently";
      }
    });
  }

  // Download Data Functionality
  if (downloadDataBtn) {
    downloadDataBtn.addEventListener("click", async () => {
      try {
        downloadDataBtn.disabled = true;
        downloadDataBtn.textContent = "Preparing...";

        const meRes = await authFetch(`${API}/users/me`);
        const userData = await meRes.json();

        let profileData = {};
        if (user.is_admin || user.role === "job_seeker") {
          const profileRes = await authFetch(`${API}/users/job-seeker-profile`);
          profileData = await profileRes.json();
        }

        const dataExport = {
          exportDate: new Date().toISOString(),
          userInfo: userData,
          profileInfo: profileData
        };

        const blob = new Blob([JSON.stringify(dataExport, null, 2)], {
          type: "application/json"
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `jobportal-data-${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);

        if (window.toast) {
          window.toast("Data downloaded successfully");
        }
      } catch (err) {
        console.error(err);
        alert("Failed to download data");
      } finally {
        downloadDataBtn.disabled = false;
        downloadDataBtn.textContent = "Download Data";
      }
    });
  }
});

