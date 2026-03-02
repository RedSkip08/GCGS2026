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
const connectRedis = require("connect-redis");
const Redis = require("ioredis");
const { Resend } = require("resend");
const mime = require("mime-types");
const cors = require("cors");

// --- Use environment variables ---
const resend = new Resend(process.env.RESEND_API_KEY);
const SESSION_SECRET = process.env.SESSION_SECRET;
const LOGIN_USERNAME = process.env.LOGIN_USERNAME;
const LOGIN_PASSWORD = process.env.LOGIN_PASSWORD;

console.log("✅ Loaded environment variables:");
console.log("RESEND_API_KEY:", process.env.RESEND_API_KEY ? "Loaded ✅" : "Missing ⚠️");
console.log("SESSION_SECRET:", process.env.SESSION_SECRET ? "Loaded ✅" : "Missing ⚠️");
console.log("Render environment RESEND_API_KEY:", !!process.env.RESEND_API_KEY);

const app = express();
const PORT = process.env.PORT || 3000;

// --- Serve static assets ---
app.use("/css", express.static(path.join(__dirname, "css")));
app.use("/js", express.static(path.join(__dirname, "js")));
app.use("/images", express.static(path.join(__dirname, "images")));
// Serve files
app.use("/files", express.static(path.join(__dirname, "files")));

// --- Session setup ---
app.set("trust proxy", 1);

const RedisStore = connectRedis(session);
const redisClient = new Redis(process.env.REDIS_URL);

app.use(
  session({
    store: new RedisStore({ client: redisClient }),
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
      maxAge: 1000 * 60 * 60 * 24,
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

// disable submission-related pages
app.get(
  [
    "/abstractsubmission",
    "/abstractsubmission/"
  ],
  (req, res) => {
    return res.status(410).send(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <title>Submissions Closed</title>
        </head>
        <body style="font-family: Arial, sans-serif; text-align:center; margin-top:100px;">
          <h1>Thank you for your interest in GCGS 2026</h1>
          <p>We are not accepting new abstracts anymore.</p>
        </body>
      </html>
    `);
  }
);

// --- HTML routes ---
app.get("/", (req, res) => res.sendFile(path.join(__dirname, "index.html")));
app.get("/login", (req, res) => res.sendFile(path.join(__dirname, "login", "index.html")));
app.get("/abstractsubmission", (req, res) =>
  res.sendFile(path.join(__dirname, "abstractsubmission", "index.html"))
);

app.get("/registrationcomplete", (req, res) =>
  res.sendFile(path.join(__dirname, "registrationcomplete", "index.html"))
);

// Files page (requires login)
app.get("/files", (req, res) => {
  if (!req.session.loggedIn) return res.redirect("/login");
  res.sendFile(path.join(__dirname, "files", "index.html"));
});

// --- Helper function to sanitize filenames ---
function sanitizeFilename(filename) {
  return filename.replace(/[^a-zA-Z0-9.\-_]/g, "_");
}

// --- ABSTRACT UPLOAD ROUTE (your existing one) ---
app.post("/upload-abstract", upload.single("abstractFile"), async (req, res) => {
  const { firstName, middleName, lastName, affiliation, degreeProgram, paperTitle, keyword, email } = req.body;
  if (!req.file) return res.status(400).send("No file uploaded.");

  const timestamp = new Date().toISOString();
  const uploadedFileName = req.file.filename;
  const originalFileName = req.file.originalname;
  const sanitizedFileName = sanitizeFilename(originalFileName);

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

  try {
    const fileBuffer = fs.readFileSync(req.file.path);

    await resend.emails.send({
      from: "abstract@gcgs.info",
      to: "utpalpandey20@gmail.com",
      subject: `New Abstract Submission: ${firstName} ${lastName}`,
      text: metadataContent,
      attachments: [
        {
          name: sanitizedFileName,
          content: fileBuffer,
          type: mime.lookup(originalFileName) || "application/octet-stream",
        },
      ],
    });

    console.log("✅ Email sent successfully");
  } catch (err) {
    console.error("❌ Email failed:", err);
  }

  const metadataFileName = `metadata-${Date.now()}.txt`;
  fs.writeFileSync(path.join(UPLOADS_FOLDER, metadataFileName), metadataContent);

  const submissionsFile = path.join(__dirname, "submissions.json");
  let submissions = [];
  if (fs.existsSync(submissionsFile)) {
    try { submissions = JSON.parse(fs.readFileSync(submissionsFile)); } catch { submissions = []; }
  }
  submissions.push({
    metadataFile: metadataFileName,
    uploadedFile: uploadedFileName,
    originalFile: originalFileName,
    emailSent: true,
  });
  fs.writeFileSync(submissionsFile, JSON.stringify(submissions, null, 2));

  res.sendFile(path.join(__dirname, "submissioncomplete", "index.html"));
});

// disable registration-related pages
app.get(
  [
    "/registration",
    "/registrationcomplete/"
  ],
  (req, res) => {
    return res.status(410).send(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <title>Registration Closed</title>
        </head>
        <body style="font-family: Arial, sans-serif; text-align:center; margin-top:100px;">
          <h1>Thank you for your interest in GCGS 2026</h1>
          <p>Registrations are closed now.</p>
        </body>
      </html>
    `);
  }
);

// --- NEW: REGISTRATION FORM EMAIL ROUTE ---
app.post("/register", async (req, res) => {
  try {
    const { name, email, abstract, affiliation, message } = req.body;

    const content = `
New Registration for GCGS 2026:

Name: ${name}
Email: ${email}
Presenting: ${abstract}
Affiliation: ${affiliation}
Message: ${message || "No message provided"}
    `.trim();

    await resend.emails.send({
      from: "registration@gcgs.info",
      to: "utpalpandey20@gmail.com",
      subject: "New GCGS 2026 Registration",
      text: content,
    });

    console.log("📩 Registration email sent");
    return res.redirect("/registrationcomplete");
  } catch (err) {
    console.error("❌ Registration email failed:", err);
    return res.status(500).send("Registration failed. Please try again later.");
  }
});

// disable login
app.get(
  [
    "/login",
    "/login/"
  ],
  (req, res) => {
    return res.status(410).send(`

    `);
  }
);

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
  if (folder === "files") return res.redirect("/files");

  const filePath = path.join(__dirname, folder, "index.html");
  if (fs.existsSync(filePath)) res.sendFile(filePath);
  else res.status(404).send("Page not found");
});

// --- Start server ---
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
