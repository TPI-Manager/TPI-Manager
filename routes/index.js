const express = require("express");
const { body, validationResult } = require("express-validator");
const bcrypt = require("bcryptjs");
const { supabase } = require("../utils/db");
const { broadcast, sseHandler } = require("../utils/sse");
const { db: firestore } = require("../utils/firebaseAdmin");

const syncToFirestore = async (collection, action, data) => {
  try {
    if (!firestore || typeof firestore.collection !== 'function' || !data) return;
    const colRef = firestore.collection(collection);
    const docId = String(data.id || (typeof data === 'string' ? data : Date.now()));
    if (action === 'create' || action === 'update') {
      await colRef.doc(docId).set(JSON.parse(JSON.stringify(data)), { merge: true });
    } else if (action === 'delete') {
      await colRef.doc(docId).delete();
    }
  } catch (e) { console.error(`Sync Error:`, e.message); }
};

const router = express.Router();

const validate = (validations) => async (req, res, next) => {
  await Promise.all(validations.map(v => v.run(req)));
  const errors = validationResult(req);
  if (errors.isEmpty()) return next();
  return res.status(400).json({ error: errors.array()[0].msg });
};

const verifyOwnership = async (table, id, userId, idField = 'creatorId') => {
  const { data: user } = await supabase.from("users").select("role").eq("id", userId).single();
  if (user?.role === 'admin') return { success: true };
  const { data, error } = await supabase.from(table).select(idField).eq('id', id).single();
  if (error || !data) return { error: "Not found", code: 404 };
  if (data[idField] !== userId) return { error: "Unauthorized", code: 403 };
  return { success: true };
};

router.get("/stream", sseHandler);

router.post("/auth/login", async (req, res) => {
  try {
    const { userId, password } = req.body;
    const { data: user, error } = await supabase.from("users").select("*").eq("id", userId).single();
    if (error || !user) return res.status(401).json({ error: "Invalid credentials" });
    if (!await bcrypt.compare(password, user.password)) return res.status(401).json({ error: "Invalid credentials" });
    const { password: _, ...safeUser } = user;
    res.json(safeUser);
  } catch (error) { res.status(500).json({ error: "Server Error" }); }
});

router.post("/auth/create", async (req, res) => {
  try {
    const d = req.body;
    const { data: exists } = await supabase.from("users").select("id").eq("id", d.id).single();
    if (exists) return res.json({ message: "duplicate" });
    const hashedPassword = await bcrypt.hash(d.password, 10);
    const newUser = {
      id: d.id, password: hashedPassword, fullName: `${d.firstName || ""} ${d.lastName || ""}`.trim(),
      role: d.userType, department: d.department, semester: d.semester, shift: d.shift,
      studentId: d.userType === 'student' ? d.id : null,
      employeeId: d.userType === 'teacher' ? d.id : null,
      adminId: d.userType === 'admin' ? d.id : null
    };
    await supabase.from("users").insert(newUser);
    const { password: _, ...safeUser } = newUser;
    res.json({ message: "Saved", data: safeUser });
  } catch (e) { res.status(500).json({ error: "Error" }); }
});

router.put("/auth/update", async (req, res) => {
  try {
    const { currentId, newPassword, newId } = req.body;
    const updates = {};
    if (newPassword) updates.password = await bcrypt.hash(newPassword, 10);
    if (newId && newId !== currentId) { updates.id = newId; updates.adminId = newId; }
    const { data, error } = await supabase.from("users").update(updates).eq("id", currentId).select().single();
    if (error) return res.status(400).json({ error: "Update failed" });
    const { password: _, ...safeUser } = data;
    res.json({ message: "Updated", user: safeUser });
  } catch (e) { res.status(500).json({ error: "Error" }); }
});

router.get("/announcements", async (req, res) => {
  const { data } = await supabase.from("announcements").select("*").order("createdAt", { ascending: false });
  res.json(data || []);
});

