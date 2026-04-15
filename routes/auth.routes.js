const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');
const { protect } = require('../middleware/auth.middleware');
const upload = require('../middleware/upload');

const router = express.Router();

const generateToken = (id) => jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '7d' });

// POST /api/auth/register
router.post('/register', async (req, res) => {
  const { name, email, password } = req.body;
  try {
    const exists = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (exists.rows.length > 0) return res.status(400).json({ message: 'Email is already registered' });

    const hashedPassword = await bcrypt.hash(password, 12);

    const result = await pool.query(
      'INSERT INTO users (name, email, password) VALUES ($1, $2, $3) RETURNING id, name, email, role',
      [name, email, hashedPassword]
    );

    const user = result.rows[0];
    res.status(201).json({
      token: generateToken(user.id),
      user: { id: user.id, name: user.name, email: user.email, role: user.role }
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);

    if (result.rows.length === 0) return res.status(400).json({ message: 'Invalid email or password' });

    const user = result.rows[0];
    if (user.status === 'inactive') return res.status(403).json({ message: 'Your account is deactivated. Contact admin.' });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(400).json({ message: 'Invalid email or password' });

    res.json({
      token: generateToken(user.id),
      user: { id: user.id, name: user.name, email: user.email, role: user.role, profile_pic: user.profile_pic }
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/auth/me
router.get('/me', protect, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, name, email, role, status, bio, profile_pic, created_at FROM users WHERE id = $1',
      [req.user.id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT /api/auth/profile
router.put('/profile', protect, upload.single('profilePic'), async (req, res) => {
  try {
    const { name, bio } = req.body;
    const profilePic = req.file ? req.file.filename : null;

    let query = 'UPDATE users SET updated_at = CURRENT_TIMESTAMP';
    const values = [];
    let idx = 1;

    if (name) {
      query += `, name = $${idx++}`;
      values.push(name);
    }
    if (bio !== undefined) {
      query += `, bio = $${idx++}`;
      values.push(bio);
    }
    if (profilePic) {
      query += `, profile_pic = $${idx++}`;
      values.push(profilePic);
    }

    query += ` WHERE id = $${idx} RETURNING id, name, email, role, status, bio, profile_pic, created_at`;
    values.push(req.user.id);

    const result = await pool.query(query, values);
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT /api/auth/change-password
router.put('/change-password', protect, async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  try {
    const result = await pool.query('SELECT password FROM users WHERE id = $1', [req.user.id]);
    const match = await bcrypt.compare(currentPassword, result.rows[0].password);

    if (!match) return res.status(400).json({ message: 'Current password is incorrect' });

    const hashedNew = await bcrypt.hash(newPassword, 12);
    await pool.query(
      'UPDATE users SET password = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [hashedNew, req.user.id]
    );
    res.json({ message: 'Password updated successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;