import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// Your web app's Firebase configuration
// keys are pulled from environment variables (Vite)
const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID
};

let app;
let db = null;

try {
    if (firebaseConfig.apiKey && firebaseConfig.projectId) {
        app = initializeApp(firebaseConfig);
        db = getFirestore(app);
    } else {
        console.warn("Firebase keys missing. Realtime features disabled.");
    }
} catch (e) {
    console.error("Firebase Init Error:", e);
}

export { db };
