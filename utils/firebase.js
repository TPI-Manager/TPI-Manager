const admin = require("firebase-admin");
const path = require("path");
const fs = require("fs");

let serviceAccount;

try {
    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
        let envVar = process.env.FIREBASE_SERVICE_ACCOUNT;
        if (typeof envVar === "string") {
            try {
                serviceAccount = JSON.parse(envVar);
            } catch (e) {
                envVar = envVar.trim();
                serviceAccount = JSON.parse(envVar);
            }
        }
    } else {
        const serviceAccountPath = path.join(__dirname, "../serviceAccountKey.json");
        if (fs.existsSync(serviceAccountPath)) {
            serviceAccount = require(serviceAccountPath);
        }
    }
} catch (error) {
    console.error("❌ Error loading service account:", error.message);
}

if (serviceAccount) {
    if (serviceAccount.private_key) {
        serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
    }

    if (!admin.apps.length) {
        try {
            admin.initializeApp({
                credential: admin.credential.cert(serviceAccount),
                storageBucket: process.env.FIREBASE_STORAGE_BUCKET || `${serviceAccount.project_id}.appspot.com`
            });
            console.log("✅ Firebase Admin initialized.");
        } catch (e) {
            console.error("❌ Firebase Init Failed:", e.message);
        }
    }
}

const db = serviceAccount ? admin.firestore() : null;
const bucket = serviceAccount ? admin.storage().bucket() : null;

// Updated to accept ownerId for metadata
const uploadToFirebase = async (file, ownerId) => {
    if (!bucket) throw new Error("Firebase Storage not initialized");

    const filename = `uploads/${Date.now()}-${file.originalname.replace(/[^a-zA-Z0-9.]/g, "_")}`;
    const blob = bucket.file(filename);

    const blobStream = blob.createWriteStream({
        metadata: {
            contentType: file.mimetype,
            metadata: {
                ownerId: ownerId || "system" // Attach ownership
            }
        },
        resumable: false
    });

    return new Promise((resolve, reject) => {
        blobStream.on("error", (err) => reject(err));
        blobStream.on("finish", async () => {
            try {
                const [url] = await blob.getSignedUrl({
                    action: "read",
                    expires: "01-01-2050",
                });
                resolve(url);
            } catch (err) {
                reject(err);
            }
        });
        blobStream.end(file.buffer);
    });
};

module.exports = { admin, db, bucket, uploadToFirebase };