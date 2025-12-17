const express = require("express");
const fs = require("fs");
const path = require("path");
const cors = require("cors");

const app = express();
const PORT = 4000;

app.use(cors());
app.use(express.json());

/* -------------------------
   FOLDERS
--------------------------*/
const DATA_DIR = path.join(__dirname, "data");
const EVENT_BASE = path.join(__dirname, "event");
const SCHEDULE_BASE = path.join(__dirname, "schedule");

const departments = ["CST", "Electrical", "Civil Technology"];
const semesters = ["1st","2nd","3rd","4th","5th","6th","7th","8th"];
const shifts = ["Morning","Day"];

// Create main folders
[DATA_DIR, EVENT_BASE, SCHEDULE_BASE].forEach(f => {
  if (!fs.existsSync(f)) fs.mkdirSync(f, { recursive: true });
});

// Create event folders
departments.forEach(d =>
  semesters.forEach(s =>
    shifts.forEach(sh => {
      const dir = path.join(EVENT_BASE, d, s, sh);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    })
  )
);

// Create schedule folders
departments.forEach(d =>
  semesters.forEach(s =>
    shifts.forEach(sh => {
      const dir = path.join(SCHEDULE_BASE, d, s, sh);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    })
  )
);

/* -------------------------
    HELPERS
--------------------------*/
function readJSON(file) {
  try {
    return JSON.parse(fs.readFileSync(file));
  } catch {
    return null;
  }
}

