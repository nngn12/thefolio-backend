const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const pool = require('../config/db'); // Using 'pool' consistently
const { protect } = require('../middleware/auth.middleware');
const upload = require('../middleware/upload');
const sendVerificationEmail = require('../utils/sendEmail');

const router = express.Router();

const generateToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '7d' });

// ==========================================
// 1. EMAIL VERIFICATION ROUTE
// ==========================================
router.get('/verify/:token', async (req, res) => {
  const { token } = req.params;

  try {
    const result = await pool.query(
      `UPDATE users 
       SET is_verified = true, verification_token = NULL 
       WHERE verification_token = $1 
       RETURNING id`,
      [token]
    );

    if (result.rows.length === 0) {
      return res.status(400).send('<h1>Invalid or expired verification link.</h1>');
    }

    // Redirect to frontend login with a flag
    res.redirect(`${process.env.FRONTEND_URL}/login?verified=true`);
  } catch (err) {
    console.error("Verification Error:", err);
    res.status(500).send('Server Error during verification');
  }
});

// ==========================================
// 2. REGISTER ROUTE
// ==========================================
router.post('/register', async (req, res) => {
  const { name, email, password } = req.body;

  try {
    // Check if email exists
    const exists = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (exists.rows.length > 0) {
      return res.status(400).json({ message: 'Email is already registered' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Generate verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');

    // Insert user with is_verified = false
    await pool.query(
      `INSERT INTO users (name, email, password, verification_token, is_verified) 
       VALUES ($1, $2, $3, $4, $5)`,
      [name, email, hashedPassword, verificationToken, false]
    );

    // Send Gmail verification
    // NOTE: If this fails, the catch block will trigger "Registration failed"
    await sendVerificationEmail(email, verificationToken);

    res.status(201).json({
      message: 'Registration successful! Please check your Gmail to verify.'
    });

  } catch (err) {
    console.error("Registration Error:", err);
    res.status(500).json({ message: err.message });
  }
});

// ==========================================
// 3. LOGIN ROUTE
// ==========================================
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (result.rows.length === 0) {
      return res.status(400).json({ message: 'Invalid email or password' });
    }

    const user = result.rows[0];

    // BLOCK LOGIN IF NOT VERIFIED
    if (user.is_verified === false) {
      return res.status(401).json({
        message: 'Please verify your email via Gmail before logging in.'
      });
    }

    // Account status check
    if (user.status === 'inactive') {
      return res.status(403).json({ message: 'Account deactivated. Contact admin.' });
    }

    // Match password
    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.status(400).json({ message: 'Invalid email or password' });
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

// ==========================================
// 4. USER PROFILE ROUTES
// ==========================================
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

module.exports = router;