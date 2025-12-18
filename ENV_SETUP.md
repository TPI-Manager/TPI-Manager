# 🔐 TPI Manager Environment Setup Guide

To run this app locally and deploy to Vercel, you need to set up environment variables for both the Backend and the Frontend.

## 1. Get Firebase Configuration

### Part A: Service Account (For Backend)
1. Go to the **Firebase Console** (https://console.firebase.google.com).
2. Open your project.
3. Go to **Project Settings** (gear icon) -> **Service accounts** tab.
4. Click **Generate new private key**.
5. A JSON file will download (e.g., `your-project-firebase-adminsdk-xyz.json`).
6. **Local Dev**: Rename this file to `serviceAccountKey.json` and place it in the root folder (`TPI-Manager/`).
7. **Vercel**: Open the JSON file, copy the *entire content*, and verify it is a valid JSON string. You will paste this into the `FIREBASE_SERVICE_ACCOUNT` variable in Vercel.

### Part B: Client SDK Config (For Frontend)
1. Go to **Project Settings** -> **General** tab.
2. Scroll down to "Your apps". If you haven't created a Web App yet, click the `</>` icon to create one.
3. Select "Config" to see your keys (`apiKey`, `authDomain`, etc.).

---

## 2. Setup Local Environment

### Backend
1. In the root folder (`TPI-Manager/`), create a file named `.env`.
2. Copy the contents from `.env.example`.
3. If you placed `serviceAccountKey.json` in the root, you technically don't need to fill `FIREBASE_SERVICE_ACCOUNT` for local dev, but it's good practice to understand how it works.

### Frontend
1. In the app folder (`TPI-Manager/app/`), create a file named `.env`.
2. Copy the contents from `app/.env.example`.
3. Fill in the `VITE_FIREBASE_...` values from **Part B** above.

---

## 3. Deploying to Vercel

When you deploy to Vercel, you must add these Environment Variables in the Vercel Dashboard (**Settings** -> **Environment Variables**).

1. **Backend Variables**:
   - `FIREBASE_SERVICE_ACCOUNT`: Paste the **entire content** of the JSON key file you downloaded in Part A. Remove newlines if possible, though Vercel handles multiline values usually.
   - `CLIENT_URL`: Set to your production frontend URL (e.g., `https://tpi-manager.vercel.app`).

2. **Frontend Variables**:
   - Add all the `VITE_FIREBASE_...` variables exactly as they are in your `app/.env` file.

**Important**: Do NOT commit `.env` or `serviceAccountKey.json` to GitHub. They are ignored by `.gitignore` for your security.
