const express = require("express");
const multer = require("multer");
const nodemailer = require("nodemailer");
const dotenv = require("dotenv");
const path = require("path");
const fs = require("fs");

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Serve static files from public/
app.use(express.static(path.join(__dirname, "public")));

// Create uploads folder if missing
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

// ✅ Serve home page at root
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "home", "index.html"));
});

// ✅ Serve other pages dynamically (home, gcgs, registration, etc.)
app.get("/:page", (req, res) => {
  const page = req.params.page;
  const pagePath = path.join(__dirname, "public", page, "index.html");
  console.log("Trying to serve:", pagePath);

  if (fs.existsSync(pagePath)) {
    res.sendFile(pagePath);
  } else {
    res.status(404).send(`Page not found: ${page}`);
  }
});

// ✅ Abstract submission route
app.post("/submit-abstract", upload.single("abstractFile"), async (req, res) => {
  const { firstName, middleName, lastName, affiliation, degreeProgram, paperTitle, keyword, email } = req.body;
  const filePath = req.file ? req.file.path : null;

  if (!filePath) return res.status(400).send("No file uploaded.");

  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const mailBody = `
=== Abstract Submission: GCGS 2026 ===

Name: ${firstName} ${middleName || ""} ${lastName}
Affiliation: ${affiliation}
Degree Program / Position: ${degreeProgram}
Paper Title: ${paperTitle}
${keyword ? `Keywords: ${keyword}` : ""}
Contact Email: ${email}
`;

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: process.env.EMAIL_USER,
      subject: `GCGS 2026 Abstract Submission: ${paperTitle}`,
      text: mailBody,
      attachments: [{ filename: req.file.originalname, path: filePath }],
    });

    fs.unlinkSync(filePath);
    res.redirect("/submissioncomplete/");
  } catch (err) {
    console.error("Error sending abstract:", err);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    res.status(500).send("Error submitting abstract. Please try again later.");
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
