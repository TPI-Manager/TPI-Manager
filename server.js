require("dotenv").config();
const express = require("express");
const http = require("http");
const cors = require("cors");
const multer = require("multer");
const morgan = require("morgan");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const bcrypt = require("bcryptjs");
const { db, uploadToFirebase } = require("./utils/firebase");
const apiRoutes = require("./routes");
const { sseHandler } = require("./utils/sse");

const app = express();
const server = http.createServer(app);

app.use(helmet());

const allowedOrigins = process.env.CLIENT_URL ? [process.env.CLIENT_URL] : ["http://localhost:5173", "http://localhost:3000"];
app.use(cors({
  origin: allowedOrigins,
  methods: ["GET", "POST", "PUT", "DELETE"],
  allowedHeaders: ["Content-Type", "x-user-id"],
  credentials: true
}));

const PORT = process.env.PORT || 5000;

app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use(express.json());

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use("/api", limiter);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }
});

// --- SMART ADMIN SEEDING ---
const seedAdmin = async () => {
  if (!db) return;
  try {
    // Check if ANY admin exists to avoid re-seeding if ID was changed
    const snapshot = await db.collection("users").where("role", "==", "admin").limit(1).get();

    if (snapshot.empty) {
      console.log("🌱 No admin found. Seeding default 'admin' account...");
      const adminRef = db.collection("users").doc("admin");

      const salt = await bcrypt.genSalt(10);
      // Default password: "admin123" (Change this immediately in UI)
      const hashedPassword = await bcrypt.hash(process.env.ADMIN_INIT_PASS || "admin123", salt);

      await adminRef.set({
        id: "admin",
        password: hashedPassword,
        firstName: "System",
        lastName: "Administrator",
        fullName: "System Administrator",
        role: "admin",
        adminId: "admin",
        createdAt: new Date().toISOString()
      });
      console.log("✅ Default Admin created. ID: 'admin', Pass: 'admin123'");
    } else {
      // Admin already exists (could be custom ID)
    }
  } catch (error) {
    console.error("Error seeding admin:", error);
  }
};

app.get("/api/stream", sseHandler);
app.get("/api/health", (req, res) => res.json({ status: "ok" }));
app.use("/api", apiRoutes);

app.post("/api/upload", upload.array("images", 3), async (req, res) => {
  try {
    const ownerId = req.body.ownerId;
    if (!ownerId) return res.status(400).json({ error: "Owner ID required" });
    if (!req.files || req.files.length === 0) return res.json({ files: [] });

    const allowed = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    for (const file of req.files) {
      if (!allowed.includes(file.mimetype)) return res.status(400).json({ error: "Invalid file type" });
    }

    const promises = req.files.map(file => uploadToFirebase(file, ownerId));
    const files = await Promise.all(promises);

    res.json({ files });
  } catch (error) {
    console.error("Upload error:", error);
    res.status(500).json({ error: "Upload failed" });
  }
});

if (process.env.NODE_ENV === "production" || process.env.VERCEL) {
  const path = require("path");
  const fs = require("fs");
  const distPath = path.join(process.cwd(), "dist");
  if (fs.existsSync(distPath)) {
    app.use(express.static(distPath));
    app.get("*", (req, res) => res.sendFile(path.join(distPath, "index.html")));
  }
}

if (require.main === module) {
  server.listen(PORT, async () => {
    console.log(`\n🚀 Server running on port ${PORT}`);
    await seedAdmin();
  });
}

module.exports = app;