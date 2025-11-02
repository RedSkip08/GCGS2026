const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const session = require("express-session");

const app = express();
const PORT = process.env.PORT || 3000;

// ----- Serve static assets -----
app.use("/css", express.static(path.join(__dirname, "css")));
app.use("/js", express.static(path.join(__dirname, "js")));
app.use("/images", express.static(path.join(__dirname, "images")));

// ----- Session setup -----
app.set('trust proxy', 1); // Required if behind a proxy like Render
app.use(session({
  secret: "k9T!v4R@8xQ7&f2Lz#1mP^0wS6bC3dY$",
  resave: false,
  saveUninitialized: false,
  cookie: { secure: true } // must be true for HTTPS on Render
}));

// ----- Parse form data -----
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// ----- Ensure uploads folder exists -----
const UPLOADS_FOLDER = path.join(__dirname, "uploads");
if (!fs.existsSync(UPLOADS_FOLDER)) fs.mkdirSync(UPLOADS_FOLDER);
app.use('/uploads', express.static(UPLOADS_FOLDER)); // downloadable

// ----- Multer setup for file uploads -----
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOADS_FOLDER),
  filename: (req, file, cb) => cb(null, Date.now() + "-" + file.originalname),
});
const upload = multer({ storage });

// ----- Login credentials -----
const LOGIN_USERNAME = "worker";
const LOGIN_PASSWORD = "mypassword";

// ----- Routes -----

// Serve static HTML pages
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

// Handle abstract uploads
app.post("/upload-abstract", upload.single("abstractFile"), (req, res) => {
  console.log("POST /upload-abstract triggered");
  console.log("Form fields:", req.body);
  console.log("Uploaded file:", req.file);

  const { firstName, middleName, lastName, affiliation, degreeProgram, paperTitle, keyword, email } = req.body;
  if (!req.file) return res.status(400).send("No file uploaded.");

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

  res.sendFile(path.join(__dirname, "submissioncomplete", "index.html"));
});

// Handle login submission
app.post("/login", (req, res) => {
  const { username, password } = req.body;
  if (username === LOGIN_USERNAME && password === LOGIN_PASSWORD) {
    req.session.loggedIn = true;
    res.redirect("/files");
  } else {
    res.status(401).send("Invalid username or password. <a href='/login'>Try again</a>");
  }
});

// Logout route
app.get("/logout", (req, res) => {
  req.session.destroy(() => {
    res.redirect("/login");
  });
});

// API endpoint to get submissions data
app.get("/api/submissions", (req, res) => {
  if (!req.session.loggedIn) return res.status(401).json({ error: "Unauthorized" });

  const submissionsFile = path.join(__dirname, "submissions.json");
  let submissions = [];
  if (fs.existsSync(submissionsFile)) {
    try {
      submissions = JSON.parse(fs.readFileSync(submissionsFile));
    } catch (err) {
      console.error("Error reading submissions.json:", err);
      submissions = [];
    }
  }

  res.json(submissions);
});

// Optional dynamic folder serving
app.get("/:folder", (req, res) => {
  const folder = req.params.folder;
  const filePath = path.join(__dirname, folder, "index.html");
  if (fs.existsSync(filePath)) res.sendFile(filePath);
  else res.status(404).send("Page not found");
});

// ----- Start server -----
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