function writeJSON(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

// HH:MM কে today date এর Date object এ convert করে
function parseHHMMToDate(hhmm) {
  if (!hhmm) return null;
  const [hh, mm] = hhmm.split(":").map(Number);
  const now = new Date();
  now.setHours(hh, mm, 0, 0);
  return now;
}

function computeStatus(item) {
  const now = new Date();
  const day = now.toLocaleString("en-US", { weekday: "long" });

  let start = null;
  let end = null;

  if (item.startTime) {
    start = item.startTime.includes(":") ? parseHHMMToDate(item.startTime) : new Date(item.startTime);
  }

  if (item.endTime) {
    end = item.endTime.includes(":") ? parseHHMMToDate(item.endTime) : new Date(item.endTime);
  }

  const startMs = start ? start.getTime() : null;
  const endMs = end ? end.getTime() : null;

  const isDayActive = Array.isArray(item.days) ? item.days.includes(day) : true;

  let final = { ...item };

  if (!isDayActive) {
    final.status = "inactive";
    final.timeToStart = null;
    final.timeRemaining = null;
  } else if (!startMs || now < start) {
    final.status = "upcoming";
    final.timeToStart = startMs ? Math.floor((startMs - now) / 1000) : 0;
    final.timeRemaining = endMs ? Math.floor((endMs - now) / 1000) : null;
  } else if (endMs && now > end) {
    final.status = "expired";
    final.timeToStart = 0;
    final.timeRemaining = 0;
  } else {
    final.status = "active";
    final.timeToStart = 0;
    final.timeRemaining = endMs ? Math.floor((endMs - now) / 1000) : null;
  }

  return final;
}

/* -------------------------
   STUDENT AUTH
--------------------------*/
const getStudentFile = id => path.join(DATA_DIR, `${id}.json`);

app.post("/api/student", (req, res) => {
  const data = req.body;

  if (!data.studentId || !data.password)
    return res.status(400).json({ error: "studentId & password required" });

  const file = getStudentFile(data.studentId);

  if (fs.existsSync(file)) return res.json({ message: "duplicate" });


 const saveData = {
  studentId: data.studentId,
  firstName: data.firstName,
  lastName: data.lastName,
  fullName: `${data.firstName} ${data.lastName}`, // <-- এখানে fullname
  password: data.password,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  };

  writeJSON(file, saveData);
  res.json({ message: "Saved", data: saveData });
});

app.post("/api/login", (req, res) => {
  const { studentId, phone, password } = req.body;

  const files = fs.existsSync(DATA_DIR)
    ? fs.readdirSync(DATA_DIR).filter(f => f.endsWith(".json"))
    : [];

  let found = null;

  for (let f of files) {
    const user = readJSON(path.join(DATA_DIR, f));
    if (!user) continue;

    if ((user.studentId === studentId || user.phone === phone) && user.password === password) {
      found = user;
      break;
    }
  }

  if (!found) return res.status(400).json({ error: "Invalid login" });

  res.json(found);
});

/* -------------------------
   EVENT SYSTEM
--------------------------*/
const getEventFile = (d, s, sh, id) =>
  path.join(EVENT_BASE, d, s, sh, `${id}.json`);

app.get("/api/events/:department/:semester/:shift", (req, res) => {
  const { department, semester, shift } = req.params;

  const folder = path.join(EVENT_BASE, department, semester, shift);
  if (!fs.existsSync(folder)) return res.json([]);

  const files = fs.readdirSync(folder).filter(f => f.endsWith(".json"));

  const events = files
    .map(f => computeStatus(readJSON(path.join(folder, f))))
    .filter(Boolean);

  res.json(events);
});

// Add / Edit Event
app.post("/api/events", (req, res) => {
  const data = req.body;

  if (!data.department || !data.semester || !data.shift || !data.title || !data.type || !data.createdBy) {
    return res.status(400).json({ error: "Required fields missing" });
  }

const eventId = data.id || Date.now().toString();
const file = getEventFile(data.department, data.semester, data.shift, eventId);

// Existing code
let event = fs.existsSync(file)
  ? { ...readJSON(file), ...data, updatedAt: new Date().toISOString() }
  : {
      id: eventId,
      ...data,
      body: data.body || "",
      createdAt: new Date().toISOString(),
      days: Array.isArray(data.days) ? data.days : [],
      options: Array.isArray(data.options) ? data.options.slice(0, 10) : [],
      votes: {},
      votedStudents: [],
      createdByName: data.createdByName || "Unknown",  // <-- add this
    };


  if (Array.isArray(event.options)) {
    event.options.forEach(o => {
      if (!event.votes[o]) event.votes[o] = 0;
    });
  }

  writeJSON(file, event);

  res.status(201).json(computeStatus(event));
});

// Delete Event
app.delete("/api/events/:department/:semester/:shift/:id", (req, res) => {
  const { department, semester, shift, id } = req.params;

  const file = getEventFile(department, semester, shift, id);

  if (!fs.existsSync(file))
    return res.status(404).json({ error: "Event not found" });

  fs.unlinkSync(file);
  res.json({ message: "Deleted" });
});

// Vote System
app.post("/api/events/:department/:semester/:shift/:id/vote", (req, res) => {
  const { department, semester, shift, id } = req.params;
  const { option, studentId } = req.body;

  const file = getEventFile(department, semester, shift, id);

  if (!fs.existsSync(file))
    return res.status(404).json({ error: "Event not found" });

  const event = readJSON(file);
  const status = computeStatus(event);

  if (status.status !== "active")
    return res.status(400).json({ error: "Event not active" });

  if (!event.options.includes(option))
    return res.status(400).json({ error: "Invalid option" });

  if (!event.votedStudents) event.votedStudents = [];

  if (event.votedStudents.includes(studentId))
    return res.status(400).json({ error: "Already voted" });

  event.votes[option]++;
  event.votedStudents.push(studentId);

  writeJSON(file, event);

  res.json(computeStatus(event));
});

/* -------------------------
   SCHEDULE SYSTEM
--------------------------*/
const getScheduleFile = (d, s, sh, id) =>
  path.join(SCHEDULE_BASE, d, s, sh, `${id}.json`);

app.get("/api/schedules/:department/:semester/:shift", (req, res) => {
  const { department, semester, shift } = req.params;

  const folder = path.join(SCHEDULE_BASE, department, semester, shift);
  if (!fs.existsSync(folder)) return res.json([]);

  const files = fs.readdirSync(folder).filter(f => f.endsWith(".json"));

  const list = files
    .map(f => computeStatus(readJSON(path.join(folder, f))))
    .filter(Boolean);

  res.json(list);
});

app.post("/api/schedules", (req, res) => {
  const data = req.body;

  if (!data.title || !data.createdBy || !data.department || !data.semester || !data.shift)
    return res.status(400).json({ error: "Required fields missing" });

  const scheduleId = data.id || Date.now().toString();
  const file = getScheduleFile(data.department, data.semester, data.shift, scheduleId);

  const schedule = fs.existsSync(file)
    ? { ...readJSON(file), ...data, updatedAt: new Date().toISOString() }
    : {
        id: scheduleId,
        ...data,
        body: data.body || "",
        days: Array.isArray(data.days) ? data.days : [],
        createdAt: new Date().toISOString(),
      };

  writeJSON(file, schedule);

  res.json(computeStatus(schedule));
});

app.delete("/api/schedules/:department/:semester/:shift/:id", (req, res) => {
  const { department, semester, shift, id } = req.params;

  const file = getScheduleFile(department, semester, shift, id);

  if (!fs.existsSync(file))
    return res.status(404).json({ error: "Schedule not found" });

  fs.unlinkSync(file);

  res.json({ message: "Deleted" });
});

/* -------------------------
   AUTO DELETE EXPIRED
--------------------------*/
function cleanupExpired() {
  departments.forEach(d =>
    semesters.forEach(s =>
      shifts.forEach(sh => {
        const folder = path.join(EVENT_BASE, d, s, sh);
        if (!fs.existsSync(folder)) return;

        fs.readdirSync(folder)
          .filter(f => f.endsWith(".json"))
          .forEach(f => {
            const file = path.join(folder, f);
            const data = readJSON(file);

            if (data && computeStatus(data).status === "expired") {
              fs.unlinkSync(file);
              console.log("Expired event deleted:", f);
            }
          });
      })
    )
  );
}
// -------------------------
// Announcement System
// -------------------------
const ANNOUNCE_BASE = path.join(__dirname, "announcement");

// Create folder if not exists
if (!fs.existsSync(ANNOUNCE_BASE)) fs.mkdirSync(ANNOUNCE_BASE, { recursive: true });

const getAnnounceFile = (id) => path.join(ANNOUNCE_BASE, `${id}.json`);

// List all announcements
app.get("/api/global-announcements", (req, res) => {
  if (!fs.existsSync(ANNOUNCE_BASE)) return res.json([]);

  const files = fs.readdirSync(ANNOUNCE_BASE).filter(f => f.endsWith(".json"));
  const announcements = files
    .map(f => computeStatus(readJSON(path.join(ANNOUNCE_BASE, f))))
    .filter(Boolean);

  res.json(announcements);
});

// Add / Edit Announcement
app.post("/api/global-announcements", (req, res) => {
  const data = req.body;

  if (!data.title || !data.createdBy) {
    return res.status(400).json({ error: "Required fields missing" });
  }

  const id = data.id || Date.now().toString();
  const file = getAnnounceFile(id);

  const announce = fs.existsSync(file)
    ? { ...readJSON(file), ...data, updatedAt: new Date().toISOString() }
    : {
        id,
        ...data,
        body: data.body || "",
        days: Array.isArray(data.days) ? data.days : ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"],
        startTime: data.startTime || "",
        endTime: data.endTime || "",
        createdAt: new Date().toISOString(),
      };

  writeJSON(file, announce);

  res.status(201).json(computeStatus(announce));
});

// Delete Announcement
app.delete("/api/global-announcements/:id", (req, res) => {
  const { id } = req.params;
  const file = getAnnounceFile(id);

  if (!fs.existsSync(file))
    return res.status(404).json({ error: "Announcement not found" });

  fs.unlinkSync(file);
  res.json({ message: "Deleted" });
});
/* -------------------------
   STUDENT SEARCH & UPDATE
--------------------------*/

// GET student by ID
app.get("/api/student/:id", (req, res) => {
  const { id } = req.params;
  const file = getStudentFile(id);

  if (!fs.existsSync(file)) {
    return res.status(404).json({ error: "Student not found" });
  }

  const student = readJSON(file);
  res.json(student);
});

// UPDATE student by ID
app.put("/api/student/:id", (req, res) => {
  const { id } = req.params;
  const file = getStudentFile(id);

  if (!fs.existsSync(file)) {
    return res.status(404).json({ error: "Student not found" });
  }

  const oldData = readJSON(file);
  const newData = { 
    ...oldData, 
    ...req.body, 
    fullName: `${req.body.firstName || oldData.firstName} ${req.body.lastName || oldData.lastName}`,
    updatedAt: new Date().toISOString()
  };

  writeJSON(file, newData);
  res.json(newData);
});


setInterval(cleanupExpired, 6000);

/* -------------------------
   START SERVER
--------------------------*/

app.listen(PORT, () => console.log(`Backend OK on ${PORT}`));
