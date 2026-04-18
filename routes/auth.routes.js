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

// 2. Setup Multer (Memory Storage for Supabase)
const storage = multer.memoryStorage();
const upload = multer({ storage });

// Helper to generate JWT
const generateToken = (id) =>
    jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: "7d" });

// --- REGISTER (Direct Creation) ---
router.post("/register", async (req, res) => {
    const { name, email, password } = req.body;
    
    if (!name || !email || !password) {
        return res.status(400).json({ message: "All fields required" });
    }

    try {
        // Check if user exists
        const exists = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
        if (exists.rows.length > 0) {
            return res.status(400).json({ message: "Email already registered" });
        }

        const hashed = await bcrypt.hash(password, 10);

        // Insert directly into the users table
        const result = await pool.query(
            `INSERT INTO users (name, email, password, role, status) 
             VALUES ($1, $2, $3, 'member', 'active') 
             RETURNING id, name, email, role`,
            [name, email, hashed]
        );

        const newUser = result.rows[0];

        res.status(201).json({
            token: generateToken(newUser.id),
            user: newUser
        });
    } catch (err) {
        console.error("Register error:", err);
        res.status(500).json({ message: "Server error during registration" });
    }
});

// --- LOGIN ---
router.post("/login", async (req, res) => {
    const { email, password } = req.body;
    try {
        const result = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
        const user = result.rows[0];

        if (!user || user.status === 'inactive') {
            return res.status(401).json({ message: "Invalid credentials or account inactive" });
        }
        
        const match = await bcrypt.compare(password, user.password);
        if (!match) return res.status(401).json({ message: "Invalid email or password" });

        res.json({
            token: generateToken(user.id),
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
                bio: user.bio,
                profile_pic: user.profile_pic,
            },
        });
    } catch (err) {
        res.status(500).json({ message: "Server error" });
    }
});

// --- GET CURRENT USER (/me) ---
router.get("/me", protect, async (req, res) => {
    try {
        const result = await pool.query(
            "SELECT id, name, email, role, bio, profile_pic FROM users WHERE id = $1",
            [req.user.id]
        );
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ message: "Server error" });
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
             SET name = COALESCE($1, name), bio = COALESCE($2, bio), profile_pic = COALESCE($3, profile_pic) 
             WHERE id = $4 RETURNING id, name, bio, profile_pic, email, role`,
            [name, bio, profilePicUrl, req.user.id]
        );
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;
