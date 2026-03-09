const db = require("../config/mysql");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const nodemailer = require("nodemailer");

const isEmail = (value) => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value || "");
};

const normalizeRole = (value) => {
  const role = (value || "").trim().toLowerCase();
  if (!role) return "job_seeker";
  if (["job_seeker", "employer", "admin"].includes(role)) return role;
  return null;
};

const getMailer = () => {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.SMTP_FROM;

  if (!host || !user || !pass || !from) {
    return null;
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass }
  });

  return { transporter, from };
};

const createEmailVerification = (user, cb) => {
  const token = crypto.randomBytes(32).toString("hex");
  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

  db.query("DELETE FROM email_verifications WHERE user_id = ?", [user.id], (deleteErr) => {
    if (deleteErr) return cb(deleteErr);

    db.query(
      "INSERT INTO email_verifications (user_id, token_hash, expires_at) VALUES (?, ?, ?)",
      [user.id, tokenHash, expiresAt],
      async (insertErr) => {
        if (insertErr) return cb(insertErr);

        const verifyUrl = `${process.env.FRONTEND_URL || "http://localhost:3000"}/verify-email.html?token=${token}`;
        const mailer = getMailer();

        if (mailer) {
          try {
            await mailer.transporter.sendMail({
              from: mailer.from,
              to: user.email,
              subject: "Verify your JobPortal email",
              text: `Hi ${user.name || ""},\n\nVerify your email: ${verifyUrl}\nThis link expires in 24 hours.\n\nIf you did not create this account, you can ignore this email.`
            });
          } catch (mailErr) {
            console.error("Verification email failed:", mailErr);
          }
        } else {
          console.warn("SMTP not configured. Verification link:", verifyUrl);
        }

        return cb(null);
      }
    );
  });
};

/* REGISTER */
exports.registerUser = async (req, res) => {
  const name = (req.body.name || "").trim();
  const email = (req.body.email || "").trim().toLowerCase();
  const password = (req.body.password || "").trim();
  const phone = (req.body.phone || "").trim();
  const country = (req.body.country || "").trim();
  const city = (req.body.city || "").trim();
  const role = normalizeRole(req.body.role || req.body.accountType);

  const companyName = (req.body.company_name || req.body.companyName || "").trim();
  const companyWebsite = (req.body.company_website || req.body.companyWebsite || "").trim();
  const companyLocation = (req.body.company_location || req.body.companyLocation || "").trim();
  const companyPhone = (req.body.company_phone || req.body.companyPhone || "").trim();
  const companyAddress = (req.body.company_address || req.body.companyAddress || "").trim();

  if (!name || !email || !password) {
    return res.status(400).json({ message: "All fields required" });
  }

  if (!role) {
    return res.status(400).json({ message: "Invalid role" });
  }

  if (!isEmail(email)) {
    return res.status(400).json({ message: "Invalid email format" });
  }

  if (password.length < 6) {
    return res.status(400).json({ message: "Password must be at least 6 characters" });
  }

  if (!phone) {
    return res.status(400).json({ message: "Phone is required" });
  }

  if (role === "job_seeker" && (!country || !city)) {
    return res.status(400).json({ message: "Country and city are required" });
  }

  if (role === "employer" && (!companyName || !companyLocation)) {
    return res.status(400).json({ message: "Company name and location are required" });
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  const sql = `
    INSERT INTO users (name, email, password, phone, role, country, city)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `;

  db.query(sql, [name, email, hashedPassword, phone, role, country || null, city || null], (err, result) => {
    if (err) {
      if (err.code === "ER_DUP_ENTRY") {
        return res.status(400).json({ message: "Email already exists" });
      }
      return res.status(500).json({ error: err.message });
    }

    const userId = result.insertId;

    if (role === "employer") {
      db.query(
        `INSERT INTO companies (owner_user_id, name, website, location)
         VALUES (?, ?, ?, ?)`
        ,[
          userId,
          companyName,
          companyWebsite || null,
          companyLocation || null
        ],
        (companyErr) => {
          if (companyErr) {
            return res.status(500).json({ error: companyErr.message });
          }

          db.query(
            `INSERT INTO employer_profiles (user_id, company_name, company_phone, company_address, company_location, website)
             VALUES (?, ?, ?, ?, ?, ?)`
            ,[
              userId,
              companyName,
              companyPhone || null,
              companyAddress || null,
              companyLocation || null,
              companyWebsite || null
            ],
            (profileErr) => {
              if (profileErr) {
                return res.status(500).json({ error: profileErr.message });
              }

              const user = { id: userId, email, name };
              createEmailVerification(user, (verifyErr) => {
                if (verifyErr) {
                  return res.status(500).json({ error: verifyErr.message });
                }
                res.status(201).json({ message: "Employer registered. Please verify your email." });
              });
            }
          );
        }
      );
      return;
    }

    db.query(
      `INSERT INTO job_seeker_profiles (user_id)
       VALUES (?)`,
      [userId],
      (profileErr) => {
        if (profileErr) {
          return res.status(500).json({ error: profileErr.message });
        }

        const user = { id: userId, email, name };
        createEmailVerification(user, (verifyErr) => {
          if (verifyErr) {
            return res.status(500).json({ error: verifyErr.message });
          }
          res.status(201).json({ message: "Registration successful. Please verify your email." });
        });
      }
    );
  });
};

/* LOGIN + JWT */
exports.loginUser = (req, res) => {
  const email = (req.body.email || "").trim().toLowerCase();
  const password = (req.body.password || "").trim();

  if (!email || !password) {
    return res.status(400).json({ message: "Email and password are required" });
  }

  if (!isEmail(email)) {
    return res.status(400).json({ message: "Invalid email format" });
  }

  const sql = "SELECT * FROM users WHERE email = ?";

  db.query(sql, [email], async (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    if (results.length === 0) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const user = results[0];
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    /* 🔐 CREATE TOKEN */
    const token = jwt.sign(
      { id: user.id, is_admin: !!user.is_admin, role: user.role || "job_seeker" },
      "secret123",
      { expiresIn: "1d" }
    );

    res.json({
      message: "Login successful",
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        verified: user.verified,
        is_admin: user.is_admin,
        role: user.role || "job_seeker",
        phone: user.phone || "",
        country: user.country || "",
        city: user.city || ""
      }
    });
  });
};

