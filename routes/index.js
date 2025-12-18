const express = require("express");
const { body, header, validationResult } = require("express-validator");
const bcrypt = require("bcryptjs");
const { supabase } = require("../utils/db");
const { broadcast, sseHandler } = require("../utils/sse");

const router = express.Router();

const validate = (validations) => {
  return async (req, res, next) => {
    await Promise.all(validations.map(validation => validation.run(req)));
    const errors = validationResult(req);
    if (errors.isEmpty()) return next();
    return res.status(400).json({ error: errors.array()[0].msg });
  };
};

const verifyOwnership = async (table, id, userId, idField = 'creatorId') => {
  // Check if user is admin
  const { data: user } = await supabase.from("users").select("role").eq("id", userId).single();
  if (user && user.role === 'admin') return { success: true };

  const { data, error } = await supabase.from(table).select(idField).eq('id', id).single();
  if (error || !data) return { error: "Not found", code: 404 };
  if (data[idField] !== userId) return { error: "Unauthorized", code: 403 };
  return { success: true };
};

// --- SSE ---
router.get("/stream", sseHandler);

// --- AUTH ---

router.post("/auth/login", [
  body("userId").trim().notEmpty(),
  body("password").notEmpty()
], validate([]), async (req, res) => {
  try {
    const { userId, password } = req.body;
    const { data: user, error } = await supabase.from("users").select("*").eq("id", userId).single();

    if (error || !user) return res.status(401).json({ error: "Invalid credentials" });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(401).json({ error: "Invalid credentials" });

    const { password: _, ...safeUser } = user;
    res.json(safeUser);
  } catch (error) { res.status(500).json({ error: "Server Error" }); }
});

router.post("/auth/create", [
  body("id").trim().notEmpty(),
  body("password").isLength({ min: 6 })
], validate([]), async (req, res) => {
  try {
    const d = req.body;
    // Check duplicate
    const { data: exists } = await supabase.from("users").select("id").eq("id", d.id).single();
    if (exists) return res.json({ message: "duplicate" });

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(d.password, salt);

    const newUser = {
      id: d.id,
      password: hashedPassword,
      "fullName": `${d.firstName || ""} ${d.lastName || ""}`.trim(),
      role: d.userType,
      department: d.department,
      semester: d.semester,
      shift: d.shift,
      // Map roles
      "studentId": (d.userType === 'student') ? d.id : null,
      "employeeId": (d.userType === 'teacher') ? d.id : null,
      "adminId": (d.userType === 'admin') ? d.id : null
    };

    const { error } = await supabase.from("users").insert(newUser);
    if (error) throw error;

    const { password: _, ...safeUser } = newUser;
    res.json({ message: "Saved", data: safeUser });
  } catch (e) { console.error(e); res.status(500).json({ error: "Error" }); }
});

router.put("/auth/update", async (req, res) => {
  try {
    const { currentId, newPassword, newId } = req.body;

    const updates = {};
    if (newPassword) {
      updates.password = await bcrypt.hash(newPassword, await bcrypt.genSalt(10));
    }
    if (newId && newId !== currentId) {
      updates.id = newId;
      updates.adminId = newId; // assuming only admin uses this
    }

    const { data, error } = await supabase.from("users").update(updates).eq("id", currentId).select().single();

    if (error) return res.status(400).json({ error: "Update failed (ID might exist)" });

    const { password: _, ...safeUser } = data;
    res.json({ message: "Updated", user: safeUser });
  } catch (e) { res.status(500).json({ error: "Error" }); }
});

// --- ANNOUNCEMENTS ---
router.get("/announcements", async (req, res) => {
  const { data } = await supabase.from("announcements").select("*").order("createdAt", { ascending: false });
  res.json(data || []);
});
router.post("/announcements", async (req, res) => {
  const { data, error } = await supabase.from("announcements").insert(req.body).select().single();
  if (error) return res.status(500).send();
  broadcast("announcements", { action: "create", data });
  res.json(data);
});
router.delete("/announcements/:id", async (req, res) => {
  const c = await verifyOwnership("announcements", req.params.id, req.headers["x-user-id"], "creatorId");
  if (c.error) return res.status(c.code).json(c);

  await supabase.from("announcements").delete().eq("id", req.params.id);
  broadcast("announcements", { action: "delete", id: req.params.id });
  res.json({ message: "Deleted" });
});

