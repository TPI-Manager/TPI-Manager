const express = require("express");
const fs = require("fs");
const path = require("path");
const { v4: uuidv4 } = require("uuid");
const { FOLDERS, readJSON, writeJSON, deleteFile, getFilePath } = require("../utils/storage");

const router = express.Router();

const computeStatus = (item) => {
  if (!item) return null;
  const now = new Date();
  const day = now.toLocaleString("en-US", { weekday: "long" });
  if (Array.isArray(item.days) && !item.days.includes(day)) return { ...item, status: "inactive" };
  return { ...item, status: "active" };
};

router.post("/auth/login", (req, res) => {
  try {
    const { userId, password } = req.body;

    const searchFolders = [
      { dir: FOLDERS.ADMINS, role: "admin" },
      { dir: FOLDERS.TEACHERS, role: "teacher" },
      { dir: FOLDERS.STUDENTS, role: "student" }
    ];

    for (const { dir, role } of searchFolders) {
      if (!fs.existsSync(dir)) continue;
      const files = fs.readdirSync(dir);
      for (const file of files) {
        if (!file.endsWith(".json")) continue;
        const user = readJSON(path.join(dir, file));
        if (user && user.password === password) {
          if (user.id === userId || user.studentId === userId || user.employeeId === userId || user.adminId === userId) {
            return res.json({ ...user, role });
          }
        }
      }
    }

    res.status(401).json({ error: "Invalid credentials" });
  } catch (error) {
    console.error("Login Error:", error);
    res.status(500).json({ error: "Server Error" });
  }
});

router.post("/auth/create", (req, res) => {
  try {
    const data = req.body;
    const { userType, id, password } = data;

    if (!id || !password || !userType) return res.status(400).json({ error: "Missing required fields" });

    let targetFolder;
    if (userType === "admin") targetFolder = FOLDERS.ADMINS;
    else if (userType === "teacher") targetFolder = FOLDERS.TEACHERS;
    else targetFolder = FOLDERS.STUDENTS;

    const filePath = getFilePath(targetFolder, id);
    if (fs.existsSync(filePath)) return res.json({ message: "duplicate" });

    const newUser = {
      ...data,
      fullName: `${data.firstName || ""} ${data.lastName || ""}`.trim(),
      createdAt: new Date().toISOString(),
      role: userType
    };

    writeJSON(filePath, newUser);
    res.json({ message: "Saved", data: newUser });
  } catch (error) {
    console.error("Create User Error:", error);
    res.status(500).json({ error: "Server Error" });
  }
});

router.get("/announcements", (req, res) => {
  try {
    if (!fs.existsSync(FOLDERS.ANNOUNCEMENTS)) return res.json([]);
    const files = fs.readdirSync(FOLDERS.ANNOUNCEMENTS);
    const data = files
      .filter(f => f.endsWith(".json"))
      .map(f => readJSON(path.join(FOLDERS.ANNOUNCEMENTS, f)))
      .filter(Boolean);
    res.json(data);
  } catch (error) {
    console.error("Announcements Get Error:", error);
    res.status(500).json({ error: "Failed to fetch announcements" });
  }
});

router.post("/announcements", (req, res) => {
  try {
    const id = req.body.id || uuidv4();
    const filePath = getFilePath(FOLDERS.ANNOUNCEMENTS, id);
    const data = { id, ...req.body, createdAt: new Date().toISOString() };
    writeJSON(filePath, data);
    res.json(data);
  } catch (error) {
    console.error("Announcements Post Error:", error);
    res.status(500).json({ error: "Failed to save announcement" });
  }
});

router.delete("/announcements/:id", (req, res) => {
  try {
    deleteFile(getFilePath(FOLDERS.ANNOUNCEMENTS, req.params.id));
    res.json({ message: "Deleted" });
  } catch (error) {
    console.error("Announcements Delete Error:", error);
    res.status(500).json({ error: "Failed to delete" });
  }
});

const handleDeptGet = (folder, req, res) => {
  try {
    const { dept, sem, shift } = req.params;

    // Defensive check: if params are weird
    if (!dept || !sem || !shift) return res.json([]);

    const dir = path.join(folder, dept, sem, shift);

    if (!fs.existsSync(dir)) return res.json([]);
    if (!fs.statSync(dir).isDirectory()) return res.json([]);

    const files = fs.readdirSync(dir);
    const items = files
      .filter(f => f.endsWith(".json"))
      .map(f => readJSON(path.join(dir, f)))
      .filter(Boolean);

    const computed = items.map(computeStatus).filter(Boolean);
    res.json(computed);
  } catch (error) {
    console.error(`Dept Get Error at ${req.path}:`, error);
    // Return empty array instead of 500 to keep UI alive
    res.json([]);
  }
};

const handleDeptSave = (folder, req, res) => {
  try {
    const { department, semester, shift, id } = req.body;
    if (!department || !semester || !shift) return res.status(400).json({ error: "Missing metadata" });

    const entityId = id || uuidv4();
    const filePath = getFilePath(path.join(folder, department, semester, shift), entityId);
    const existing = readJSON(filePath) || {};
    const data = {
      ...existing,
      ...req.body,
      id: entityId,
      createdAt: existing.createdAt || new Date().toISOString()
    };

    writeJSON(filePath, data);
    res.json(computeStatus(data));
  } catch (error) {
    console.error("Dept Save Error:", error);
    res.status(500).json({ error: "Failed to save data" });
  }
};

const handleDeptDelete = (folder, req, res) => {
  try {
    const { dept, sem, shift, id } = req.params;
    deleteFile(getFilePath(path.join(folder, dept, sem, shift), id));
    res.json({ message: "Deleted" });
  } catch (error) {
    console.error("Dept Delete Error:", error);
    res.status(500).json({ error: "Failed to delete" });
  }
};

router.get("/events/:dept/:sem/:shift", (req, res) => handleDeptGet(FOLDERS.EVENTS, req, res));
router.post("/events", (req, res) => handleDeptSave(FOLDERS.EVENTS, req, res));
router.delete("/events/:dept/:sem/:shift/:id", (req, res) => handleDeptDelete(FOLDERS.EVENTS, req, res));

router.get("/schedules/:dept/:sem/:shift", (req, res) => handleDeptGet(FOLDERS.SCHEDULES, req, res));
router.post("/schedules", (req, res) => handleDeptSave(FOLDERS.SCHEDULES, req, res));
router.delete("/schedules/:dept/:sem/:shift/:id", (req, res) => handleDeptDelete(FOLDERS.SCHEDULES, req, res));

module.exports = router;