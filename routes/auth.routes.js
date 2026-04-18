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

/* =========================
   REGISTER
========================= */
router.post('/register', async (req, res) => {
  const { name, email, password } = req.body;

  try {
    const exists = await pool.query(
      'SELECT id FROM users WHERE email = $1',
      [email]
    );

    if (exists.rows.length > 0) {
      return res.status(400).json({ message: 'Email already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    await pool.query(
      `INSERT INTO users (name, email, password, is_verified)
       VALUES ($1, $2, $3, $4)`,
      [name, email, hashedPassword, true]
    );

    res.json({ message: 'Registered successfully' });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/* =========================
   LOGIN
========================= */
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const result = await pool.query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const user = result.rows[0];

    const match = await bcrypt.compare(password, user.password);

    if (!match) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    res.json({
      token: generateToken(user.id),
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        profile_pic: user.profile_pic
      }
    });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/* =========================
   GET PROFILE
========================= */
router.get('/me', protect, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, name, email, role, bio, profile_pic FROM users WHERE id = $1',
      [req.user.id]
    );

    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/* =========================
   UPDATE PROFILE (FIXED $3 ERROR)
========================= */
router.put("/profile", protect, upload.single("profilePic"), async (req, res) => {
  try {
    const { name, bio } = req.body;

    let profilePicUrl = null;

    // Upload to Supabase
    if (req.file) {
      const fileName = `${Date.now()}-${req.file.originalname}`;

      const { data, error } = await supabase.storage
        .from("uploads")
        .upload(`profile/${fileName}`, req.file.buffer, {
          contentType: req.file.mimetype,
        });

      if (error) throw error;

      const { data: publicUrl } = supabase.storage
        .from("uploads")
        .getPublicUrl(data.path);

      profilePicUrl = publicUrl.publicUrl;
    }

    let result;

    // ✅ FIX: avoid NULL type issue
    if (profilePicUrl) {
      result = await pool.query(
        `UPDATE users 
         SET name = $1, bio = $2, profile_pic = $3
         WHERE id = $4
         RETURNING id, name, bio, profile_pic, email, role`,
        [name, bio, profilePicUrl, req.user.id]
      );
    } else {
      result = await pool.query(
        `UPDATE users 
         SET name = $1, bio = $2
         WHERE id = $3
         RETURNING id, name, bio, profile_pic, email, role`,
        [name, bio, req.user.id]
      );
    }

    res.json(result.rows[0]);

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
