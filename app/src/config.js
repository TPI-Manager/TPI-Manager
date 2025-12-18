// In production (Vite), import.meta.env is used. 
// PROD: Empty string means requests go to relative path /api (same origin)
// DEV: localhost:5000
const isProd = import.meta.env.PROD;

export const API_BASE = isProd ? "" : "http://localhost:5000";
export const SOCKET_URL = isProd ? window.location.origin : "http://localhost:5000";
export const UPLOAD_URL = ""; // Firebase URLs are absolute