const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');
const { protect } = require('../middleware/auth.middleware');
const upload = require('../middleware/upload');
const { supabase } = require("../config/supabase");

const router = express.Router();

const generateToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '7d' });

/* ============================================================
   ADMIN DASHBOARD DATA (Stats & Lists)
   ============================================================ */

// 1. Get Totals for the Dashboard Cards
router.get("/admin/stats", protect, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: "Access denied" });
    }

    const [usersRes, activeRes, postsRes, messagesRes] = await Promise.all([
      pool.query("SELECT COUNT(*) FROM users"),
      pool.query("SELECT COUNT(*) FROM users WHERE status = 'active'"),
      pool.query("SELECT COUNT(*) FROM posts"),
      pool.query("SELECT COUNT(*) FROM messages WHERE read = false")
    ]);

    res.json({
      members: Number(usersRes.rows[0].count),
      active: Number(activeRes.rows[0].count),
      posts: Number(postsRes.rows[0].count),
      unreadMsgs: Number(messagesRes.rows[0].count)
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
});

// 2. Get Users List
router.get("/admin/users", protect, async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ message: "Access denied" });
    const result = await pool.query("SELECT id, name, email, status, created_at FROM users ORDER BY created_at DESC");
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// 3. Get Posts List
router.get("/admin/posts", protect, async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ message: "Access denied" });
    const result = await pool.query(`
      SELECT posts.*, users.name as author_name 
      FROM posts 
      LEFT JOIN users ON posts.author_id = users.id 
      ORDER BY posts.created_at DESC`);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// 4. Get Messages List
router.get("/admin/messages", protect, async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ message: "Access denied" });
    const result = await pool.query("SELECT * FROM messages ORDER BY created_at DESC");
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/* ============================================================
   AUTH & PROFILE (Login, Register, Profile)
   ============================================================ */

router.post('/register', async (req, res) => {
  const { name, email, password } = req.body;
  try {
    const exists = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (exists.rows.length > 0) return res.status(400).json({ message: 'Email exists' });

    const hashedPassword = await bcrypt.hash(password, 12);
    const result = await pool.query(
      `INSERT INTO users (name, email, password, is_verified, role, status)
       VALUES ($1, $2, $3, true, 'member', 'active') RETURNING id, name, email, role`,
      [name, email, hashedPassword]
    );
    res.json({ message: 'Registered successfully', user: result.rows[0] });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    const user = result.rows[0];
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }
    res.json({
      token: generateToken(user.id),
      user: { id: user.id, name: user.name, email: user.email, role: user.role, profile_pic: user.profile_pic }
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/me', protect, async (req, res) => {
  try {
    const result = await pool.query('SELECT id, name, email, role, bio, profile_pic FROM users WHERE id = $1', [req.user.id]);
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.put("/profile", protect, upload.single("profilePic"), async (req, res) => {
  try {
    const { name, bio } = req.body;
    let profilePicUrl = null;

    if (req.file) {
      const fileName = `${Date.now()}-${req.file.originalname}`;
      const { data, error } = await supabase.storage.from("uploads").upload(`profile/${fileName}`, req.file.buffer, { contentType: req.file.mimetype });
      if (error) throw error;
      const { data: publicUrl } = supabase.storage.from("uploads").getPublicUrl(data.path);
      profilePicUrl = publicUrl.publicUrl;
    }

    const query = profilePicUrl 
      ? [`UPDATE users SET name=$1, bio=$2, profile_pic=$3 WHERE id=$4 RETURNING *`, [name, bio, profilePicUrl, req.user.id]]
      : [`UPDATE users SET name=$1, bio=$2 WHERE id=$3 RETURNING *`, [name, bio, req.user.id]];

    const result = await pool.query(query[0], query[1]);
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
