const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');
const pool = require('../config/db');
const { protect } = require('../middleware/auth.middleware');
const multer = require('multer');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// 1. Initialize Supabase
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
let supabase;

if (supabaseUrl && supabaseKey) {
    supabase = createClient(supabaseUrl, supabaseKey);
} else {
    console.error("❌ ERROR: Supabase credentials missing.");
}

// 2. Setup Multer (Memory for Supabase)
const storage = multer.memoryStorage();
const upload = multer({ storage });

// --- AUTH ROUTES ---

// REGISTER
router.post("/register", async (req, res) => {
    try {
        const { name, email, password } = req.body;
        const hashed = await bcrypt.hash(password, 10);
        const result = await pool.query(
            "INSERT INTO users (name, email, password) VALUES ($1, $2, $3) RETURNING id, name, email, role",
            [name, email, hashed]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// LOGIN
router.post("/login", async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await pool.query("SELECT * FROM users WHERE email = $1", [email]);

        if (user.rows.length > 0 && await bcrypt.compare(password, user.rows[0].password)) {
            const token = jwt.sign(
                { id: user.rows[0].id, role: user.rows[0].role },
                process.env.JWT_SECRET,
                { expiresIn: '1d' }
            );
            const { password: _, ...userData } = user.rows[0];
            res.json({ ...userData, token });
        } else {
            res.status(401).json({ message: "Invalid credentials" });
        }
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// GET CURRENT USER (Used by Frontend AuthContext)
router.get("/me", protect, async (req, res) => {
    try {
        const result = await pool.query(
            "SELECT id, name, email, role, bio, profile_pic FROM users WHERE id = $1",
            [req.user.id]
        );
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// --- PROFILE UPDATE (WITH SUPABASE) ---
router.put("/profile", protect, upload.single("profile_pic"), async (req, res) => {
    try {
        const { name, bio } = req.body;
        let profilePicUrl = null;

        if (req.file && supabase) {
            const fileName = `profile-${Date.now()}-${req.file.originalname.replace(/\s+/g, '_')}`;
            const { error } = await supabase.storage
                .from("uploads")
                .upload(`profile/${fileName}`, req.file.buffer, { contentType: req.file.mimetype });

            if (error) throw error;

            const { data: publicUrlData } = supabase.storage
                .from("uploads")
                .getPublicUrl(`profile/${fileName}`);

            profilePicUrl = publicUrlData.publicUrl;
        }

        const result = await pool.query(
            `UPDATE users 
             SET name = $1, bio = $2, profile_pic = COALESCE($3::text, profile_pic) 
             WHERE id = $4 RETURNING id, name, bio, profile_pic, email, role`,
            [name, bio, profilePicUrl, req.user.id]
        );
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: err.message });
    }
});

// CHANGE PASSWORD
router.put("/change-password", protect, async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        const user = await pool.query("SELECT password FROM users WHERE id = $1", [req.user.id]);
        
        if (await bcrypt.compare(currentPassword, user.rows[0].password)) {
            const hashed = await bcrypt.hash(newPassword, 10);
            await pool.query("UPDATE users SET password = $1 WHERE id = $2", [hashed, req.user.id]);
            res.json({ message: "Password updated" });
        } else {
            res.status(400).json({ message: "Current password incorrect" });
        }
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;
