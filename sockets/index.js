const path = require("path");
const { v4: uuidv4 } = require("uuid");
const { FOLDERS, readJSON, writeJSON, getFilePath } = require("../utils/storage");

module.exports = (io) => {
  io.on("connection", (socket) => {
    // console.log("New client connected:", socket.id); // Uncomment for server-side debug

    socket.on("joinChatRoom", ({ type, department, semester, shift }) => {
      const room = `${type}-${department}-${semester || ""}-${shift || ""}`;
      socket.join(room);

      let filePath;
      if (type === "department") filePath = getFilePath(path.join(FOLDERS.CHAT, "DepartmentOnly"), department);
      else if (type === "semester") filePath = getFilePath(path.join(FOLDERS.CHAT, "Semester", department), semester);
      else filePath = getFilePath(path.join(FOLDERS.CHAT, "Shift", department, semester), shift);

      const messages = readJSON(filePath) || [];
      socket.emit("existingMessages", messages.slice(-100));
    });

    socket.on("sendMessage", (msg) => {
      const { type, department, semester, shift } = msg;
      const room = `${type}-${department}-${semester || ""}-${shift || ""}`;

      let filePath;
      if (type === "department") filePath = getFilePath(path.join(FOLDERS.CHAT, "DepartmentOnly"), department);
      else if (type === "semester") filePath = getFilePath(path.join(FOLDERS.CHAT, "Semester", department), semester);
      else filePath = getFilePath(path.join(FOLDERS.CHAT, "Shift", department, semester), shift);

      const newMessage = { ...msg, id: Date.now(), createdAt: new Date().toISOString() };

      const messages = readJSON(filePath) || [];
      messages.push(newMessage);
      writeJSON(filePath, messages);

      io.to(room).emit("newMessage", newMessage);
    });

    socket.on("joinAskRoom", ({ department }) => {
      const room = `ask-${department}`;
      socket.join(room);
      const filePath = getFilePath(FOLDERS.ASK, department);
      socket.emit("existingQuestions", (readJSON(filePath) || []).reverse().slice(0, 100));
    });

    socket.on("askQuestion", (data) => {
      const { department } = data;
      const room = `ask-${department}`;
      const filePath = getFilePath(FOLDERS.ASK, department);

      const questions = readJSON(filePath) || [];
      const newQ = { id: uuidv4(), ...data, answers: [], createdAt: new Date().toISOString() };
      questions.push(newQ);
      writeJSON(filePath, questions);

      io.to(room).emit("newQuestion", newQ);
    });

    socket.on("answerQuestion", ({ questionId, department, answer }) => {
      const room = `ask-${department}`;
      const filePath = getFilePath(FOLDERS.ASK, department);
      const questions = readJSON(filePath) || [];
      const q = questions.find(q => q.id === questionId);

      if (q) {
        q.answers.push({ ...answer, id: uuidv4(), createdAt: new Date().toISOString() });
        writeJSON(filePath, questions);
        io.to(room).emit("questionAnswered", { questionId, answer });
      }
    });
  });
};