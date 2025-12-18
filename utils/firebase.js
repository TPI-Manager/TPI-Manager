const admin = require("firebase-admin");
const path = require("path");
const fs = require("fs");

let serviceAccount;

try {
    // Method 1: Environment Variable (Recommended for production/Vercel)
    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
        serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    } else {
        // Method 2: Local File (Development only)
        const serviceAccountPath = path.join(__dirname, "../serviceAccountKey.json");
        if (fs.existsSync(serviceAccountPath)) {
            serviceAccount = require(serviceAccountPath);
        }
    }
} catch (error) {
    console.error("❌ Error loading service account:", error.message);
}

if (serviceAccount) {
    // Fix common formatting issues in private key
    if (serviceAccount.private_key) {
        let pk = serviceAccount.private_key;

        // Fix missing spaces in headers/footers (common env var issue)
        pk = pk.replace(/-----BEGINPRIVATEKEY-----/g, '-----BEGIN PRIVATE KEY-----');
        pk = pk.replace(/-----ENDPRIVATEKEY-----/g, '-----END PRIVATE KEY-----');

        // Fix escaped newlines
        pk = pk.replace(/\\n/g, '\n');

        serviceAccount.private_key = pk;
    }

    if (!admin.apps.length) {
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
            storageBucket: process.env.FIREBASE_STORAGE_BUCKET || `${serviceAccount.project_id}.appspot.com`
        });
        console.log("✅ Firebase Admin initialized.");
    }
} else {
    console.error("🛑 CRITICAL: Firebase Service Account missing! Set FIREBASE_SERVICE_ACCOUNT env var or add serviceAccountKey.json");
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