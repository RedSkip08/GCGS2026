const express = require("express");
const path = require("path");
const fs = require("fs");
const multer = require("multer");
const nodemailer = require("nodemailer");
const dotenv = require("dotenv");

dotenv.config();
const app = express();
const PORT = process.env.PORT || 3000;

// ---------------------------
// Serve static files
// ---------------------------
app.use("/css", express.static(path.join(__dirname, "css")));
app.use("/js", express.static(path.join(__dirname, "js")));
app.use("/images", express.static(path.join(__dirname, "images")));

// ---------------------------
// Ensure uploads folder exists
// ---------------------------
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

// ---------------------------
// Routes
// ---------------------------

// Home page
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html")); // Change to "home/index.html" if you prefer
});

// Other pages (dynamic routing)
app.get("/:page", (req, res) => {
  const pageFolder = req.params.page;
  const pagePath = path.join(__dirname, pageFolder, "index.html");

  if (fs.existsSync(pagePath)) {
    res.sendFile(pagePath);
  } else {
    res.status(404).send("Page not found");
  }
});

// ---------------------------
// Abstract submission route
// ---------------------------
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
=== Abstract Submission ===
Name: ${firstName} ${middleName || ""} ${lastName}
Affiliation: ${affiliation}
Degree Program: ${degreeProgram}
Paper Title: ${paperTitle}
${keyword ? `Keywords: ${keyword}` : ""}
Email: ${email}
`;

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: process.env.EMAIL_USER,
      subject: `Abstract Submission: ${paperTitle}`,
      text: mailBody,
      attachments: [{ filename: req.file.originalname, path: filePath }],
    });

    // Delete file after sending
    fs.unlinkSync(filePath);

    // Redirect to submission complete page
    res.redirect("/submissioncomplete"); // Assumes folder submissioncomplete/index.html exists
  } catch (err) {
    console.error(err);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    res.status(500).send("Error submitting abstract.");
  }
});

// ---------------------------
// Start server
// ---------------------------
app.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));
