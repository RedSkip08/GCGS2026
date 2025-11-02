// Load environment variables in local development (optional)
if (process.env.NODE_ENV !== "production") {
  require("dotenv").config();
}

// Import modules
const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const session = require("express-session");
const { Resend } = require("resend");
const mime = require("mime-types");


// ⚠️ Temporary: Hardcode your Resend API key for testing
const resend = new Resend("***REMOVED***"); // <-- replace with your actual key

// ⚠️ Hardcoded session secret for testing
const SESSION_SECRET = "***REMOVED***";

console.log("✅ Using hardcoded Resend API key for test");
console.log("✅ Using hardcoded session secret for test");

const app = express();
const PORT = process.env.PORT || 3000;

// --- Serve static assets ---
app.use("/css", express.static(path.join(__dirname, "css")));
app.use("/js", express.static(path.join(__dirname, "js")));
app.use("/images", express.static(path.join(__dirname, "images")));

// --- Session setup ---
app.set("trust proxy", 1); // required for HTTPS proxies
app.use(
  session({
    secret: SESSION_SECRET, // <- hardcoded for now
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: false, // false for local testing, true on Render HTTPS
      httpOnly: true,
      maxAge: 1000 * 60 * 60 * 24, // 1 day
    },
  })
);

// --- Parse form data ---
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// --- Ensure uploads folder exists ---
const UPLOADS_FOLDER = path.join(__dirname, "uploads");
if (!fs.existsSync(UPLOADS_FOLDER)) fs.mkdirSync(UPLOADS_FOLDER);

// --- Multer setup with limits and file type validation ---
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOADS_FOLDER),
  filename: (req, file, cb) => cb(null, Date.now() + "-" + file.originalname),
});
const upload = multer({
  storage,
  limits: { fileSize: 1 * 1024 * 1024 }, // 1 MB max
  fileFilter: (req, file, cb) => {
    const allowed = [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error("Invalid file type"));
  },
});

// --- Login credentials ---
const LOGIN_USERNAME = "***REMOVED***"; // replace or use environment variables later
const LOGIN_PASSWORD = "***REMOVED***"; // replace or use environment variables later

// --- HTML routes ---
app.get("/", (req, res) => res.sendFile(path.join(__dirname, "index.html")));
app.get("/login", (req, res) => res.sendFile(path.join(__dirname, "login", "index.html")));
app.get("/abstractsubmission", (req, res) =>
  res.sendFile(path.join(__dirname, "abstractsubmission", "index.html"))
);
app.get("/submissioncomplete", (req, res) =>
  res.sendFile(path.join(__dirname, "submissioncomplete", "index.html"))
);

// Files page (requires login)
app.get("/files", (req, res) => {
  if (!req.session.loggedIn) return res.redirect("/login");
  res.sendFile(path.join(__dirname, "files", "index.html"));
});

// --- Handle abstract upload with Resend email ---
app.post("/upload-abstract", upload.single("abstractFile"), async (req, res) => {
  const { firstName, middleName, lastName, affiliation, degreeProgram, paperTitle, keyword, email } = req.body;
  if (!req.file) return res.status(400).send("No file uploaded.");

  const timestamp = new Date().toISOString();
  const uploadedFileName = req.file.filename;
  const originalFileName = req.file.originalname;

  // Create metadata content
  const metadataContent = `
First Name: ${firstName || ""}
Middle Name: ${middleName || ""}
Last Name: ${lastName || ""}
Affiliation: ${affiliation || ""}
Degree Program: ${degreeProgram || ""}
Paper Title: ${paperTitle || ""}
Keywords: ${keyword || ""}
Email: ${email || ""}
Uploaded File (original): ${originalFileName}
Saved as: ${uploadedFileName}
Submitted On: ${timestamp}
  `.trim();

  // --- Send email with Resend ---
  try {
    await resend.emails.send({
      from: "abstract@gcgs.info", // verified sender in Resend
      to: "utpalpandey20@gmail.com", // your recipients
      subject: `New Abstract Submission: ${firstName} ${lastName}`,
      text: metadataContent,
      attachments: [
        {
          name: req.file.originalname,                     // keeps original file name
          content: fs.readFileSync(req.file.path),        // file content
          type: mime.lookup(req.file.originalname) || "application/octet-stream", // proper MIME type
        },
      ],

    });
    console.log("✅ Email sent successfully");
  } catch (err) {
    console.error("❌ Email failed:", err);
  }

  // Save metadata file
  const metadataFileName = `metadata-${Date.now()}.txt`;
  fs.writeFileSync(path.join(UPLOADS_FOLDER, metadataFileName), metadataContent);

  // Save submission record
  const submissionsFile = path.join(__dirname, "submissions.json");
  let submissions = [];
  if (fs.existsSync(submissionsFile)) {
    try {
      submissions = JSON.parse(fs.readFileSync(submissionsFile));
    } catch {
      submissions = [];
    }
  }
  submissions.push({
    metadataFile: metadataFileName,
    uploadedFile: uploadedFileName,
    originalFile: originalFileName,
    emailSent: true,
  });
  fs.writeFileSync(submissionsFile, JSON.stringify(submissions, null, 2));

  // Optionally delete uploaded file to save space
  try { fs.unlinkSync(req.file.path); } catch {}

  res.sendFile(path.join(__dirname, "submissioncomplete", "index.html"));
});

// --- Login ---
app.post("/login", (req, res) => {
  const { username, password } = req.body;
  if (username === LOGIN_USERNAME && password === LOGIN_PASSWORD) {
    req.session.loggedIn = true;
    res.redirect("/files");
  } else {
    res.status(401).send("Invalid username or password. <a href='/login'>Try again</a>");
  }
});

// --- Logout ---
app.get("/logout", (req, res) => {
  req.session.destroy(() => res.redirect("/login"));
});

// --- API to get submissions ---
app.get("/api/submissions", (req, res) => {
  if (!req.session.loggedIn) return res.status(401).json({ error: "Unauthorized" });
  const submissionsFile = path.join(__dirname, "submissions.json");
  let submissions = [];
  if (fs.existsSync(submissionsFile)) {
    try {
      submissions = JSON.parse(fs.readFileSync(submissionsFile));
    } catch {
      submissions = [];
    }
  }
  res.json(submissions);
});

// --- Secure download routes ---
app.get("/metadata/:file", (req, res) => {
  if (!req.session.loggedIn) return res.status(401).send("Unauthorized");
  const fileName = path.basename(req.params.file);
  const filePath = path.join(UPLOADS_FOLDER, fileName);
  if (fs.existsSync(filePath)) res.download(filePath);
  else res.status(404).send("File not found");
});

app.get("/download/:file", (req, res) => {
  if (!req.session.loggedIn) return res.status(401).send("Unauthorized");
  const fileName = path.basename(req.params.file);
  const filePath = path.join(UPLOADS_FOLDER, fileName);
  if (fs.existsSync(filePath)) res.download(filePath);
  else res.status(404).send("File not found");
});



// --- Dynamic folder serving ---
app.get("/:folder", (req, res) => {
  const folder = req.params.folder;
  
  // Skip /files (already handled)
  if (folder === "files") return res.redirect("/files");

  const filePath = path.join(__dirname, folder, "index.html");
  if (fs.existsSync(filePath)) res.sendFile(filePath);
  else res.status(404).send("Page not found");
});


// --- Start server ---
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
