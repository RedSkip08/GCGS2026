const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const app = express();
const PORT = process.env.PORT || 3000;

// Serve static assets
app.use("/css", express.static(path.join(__dirname, "css")));
app.use("/js", express.static(path.join(__dirname, "js")));
app.use("/images", express.static(path.join(__dirname, "images")));

// Ensure uploads folder exists
const UPLOADS_FOLDER = path.join(__dirname, "uploads");
if (!fs.existsSync(UPLOADS_FOLDER)) fs.mkdirSync(UPLOADS_FOLDER);

// Make uploads folder downloadable
app.use('/uploads', express.static(UPLOADS_FOLDER));

// Multer setup for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOADS_FOLDER),
  filename: (req, file, cb) => cb(null, Date.now() + "-" + file.originalname),
});
const upload = multer({ storage });

// Parse form data
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Serve form page
app.get("/abstractsubmission", (req, res) =>
  res.sendFile(path.join(__dirname, "abstractsubmission", "index.html"))
);

// Serve success page
app.get("/submissioncomplete", (req, res) =>
  res.sendFile(path.join(__dirname, "submissioncomplete", "index.html"))
);

// Handle abstract uploads
app.post("/upload-abstract", upload.single("abstractFile"), (req, res) => {
  console.log("POST /upload-abstract triggered");
  console.log("Form fields:", req.body);
  console.log("Uploaded file:", req.file);

  const {
    firstName,
    middleName,
    lastName,
    affiliation,
    degreeProgram,
    paperTitle,
    keyword,
    email,
  } = req.body;

  if (!req.file) return res.status(400).send("No file uploaded.");

  // Save submission details
  const submissionData = {
    timestamp: new Date().toISOString(),
    firstName,
    middleName: middleName || "",
    lastName,
    affiliation,
    degreeProgram,
    paperTitle,
    keyword: keyword || "",
    email,
    fileName: req.file.filename,
  };

  const submissionsFile = path.join(__dirname, "submissions.json");
  let submissions = [];
  if (fs.existsSync(submissionsFile)) {
    try {
      submissions = JSON.parse(fs.readFileSync(submissionsFile));
      if (!Array.isArray(submissions)) submissions = [];
    } catch (err) {
      console.error("Error reading submissions.json, resetting file.", err);
      submissions = [];
    }
  }
  submissions.push(submissionData);
  fs.writeFileSync(submissionsFile, JSON.stringify(submissions, null, 2));

  // Send success page
  res.sendFile(path.join(__dirname, "submissioncomplete", "index.html"));
});

// Serve root page
app.get("/", (req, res) => res.sendFile(path.join(__dirname, "index.html")));

// Dynamic folder serving (optional)
app.get("/:folder", (req, res) => {
  const folder = req.params.folder;
  const filePath = path.join(__dirname, folder, "index.html");
  if (fs.existsSync(filePath)) res.sendFile(filePath);
  else res.status(404).send("Page not found");
});

// ✅ Password-protected files listing
const FILES_PASSWORD = "mypassword"; // CHANGE this to a strong password
app.get("/files", (req, res) => {
  const password = req.query.password;
  if (password !== FILES_PASSWORD) {
    return res.status(401).send("Unauthorized: wrong password");
  }

  const files = fs.readdirSync(UPLOADS_FOLDER);
  let html = '<h1>Uploaded Files</h1><ul>';
  files.forEach(file => {
    html += `<li><a href="/uploads/${file}" download>${file}</a></li>`;
  });
  html += '</ul>';
  res.send(html);
});

// ✅ Login page
const LOGIN_USERNAME = "worker";      // change this if needed
const LOGIN_PASSWORD = "mypassword";  // can be same as FILES_PASSWORD

app.get("/login", (req, res) => {
  res.sendFile(path.join(__dirname, "login", "index.html"));
});

// Handle login submission
app.post("/login", (req, res) => {
  const { username, password } = req.body;

  if (username === LOGIN_USERNAME && password === LOGIN_PASSWORD) {
    // Login successful → redirect to files page
    res.redirect(`/files?password=${FILES_PASSWORD}`);
  } else {
    // Login failed → show message
    res.status(401).send("Invalid username or password. <a href='/login'>Try again</a>");
  }
});

// Start server
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
