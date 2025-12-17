// createChatFiles.js
const fs = require("fs");
const path = require("path");

const BASE_PATH = path.join(__dirname, "chat");

// Departments, semesters, shifts
const departments = ["CST", "Civil Technology", "Electrical"];
const semesters = ["1st","2nd","3rd","4th","5th","6th","7th","8th"];
const shifts = ["Morning", "Day"];

// Helper: create folder if not exist
const ensureFolder = folder => {
  if (!fs.existsSync(folder)) fs.mkdirSync(folder, { recursive: true });
};

// Helper: create empty JSON file
const ensureFile = file => {
  if (!fs.existsSync(file)) fs.writeFileSync(file, "[]");
};

// Create DepartmentOnly files
const deptOnlyFolder = path.join(BASE_PATH, "DepartmentOnly");
ensureFolder(deptOnlyFolder);
departments.forEach(dept => ensureFile(path.join(deptOnlyFolder, `${dept}.json`)));

// Create Semester files
const semFolder = path.join(BASE_PATH, "Semester");
departments.forEach(dept => {
  const deptFolder = path.join(semFolder, dept);
  ensureFolder(deptFolder);
  semesters.forEach(sem => ensureFile(path.join(deptFolder, `${sem}.json`)));
});

// Create Department/Shift files
const depShiftFolder = path.join(BASE_PATH, "Department");
departments.forEach(dept => {
  const deptFolder = path.join(depShiftFolder, dept);
  semesters.forEach(sem => {
    const semFolderPath = path.join(deptFolder, sem);
    ensureFolder(semFolderPath);
    shifts.forEach(shift => ensureFile(path.join(semFolderPath, `${shift}.json`)));
  });
});

console.log("All folders & JSON files created successfully!");
