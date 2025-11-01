const express = require("express");
const multer = require("multer");
const nodemailer = require("nodemailer");
const dotenv = require("dotenv");
const path = require("path");
const fs = require("fs");

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Serve frontend files
app.use(express.static(path.join(__dirname, "public")));

// Create uploads folder if it doesn't exist
const UPLOADS_FOLDER = path.join(__dirname, "uploads");
if (!fs.existsSync(UPLOADS_FOLDER)) fs.mkdirSync(UPLOADS_FOLDER);

// Multer setup for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOADS_FOLDER),
  filename: (req, file, cb) => cb(null, Date.now() + "-" + file.originalname),
});
const upload = multer({ storage });

// Parse form data
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Abstract submission route
app.post("/submit-abstract", upload.single("abstractFile"), async (req, res) => {
  const { firstName, middleName, lastName, affiliation, degreeProgram, paperTitle, keyword, email } = req.body;
  const filePath = req.file ? req.file.path : null;

  if (!filePath) return res.status(400).send("No file uploaded.");

  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
    });

    await transporter.verify();

    const mailBody = `
Name: ${firstName} ${middleName || ""} ${lastName}
Affiliation: ${affiliation}
Degree Program: ${degreeProgram}
Paper Title: ${paperTitle}
${keyword ? `Keywords: ${keyword}` : ""}
Email: ${email}
`;

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: process.env.EMAIL_USER,
      subject: `GCGS 2026 Abstract: ${paperTitle}`,
      text: mailBody,
      attachments: [{ filename: req.file.originalname, path: filePath }],
    };

    await transporter.sendMail(mailOptions);

    fs.unlinkSync(filePath);
    res.redirect("/submissioncomplete/");
  } catch (err) {
    console.error(err);
    if (filePath && fs.existsSync(filePath)) fs.unlinkSync(filePath);
    res.status(500).send("Error submitting abstract.");
  }
});

// 404 fallback
app.use((req, res) => {
  res.status(404).sendFile(path.join(__dirname, "public", "404.html"));
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