router.post("/announcements", async (req, res) => {
  try {
    const { data, error } = await supabase.from("announcements").insert(req.body).select().single();
    if (error) throw error;
    broadcast("announcements", { action: "create", data });
    syncToFirestore("announcements", "create", data);
    res.json(data);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.delete("/announcements/:id", async (req, res) => {
  try {
    const c = await verifyOwnership("announcements", req.params.id, req.headers["x-user-id"], "creatorId");
    if (c.error) return res.status(c.code).json(c);
    await supabase.from("announcements").delete().eq("id", req.params.id);
    broadcast("announcements", { action: "delete", id: req.params.id });
    syncToFirestore("announcements", "delete", req.params.id);
    res.json({ message: "Deleted" });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get("/chat", async (req, res) => {
  const { room } = req.query;
  const { data } = await supabase.from("chat").select("*").eq("room", room).order("createdAt", { ascending: true });
  res.json(data || []);
});

router.post("/chat", async (req, res) => {
  try {
    const b = req.body;
    const payload = {
      text: b.text || null, senderId: b.senderId, senderName: b.senderName,
      room: b.room, department: b.department, semester: b.semester, shift: b.shift,
      images: Array.isArray(b.images) ? b.images : null, role: b.role || "student"
    };
    const { data, error } = await supabase.from("chat").insert([payload]).select().single();
    if (error) throw error;
    broadcast(`chat-${payload.room}`, { action: "create", data });
    syncToFirestore("chat", "create", data);
    res.json(data);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

router.delete("/chat/:id", async (req, res) => {
  try {
    const { data: msg } = await supabase.from("chat").select("room, senderId").eq("id", req.params.id).single();
    if (!msg) return res.status(200).json({ message: "Already deleted" });
    if (msg.senderId !== req.headers["x-user-id"]) {
      const { data: user } = await supabase.from("users").select("role").eq("id", req.headers["x-user-id"]).single();
      if (user?.role !== 'admin') return res.status(403).json({ error: "Unauthorized" });
    }
    await supabase.from("chat").delete().eq("id", req.params.id);
    broadcast(`chat-${msg.room}`, { action: "delete", id: req.params.id });
    syncToFirestore("chat", "delete", req.params.id);
    res.json({ message: "Deleted" });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get("/ask/:dept", async (req, res) => {
  const { data } = await supabase.from("ask").select("*").eq("department", req.params.dept).order("createdAt", { ascending: false });
  res.json(data || []);
});

router.post("/ask", async (req, res) => {
  try {
    const { data, error } = await supabase.from("ask").insert(req.body).select().single();
    if (error) throw error;
    broadcast(`ask-${req.body.department}`, { action: "create", data });
    syncToFirestore("ask", "create", data);
    res.json(data);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.delete("/ask/:id", async (req, res) => {
  try {
    const { data: q } = await supabase.from("ask").select("department, senderId").eq("id", req.params.id).single();
    if (!q) return res.json({ message: "Deleted" });
    if (q.senderId !== req.headers["x-user-id"]) {
      const { data: user } = await supabase.from("users").select("role").eq("id", req.headers["x-user-id"]).single();
      if (user?.role !== 'admin') return res.status(403).json({ error: "Unauthorized" });
    }
    await supabase.from("ask").delete().eq("id", req.params.id);
    broadcast(`ask-${q.department}`, { action: "delete", id: req.params.id });
    syncToFirestore("ask", "delete", req.params.id);
    res.json({ message: "Deleted" });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post("/ask/:id/answer", async (req, res) => {
  try {
    const { id } = req.params;
    const { data: q } = await supabase.from("ask").select("answers, department").eq("id", id).single();
    const updatedAnswers = [...(q.answers || []), req.body];
    await supabase.from("ask").update({ answers: updatedAnswers }).eq("id", id);
    broadcast(`ask-${q.department}`, { action: "update", id, answers: updatedAnswers });
    syncToFirestore("ask", "update", { id, answers: updatedAnswers });
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

const handleDeptDelete = async (table, req, res) => {
  try {
    const c = await verifyOwnership(table, req.params.id, req.headers["x-user-id"], "creatorId");
    if (c.error) return res.status(c.code).json(c);
    await supabase.from(table).delete().eq("id", req.params.id);
    broadcast(table, { action: "delete", id: req.params.id });
    syncToFirestore(table, "delete", req.params.id);
    res.json({ message: "Deleted" });
  } catch (e) { res.status(500).json({ error: e.message }); }
};

router.get("/events/:dept", async (req, res) => {
  const { data } = await supabase.from("events").select("*").eq("department", req.params.dept);
  res.json(data || []);
});

router.post("/events", async (req, res) => {
  try {
    const { data, error } = await supabase.from("events").insert(req.body).select().single();
    if (error) throw error;
    broadcast("events", { action: "save", data });
    syncToFirestore("events", "create", data);
    res.json(data);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.delete("/events/:id", (req, res) => handleDeptDelete("events", req, res));

router.get("/schedules/:dept", async (req, res) => {
  const { data } = await supabase.from("schedules").select("*").eq("department", req.params.dept);
  res.json(data || []);
});

router.post("/schedules", async (req, res) => {
  try {
    const { data, error } = await supabase.from("schedules").insert(req.body).select().single();
    if (error) throw error;
    broadcast("schedules", { action: "save", data });
    syncToFirestore("schedules", "create", data);
    res.json(data);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.delete("/schedules/:id", (req, res) => handleDeptDelete("schedules", req, res));

module.exports = router;