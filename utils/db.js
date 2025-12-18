const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

let supabase;

if (!supabaseUrl || !supabaseKey) {
    console.error("❌ CRITICAL ERROR: Supabase URL or Key is MISSING in Environment Variables.");
    // We do not initialize supabase to avoid a hard crash, 
    // but API calls using it will fail.
} else {
    try {
        supabase = createClient(supabaseUrl, supabaseKey);
    } catch (e) {
        console.error("❌ Supabase Init Error:", e.message);
    }
}

// Helper to upload file
const uploadToSupabase = async (file, ownerId) => {
    if (!supabase) throw new Error("Database connection not initialized (Missing Env Vars)");

    const name = `${Date.now()}-${file.originalname.replace(/[^a-zA-Z0-9.]/g, "_")}`;

    const { data, error } = await supabase
        .storage
        .from('uploads')
        .upload(name, file.buffer, {
            contentType: file.mimetype,
            upsert: false
        });

    if (error) throw error;

    const { data: { publicUrl } } = supabase
        .storage
        .from('uploads')
        .getPublicUrl(name);

    return publicUrl;
};

module.exports = { supabase, uploadToSupabase };