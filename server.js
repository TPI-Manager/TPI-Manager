// ready for deployment
require("dotenv").config();
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const multer = require("multer");
const morgan = require("morgan");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const { db, uploadToFirebase } = require("./utils/firebase");
const apiRoutes = require("./routes");
const socketManager = require("./sockets");

const app = express();
const server = http.createServer(app);

// Production Security Headers
app.use(helmet());

// CORS Config - Strict in Production
const allowedOrigins = process.env.CLIENT_URL ? [process.env.CLIENT_URL] : ["http://localhost:5173", "http://localhost:3000"];
app.use(cors({
  origin: allowedOrigins,
  methods: ["GET", "POST", "PUT", "DELETE"],
  credentials: true
}));

const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"],
    credentials: true
  },
  path: "/socket.io"
});

const PORT = process.env.PORT || 5000;

// Logging (Minimal in production)
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use(express.json());

// Rate Limiting to prevent brute force
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  message: "Too many requests from this IP, please try again later."
});
app.use("/api", limiter);

// Memory storage for Multer to stream directly to Firebase
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB Limit
});

// Check and Seed Admin
const seedAdmin = async () => {
  if (!db) return;
  try {
    const adminRef = db.collection("users").doc("admin");
    const doc = await adminRef.get();
    if (!doc.exists) {
      console.log("🌱 Seeding default Admin account...");
      // In production, you might want to force a random password logged to console instead
      const initialPassword = process.env.ADMIN_INIT_PASS || "admin123";
      await adminRef.set({
        id: "admin",
        password: initialPassword,
        firstName: "System",
        lastName: "Administrator",
        fullName: "System Administrator",
        role: "admin",
        createdAt: new Date().toISOString()
      });
      console.log("✅ Admin created.");
    }
  } catch (error) {
    console.error("Error seeding admin:", error);
  }
};

app.use("/api", apiRoutes);

// Upload Endpoint
app.post("/api/upload", upload.array("images", 3), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) return res.json({ files: [] });

    // Validate file types
    const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    for (const file of req.files) {
      if (!allowedMimeTypes.includes(file.mimetype)) {
        return res.status(400).json({ error: "Invalid file type. Only images allowed." });
      }
    }

    const uploadPromises = req.files.map(file => uploadToFirebase(file));
    const files = await Promise.all(uploadPromises);

    res.json({ files });
  } catch (error) {
    console.error("Upload error:", error);
    res.status(500).json({ error: "Upload failed" });
  }
});

socketManager(io);

// Handle React Routing in Production
if (process.env.NODE_ENV === "production" || process.env.VERCEL) {
  const path = require("path");
  const fs = require("fs");

  const potentialPaths = [
    path.join(__dirname, "app", "dist"),
    path.join(process.cwd(), "app", "dist"),
    path.join(__dirname, "dist"),
    path.join(process.cwd(), "dist")
  ];

  const distPath = potentialPaths.find(p => fs.existsSync(p)) || potentialPaths[0];

  app.use(express.static(distPath));

  app.get("/api/health", (req, res) => {
    const listDir = (dir, depth = 0) => {
      if (depth > 2 || !fs.existsSync(dir)) return [];
      try {
        return fs.readdirSync(dir).map(f => {
          const p = path.join(dir, f);
          const isDir = fs.statSync(p).isDirectory();
          return isDir ? { name: f, children: listDir(p, depth + 1) } : f;
        });
      } catch (e) { return [e.message]; }
    };

    res.json({
      status: "ok",
      cwd: process.cwd(),
      dirname: __dirname,
      distPath,
      distExists: fs.existsSync(distPath),
      structure: listDir(process.cwd()),
      potentialPaths
    });
  });

  app.get("*", (req, res) => {
    const indexPath = path.join(distPath, "index.html");
    if (fs.existsSync(indexPath)) {
      res.sendFile(indexPath);
    } else {
      res.status(404).send(`Frontend not found at ${indexPath}. Base dir: ${__dirname}`);
    }
  });
}

if (require.main === module) {
  server.listen(PORT, async () => {
    console.log(`\n🚀 Server running on port ${PORT}`);
    // await seedAdmin(); // Commented out for testing Vercel deployment timeouts
  });
}

module.exports = app;