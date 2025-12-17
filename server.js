const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const multer = require("multer");
const morgan = require("morgan");
const { FOLDERS } = require("./utils/storage");
const apiRoutes = require("./routes");
const socketManager = require("./sockets");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" },
  path: "/socket.io"
});

const PORT = process.env.PORT || 5000;

app.use(morgan("dev"));
app.use(cors());
app.use(express.json());
app.use("/uploads", express.static(FOLDERS.UPLOADS));

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, FOLDERS.UPLOADS),
  filename: (req, file, cb) => cb(null, Date.now() + "-" + file.originalname)
});
const upload = multer({ storage });

app.use("/api", apiRoutes);

app.post("/api/upload", upload.array("images", 3), (req, res) => {
  const files = req.files ? req.files.map(f => f.filename) : [];
  res.json({ files });
});

socketManager(io);

if (require.main === module) {
  server.listen(PORT, () => {
    console.log(`\n🚀 Server running on port ${PORT}`);
    console.log(`➜  Local:   http://localhost:${PORT}`);
    console.log(`➜  Network: http://0.0.0.0:${PORT}\n`);
  });
}

module.exports = { app, server };