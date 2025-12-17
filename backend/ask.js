const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const fs = require("fs");
const path = require("path");
const cors = require("cors");
const { v4: uuidv4 } = require("uuid");
const multer = require("multer");

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" }
});

/* ---------------- BASIC DATA ---------------- */
const BASE_PATH = path.join(__dirname, "askData");

const departments = ["CST", "Civil Technology", "Electrical"];
const semesters = ["1st","2nd","3rd","4th","5th","6th","7th","8th"];
const shifts = ["Morning","Day"];

/* ---------------- HELPERS ---------------- */
const ensureFolder = (folder) => {
  if (!fs.existsSync(folder)) {
    fs.mkdirSync(folder, { recursive: true });
  }
};

const ensureFile = (file) => {
  if (!fs.existsSync(file)) {
    fs.writeFileSync(file, "[]");
  }
};

const getDepartmentFile = (department) => {
  return path.join(BASE_PATH, "DepartmentOnly", `${department}.json`);
};

/* ---------------- FOLDERS & FILES ---------------- */
ensureFolder(BASE_PATH);
ensureFolder(path.join(BASE_PATH, "DepartmentOnly"));
ensureFolder(path.join(BASE_PATH, "uploads"));

departments.forEach(dept => {
  ensureFile(getDepartmentFile(dept));
});

/* ---------------- IMAGE UPLOAD ---------------- */
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(BASE_PATH, "uploads"));
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});

const upload = multer({ storage });

app.post("/upload", upload.single("image"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No image uploaded" });
  }
  res.json({
    url: `/uploads/${req.file.filename}`
  });
});

app.use("/uploads", express.static(path.join(BASE_PATH, "uploads")));

/* ---------------- API TEST ---------------- */
app.get("/", (req, res) => {
  res.send("ASK Server Running ✅");
});

/* ---------------- SOCKET ---------------- */
io.on("connection", (socket) => {
  console.log("Socket connected:", socket.id);

  /* ---------- JOIN ROOM ---------- */
  socket.on("joinAskRoom", ({ department, role }) => {

    socket.rooms.forEach(r => {
      if (r !== socket.id) socket.leave(r);
    });

    if (role === "teacher" || role === "admin") {
      departments.forEach(d => {
        socket.join(`department-${d}`);
      });
    } else {
      socket.join(`department-${department}`);
    }

    let allQuestions = [];

    if (role === "teacher" || role === "admin") {
      departments.forEach(d => {
        const filePath = getDepartmentFile(d);
        const q = JSON.parse(fs.readFileSync(filePath));
        allQuestions.push(...q);
      });
    } else {
      const filePath = getDepartmentFile(department);
      allQuestions = JSON.parse(fs.readFileSync(filePath));
    }

    allQuestions.sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
    );

    socket.emit("existingQuestions", allQuestions);
  });

  /* ---------- ASK QUESTION ---------- */
  socket.on("askQuestion", (data) => {
    const filePath = getDepartmentFile(data.department);
    const questions = JSON.parse(fs.readFileSync(filePath));

    const question = {
      id: uuidv4(),
      text: data.text,
      image: data.image || null,
      senderId: data.senderId,
      senderName: data.senderName,
      answers: [],
      createdAt: new Date().toISOString()
    };

    // NEW QUESTION ON TOP
    questions.unshift(question);

    fs.writeFileSync(filePath, JSON.stringify(questions, null, 2));

    io.to(`department-${data.department}`).emit("newQuestion", question);
  });

  /* ---------- ANSWER QUESTION ---------- */
  socket.on("answerQuestion", (data) => {
    const filePath = getDepartmentFile(data.department);
    const questions = JSON.parse(fs.readFileSync(filePath));

    const question = questions.find(q => q.id === data.questionId);
    if (!question) return;

    const answer = {
      id: uuidv4(),
      text: data.answer.text,
      senderId: data.answer.senderId,
      senderName: data.answer.senderName,
      createdAt: new Date().toISOString()
    };

    question.answers.push(answer);

    fs.writeFileSync(filePath, JSON.stringify(questions, null, 2));

    io.to(`department-${data.department}`).emit(
      "questionAnswered",
      { questionId: data.questionId, answer }
    );
  });
});

/* ---------------- SERVER START ---------------- */
const PORT = process.env.PORT || 5011;
server.listen(PORT, () => {
  console.log(`ASK server running on port ${PORT} 🚀`);
});
