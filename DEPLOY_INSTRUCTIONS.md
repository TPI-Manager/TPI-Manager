# Deployment Instructions

This project is set up for easy deployment on **Vercel**, **Railway**, or **Render**.

## 1. Vercel (Recommended for Frontend + API)

1.  **Import Project**: Connect your GitHub repository to Vercel.
2.  **Project Settings**:
    *   **Framework Preset**: Select **Vite** or Leave as **Other**.
    *   **Build Command**: `npm run build`
    *   **Output Directory**: `dist` (Important! Check this in Build & Development Settings)
3.  **Environment Variables**: Add your `.env` variables (PORT, FIREBASE_*, etc.).
4.  **Deploy**.

*The `vercel.json` and `api/index.js` files are configured to handle the serverless API and client-side routing automatically.*

## 2. Render / Railway (Recommended for Full Server features)

These platforms will automatically detect the configuration.

### Render
1.  **New Web Service**: Connect your repo.
2.  **Blueprint**: It should auto-detect `render.yaml`.
3.  If not using Blueprint:
    *   **Build Command**: `npm install && npm run build`
    *   **Start Command**: `npm start`
4.  Add Environment Variables.

### Railway
1.  **New Project**: Deploy from GitHub.
2.  Railway will detect `package.json` and use:
    *   **Build**: `npm install && npm run build`
    *   **Start**: `npm start`
3.  Add Environment Variables.

## Note on "Duplicates"
The backend logic is centralized in `server.js`. The `api/` folder now simply points to the main server, preventing code duplication issues.
