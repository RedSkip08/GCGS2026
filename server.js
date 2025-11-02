const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const session = require("express-session");

const app = express();
const PORT = process.env.PORT || 3000;

// Serve static assets
app.use("/css", express.static(path.join(__dirname, "css")));
app.use("/js", express.static(path.join(__dirname, "js")));
app.use("/images", express.static(path.join(__dirname, "images")));

// Session setup
app.use(session({
  secret: "yourStrongSecretHere", // change to a strong secret
  resave: false,
  saveUninitialized: false
}));

// Ensure uploads folder exists
const UPLOADS_FOLDER = path.join(__dirname, "uploads");
if (!fs.existsSync(UPLOADS_FOLDER)) fs.mkdirSync(UPLOADS_FOLDER);

// Make uploads folder downloadable
app.use('/uploads', express.static(UPLOADS_FOLDER));

// Multer setup
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOADS_FOLDER),
  filename: (req, file, cb) => cb(null, Date.now() + "-" + file.originalname),
});
const upload = multer({ storage });

// Parse form data
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Serve pages
app.get("/abstractsubmission", (req, res) =>
  res.sendFile(path.join(__dirname, "abstractsubmission", "index.html"))
);
app.get("/submissioncomplete", (req, res) =>
  res.sendFile(path.join(__dirname, "submissioncomplete", "index.html"))
);
app.get("/", (req, res) => res.sendFile(path.join(__dirname, "index.html")));
app.get("/login", (req, res) => res.sendFile(path.join(__dirname, "login", "index.html")));

// Handle abstract uploads
app.post("/upload-abstract", upload.single("abstractFile"), (req, res) => {
  const submissionData = {
    timestamp: new Date().toISOString(),
    ...req.body,
    fileName: req.file ? req.file.filename : null
  };

  const submissionsFile = path.join(__dirname, "submissions.json");
  let submissions = [];
  try {
    if (fs.existsSync(submissionsFile)) {
      submissions = JSON.parse(fs.readFileSync(submissionsFile));
      if (!Array.isArray(submissions)) submissions = [];
    }
  } catch (err) {
    console.error("Error reading submissions.json:", err);
    submissions = [];
  }
  submissions.push(submissionData);
  fs.writeFileSync(submissionsFile, JSON.stringify(submissions, null, 2));

  res.sendFile(path.join(__dirname, "submissioncomplete", "index.html"));
});

// Login credentials
const LOGIN_USERNAME = "worker";      
const LOGIN_PASSWORD = "mypassword";  

// Login POST
app.post("/login", (req, res) => {
  const { username, password } = req.body;
  if (username === LOGIN_USERNAME && password === LOGIN_PASSWORD) {
    req.session.loggedIn = true;
    res.redirect("/files");
  } else {
    res.status(401).send("Invalid username or password. <a href='/login'>Try again</a>");
  }
});

// Logout
app.get("/logout", (req, res) => {
  req.session.destroy(() => {
    res.redirect("/login");
  });
});

// Files page with metadata
app.get("/files", (req, res) => {
  if (!req.session.loggedIn) {
    return res.status(401).send("Unauthorized. Please <a href='/login'>login</a>.");
  }

  const submissionsFile = path.join(__dirname, "submissions.json");
  let submissions = [];
  try {
    if (fs.existsSync(submissionsFile)) {
      submissions = JSON.parse(fs.readFileSync(submissionsFile));
    }
  } catch (err) {
    console.error("Error reading submissions.json:", err);
    submissions = [];
  }

  let html = '<h1>Uploaded Files & Metadata</h1><ul>';
  submissions.forEach(sub => {
    html += `<li>
      <strong>${sub.firstName || ""} ${sub.middleName || ""} ${sub.lastName || ""}</strong> - 
      ${sub.affiliation || ""} - ${sub.degreeProgram || ""} - ${sub.paperTitle || ""} - ${sub.keyword || ""} - 
      ${sub.email || ""} - ${sub.timestamp || ""} 
      ${sub.fileName ? `<a href="/uploads/${sub.fileName}" download>[Download]</a>` : ""}
    </li>`;
  });
  html += '</ul><a href="/logout">Logout</a>';
  res.send(html);
});

// Dynamic folder serving (optional)
app.get("/:folder", (req, res) => {
  const folder = req.params.folder;
  const filePath = path.join(__dirname, folder, "index.html");
  if (fs.existsSync(filePath)) res.sendFile(filePath);
  else res.status(404).send("Page not found");
});

// Start server
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
