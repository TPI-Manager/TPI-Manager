const fs = require("fs");
const path = require("path");

const ROOT_DIR = path.join(__dirname, "..");
const STORAGE_DIR = path.join(ROOT_DIR, "storage");

const FOLDERS = {
  STUDENTS: path.join(STORAGE_DIR, "students"),
  TEACHERS: path.join(STORAGE_DIR, "teachers"),
  ADMINS: path.join(STORAGE_DIR, "admins"),
  EVENTS: path.join(STORAGE_DIR, "events"),
  SCHEDULES: path.join(STORAGE_DIR, "schedules"),
  ANNOUNCEMENTS: path.join(STORAGE_DIR, "announcements"),
  CHAT: path.join(STORAGE_DIR, "chat"),
  ASK: path.join(STORAGE_DIR, "ask"),
  UPLOADS: path.join(ROOT_DIR, "uploads"),
};

// Ensure directories exist
Object.values(FOLDERS).forEach((dir) => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

const getFilePath = (folder, ...parts) => {
  if (parts.length === 0) return folder;
  const fileName = parts[parts.length - 1];
  const needsExt = fileName && !fileName.endsWith(".json");
  return path.join(folder, ...parts) + (needsExt ? ".json" : "");
};

const readJSON = (filePath) => {
  try {
    if (!fs.existsSync(filePath)) return null;
    const stat = fs.statSync(filePath);
    if (!stat.isFile()) return null; // Ignore directories like .DS_Store folders

    const content = fs.readFileSync(filePath, "utf-8");
    return content ? JSON.parse(content) : null;
  } catch (e) {
    console.error(`Error reading JSON from ${filePath}:`, e.message);
    return null;
  }
};

const writeJSON = (filePath, data) => {
  try {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    return true;
  } catch (e) {
    console.error(`Error writing JSON to ${filePath}:`, e.message);
    return false;
  }
};

const deleteFile = (filePath) => {
  try {
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    return true;
  } catch (e) {
    console.error(`Error deleting file ${filePath}:`, e.message);
    return false;
  }
};

module.exports = { FOLDERS, readJSON, writeJSON, deleteFile, getFilePath };