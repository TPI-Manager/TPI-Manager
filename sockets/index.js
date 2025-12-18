const { db } = require("../utils/firebase");
const { v4: uuidv4 } = require("uuid");

// Basic XSS sanitization
const sanitize = (str) => {
  if (typeof str !== 'string') return str;
  return str.replace(/</g, "&lt;").replace(/>/g, "&gt;");
};

module.exports = (io) => {
  io.on("connection", (socket) => {

    // --- CHAT ---
    socket.on("joinChatRoom", async ({ type, department, semester, shift }) => {
      const room = `${type}-${department}-${semester || ""}-${shift || ""}`;
      socket.join(room);

      if (!db) return;

      const snapshot = await db.collection("chat")
        .where("room", "==", room)
        .orderBy("createdAt", "desc")
        .limit(50)
        .get();

      const messages = snapshot.docs.map(doc => doc.data()).reverse();
      socket.emit("existingMessages", messages);
    });

    socket.on("sendMessage", async (msg) => {
      const { type, department, semester, shift, text } = msg;
      const room = `${type}-${department}-${semester || ""}-${shift || ""}`;

      const newMessage = {
        ...msg,
        text: sanitize(text), // Sanitize input
        room,
        id: uuidv4(),
        createdAt: new Date().toISOString(),
        seenBy: []
      };

      if (db) {
        await db.collection("chat").doc(newMessage.id).set(newMessage);
      }

      io.to(room).emit("newMessage", newMessage);
    });

    socket.on("deleteMessage", async (data) => {
      const { messageId, type, department, semester, shift, senderId } = data;
      const room = `${type}-${department}-${semester || ""}-${shift || ""}`;

      if (db) {
        const docRef = db.collection("chat").doc(messageId);
        const doc = await docRef.get();
        if (doc.exists && doc.data().senderId === senderId) {
          await docRef.delete();
          io.to(room).emit("messageDeleted", messageId);
        }
      }
    });

    socket.on("markSeen", async (data) => {
      const { messageId, userId, type, department, semester, shift } = data;
      const room = `${type}-${department}-${semester || ""}-${shift || ""}`;

      if (db) {
        const docRef = db.collection("chat").doc(messageId);
        const doc = await docRef.get();
        if (doc.exists) {
          const seenBy = doc.data().seenBy || [];
          if (!seenBy.includes(userId)) {
            seenBy.push(userId);
            await docRef.update({ seenBy });
            io.to(room).emit("messageSeen", { messageId, seenBy });
          }
        }
      }
    });

    // --- Q&A (Ask) ---
    socket.on("joinAskRoom", async ({ department }) => {
      const room = `ask-${department}`;
      socket.join(room);

      if (!db) return;

      const snapshot = await db.collection("ask")
        .where("department", "==", department)
        .orderBy("createdAt", "desc")
        .limit(50)
        .get();

      const questions = snapshot.docs.map(doc => doc.data());
      socket.emit("existingQuestions", questions);
    });

    socket.on("askQuestion", async (data) => {
      const { department, text } = data;
      const room = `ask-${department}`;
      const newQ = {
        id: uuidv4(),
        ...data,
        text: sanitize(text),
        answers: [],
        createdAt: new Date().toISOString(),
        images: data.images || []
      };

      if (db) {
        await db.collection("ask").doc(newQ.id).set(newQ);
      }
      io.to(room).emit("newQuestion", newQ);
    });

    socket.on("answerQuestion", async ({ questionId, department, answer }) => {
      const room = `ask-${department}`;

      if (db) {
        const qRef = db.collection("ask").doc(questionId);
        const qDoc = await qRef.get();

        if (qDoc.exists) {
          const newAnswer = {
            ...answer,
            text: sanitize(answer.text),
            id: uuidv4(),
            createdAt: new Date().toISOString(),
            images: answer.images || []
          };

          const currentAnswers = qDoc.data().answers || [];
          await qRef.update({ answers: [...currentAnswers, newAnswer] });

          io.to(room).emit("questionAnswered", { questionId, answer: newAnswer });
        }
      }
    });
  });
};