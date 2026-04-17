const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const pool = require('../config/db');
const { protect } = require('../middleware/auth.middleware');
const upload = require('../middleware/upload');
const sendVerificationEmail = require('../utils/sendEmail');

const router = express.Router();

const generateToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '7d' });


// ==========================
// 1. EMAIL VERIFICATION ROUTE
// ==========================
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
      return res
        .status(400)
        .send('<h1>Invalid or expired verification link.</h1>');
    }

    // ✅ Redirect to frontend
    res.redirect(`${process.env.FRONTEND_URL}/login?verified=true`);

  } catch (err) {
    res.status(500).send('Server Error');
  }
});


// ==========================
// 2. REGISTER ROUTE (FIXED)
// ==========================
router.post('/register', async (req, res) => {
  const { name, email, password } = req.body;

  try {
    // Check if email exists
    const exists = await pool.query(
      'SELECT id FROM users WHERE email = $1',
      [email]
    );

    if (exists.rows.length > 0) {
      return res
        .status(400)
        .json({ message: 'Email is already registered' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Generate verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');

    // ✅ FIXED: include is_verified
    await pool.query(
      `INSERT INTO users 
       (name, email, password, verification_token, is_verified) 
       VALUES ($1, $2, $3, $4, $5)`,
      [name, email, hashedPassword, verificationToken, false]
    );

    // Send email
    await sendVerificationEmail(email, verificationToken);

    res.status(201).json({
      message: 'Registration successful! Please check your Gmail to verify your account.'
    });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});


// ==========================
// 3. LOGIN ROUTE (FIXED)
// ==========================
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const result = await pool.query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      return res
        .status(400)
        .json({ message: 'Invalid email or password' });
    }

    const user = result.rows[0];

    // ✅ CHECK IF VERIFIED
    if (!user.is_verified) {
      return res.status(401).json({
        message: 'Please verify your email before logging in.'
      });
    }

    // Optional status check
    if (user.status === 'inactive') {
      return res.status(403).json({
        message: 'Your account is deactivated. Contact admin.'
      });
    }

    // Check password
    const match = await bcrypt.compare(password, user.password);

    if (!match) {
      return res
        .status(400)
        .json({ message: 'Invalid email or password' });
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

router.get("/verify/:token", async (req, res) => {
  const { token } = req.params;

  // 1. Find user with this token
  const user = await db.query("SELECT * FROM users WHERE verification_token = $1", [token]);

  if (user.rows.length === 0) return res.status(400).send("Invalid or expired token.");

  // 2. Mark as verified
  await db.query(
    "UPDATE users SET is_verified = true, verification_token = NULL WHERE id = $1",
    [user.rows[0].id]
  );

  // 3. Redirect back to your React login page
  res.redirect(`${process.env.FRONTEND_URL}/login?verified=true`);
});

// Inside your Login function:
if (!user.is_verified) {
  return res.status(401).json({ message: "Please verify your email before logging in." });
}

const handleRegister = async (e) => {
  try {
    const res = await API.post("/auth/register", formData);
    alert("Success! Check your Gmail to verify your account before logging in.");
    navigate("/login");
  } catch (err) {
    alert(err.response?.data?.message || "Registration failed");
  }
};

// ==========================
// EXPORT
// ==========================
module.exports = router;