// --- CHAT (Now via API + SSE) ---
router.get("/chat", async (req, res) => {
  const { room } = req.query;
  const { data } = await supabase.from("chat").select("*").eq("room", room).order("createdAt", { ascending: true });
  res.json(data || []);
});
router.post("/chat", async (req, res) => {
  const { data, error } = await supabase.from("chat").insert(req.body).select().single();
  if (error) return res.status(500).send();
  // Broadcast specific type for this room
  broadcast(`chat-${req.body.room}`, { action: "create", data });
  res.json(data);
});
router.delete("/chat/:id", async (req, res) => {
  // 1. Get room to broadcast deletion
  const { data: msg } = await supabase.from("chat").select("room, senderId").eq("id", req.params.id).single();
  if (!msg) return res.status(404).send();

  // Ownership check
  if (msg.senderId !== req.headers["x-user-id"]) {
    // Check if user is admin
    const { data: user } = await supabase.from("users").select("role").eq("id", req.headers["x-user-id"]).single();
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ error: "Unauthorized" });
    }
  }

  await supabase.from("chat").delete().eq("id", req.params.id);
  broadcast(`chat-${msg.room}`, { action: "delete", id: req.params.id });
  res.json({ message: "Deleted" });
});

// --- ASK (Q&A) ---
router.get("/ask/:dept", async (req, res) => {
  const { data } = await supabase.from("ask").select("*").eq("department", req.params.dept).order("createdAt", { ascending: false });
  res.json(data || []);
});
router.post("/ask", async (req, res) => {
  const { data, error } = await supabase.from("ask").insert(req.body).select().single();
  if (error) return res.status(500).send();
  broadcast(`ask-${req.body.department}`, { action: "create", data });
  res.json(data);
});
router.delete("/ask/:id", async (req, res) => {
  const { data: q } = await supabase.from("ask").select("department, senderId").eq("id", req.params.id).single();
  if (!q) return res.status(404).send();
  if (q.senderId !== req.headers["x-user-id"]) {
    // Check if user is admin
    const { data: user } = await supabase.from("users").select("role").eq("id", req.headers["x-user-id"]).single();
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ error: "Unauthorized" });
    }
  }

  await supabase.from("ask").delete().eq("id", req.params.id);
  broadcast(`ask-${q.department}`, { action: "delete", id: req.params.id });
  res.json({ message: "Deleted" });
});
// Add Answer to Question
router.post("/ask/:id/answer", async (req, res) => {
  const { id } = req.params;
  const newAnswer = req.body; // { text, senderId... }

  // Postgres array append for JSONB or just fetch-modify-save
  // Fetch current
  const { data: q } = await supabase.from("ask").select("answers, department").eq("id", id).single();
  const updatedAnswers = [...(q.answers || []), newAnswer];

  await supabase.from("ask").update({ answers: updatedAnswers }).eq("id", id);
  broadcast(`ask-${q.department}`, { action: "update", id, answers: updatedAnswers });
  res.json({ success: true });
});


// --- GENERIC ---
const handleDeptDelete = async (table, req, res) => {
  const c = await verifyOwnership(table, req.params.id, req.headers["x-user-id"], "creatorId");
  if (c.error) return res.status(c.code).json(c);
  await supabase.from(table).delete().eq("id", req.params.id);
  broadcast(table, { action: "delete", id: req.params.id });
  res.json({ message: "Deleted" });
};

router.get("/events/:dept", async (req, res) => {
  const { data } = await supabase.from("events").select("*").eq("department", req.params.dept);
  res.json(data || []);
});
router.post("/events", async (req, res) => {
  const { data } = await supabase.from("events").insert(req.body).select().single();
  broadcast("events", { action: "save", data });
  res.json(data);
});
router.delete("/events/:id", (req, res) => handleDeptDelete("events", req, res));

router.get("/schedules/:dept", async (req, res) => {
  const { data } = await supabase.from("schedules").select("*").eq("department", req.params.dept);
  res.json(data || []);
});
router.post("/schedules", async (req, res) => {
  const { data } = await supabase.from("schedules").insert(req.body).select().single();
  broadcast("schedules", { action: "save", data });
  res.json(data);
});
router.delete("/schedules/:id", (req, res) => handleDeptDelete("schedules", req, res));

module.exports = router;