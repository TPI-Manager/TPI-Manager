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

// 1. Security Headers (Allow Supabase Images & Realtime)
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "blob:", "https://*.supabase.co", "https://*.googleapis.com"],
      connectSrc: [
        "'self'",
        "https://*.supabase.co",
        "wss://*.supabase.co",
        "https://firestore.googleapis.com",
        "https://*.googleapis.com",
        "https://*.firebaseio.com",
        "wss://*.firebaseio.com"
      ],
      scriptSrc: ["'self'", "'unsafe-inline'"],
    }
  }
}));

// 2. CORS Config
const allowedOrigins = process.env.CLIENT_URL ? [process.env.CLIENT_URL] : ["http://localhost:5173", "http://localhost:3000"];
app.use(cors({
  origin: allowedOrigins,
  methods: ["GET", "POST", "PUT", "DELETE"],
  allowedHeaders: ["Content-Type", "x-user-id"],
  credentials: true
}));

const PORT = process.env.PORT || 5000;

// 3. Logging & Parsing
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use(express.json());

// 4. Rate Limiting
const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 300 });
app.use("/api", limiter);

// 5. File Upload Config (Memory Storage)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

// 6. Admin Seeding Logic
const seedAdmin = async () => {
  if (!supabase) return; // Skip if DB connection failed
  try {
    const { data } = await supabase.from("users").select("*").eq("role", "admin").limit(1);

    if (!data || data.length === 0) {
      console.log("🌱 Seeding Admin Account...");
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(process.env.ADMIN_INIT_PASS || "admin123", salt);

      const { error } = await supabase.from("users").insert({
        id: "admin",
        password: hashedPassword,
        "fullName": "System Administrator",
        role: "admin",
        "adminId": "admin"
      });

      if (error) console.error("Error inserting admin:", error.message);
      else console.log("✅ Admin Created Successfully");
    }
  } catch (error) {
    console.error("Admin seed error:", error.message);
  }
};

// 7. Routes

// Health Check & Lazy Seeding (Triggers on Vercel)
app.get("/api/health", async (req, res) => {
  // Attempt to seed admin if it doesn't exist yet
  await seedAdmin();
  res.json({ status: "ok", database: !!supabase });
});

// File Upload Endpoint
app.post("/api/upload", upload.array("images", 3), async (req, res) => {
  try {
    const ownerId = req.body.ownerId;
    if (!ownerId) return res.status(400).json({ error: "Owner ID required" });
    if (!req.files || req.files.length === 0) return res.json({ files: [] });

    const allowed = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    for (const file of req.files) {
      if (!allowed.includes(file.mimetype)) return res.status(400).json({ error: "Invalid type" });
    }

    const promises = req.files.map(file => uploadToSupabase(file, ownerId));
    const files = await Promise.all(promises);

    res.json({ files });
  } catch (error) {
    console.error("Upload error:", error);
    res.status(500).json({ error: "Upload failed" });
  }
});

// Mount API Routes
app.use("/api", apiRoutes);

// 8. Serve Frontend (Production/Vercel)
if (process.env.NODE_ENV === "production" || process.env.VERCEL) {
  const path = require("path");
  const fs = require("fs");
  const distPath = path.join(process.cwd(), "dist");

  if (fs.existsSync(distPath)) {
    app.use(express.static(distPath));
    app.get("*", (req, res) => res.sendFile(path.join(distPath, "index.html")));
  }
}

// 9. Start Server (Local Development Only)
if (require.main === module) {
  server.listen(PORT, async () => {
    console.log(`\n🚀 Server running on port ${PORT}`);
    // On local dev, we can seed immediately
    await seedAdmin();
  });
}

module.exports = app;