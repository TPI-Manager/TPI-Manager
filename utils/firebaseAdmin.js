const admin = require("firebase-admin");

let db;

try {
    let serviceAccount;
    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
        const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
        serviceAccount = JSON.parse(raw);

        if (serviceAccount.private_key) {
            serviceAccount.private_key = serviceAccount.private_key
                .replace(/\\n/g, '\n')
                .replace("-----BEGINPRIVATEKEY-----", "-----BEGIN PRIVATE KEY-----")
                .replace("-----ENDPRIVATEKEY-----", "-----END PRIVATE KEY-----");
        }
    }

    if (serviceAccount && serviceAccount.private_key) {
        if (admin.apps.length === 0) {
            admin.initializeApp({
                credential: admin.credential.cert(serviceAccount)
            });
        }
        db = admin.firestore();
    } else {
        db = {
            collection: () => ({
                doc: () => ({ set: async () => { }, delete: async () => { }, update: async () => { } }),
                add: async () => { }
            })
        };
    }
} catch (error) {
    db = {
        collection: () => ({
            doc: () => ({ set: async () => { }, delete: async () => { }, update: async () => { } }),
            add: async () => { }
        })
    };
}

module.exports = { admin, db };