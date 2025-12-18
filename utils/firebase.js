const admin = require("firebase-admin");
const path = require("path");
const fs = require("fs");

let serviceAccount;

try {
    // Look for serviceAccountKey.json in root
    const serviceAccountPath = path.join(__dirname, "../serviceAccountKey.json");
    if (fs.existsSync(serviceAccountPath)) {
        serviceAccount = require(serviceAccountPath);
    } else {
        console.warn("⚠️  serviceAccountKey.json not found. Firebase will not work until configured.");
    }
} catch (error) {
    console.error("Error loading service account:", error);
}

if (serviceAccount) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        storageBucket: `${serviceAccount.project_id}.appspot.com` // Default bucket inference
    });
}

const db = serviceAccount ? admin.firestore() : null;
const bucket = serviceAccount ? admin.storage().bucket() : null;

// Helper to upload file buffer to Firebase Storage
const uploadToFirebase = async (file) => {
    if (!bucket) throw new Error("Firebase Storage not initialized");

    const filename = `uploads/${Date.now()}-${file.originalname}`;
    const blob = bucket.file(filename);

    const blobStream = blob.createWriteStream({
        metadata: {
            contentType: file.mimetype,
        },
    });

    return new Promise((resolve, reject) => {
        blobStream.on("error", (err) => reject(err));
        blobStream.on("finish", async () => {
            try {
                // Get a signed URL valid for 100 years (effectively public for this use case)
                const [url] = await blob.getSignedUrl({
                    action: "read",
                    expires: "03-01-2100",
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