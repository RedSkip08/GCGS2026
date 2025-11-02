const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const session = require("express-session");

const app = express();
const PORT = process.env.PORT || 3000;

// --- Serve static assets ---
app.use("/css", express.static(path.join(__dirname, "css")));
app.use("/js", express.static(path.join(__dirname, "js")));
app.use("/images", express.static(path.join(__dirname, "images")));

// --- Session setup (works on Render HTTPS) ---
app.set('trust proxy', 1); // required if behind HTTPS proxy
app.use(session({
  secret: "k9T!v4R@8xQ7&f2Lz#1mP^0wS6bC3dY$",
  resave: false,
  saveUninitialized: false,
  cookie: { 
    secure: true, // required for HTTPS
    httpOnly: true,
    maxAge: 1000 * 60 * 60 * 24 // 1 day
  }
}));

// --- Parse form data ---
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// --- Ensure uploads folder exists ---
const UPLOADS_FOLDER = path.join(__dirname, "uploads");
if (!fs.existsSync(UPLOADS_FOLDER)) fs.mkdirSync(UPLOADS_FOLDER);

// --- Multer setup ---
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOADS_FOLDER),
  filename: (req, file, cb) => cb(null, Date.now() + "-" + file.originalname),
});
const upload = multer({ storage });

// --- Login credentials ---
const LOGIN_USERNAME = "***REMOVED***";
const LOGIN_PASSWORD = "***REMOVED***";

// --- Routes ---

// Serve HTML pages
app.get("/", (req, res) => res.sendFile(path.join(__dirname, "index.html")));
app.get("/login", (req, res) => res.sendFile(path.join(__dirname, "login", "index.html")));
app.get("/abstractsubmission", (req, res) => res.sendFile(path.join(__dirname, "abstractsubmission", "index.html")));
app.get("/submissioncomplete", (req, res) => res.sendFile(path.join(__dirname, "submissioncomplete", "index.html")));

// Files page (requires login)
app.get("/files", (req, res) => {
  if (!req.session.loggedIn) return res.redirect("/login");
  res.sendFile(path.join(__dirname, "files", "index.html"));
});

// --- Handle uploads with metadata ---
app.post("/upload-abstract", upload.single("abstractFile"), (req, res) => {
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

  // Save metadata file
  const metadataFileName = `metadata-${Date.now()}.txt`;
  const metadataPath = path.join(UPLOADS_FOLDER, metadataFileName);
  fs.writeFileSync(metadataPath, metadataContent);

  // Save submission record in submissions.json
  const submissionsFile = path.join(__dirname, "submissions.json");
  let submissions = [];
  if (fs.existsSync(submissionsFile)) {
    try {
      submissions = JSON.parse(fs.readFileSync(submissionsFile));
      if (!Array.isArray(submissions)) submissions = [];
    } catch {
      submissions = [];
    }
  }

  submissions.push({
    timestamp,
    metadataFile: metadataFileName,
    uploadedFile: uploadedFileName,
    originalFile: originalFileName
  });

  fs.writeFileSync(submissionsFile, JSON.stringify(submissions, null, 2));

  res.sendFile(path.join(__dirname, "submissioncomplete", "index.html"));
});

// --- Handle login ---
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

// Metadata download
app.get("/metadata/:file", (req, res) => {
  if (!req.session.loggedIn) return res.status(401).send("Unauthorized");

  const file = req.params.file;
  const filePath = path.join(UPLOADS_FOLDER, file);

  if (fs.existsSync(filePath)) {
    res.download(filePath);
  } else {
    res.status(404).send("File not found");
  }
});

// Uploaded file download
app.get("/download/:file", (req, res) => {
  if (!req.session.loggedIn) return res.status(401).send("Unauthorized");

  const file = req.params.file;
  const filePath = path.join(UPLOADS_FOLDER, file);

  if (fs.existsSync(filePath)) {
    res.download(filePath);
  } else {
    res.status(404).send("File not found");
  }
});

// --- Optional dynamic folder serving ---
app.get("/:folder", (req, res) => {
  const folder = req.params.folder;
  const filePath = path.join(__dirname, folder, "index.html");
  if (fs.existsSync(filePath)) res.sendFile(filePath);
  else res.status(404).send("Page not found");
});

// --- Start server ---
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
