const { createClient } = require('@supabase/supabase-js');

// Initialize with Service Role Key to bypass RLS (Admin Access)
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("❌ Missing Supabase URL or Key in .env");
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Helper to upload file
const uploadToSupabase = async (file, ownerId) => {
    // Sanitize filename
    const name = `${Date.now()}-${file.originalname.replace(/[^a-zA-Z0-9.]/g, "_")}`;

    // Upload
    const { data, error } = await supabase
        .storage
        .from('uploads')
        .upload(name, file.buffer, {
            contentType: file.mimetype,
            upsert: false
        });

    if (error) throw error;

    // Get Public URL
    const { data: { publicUrl } } = supabase
        .storage
        .from('uploads')
        .getPublicUrl(name);

    return publicUrl;
};

module.exports = { supabase, uploadToSupabase };