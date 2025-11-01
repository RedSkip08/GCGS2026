const express = require("express");
const multer = require("multer");
const nodemailer = require("nodemailer");
const dotenv = require("dotenv");
const path = require("path");
const fs = require("fs");

dotenv.config();

const app = express();
const PORT = 3000;

// Serve static files
app.use(express.static(__dirname));

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
  // Destructure form data including optional fields
  const { firstName, middleName, lastName, affiliation, degreeProgram, paperTitle, keyword, email } = req.body;
  const filePath = req.file ? req.file.path : null;

  try {
    if (!filePath) {
      return res.status(400).send("No file uploaded. Please upload your abstract.");
    }

    // Nodemailer transporter
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    // Email body with optional middle name and keywords
    const mailBody = `
=== Abstract Submission: GCGS 2026 ===

Name: ${firstName} ${middleName || ""} ${lastName}
Affiliation: ${affiliation}
Degree Program / Position: ${degreeProgram}

Paper Title: ${paperTitle}
${keyword ? `Keywords: ${keyword}` : ""}

Contact Email: ${email}

---------------------------
This abstract was submitted via the GCGS 2026 portal.
`;

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: process.env.EMAIL_USER, // your receiving email
      subject: `GCGS 2026 Abstract Submission: ${paperTitle}`,
      text: mailBody,
      attachments: [
        {
          filename: req.file.originalname,
          path: filePath,
        },
      ],
    };

    // Send email
    await transporter.sendMail(mailOptions);

    // Delete uploaded file after sending
    fs.unlinkSync(filePath);

    // Redirect to success page
    res.redirect("/submissioncomplete/index.html");

  } catch (err) {
    console.error("Error sending abstract:", err);

    // Delete uploaded file if it exists, even on error
    if (filePath && fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    res.status(500).send("Error submitting abstract. Please try again later.");
  }
});

// Start server
app.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));
