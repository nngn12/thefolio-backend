const { createClient } = require('@supabase/supabase-js');
const pool = require('../config/db');
const { protect } = require('../middleware/auth.middleware');
const multer = require('multer');

// 1. Initialize Supabase
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

// 2. Setup Multer for Memory Storage (Crucial for Supabase uploads)
const storage = multer.memoryStorage();
const upload = multer({ storage });

// 3. The Route
router.put("/profile", protect, upload.single("profile_pic"), async (req, res) => {
    try {
        const { name, bio } = req.body;
        let profilePicUrl = null;

        // --- STEP 1: UPLOAD TO SUPABASE ---
        if (req.file) {
            // Create a unique filename inside a 'profile' folder
            const fileName = `profile-${Date.now()}-${req.file.originalname.replace(/\s+/g, '_')}`;

            const { data, error } = await supabase.storage
                .from("uploads") // Make sure your bucket is named "uploads"
                .upload(`profile/${fileName}`, req.file.buffer, {
                    contentType: req.file.mimetype,
                    upsert: true // Overwrite if same name exists
                });

            if (error) {
                console.error("Supabase Upload Error:", error);
                throw new Error("Failed to upload image to storage.");
            }

            // Get the Public URL from Supabase
            const { data: publicUrl } = supabase.storage
                .from("uploads")
                .getPublicUrl(`profile/${fileName}`);

            profilePicUrl = publicUrl.publicUrl;
        }

        // --- STEP 2: UPDATE DATABASE ---
        // Using COALESCE for $3 means if profilePicUrl is NULL (no new file), 
        // it keeps the old profile_pic value.
        const result = await pool.query(
            `UPDATE users 
             SET name = $1, 
                 bio = $2, 
                 profile_pic = COALESCE($3, profile_pic)
             WHERE id = $4 
             RETURNING id, name, bio, profile_pic, email, role`,
            [name, bio, profilePicUrl, req.user.id]
        );

        // --- STEP 3: SUCCESS RESPONSE ---
        res.json(result.rows[0]);

    } catch (err) {
        console.error("Profile Update Route Error:", err);
        res.status(500).json({ 
            success: false, 
            message: err.message || "An error occurred while updating the profile." 
        });
    }
});