/* GET CURRENT USER */
exports.getMe = (req, res) => {
  db.query(
    "SELECT id, name, email, role, phone, country, city, verified, is_admin FROM users WHERE id = ?",
    [req.user.id],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      if (!rows.length) return res.status(404).json({ message: "User not found" });
      res.json(rows[0]);
    }
  );
};

/* UPDATE CURRENT USER */
exports.updateMe = (req, res) => {
  const name = (req.body.name || "").trim();
  const phone = (req.body.phone || "").trim();
  const country = (req.body.country || "").trim();
  const city = (req.body.city || "").trim();

  if (!name) {
    return res.status(400).json({ message: "Name is required" });
  }

  db.query(
    `UPDATE users SET name = ?, phone = ?, country = ?, city = ? WHERE id = ?`,
    [name, phone || null, country || null, city || null, req.user.id],
    (err) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ message: "Profile updated" });
    }
  );
};

/* GET JOB SEEKER PROFILE */
exports.getJobSeekerProfile = (req, res) => {
  db.query(
    "SELECT * FROM users WHERE id = ?",
    [req.user.id],
    (roleErr, users) => {
      if (roleErr) return res.status(500).json({ error: roleErr.message });
      if (!users.length) return res.status(404).json({ message: "User not found" });
      if (!users[0].is_admin && users[0].role !== "job_seeker") {
        return res.status(403).json({ message: "Job seeker access only" });
      }

      db.query(
        "SELECT * FROM job_seeker_profiles WHERE user_id = ?",
        [req.user.id],
        (err, rows) => {
          if (err) return res.status(500).json({ error: err.message });
          if (!rows.length) return res.json(null);
          res.json(rows[0]);
        }
      );
    }
  );
};

