const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');
const pool = require('../config/db');
const { protect } = require('../middleware/auth.middleware');
const multer = require('multer');

// 1. Initialize Supabase using the EXACT names from your Render Env
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY; 

let supabase;

// Safety check: Only initialize if keys exist to prevent Render crash
if (supabaseUrl && supabaseKey) {
    supabase = createClient(supabaseUrl, supabaseKey);
} else {
    console.error("❌ ERROR: Supabase credentials (SUPABASE_URL or SUPABASE_ANON_KEY) missing in Render.");
}

// 2. Setup Multer for Memory Storage
const storage = multer.memoryStorage();
const upload = multer({ storage });

// 3. The Profile Update Route
router.put("/profile", protect, upload.single("profile_pic"), async (req, res) => {
    try {
        const { name, bio } = req.body;
        let profilePicUrl = null;

        // Check if Supabase initialized correctly
        if (!supabase) {
            return res.status(500).json({ 
                success: false, 
                message: "Cloud storage is not configured. Check server logs." 
            });
        }

        // --- STEP 1: UPLOAD TO SUPABASE ---
        if (req.file) {
            // Create a unique filename with timestamp
            const fileName = `profile-${Date.now()}-${req.file.originalname.replace(/\s+/g, '_')}`;

            const { data, error } = await supabase.storage
                .from("uploads") 
                .upload(`profile/${fileName}`, req.file.buffer, {
                    contentType: req.file.mimetype,
                    upsert: true 
                });

            if (error) {
                console.error("Supabase Upload Error:", error);
                throw new Error("Failed to upload image to Supabase.");
            }

            // Get the Public URL
            const { data: publicUrlData } = supabase.storage
                .from("uploads")
                .getPublicUrl(`profile/${fileName}`);

            profilePicUrl = publicUrlData.publicUrl;
        }

        // --- STEP 2: UPDATE POSTGRES DATABASE ---
        const result = await pool.query(
            `UPDATE users 
             SET name = $1, 
                 bio = $2, 
                 profile_pic = COALESCE($3::text, profile_pic)
             WHERE id = $4 
             RETURNING id, name, bio, profile_pic, email, role`,
            [name, bio, profilePicUrl, req.user.id]
        );

        res.json(result.rows[0]);

    } catch (err) {
        console.error("Profile Update Route Error:", err);
        res.status(500).json({ 
            success: false, 
            message: err.message || "An error occurred while updating the profile." 
        });
    }
});

module.exports = router;
