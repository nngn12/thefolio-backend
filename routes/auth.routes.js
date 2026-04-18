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

const generateToken = (id) =>
    jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: "7d" });

// --- NEW: ADMIN STATS ROUTE ---
// Use this on your Admin Dashboard to show the total posts
router.get("/admin-stats", protect, async (req, res) => {
    try {
        // Only allow admins to see the total count
        if (req.user.role !== 'admin') {
            return res.status(403).json({ message: "Access denied. Admins only." });
        }

        const postCountResult = await pool.query("SELECT COUNT(*) FROM posts");
        const userCountResult = await pool.query("SELECT COUNT(*) FROM users");

        res.json({
            totalPosts: parseInt(postCountResult.rows[0].count),
            totalUsers: parseInt(userCountResult.rows[0].count)
        });
    } catch (err) {
        console.error("Stats Error:", err);
        res.status(500).json({ message: "Error fetching dashboard stats" });
    }
});

// --- UPDATED: GET CURRENT USER (/me) ---
// Now includes the post count for the specific user (Ana Leah)
router.get("/me", protect, async (req, res) => {
    try {
        const userResult = await pool.query(
            "SELECT id, name, email, role, bio, profile_pic FROM users WHERE id = $1",
            [req.user.id]
        );
        
        if (userResult.rows.length === 0) return res.status(404).json({ message: "User not found" });

        const user = userResult.rows[0];

        // Also count how many posts this specific user has made
        const userPostCount = await pool.query(
            "SELECT COUNT(*) FROM posts WHERE author_id = $1",
            [req.user.id]
        );

        res.json({
            ...user,
            postCount: parseInt(userPostCount.rows[0].count)
        });
    } catch (err) {
        res.status(500).json({ message: "Server error" });
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

        // Add the post count to the login response as well
        const postCount = await pool.query("SELECT COUNT(*) FROM posts WHERE author_id = $1", [user.id]);

        res.json({
            token: generateToken(user.id),
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
                bio: user.bio,
                profile_pic: user.profile_pic,
                postCount: parseInt(postCount.rows[0].count)
            },
        });
    } catch (err) {
        res.status(500).json({ message: "Server error" });
    }
});

// --- REGISTER ---
router.post("/register", async (req, res) => {
    const { name, email, password } = req.body;
    if (!name || !email || !password) return res.status(400).json({ message: "All fields required" });

    try {
        const exists = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
        if (exists.rows.length > 0) return res.status(400).json({ message: "Email registered" });

        const hashed = await bcrypt.hash(password, 10);
        const result = await pool.query(
            "INSERT INTO users (name, email, password, role, status) VALUES ($1, $2, $3, 'member', 'active') RETURNING id, name, email, role",
            [name, email, hashed]
        );

        res.status(201).json({ token: generateToken(result.rows[0].id), user: result.rows[0] });
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
                .upload(`profile/${fileName}`, req.file.buffer, { contentType: req.file.mimetype });

            if (error) throw error;
            const { data: publicUrl } = supabase.storage.from("uploads").getPublicUrl(`profile/${fileName}`);
            profilePicUrl = publicUrl.publicUrl;
        }

        const result = await pool.query(
            `UPDATE users SET name = COALESCE($1, name), bio = COALESCE($2, bio), profile_pic = COALESCE($3, profile_pic) 
             WHERE id = $4 RETURNING id, name, bio, profile_pic, email, role`,
            [name, bio, profilePicUrl, req.user.id]
        );
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;
