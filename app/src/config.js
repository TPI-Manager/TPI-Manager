const isProd = import.meta.env.PROD;

export const API_BASE = isProd ? "" : "http://localhost:5000";
// Add these to Vercel Environment Variables later
export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "YOUR_SUPABASE_URL";
export const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || "YOUR_SUPABASE_ANON_KEY";