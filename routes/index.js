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
  if (data[idField] !== userId) return { error: "Unauthorized", code: 403 };
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

    // Generate token for Frontend to assume identity in Firestore Rules
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
    Object.keys(newUser).forEach(k => newUser[k] === undefined && delete newUser[k]);

    await docRef.set(newUser);
    const { password: _, ...safeUser } = newUser;
    res.json({ message: "Saved", data: safeUser });
  } catch (e) { res.status(500).json({ error: "Error" }); }
});

// Admin Update Route (Username & Password)
router.put("/auth/update", [
  checkDB,
  body("currentId").notEmpty(),
  body("role").equals("admin").withMessage("Only admins can edit credentials here"),
  body("newId").optional().trim().isLength({ min: 3 }),
  body("newPassword").optional().isLength({ min: 6 })
], validate([]), async (req, res) => {
  try {
    const { currentId, newPassword, newId } = req.body;

    const userRef = db.collection("users").doc(currentId);
    const doc = await userRef.get();

    if (!doc.exists) return res.status(404).json({ error: "User not found" });

    const updates = {};
    if (newPassword) {
      const salt = await bcrypt.genSalt(10);
      updates.password = await bcrypt.hash(newPassword, salt);
    }

    // Handle ID Change (Renaming Document)
    if (newId && newId !== currentId) {
      const newRef = db.collection("users").doc(newId);
      const newDoc = await newRef.get();
      if (newDoc.exists) return res.status(400).json({ error: "Username already taken" });

      const oldData = doc.data();
      const newData = {
        ...oldData,
        ...updates,
        id: newId,
        adminId: newId // Update the role specific ID
      };

      const batch = db.batch();
      batch.set(newRef, newData);
      batch.delete(userRef);
      await batch.commit();

      const { password: _, ...safeUser } = newData;
      // We must return a new token because the UID changed!
      let firebaseToken = "";
      if (admin) try { firebaseToken = await admin.auth().createCustomToken(newId); } catch (e) { }

      return res.json({ message: "Updated", user: safeUser, firebaseToken });
    }

    // Normal Update (Password only)
    if (Object.keys(updates).length > 0) {
      await userRef.update(updates);
    }

    const updatedDoc = await db.collection("users").doc(currentId).get();
    const { password: _, ...safeUser } = updatedDoc.data();
    res.json({ message: "Updated", user: safeUser });

  } catch (error) {
    console.error("Update error", error);
    res.status(500).json({ error: "Server Error" });
  }
});

// --- RESOURCES (With Strict Ownership) ---

router.get("/announcements", checkDB, async (req, res) => {
  const s = await db.collection("announcements").orderBy("createdAt", "desc").get();
  res.json(s.docs.map(d => d.data()));
});

router.post("/announcements", [checkDB, body("creatorId").notEmpty()], validate([]), async (req, res) => {
  const ref = db.collection("announcements").doc();
  const data = { id: ref.id, ...req.body, createdAt: new Date().toISOString() };
  await ref.set(data);
  broadcast("announcements", { action: "create", data });
  res.json(data);
});

router.delete("/announcements/:id", [checkDB, header("x-user-id").notEmpty()], validate([]), async (req, res) => {
  const c = await verifyOwnership("announcements", req.params.id, req.headers["x-user-id"]);
  if (c.error) return res.status(c.code).json(c);
  await db.collection("announcements").doc(req.params.id).delete();
  broadcast("announcements", { action: "delete", id: req.params.id });
  res.json({ message: "Deleted" });
});

// Events & Schedules helpers
const handleDeptDelete = async (col, req, res) => {
  const c = await verifyOwnership(col, req.params.id, req.headers["x-user-id"]);
  if (c.error) return res.status(c.code).json(c);
  await db.collection(col).doc(req.params.id).delete();
  broadcast(col, { action: "delete", id: req.params.id });
  res.json({ message: "Deleted" });
};

router.get("/events/:dept/:sem/:shift", checkDB, async (req, res) => {
  const s = await db.collection("events").where("department", "==", req.params.dept).get();
  res.json(s.docs.map(d => d.data()));
});
router.post("/events", [checkDB, body("creatorId").notEmpty()], validate([]), async (req, res) => {
  const r = db.collection("events").doc();
  const d = { ...req.body, id: r.id, createdAt: new Date().toISOString() };
  await r.set(d); broadcast("events", { action: "save", data: d }); res.json(d);
});
router.delete("/events/:dept/:sem/:shift/:id", [checkDB, header("x-user-id").notEmpty()], validate([]), (req, res) => handleDeptDelete("events", req, res));

router.get("/schedules/:dept/:sem/:shift", checkDB, async (req, res) => {
  const s = await db.collection("schedules").where("department", "==", req.params.dept).get();
  res.json(s.docs.map(d => d.data()));
});
router.post("/schedules", [checkDB, body("creatorId").notEmpty()], validate([]), async (req, res) => {
  const r = db.collection("schedules").doc();
  const d = { ...req.body, id: r.id, createdAt: new Date().toISOString() };
  await r.set(d); broadcast("schedules", { action: "save", data: d }); res.json(d);
});
router.delete("/schedules/:dept/:sem/:shift/:id", [checkDB, header("x-user-id").notEmpty()], validate([]), (req, res) => handleDeptDelete("schedules", req, res));

module.exports = router;