const fs = require("fs");
const pdfParse = require("pdf-parse");
const db = require("../config/mysql");

exports.uploadResume = async (req, res) => {
  const userId = req.user.id;

  if (!req.file) {
    return res.status(400).json({ message: "Resume file is required" });
  }

  const filePath = `/uploads/resumes/${req.file.filename}`;
  let extractedText = null;
  let parsedAt = null;

  try {
    const buffer = fs.readFileSync(req.file.path);
    const parsed = await pdfParse(buffer);
    extractedText = (parsed.text || "").trim();
    parsedAt = extractedText ? new Date() : null;
  } catch (err) {
    console.error("Resume parse failed:", err.message);
  }

  db.query(
    `INSERT INTO resumes (user_id, file_path, extracted_text, parsed_at)
     VALUES (?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       file_path = VALUES(file_path),
       extracted_text = VALUES(extracted_text),
       parsed_at = VALUES(parsed_at)`
    ,[
      userId,
      filePath,
      extractedText,
      parsedAt
    ],
    (err) => {
      if (err) return res.status(500).json({ error: err.message });
      res.status(201).json({
        message: "Resume uploaded",
        file_path: filePath,
        parsed: !!extractedText
      });
    }
  );
};

exports.getMyResume = (req, res) => {
  db.query(
    `SELECT id, file_path, parsed_at, updated_at
     FROM resumes WHERE user_id = ?` ,
    [req.user.id],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      if (!rows.length) return res.json(null);
      res.json(rows[0]);
    }
  );
};
