const fs = require("fs");
const pdfParse = require("pdf-parse");
const mammoth = require("mammoth");
const WordExtractor = require("word-extractor");
const db = require("../config/mysql");

exports.uploadResume = async (req, res) => {
  const userId = req.user.id;

  if (!req.file) {
    return res.status(400).json({ message: "Resume file is required" });
  }

  const filePath = `/uploads/resumes/${req.file.filename}`;
  const originalName = String(req.file.originalname || "resume");
  const fileExt = originalName.includes(".") ? originalName.split(".").pop().toLowerCase() : "";
  const isPdf = req.file.mimetype === "application/pdf" || fileExt === "pdf";
  const isDocx =
    req.file.mimetype === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    fileExt === "docx";
  const isDoc = req.file.mimetype === "application/msword" || fileExt === "doc";
  let extractedText = null;
  let parsedAt = null;
  let parseStatus = "unsupported_format";
  let parseMessage = "Text extraction currently supports PDF, DOCX, and DOC files. Your resume was uploaded successfully.";

  try {
<<<<<<< HEAD
    if (isPdf) {
      parseStatus = "parsing_attempted";
=======
    const isPdf = req.file.mimetype === "application/pdf" || (req.file.originalname || "").toLowerCase().endsWith(".pdf");
    if (isPdf) {
>>>>>>> d748585d6ba176664da923b31c34be130ff010e7
      const buffer = fs.readFileSync(req.file.path);
      const parsed = await pdfParse(buffer);
      extractedText = (parsed.text || "").trim();
      parsedAt = extractedText ? new Date() : null;
<<<<<<< HEAD
      if (extractedText) {
        parseStatus = "parsed";
        parseMessage = "Resume uploaded and parsed successfully.";
      } else {
        parseStatus = "empty_text";
        parseMessage = "Resume uploaded, but no readable text was found. This usually happens with scanned/image-based PDFs.";
      }
    } else if (isDocx) {
      parseStatus = "parsing_attempted";
      const result = await mammoth.extractRawText({ path: req.file.path });
      extractedText = (result?.value || "").trim();
      parsedAt = extractedText ? new Date() : null;
      if (extractedText) {
        parseStatus = "parsed";
        parseMessage = "Resume uploaded and parsed successfully.";
      } else {
        parseStatus = "empty_text";
        parseMessage = "Resume uploaded, but no readable text was found in this DOCX file.";
      }
    } else if (isDoc) {
      parseStatus = "parsing_attempted";
      const extractor = new WordExtractor();
      const extractedDoc = await extractor.extract(req.file.path);
      extractedText = String(extractedDoc?.getBody?.() || "").trim();
      parsedAt = extractedText ? new Date() : null;
      if (extractedText) {
        parseStatus = "parsed";
        parseMessage = "Resume uploaded and parsed successfully.";
      } else {
        parseStatus = "empty_text";
        parseMessage = "Resume uploaded, but no readable text was found in this DOC file.";
      }
=======
>>>>>>> d748585d6ba176664da923b31c34be130ff010e7
    }
  } catch (err) {
    console.error("Resume parse failed:", err.message);
    parseStatus = "parse_failed";
    parseMessage = "Resume uploaded, but parsing failed. Try exporting the file again as a text-based PDF or DOCX.";
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

      // Keep job seeker profile in sync so profile page can show uploaded resume immediately.
      db.query(
        `INSERT INTO job_seeker_profiles (user_id, resume_url)
         VALUES (?, ?)
         ON DUPLICATE KEY UPDATE resume_url = VALUES(resume_url)`,
        [userId, filePath],
        (profileErr) => {
          if (profileErr) {
            console.warn("resume_url sync failed:", profileErr.message);
          }

          res.status(201).json({
            message: "Resume uploaded",
            file_path: filePath,
            parsed: !!extractedText,
            parseStatus,
            parseMessage,
            fileName: originalName,
            fileType: req.file.mimetype || ""
          });
        }
      );
    }
  );
};

exports.getMyResume = (req, res) => {
  db.query(
    `SELECT id, file_path, extracted_text, parsed_at, updated_at
     FROM resumes WHERE user_id = ?` ,
    [req.user.id],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      if (!rows.length) return res.json(null);
      res.json(rows[0]);
    }
  );
};
