const express = require("express");
const fs = require("fs");
const path = require("path");
const cors = require("cors");

const app = express();
const PORT = 4003;

app.use(cors());
app.use(express.json());

const DATA_DIR = path.join(__dirname, "data");
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

// Helpers
const readJSON = (file) => {
  try {
    return JSON.parse(fs.readFileSync(file));
  } catch {
    return null;
  }
};
const writeJSON = (file, data) => fs.writeFileSync(file, JSON.stringify(data, null, 2));

const getStudentFile = (id) => path.join(DATA_DIR, `${id}.json`);

// Add Student
app.post("/api/student", (req, res) => {
  const data = req.body;

  if (!data.studentId || !data.password)
    return res.status(400).json({ error: "studentId & password required" });

  const file = getStudentFile(data.studentId);

  if (fs.existsSync(file)) return res.json({ message: "duplicate" });

  const saveData = {
    studentId: data.studentId,
    firstName: data.firstName || "",
    lastName: data.lastName || "",
    fullName: `${data.firstName || ""} ${data.lastName || ""}`,
    password: data.password,
    email: data.email || "",
    phone: data.phone || "",
    department: data.department || "",
    roll: data.roll || "",
    address: data.address || "",
    semester: data.semester || "",
    shift: data.shift || "",
    guardianName: data.guardianName || "",
    guardianPhone: data.guardianPhone || "",
    admin: data.admin || "no",
    teacher: data.teacher || "no",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  writeJSON(file, saveData);
  res.json({ message: "Saved", data: saveData });
});

// Login (optional)
app.post("/api/login", (req, res) => {
  const { studentId, password } = req.body;
  const file = getStudentFile(studentId);

  if (!fs.existsSync(file)) return res.status(400).json({ error: "Invalid login" });

  const student = readJSON(file);
  if (student.password !== password) return res.status(400).json({ error: "Invalid login" });

  res.json(student);
});

app.listen(PORT, () => console.log(`Backend running on port ${PORT}`));
