require("dotenv").config();
const express = require("express");
const http = require("http");
const cors = require("cors");
const multer = require("multer");
const morgan = require("morgan");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const bcrypt = require("bcryptjs");
const { supabase, uploadToSupabase } = require("./utils/db");
const apiRoutes = require("./routes");

const app = express();
const server = http.createServer(app);

// FIX: Relax Security Policy to allow Supabase Images
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "blob:", "https://*.supabase.co"], // Allow Supabase Images
      connectSrc: ["'self'", "https://*.supabase.co", "wss://*.supabase.co"], // Allow Realtime
      scriptSrc: ["'self'", "'unsafe-inline'"], // Allow React scripts
    }
  }
}));

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

const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 300 });
app.use("/api", limiter);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }
});

// Seed Admin
const seedAdmin = async () => {
  try {
    const { data } = await supabase.from("users").select("*").eq("role", "admin").limit(1);
    if (!data || data.length === 0) {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(process.env.ADMIN_INIT_PASS || "admin123", salt);
      await supabase.from("users").insert({
        id: "admin",
        password: hashedPassword,
        "fullName": "System Administrator",
        role: "admin",
        "adminId": "admin"
      });
      console.log("✅ Admin Created");
    }
  } catch (error) { console.error("Admin seed error", error); }
};

app.get("/api/health", (req, res) => res.json({ status: "ok" }));
app.use("/api", apiRoutes);

app.post("/api/upload", upload.array("images", 3), async (req, res) => {
  try {
    const ownerId = req.body.ownerId;
    if (!ownerId) return res.status(400).json({ error: "Owner ID required" });
    if (!req.files || req.files.length === 0) return res.json({ files: [] });

    const promises = req.files.map(file => uploadToSupabase(file, ownerId));
    const files = await Promise.all(promises);

    res.json({ files });
  } catch (error) {
    console.error("Upload error:", error);
    res.status(500).json({ error: "Upload failed" });
  }
});

// Serve Frontend
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