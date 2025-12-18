const express = require("express");
const { body, param, validationResult } = require("express-validator");
const bcrypt = require("bcryptjs");
const { db, admin } = require("../utils/firebase");

const router = express.Router();

// Middleware to ensure DB is ready
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

const computeStatus = (item) => {
  if (!item) return null;
  const now = new Date();
  const day = now.toLocaleString("en-US", { weekday: "long" });
  if (Array.isArray(item.days) && !item.days.includes(day)) return { ...item, status: "inactive" };
  return { ...item, status: "active" };
};

// --- AUTH ---

router.post("/auth/login", [
  checkDB,
  body("userId").trim().escape().notEmpty().withMessage("User ID required"),
  body("password").notEmpty().withMessage("Password required")
], validate([]), async (req, res) => {
  try {
    const { userId, password } = req.body;

    const userDoc = await db.collection("users").doc(userId).get();

    if (!userDoc.exists) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const userData = userDoc.data();

    // Compare hashed password
    const isMatch = await bcrypt.compare(password, userData.password);
    if (!isMatch) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const { password: _, ...safeUser } = userData;

    // Generate Firebase Custom Token for Client SDK
    let firebaseToken = "";
    try {
      firebaseToken = await admin.auth().createCustomToken(userId);
    } catch (e) {
      console.error("Error creating custom token:", e);
    }

    res.json({ ...safeUser, firebaseToken });
  } catch (error) {
    console.error("Login Error:", error);
    res.status(500).json({ error: "Server Error" });
  }
});

router.post("/auth/create", [
  checkDB,
  body("userType").isIn(['student', 'teacher', 'admin']).withMessage("Invalid Role"),
  body("id").trim().escape().notEmpty().isLength({ min: 3 }).withMessage("ID invalid"),
  body("password").isLength({ min: 6 }).withMessage("Password must be 6+ chars"),
  body("firstName").trim().escape(),
  body("lastName").trim().escape()
], validate([]), async (req, res) => {
  try {
    const data = req.body;
    const { userType, id, password } = data;

    const docRef = db.collection("users").doc(id);
    const doc = await docRef.get();

    if (doc.exists) return res.json({ message: "duplicate" });

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = {
      ...data,
      password: hashedPassword,
      fullName: `${data.firstName || ""} ${data.lastName || ""}`.trim(),
      createdAt: new Date().toISOString(),
      role: userType,
      studentId: (userType === 'student') ? id : undefined,
      employeeId: (userType === 'teacher') ? id : undefined,
      adminId: (userType === 'admin') ? id : undefined
    };

    Object.keys(newUser).forEach(key => newUser[key] === undefined && delete newUser[key]);

    await docRef.set(newUser);

    const { password: _, ...safeUser } = newUser;
    res.json({ message: "Saved", data: safeUser });
  } catch (error) {
    console.error("Create User Error:", error);
    res.status(500).json({ error: "Server Error" });
  }
});

router.put("/auth/update", [
  checkDB,
  body("currentId").notEmpty(),
  body("role").equals("admin").withMessage("Unauthorized action"),
  body("newId").optional().trim().escape().isLength({ min: 3 }),
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

    if (newId && newId !== currentId) {
      const newRef = db.collection("users").doc(newId);
      const newDoc = await newRef.get();
      if (newDoc.exists) return res.status(400).json({ error: "New ID already taken" });

      const oldData = doc.data();
      const newData = { ...oldData, ...updates, id: newId, adminId: newId };
      // Ensure we don't carry over the old password if we didn't update it (it's already hashed in oldData)
      // If we updated it, 'updates.password' has the new hash.

      const batch = db.batch();
      batch.set(newRef, newData);
      batch.delete(userRef);
      await batch.commit();

      const { password: _, ...safeUser } = newData;
      return res.json({ message: "Updated", user: safeUser });
    }

    if (Object.keys(updates).length > 0) {
      await userRef.update(updates);
    }

    const updatedDoc = await db.collection("users").doc(newId || currentId).get();
    const { password: _, ...safeUser } = updatedDoc.data();
    res.json({ message: "Updated", user: safeUser });

  } catch (error) {
    console.error("Update User Error:", error);
    res.status(500).json({ error: "Server Error" });
  }
});

