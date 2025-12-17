const express = require("express");
const fs = require("fs");
const path = require("path");
const cors = require("cors");

const app = express();
const PORT = 5004; // আলাদা পোর্ট

app.use(cors());
app.use(express.json());

// DATA FOLDER
const DATA_DIR = path.join(__dirname, "schedule_data");

// Departments, semesters, shifts
const departments = ["CST", "Electrical", "Civil Technology"];
const semesters = ["1st","2nd","3rd","4th","5th","6th","7th","8th"];
const shifts = ["Morning","Day"];

// Create folders
[DATA_DIR].forEach(f => { if (!fs.existsSync(f)) fs.mkdirSync(f, { recursive: true }); });

// Helper functions
function readJSON(file) {
  try { return JSON.parse(fs.readFileSync(file)); } catch { return null; }
}
function writeJSON(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}
function getScheduleFile(department, semester, shift, id) {
  const dir = path.join(DATA_DIR, department, semester, shift);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return path.join(dir, `${id}.json`);
}
function parseHHMMToDate(hhmm) {
  const [hh, mm] = hhmm.split(":").map(Number);
  const now = new Date();
  now.setHours(hh, mm, 0, 0);
  return now;
}
function computeStatus(item) {
  const now = new Date();
  const day = now.toLocaleString("en-US", { weekday: "long" });

  let start = item.startTime ? parseHHMMToDate(item.startTime) : null;
  let end = item.endTime ? parseHHMMToDate(item.endTime) : null;

  const startMs = start ? start.getTime() : null;
  const endMs = end ? end.getTime() : null;

  const isDayActive = Array.isArray(item.days) ? item.days.includes(day) : true;

  let final = { ...item };

  if (!isDayActive) {
    final.status = "inactive"; final.timeToStart = null; final.timeRemaining = null;
  } else if (!startMs || now < start) {
    final.status = "upcoming";
    final.timeToStart = startMs ? Math.floor((startMs - now)/1000) : 0;
    final.timeRemaining = endMs ? Math.floor((endMs - now)/1000) : null;
  } else if (endMs && now > end) {
    final.status = "expired"; final.timeToStart = 0; final.timeRemaining = 0;
  } else {
    final.status = "active";
    final.timeToStart = 0;
    final.timeRemaining = endMs ? Math.floor((endMs - now)/1000) : null;
  }

  return final;
}

/* -------------------------
   ROUTES
--------------------------*/

// Get all schedules
app.get("/api/schedules/:department/:semester/:shift", (req, res) => {
  const { department, semester, shift } = req.params;
  const folder = path.join(DATA_DIR, department, semester, shift);
  if (!fs.existsSync(folder)) return res.json([]);
  const files = fs.readdirSync(folder).filter(f => f.endsWith(".json"));
  const list = files.map(f => computeStatus(readJSON(path.join(folder, f)))).filter(Boolean);
  res.json(list);
});

// Add / Edit schedule
app.post("/api/schedules", (req, res) => {
  const data = req.body;
  if (!data.title || !data.department || !data.semester || !data.shift || !data.createdBy)
    return res.status(400).json({ error: "Required fields missing" });

  const id = data.id || Date.now().toString();
  const file = getScheduleFile(data.department, data.semester, data.shift, id);

  const schedule = fs.existsSync(file)
    ? { ...readJSON(file), ...data, updatedAt: new Date().toISOString() }
    : { id, ...data, body: data.body||"", days: Array.isArray(data.days)?data.days:[], createdAt: new Date().toISOString() };

  writeJSON(file, schedule);
  res.json(computeStatus(schedule));
});

// Delete schedule
app.delete("/api/schedules/:department/:semester/:shift/:id", (req, res) => {
  const { department, semester, shift, id } = req.params;
  const file = getScheduleFile(department, semester, shift, id);
  if (!fs.existsSync(file)) return res.status(404).json({ error: "Schedule not found" });
  fs.unlinkSync(file);
  res.json({ message: "Deleted" });
});

// Auto-cleanup expired schedules (optional)
setInterval(() => {
  departments.forEach(d => semesters.forEach(s => shifts.forEach(sh => {
    const folder = path.join(DATA_DIR, d, s, sh);
    if (!fs.existsSync(folder)) return;
    fs.readdirSync(folder)
      .filter(f => f.endsWith(".json"))
      .forEach(f => {
        const file = path.join(folder, f);
        const data = readJSON(file);
        if (data && computeStatus(data).status === "expired") fs.unlinkSync(file);
      });
  })));
}, 60000);

app.listen(PORT, () => console.log(`Schedule server running on port ${PORT}`));
