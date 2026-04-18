const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');
const pool = require('../config/db');
const { protect } = require('../middleware/auth.middleware');
const multer = require('multer');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// 1. Initialize Supabase
const supabase = createClient(
    process.env.SUPABASE_URL || '', 
    process.env.SUPABASE_ANON_KEY || ''
);

// 2. Setup Multer
const storage = multer.memoryStorage();
const upload = multer({ storage });

// --- LOGIN ---
router.post("/login", async (req, res) => {
    try {
        const { email, password } = req.body;
        const result = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
        const user = result.rows[0];

        if (user && await bcrypt.compare(password, user.password)) {
            const token = jwt.sign(
                { id: user.id, role: user.role }, 
                process.env.JWT_SECRET, 
                { expiresIn: '1d' }
            );
            
            // Explicitly sending the role back to the frontend
            return res.json({ 
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role, // <--- CRITICAL
                bio: user.bio,
                profile_pic: user.profile_pic,
                token 
            });
        }
        return res.status(401).json({ message: "Invalid credentials" });
    } catch (err) {
        console.error("Login Error:", err);
        res.status(500).json({ message: "Server error" });
    }
});

// --- GET CURRENT USER (/me) ---
// Frontend calls this to "stay logged in" on refresh
router.get("/me", protect, async (req, res) => {
    try {
        const result = await pool.query(
            "SELECT id, name, email, role, bio, profile_pic FROM users WHERE id = $1",
            [req.user.id]
        );
        
        if (result.rows.length === 0) return res.status(404).json({ message: "User not found" });
        
        // Ensure role is in the response
        res.json(result.rows[0]); 
    } catch (err) {
        console.error("Me Error:", err);
        res.status(500).json({ message: "Server error" });
    }
});

// --- REGISTER ---
router.post("/register", async (req, res) => {
    try {
        const { name, email, password } = req.body;
        const hashed = await bcrypt.hash(password, 10);
        const result = await pool.query(
            "INSERT INTO users (name, email, password, role) VALUES ($1, $2, $3, 'user') RETURNING id, name, email, role",
            [name, email, hashed]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// --- PROFILE UPDATE (SUPABASE) ---
router.put("/profile", protect, upload.single("profile_pic"), async (req, res) => {
    try {
        const { name, bio } = req.body;
        let profilePicUrl = null;

        if (req.file) {
            const fileName = `profile-${Date.now()}-${req.file.originalname.replace(/\s+/g, '_')}`;
            const { error } = await supabase.storage
                .from("uploads")
                .upload(`profile/${fileName}`, req.file.buffer, {
                    contentType: req.file.mimetype,
                    upsert: true
                });

            if (error) throw error;
            const { data: publicUrl } = supabase.storage.from("uploads").getPublicUrl(`profile/${fileName}`);
            profilePicUrl = publicUrl.publicUrl;
        }

        const result = await pool.query(
            `UPDATE users 
             SET name = $1, bio = $2, profile_pic = COALESCE($3::text, profile_pic) 
             WHERE id = $4 
             RETURNING id, name, bio, profile_pic, email, role`, // <--- Includes role after update
            [name, bio, profilePicUrl, req.user.id]
        );
        res.json(result.rows[0]);
    } catch (err) {
        console.error("Profile Error:", err);
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;
