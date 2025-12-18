const admin = require("firebase-admin");

let db;

try {
    let serviceAccount;
    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
        serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    }

    if (serviceAccount) {
        if (admin.apps.length === 0) {
            admin.initializeApp({
                credential: admin.credential.cert(serviceAccount)
            });
        }
        db = admin.firestore();
        console.log("Firebase Admin Initialized");
    } else {
        console.warn("FIREBASE_SERVICE_ACCOUNT missing. Double-write disabled.");
        // Mock to prevent crash
        db = {
            collection: () => ({
                doc: () => ({ set: async () => { }, delete: async () => { }, update: async () => { } }),
                add: async () => { }
            })
        };
    }
} catch (error) {
    console.error("Firebase Init Error:", error);
    db = {
        collection: () => ({
            doc: () => ({ set: async () => { }, delete: async () => { }, update: async () => { } }),
            add: async () => { }
        })
    };
}

module.exports = { admin, db };
