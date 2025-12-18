const express = require("express");
const { body, header, validationResult } = require("express-validator");
const bcrypt = require("bcryptjs");
const { db, admin } = require("../utils/firebase");
const { broadcast } = require("../utils/sse");

const router = express.Router();

const checkDB = (req, res, next) => {
  if (!db) return res.status(503).json({ error: "Database not connected" });
  next();
};

const validate = (validations) => {
  return async (req, res, next) => {
    await Promise.all(validations.map(validation => validation.run(req)));
    const errors = validationResult(req);
    if (errors.isEmpty()) return next();
    return res.status(400).json({ error: errors.array()[0].msg });
  };
};

const verifyOwnership = async (collection, docId, userId, idField = 'creatorId') => {
  const doc = await db.collection(collection).doc(docId).get();
  if (!doc.exists) return { error: "Not found", code: 404 };
  const data = doc.data();
  if (data[idField] !== userId) return { error: "Unauthorized: You can only delete your own items.", code: 403 };
  return { success: true };
};

// --- AUTH ---
router.post("/auth/login", [
  checkDB,
  body("userId").trim().notEmpty(),
  body("password").notEmpty()
], validate([]), async (req, res) => {
  try {
    const { userId, password } = req.body;
    const userDoc = await db.collection("users").doc(userId).get();

    if (!userDoc.exists) return res.status(401).json({ error: "Invalid credentials" });

    const userData = userDoc.data();
    if (!userData.password || !(await bcrypt.compare(password, userData.password))) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    let firebaseToken = "";
    if (admin) {
      try { firebaseToken = await admin.auth().createCustomToken(userId); } catch (e) { }
    }

    const { password: _, ...safeUser } = userData;
    res.json({ ...safeUser, firebaseToken });
  } catch (error) {
    res.status(500).json({ error: "Server Error" });
  }
});

router.post("/auth/create", [
  checkDB,
  body("id").trim().notEmpty(),
  body("password").isLength({ min: 6 })
], validate([]), async (req, res) => {
  try {
    const data = req.body;
    const docRef = db.collection("users").doc(data.id);
    const doc = await docRef.get();
    if (doc.exists) return res.json({ message: "duplicate" });

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(data.password, salt);

    const newUser = {
      ...data,
      password: hashedPassword,
      fullName: `${data.firstName || ""} ${data.lastName || ""}`.trim(),
      createdAt: new Date().toISOString(),
      studentId: (data.userType === 'student') ? data.id : undefined,
      employeeId: (data.userType === 'teacher') ? data.id : undefined,
      adminId: (data.userType === 'admin') ? data.id : undefined
    };

    Object.keys(newUser).forEach(key => newUser[key] === undefined && delete newUser[key]);
    await docRef.set(newUser);
    const { password: _, ...safeUser } = newUser;
    res.json({ message: "Saved", data: safeUser });
  } catch (error) { res.status(500).json({ error: "Error" }); }
});

router.put("/auth/update", [checkDB], async (req, res) => {
  // Simplified update logic
  try {
    const { currentId, newPassword, newId } = req.body;
    const userRef = db.collection("users").doc(currentId);

    if (newPassword) {
      const salt = await bcrypt.genSalt(10);
      await userRef.update({ password: await bcrypt.hash(newPassword, salt) });
    }
    res.json({ message: "Updated", user: { id: currentId } });
  } catch (e) { res.status(500).json({ error: "Error" }); }
});

// --- ANNOUNCEMENTS (STRICT OWNERSHIP) ---

router.get("/announcements", checkDB, async (req, res) => {
  const snapshot = await db.collection("announcements").orderBy("createdAt", "desc").get();
  res.json(snapshot.docs.map(doc => doc.data()));
});

router.post("/announcements", [
  checkDB,
  body("creatorId").notEmpty().withMessage("User ID required")
], validate([]), async (req, res) => {
  try {
    const ref = db.collection("announcements").doc();
    const data = {
      id: ref.id,
      ...req.body,
      createdAt: new Date().toISOString()
    };
    await ref.set(data);
    broadcast("announcements", { action: "create", data });
    res.json(data);
  } catch (error) { res.status(500).json({ error: "Failed" }); }
});

router.delete("/announcements/:id", [
  checkDB,
  header("x-user-id").notEmpty().withMessage("User ID header required")
], validate([]), async (req, res) => {
  try {
    const userId = req.headers["x-user-id"];
    const check = await verifyOwnership("announcements", req.params.id, userId, "creatorId");
    if (check.error) return res.status(check.code).json({ error: check.error });

    await db.collection("announcements").doc(req.params.id).delete();
    broadcast("announcements", { action: "delete", id: req.params.id });
    res.json({ message: "Deleted" });
  } catch (error) { res.status(500).json({ error: "Failed" }); }
});

// --- GENERIC RESOURCES (Events/Schedules) ---

const handleDeptDelete = async (collection, req, res) => {
  try {
    const userId = req.headers["x-user-id"];
    // Strict check: Only creator can delete
    const check = await verifyOwnership(collection, req.params.id, userId, "creatorId");
    if (check.error) return res.status(check.code).json({ error: check.error });

    await db.collection(collection).doc(req.params.id).delete();
    broadcast(collection, { action: "delete", id: req.params.id });
    res.json({ message: "Deleted" });
  } catch (error) { res.status(500).json({ error: "Failed" }); }
};

router.get("/events/:dept/:sem/:shift", checkDB, async (req, res) => {
  const snapshot = await db.collection("events")
    .where("department", "==", req.params.dept).get();
  res.json(snapshot.docs.map(d => d.data()));
});

router.post("/events", [checkDB, body("creatorId").notEmpty()], validate([]), async (req, res) => {
  const ref = db.collection("events").doc();
  const data = { ...req.body, id: ref.id, createdAt: new Date().toISOString() };
  await ref.set(data);
  broadcast("events", { action: "save", data });
  res.json(data);
});

router.delete("/events/:dept/:sem/:shift/:id", [checkDB, header("x-user-id").notEmpty()], validate([]), (req, res) => handleDeptDelete("events", req, res));

// Schedules similar logic
router.get("/schedules/:dept/:sem/:shift", checkDB, async (req, res) => {
  const snapshot = await db.collection("schedules")
    .where("department", "==", req.params.dept).get();
  res.json(snapshot.docs.map(d => d.data()));
});

router.post("/schedules", [checkDB, body("creatorId").notEmpty()], validate([]), async (req, res) => {
  const ref = db.collection("schedules").doc();
  const data = { ...req.body, id: ref.id, createdAt: new Date().toISOString() };
  await ref.set(data);
  broadcast("schedules", { action: "save", data });
  res.json(data);
});

router.delete("/schedules/:dept/:sem/:shift/:id", [checkDB, header("x-user-id").notEmpty()], validate([]), (req, res) => handleDeptDelete("schedules", req, res));

module.exports = router;