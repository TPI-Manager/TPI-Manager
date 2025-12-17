// server.js
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const fs = require("fs");
const path = require("path");
const cors = require("cors");
const multer = require("multer");

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

app.use(cors());
app.use(express.json());
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

const BASE_PATH = path.join(__dirname, "chat");

// ---------- HELPER FUNCTIONS ----------
const ensureFileExists = (file) => {
  const dir = path.dirname(file);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(file)) fs.writeFileSync(file, "[]");
};

const getDepartmentOnlyFile = (department) => path.join(BASE_PATH, "DepartmentOnly", `${department}.json`);
const getSemesterFile = (department, semester) => path.join(BASE_PATH, "Semester", department, `${semester}.json`);
const getShiftFile = (department, semester, shift) => path.join(BASE_PATH, "Department", department, semester, `${shift}.json`);

// ---------- REST API ----------
// Fetch chat history
app.get("/api/chat/:type/:department/:semester?/:shift?", (req, res) => {
  const { type, department, semester, shift } = req.params;
  let file;

  if (type === "department") file = getDepartmentOnlyFile(department);
  else if (type === "semester") file = getSemesterFile(department, semester);
  else if (type === "shift") file = getShiftFile(department, semester, shift);
  else return res.status(400).json({ error: "Invalid type" });

  ensureFileExists(file);
  const data = JSON.parse(fs.readFileSync(file));
  res.json(data);
});

// Upload images
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, "uploads");
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const unique = Date.now() + "-" + Math.round(Math.random() * 1E9);
    cb(null, unique + path.extname(file.originalname));
  }
});
const upload = multer({ storage });

app.post("/api/chat/upload", upload.array("images", 3), (req, res) => {
  try {
    const files = req.files.map(f => f.filename);
    res.json({ files });
  } catch (err) {
    res.status(500).json({ error: "Upload failed" });
  }
});

// Save message helper
const saveMessage = (type, department, semester, shift, msg) => {
  let file;
  if (type === "department") file = getDepartmentOnlyFile(department);
  else if (type === "semester") file = getSemesterFile(department, semester);
  else if (type === "shift") file = getShiftFile(department, semester, shift);

  ensureFileExists(file);
  const data = JSON.parse(fs.readFileSync(file));
  data.push(msg);
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
};

// ---------- SOCKET.IO ----------
io.on("connection", (socket) => {
  console.log("New socket connected:", socket.id);

socket.on("joinRoom", ({ type, department, semester, shift, userId }) => {
  const room = `${type}-${department}-${semester || ""}-${shift || ""}`;
  socket.join(room);
  console.log(`${userId} joined room: ${room}`);

  // fetch messages from file
  let file;
  if (type === "department") file = getDepartmentOnlyFile(department);
  else if (type === "semester") file = getSemesterFile(department, semester);
  else if (type === "shift") file = getShiftFile(department, semester, shift);

  ensureFileExists(file);
  let data = JSON.parse(fs.readFileSync(file));

  // send last 100 messages only
  const last100 = data.slice(-100);
  socket.emit("existingMessages", last100);
});


  socket.on("sendMessage", (msg) => {
    const room = `${msg.type}-${msg.department}-${msg.semester || ""}-${msg.shift || ""}`;
    const messageData = { ...msg, id: Date.now(), createdAt: new Date() };
    saveMessage(msg.type, msg.department, msg.semester, msg.shift, messageData);
    io.to(room).emit("newMessage", messageData);
  });

  socket.on("editMessage", ({ messageId, text, room }) => {
    const [type, department, semester, shift] = room.split("-");
    const file = type === "department" ? getDepartmentOnlyFile(department)
      : type === "semester" ? getSemesterFile(department, semester)
      : getShiftFile(department, semester, shift);

    ensureFileExists(file);
    const data = JSON.parse(fs.readFileSync(file));
    const idx = data.findIndex(m => m.id == messageId);
    if (idx !== -1) {
      data[idx].text = text;
      data[idx].updatedAt = new Date();
      fs.writeFileSync(file, JSON.stringify(data, null, 2));
      io.to(room).emit("messageEdited", { messageId, text, updatedAt: data[idx].updatedAt });
    }
  });

  socket.on("deleteMessage", ({ messageId, deletedByName, room }) => {
    const [type, department, semester, shift] = room.split("-");
    const file = type === "department" ? getDepartmentOnlyFile(department)
      : type === "semester" ? getSemesterFile(department, semester)
      : getShiftFile(department, semester, shift);

    ensureFileExists(file);
    const data = JSON.parse(fs.readFileSync(file));
    const idx = data.findIndex(m => m.id == messageId);
    if (idx !== -1) {
      data[idx].deleted = true;
      data[idx].deletedByName = deletedByName;
      data[idx].deletedAt = new Date();
      fs.writeFileSync(file, JSON.stringify(data, null, 2));
      io.to(room).emit("messageDeleted", { messageId, deletedByName, deletedAt: data[idx].deletedAt });
    }
  });

  socket.on("replyMessage", ({ parentId, reply, room }) => {
    const [type, department, semester, shift] = room.split("-");
    const file = type === "department" ? getDepartmentOnlyFile(department)
      : type === "semester" ? getSemesterFile(department, semester)
      : getShiftFile(department, semester, shift);

    ensureFileExists(file);
    const data = JSON.parse(fs.readFileSync(file));
    const idx = data.findIndex(m => m.id == parentId);
    if (idx !== -1) {
      data[idx].replies = data[idx].replies || [];
      data[idx].replies.push(reply);
      fs.writeFileSync(file, JSON.stringify(data, null, 2));
      io.to(room).emit("messageReplied", { parentId, reply });
    }
  });

  socket.on("reactMessage", ({ messageId, userId, reaction, room }) => {
    const [type, department, semester, shift] = room.split("-");
    const file = type === "department" ? getDepartmentOnlyFile(department)
      : type === "semester" ? getSemesterFile(department, semester)
      : getShiftFile(department, semester, shift);

    ensureFileExists(file);
    const data = JSON.parse(fs.readFileSync(file));
    const idx = data.findIndex(m => m.id == messageId);
    if (idx !== -1) {
      data[idx].reactions = data[idx].reactions || [];
      const rIdx = data[idx].reactions.findIndex(r => r.userId == userId);
      if (rIdx >= 0) {
        if (data[idx].reactions[rIdx].reaction === reaction) data[idx].reactions.splice(rIdx, 1);
        else data[idx].reactions[rIdx].reaction = reaction;
      } else data[idx].reactions.push({ userId, reaction });
      fs.writeFileSync(file, JSON.stringify(data, null, 2));
      io.to(room).emit("messageReacted", { messageId, reactions: data[idx].reactions });
    }
  });

  socket.on("messageSeen", ({ messageId, userId, room }) => {
    const [type, department, semester, shift] = room.split("-");
    const file = type === "department" ? getDepartmentOnlyFile(department)
      : type === "semester" ? getSemesterFile(department, semester)
      : getShiftFile(department, semester, shift);

    ensureFileExists(file);
    const data = JSON.parse(fs.readFileSync(file));
    const idx = data.findIndex(m => m.id == messageId);
    if (idx !== -1) {
      data[idx].seenBy = data[idx].seenBy || [];
      if (!data[idx].seenBy.includes(userId)) data[idx].seenBy.push(userId);
      fs.writeFileSync(file, JSON.stringify(data, null, 2));
      io.to(room).emit("messageSeen", { messageId, seenBy: data[idx].seenBy });
    }
  });
});

// ---------- START SERVER ----------
const PORT = 5010;
server.listen(PORT, () => console.log(`Chat server running on port ${PORT}`));