/* UPDATE JOB SEEKER PROFILE */
exports.updateJobSeekerProfile = (req, res) => {
  const payload = {
    photo_url: (req.body.photo_url || "").trim(),
    dob: (req.body.dob || "").trim(),
    gender: (req.body.gender || "").trim(),
    address: (req.body.address || "").trim(),
    location: (req.body.location || "").trim(),
    linkedin_url: (req.body.linkedin_url || "").trim(),
    portfolio_url: (req.body.portfolio_url || "").trim(),
    job_title: (req.body.job_title || "").trim(),
    skills: (req.body.skills || "").trim(),
    experience_years: req.body.experience_years ? Number(req.body.experience_years) : null,
    current_company: (req.body.current_company || "").trim(),
    expected_salary: (req.body.expected_salary || "").trim(),
    preferred_job_type: (req.body.preferred_job_type || "").trim(),
    resume_url: (req.body.resume_url || "").trim(),
    about: (req.body.about || "").trim()
  };

  db.query(
    "SELECT role, is_admin FROM users WHERE id = ?",
    [req.user.id],
    (roleErr, users) => {
      if (roleErr) return res.status(500).json({ error: roleErr.message });
      if (!users.length) return res.status(404).json({ message: "User not found" });
      if (!users[0].is_admin && users[0].role !== "job_seeker") {
        return res.status(403).json({ message: "Job seeker access only" });
      }

      db.query(
        `INSERT INTO job_seeker_profiles
          (user_id, photo_url, dob, gender, address, location, linkedin_url, portfolio_url,
           job_title, skills, experience_years, current_company, expected_salary, preferred_job_type,
           resume_url, about)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           photo_url = VALUES(photo_url),
           dob = VALUES(dob),
           gender = VALUES(gender),
           address = VALUES(address),
           location = VALUES(location),
           linkedin_url = VALUES(linkedin_url),
           portfolio_url = VALUES(portfolio_url),
           job_title = VALUES(job_title),
           skills = VALUES(skills),
           experience_years = VALUES(experience_years),
           current_company = VALUES(current_company),
           expected_salary = VALUES(expected_salary),
           preferred_job_type = VALUES(preferred_job_type),
           resume_url = VALUES(resume_url),
           about = VALUES(about)`
        ,[
          req.user.id,
          payload.photo_url || null,
          payload.dob || null,
          payload.gender || null,
          payload.address || null,
          payload.location || null,
          payload.linkedin_url || null,
          payload.portfolio_url || null,
          payload.job_title || null,
          payload.skills || null,
          Number.isFinite(payload.experience_years) ? payload.experience_years : null,
          payload.current_company || null,
          payload.expected_salary || null,
          payload.preferred_job_type || null,
          payload.resume_url || null,
          payload.about || null
        ],
        (err) => {
          if (err) return res.status(500).json({ error: err.message });
          res.json({ message: "Profile updated" });
        }
      );
    }
  );
};

/* GET EMPLOYER PROFILE */
exports.getEmployerProfile = (req, res) => {
  db.query(
    "SELECT role, is_admin FROM users WHERE id = ?",
    [req.user.id],
    (roleErr, users) => {
      if (roleErr) return res.status(500).json({ error: roleErr.message });
      if (!users.length) return res.status(404).json({ message: "User not found" });
      if (!users[0].is_admin && users[0].role !== "employer") {
        return res.status(403).json({ message: "Employer access only" });
      }

      db.query(
        "SELECT * FROM employer_profiles WHERE user_id = ?",
        [req.user.id],
        (err, rows) => {
          if (err) return res.status(500).json({ error: err.message });
          if (!rows.length) return res.json(null);
          res.json(rows[0]);
        }
      );
    }
  );
};

/* UPDATE EMPLOYER PROFILE */
exports.updateEmployerProfile = (req, res) => {
  const payload = {
    company_name: (req.body.company_name || "").trim(),
    company_phone: (req.body.company_phone || "").trim(),
    company_address: (req.body.company_address || "").trim(),
    company_location: (req.body.company_location || "").trim(),
    website: (req.body.website || "").trim(),
    industry: (req.body.industry || "").trim(),
    company_size: (req.body.company_size || "").trim(),
    founded_year: req.body.founded_year ? Number(req.body.founded_year) : null,
    description: (req.body.description || "").trim(),
    registration_number: (req.body.registration_number || "").trim(),
    linkedin_url: (req.body.linkedin_url || "").trim(),
    tax_id: (req.body.tax_id || "").trim()
  };

  if (!payload.company_name) {
    return res.status(400).json({ message: "Company name is required" });
  }

  const foundedYear = Number.isFinite(payload.founded_year) ? payload.founded_year : null;

  db.query(
    "SELECT role, is_admin FROM users WHERE id = ?",
    [req.user.id],
    (roleErr, users) => {
      if (roleErr) return res.status(500).json({ error: roleErr.message });
      if (!users.length) return res.status(404).json({ message: "User not found" });
      if (!users[0].is_admin && users[0].role !== "employer") {
        return res.status(403).json({ message: "Employer access only" });
      }

      db.query(
        `INSERT INTO employer_profiles
          (user_id, company_name, company_phone, company_address, company_location, website, industry, company_size,
           founded_year, description, registration_number, linkedin_url, tax_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           company_name = VALUES(company_name),
           company_phone = VALUES(company_phone),
           company_address = VALUES(company_address),
           company_location = VALUES(company_location),
           website = VALUES(website),
           industry = VALUES(industry),
           company_size = VALUES(company_size),
           founded_year = VALUES(founded_year),
           description = VALUES(description),
           registration_number = VALUES(registration_number),
           linkedin_url = VALUES(linkedin_url),
           tax_id = VALUES(tax_id)`
        ,[
          req.user.id,
          payload.company_name,
          payload.company_phone || null,
          payload.company_address || null,
          payload.company_location || null,
          payload.website || null,
          payload.industry || null,
          payload.company_size || null,
          foundedYear,
          payload.description || null,
          payload.registration_number || null,
          payload.linkedin_url || null,
          payload.tax_id || null
        ],
        (err) => {
          if (err) return res.status(500).json({ error: err.message });
          res.json({ message: "Employer profile updated" });
        }
      );
    }
  );
};