// --- ANNOUNCEMENTS ---

router.get("/announcements", checkDB, async (req, res) => {
  try {
    const snapshot = await db.collection("announcements").orderBy("createdAt", "desc").get();
    const list = snapshot.docs.map(doc => doc.data());
    res.json(list);
  } catch (error) {
    console.error("Announcements Get Error:", error);
    res.status(500).json({ error: "Failed to fetch announcements" });
  }
});

router.post("/announcements", [
  checkDB,
  body("title").trim().escape().notEmpty(),
  body("body").trim().escape().notEmpty(),
  body("createdBy").trim().escape()
], validate([]), async (req, res) => {
  try {
    const ref = db.collection("announcements").doc();
    const data = { id: ref.id, ...req.body, createdAt: new Date().toISOString() };
    await ref.set(data);
    res.json(data);
  } catch (error) {
    console.error("Announcements Post Error:", error);
    res.status(500).json({ error: "Failed to save announcement" });
  }
});

router.delete("/announcements/:id", checkDB, async (req, res) => {
  try {
    await db.collection("announcements").doc(req.params.id).delete();
    res.json({ message: "Deleted" });
  } catch (error) {
    console.error("Announcements Delete Error:", error);
    res.status(500).json({ error: "Failed to delete" });
  }
});

// --- GENERIC RESOURCES ---

const handleDeptGet = async (collection, req, res) => {
  try {
    const { dept, sem, shift } = req.params;
    const snapshot = await db.collection(collection)
      .where("department", "==", dept)
      .where("semester", "==", sem)
      .where("shift", "==", shift)
      .get();

    const items = snapshot.docs.map(doc => doc.data());
    const computed = items.map(computeStatus).filter(Boolean);
    res.json(computed);
  } catch (error) {
    console.error(`Get ${collection} Error:`, error);
    res.json([]);
  }
};

const handleDeptSave = async (collection, req, res) => {
  try {
    const { department, semester, shift, id } = req.body;
    if (!department || !semester || !shift) return res.status(400).json({ error: "Missing metadata" });

    const ref = id ? db.collection(collection).doc(id) : db.collection(collection).doc();
    const data = {
      ...req.body,
      id: ref.id,
      createdAt: req.body.createdAt || new Date().toISOString()
    };

    await ref.set(data, { merge: true });
    res.json(computeStatus(data));
  } catch (error) {
    console.error(`Save ${collection} Error:`, error);
    res.status(500).json({ error: "Failed to save data" });
  }
};

const handleDeptDelete = async (collection, req, res) => {
  try {
    await db.collection(collection).doc(req.params.id).delete();
    res.json({ message: "Deleted" });
  } catch (error) {
    console.error(`Delete ${collection} Error:`, error);
    res.status(500).json({ error: "Failed to delete" });
  }
};

router.get("/events/:dept/:sem/:shift", checkDB, (req, res) => handleDeptGet("events", req, res));
router.post("/events", [
  checkDB, body("title").trim().escape(), body("body").trim().escape()
], validate([]), (req, res) => handleDeptSave("events", req, res));
router.delete("/events/:dept/:sem/:shift/:id", checkDB, (req, res) => handleDeptDelete("events", req, res));

router.get("/schedules/:dept/:sem/:shift", checkDB, (req, res) => handleDeptGet("schedules", req, res));
router.post("/schedules", [
  checkDB, body("title").trim().escape()
], validate([]), (req, res) => handleDeptSave("schedules", req, res));
router.delete("/schedules/:dept/:sem/:shift/:id", checkDB, (req, res) => handleDeptDelete("schedules", req, res));

module.exports = router;