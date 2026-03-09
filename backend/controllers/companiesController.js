const db = require("../config/mysql");

const clean = (value) => (value || "").trim();

const normalizeCompanyPayload = (body) => {
  return {
    name: clean(body.name),
    website: clean(body.website),
    location: clean(body.location),
    size: clean(body.size),
    industry: clean(body.industry),
    description: clean(body.description),
    logoUrl: clean(body.logo_url)
  };
};

const validateCompany = (payload) => {
  if (!payload.name) {
    return "Company name is required";
  }
  if (payload.name.length > 200) {
    return "Company name is too long";
  }
  if (payload.website && payload.website.length > 255) {
    return "Website is too long";
  }
  if (payload.location && payload.location.length > 200) {
    return "Location is too long";
  }
  if (payload.size && payload.size.length > 50) {
    return "Company size is too long";
  }
  if (payload.industry && payload.industry.length > 100) {
    return "Industry is too long";
  }
  if (payload.description && payload.description.length > 2000) {
    return "Description is too long";
  }
  if (payload.logoUrl && payload.logoUrl.length > 255) {
    return "Logo URL is too long";
  }
  return null;
};

exports.getMyCompany = (req, res) => {
  db.query(
    "SELECT * FROM companies WHERE owner_user_id = ?",
    [req.user.id],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      if (!rows.length) return res.json(null);
      res.json(rows[0]);
    }
  );
};

exports.createCompany = (req, res) => {
  const payload = normalizeCompanyPayload(req.body);
  const error = validateCompany(payload);
  if (error) return res.status(400).json({ message: error });

  db.query(
    "SELECT id FROM companies WHERE owner_user_id = ?",
    [req.user.id],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      if (rows.length) {
        return res.status(409).json({ message: "Company already exists" });
      }

      db.query(
        `INSERT INTO companies
          (owner_user_id, name, website, location, size, industry, description, logo_url)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
        ,[
          req.user.id,
          payload.name,
          payload.website || null,
          payload.location || null,
          payload.size || null,
          payload.industry || null,
          payload.description || null,
          payload.logoUrl || null
        ],
        (err, result) => {
          if (err) return res.status(500).json({ error: err.message });
          res.status(201).json({ message: "Company created", id: result.insertId });
        }
      );
    }
  );
};

exports.updateMyCompany = (req, res) => {
  const incoming = normalizeCompanyPayload(req.body);

  db.query(
    "SELECT * FROM companies WHERE owner_user_id = ?",
    [req.user.id],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      if (!rows.length) {
        return res.status(404).json({ message: "Company not found" });
      }

      const current = rows[0];
      const payload = {
        name: incoming.name || current.name,
        website: incoming.website || current.website,
        location: incoming.location || current.location,
        size: incoming.size || current.size,
        industry: incoming.industry || current.industry,
        description: incoming.description || current.description,
        logoUrl: incoming.logoUrl || current.logo_url
      };

      const error = validateCompany(payload);
      if (error) return res.status(400).json({ message: error });

      db.query(
        `UPDATE companies
         SET name = ?, website = ?, location = ?, size = ?, industry = ?, description = ?, logo_url = ?
         WHERE owner_user_id = ?`
        ,[
          payload.name,
          payload.website || null,
          payload.location || null,
          payload.size || null,
          payload.industry || null,
          payload.description || null,
          payload.logoUrl || null,
          req.user.id
        ],
        (err) => {
          if (err) return res.status(500).json({ error: err.message });
          res.json({ message: "Company updated" });
        }
      );
    }
  );
};

exports.getCompanyPublic = (req, res) => {
  db.query(
    `SELECT id, name, website, location, size, industry, description, logo_url, created_at
     FROM companies WHERE id = ?`,
    [req.params.id],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      if (!rows.length) return res.status(404).json({ message: "Company not found" });
      res.json(rows[0]);
    }
  );
};