/* REQUEST PASSWORD RESET */
exports.forgotPassword = (req, res) => {
  const email = (req.body.email || "").trim().toLowerCase();
  if (!email || !isEmail(email)) {
    return res.status(400).json({ message: "Valid email is required" });
  }

  db.query("SELECT id, email, name FROM users WHERE email = ?", [email], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });

    if (!rows.length) {
      return res.json({ message: "If that email exists, a reset link was sent." });
    }

    const user = rows[0];
    const token = crypto.randomBytes(32).toString("hex");
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000);

    db.query("DELETE FROM password_resets WHERE user_id = ?", [user.id], (deleteErr) => {
      if (deleteErr) return res.status(500).json({ error: deleteErr.message });

      db.query(
        "INSERT INTO password_resets (user_id, token_hash, expires_at) VALUES (?, ?, ?)",
        [user.id, tokenHash, expiresAt],
        async (insertErr) => {
          if (insertErr) return res.status(500).json({ error: insertErr.message });

          const resetUrl = `${process.env.FRONTEND_URL || "http://localhost:3000"}/reset-password.html?token=${token}`;
          const mailer = getMailer();

          if (mailer) {
            try {
              await mailer.transporter.sendMail({
                from: mailer.from,
                to: user.email,
                subject: "Reset your JobPortal password",
                text: `Hi ${user.name || ""},\n\nReset your password: ${resetUrl}\nThis link expires in 30 minutes.\n\nIf you did not request this, you can ignore this email.`
              });
            } catch (mailErr) {
              console.error("Password reset email failed:", mailErr);
            }
          } else {
            console.warn("SMTP not configured. Password reset link:", resetUrl);
          }

          return res.json({ message: "If that email exists, a reset link was sent." });
        }
      );
    });
  });
};

/* RESET PASSWORD */
exports.resetPassword = async (req, res) => {
  const token = (req.body.token || "").trim();
  const password = (req.body.password || "").trim();

  if (!token) {
    return res.status(400).json({ message: "Reset token is required" });
  }

  if (!password || password.length < 6) {
    return res.status(400).json({ message: "Password must be at least 6 characters" });
  }

  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

  db.query(
    "SELECT id, user_id, expires_at, used_at FROM password_resets WHERE token_hash = ?",
    [tokenHash],
    async (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      if (!rows.length) return res.status(400).json({ message: "Invalid or expired reset token" });

      const reset = rows[0];
      if (reset.used_at) {
        return res.status(400).json({ message: "Reset token already used" });
      }

      if (reset.expires_at && new Date(reset.expires_at) < new Date()) {
        return res.status(400).json({ message: "Reset token expired" });
      }

      const hashedPassword = await bcrypt.hash(password, 10);

      db.query(
        "UPDATE users SET password = ? WHERE id = ?",
        [hashedPassword, reset.user_id],
        (updateErr) => {
          if (updateErr) return res.status(500).json({ error: updateErr.message });

          db.query(
            "UPDATE password_resets SET used_at = NOW() WHERE id = ?",
            [reset.id],
            (markErr) => {
              if (markErr) return res.status(500).json({ error: markErr.message });
              res.json({ message: "Password updated successfully" });
            }
          );
        }
      );
    }
  );
};

/* VERIFY USER */
exports.verifyUser = (req, res) => {
  const { userId } = req.params;

  const sql = "UPDATE users SET verified = 1 WHERE id = ?";

  db.query(sql, [userId], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: "User verified successfully" });
  });
};

/* VERIFY EMAIL TOKEN */
exports.verifyEmail = (req, res) => {
  const token = (req.body.token || req.query.token || "").trim();
  if (!token) {
    return res.status(400).json({ message: "Verification token is required" });
  }

  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

  db.query(
    "SELECT id, user_id, expires_at, used_at FROM email_verifications WHERE token_hash = ?",
    [tokenHash],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      if (!rows.length) return res.status(400).json({ message: "Invalid or expired verification link" });

      const record = rows[0];
      if (record.used_at) {
        return res.status(400).json({ message: "Verification link already used" });
      }

      if (new Date(record.expires_at).getTime() < Date.now()) {
        return res.status(400).json({ message: "Verification link expired" });
      }

      db.query(
        "UPDATE users SET verified = 1 WHERE id = ?",
        [record.user_id],
        (updateErr) => {
          if (updateErr) return res.status(500).json({ error: updateErr.message });

          db.query(
            "UPDATE email_verifications SET used_at = NOW() WHERE id = ?",
            [record.id],
            (markErr) => {
              if (markErr) return res.status(500).json({ error: markErr.message });
              res.json({ message: "Email verified successfully" });
            }
          );
        }
      );
    }
  );
};
