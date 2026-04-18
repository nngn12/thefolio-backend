const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const pool = require('../config/db');
const { protect } = require('../middleware/auth.middleware');
const upload = require('../middleware/upload');

// ✅ Commented out to prevent Render crash
// const sendVerificationEmail = require('../utils/sendEmail');

const router = express.Router();

const generateToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '7d' });

/* =========================
   EMAIL VERIFICATION (DISABLED)
========================= */
/* router.get('/verify/:token', async (req, res) => {
  const { token } = req.params;
  try {
    const result = await pool.query(
      `UPDATE users SET is_verified = true, verification_token = NULL WHERE verification_token = $1 RETURNING id`,
      [token]
    );
    if (result.rows.length === 0) return res.status(400).send('Invalid link.');
    res.redirect(`${process.env.FRONTEND_URL}/login?verified=true`);
  } catch (err) {
    res.status(500).send('Server Error');
  }
});
*/

/* =========================
   REGISTER (BYPASS VERIFICATION)
========================= */
router.post('/register', async (req, res) => {
  const { name, email, password } = req.body;

  try {
    const exists = await pool.query('SELECT id FROM users WHERE email = $1', [email]);

    if (exists.rows.length > 0) {
      return res.status(400).json({ success: false, message: 'Email is already registered' });
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    
    // Set is_verified to true by default so you can log in immediately
    await pool.query(
      `INSERT INTO users (name, email, password, is_verified) VALUES ($1, $2, $3, $4)`,
      [name, email, hashedPassword, true] 
    );

    // ✅ Commented out email sending
    // await sendVerificationEmail(email, verificationToken);

    res.status(201).json({
      success: true,
      message: 'Registration successful! You can now log in.'
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err.message });
  }
});

/* =========================
   LOGIN (NO GATES)
========================= */
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);

    if (result.rows.length === 0) {
      return res.status(400).json({ success: false, message: 'Invalid email or password' });
    }

    const user = result.rows[0];

    // ✅ Commented out the verification check gate
    /*
    if (!user.is_verified) {
      return res.status(401).json({ success: false, message: 'Please verify email.' });
    }
    */

    // ✅ Commented out the status check gate
    /*
    if (user.status === 'inactive') {
      return res.status(403).json({ success: false, message: 'Account deactivated.' });
    }
    */

    const match = await bcrypt.compare(password, user.password);

    if (!match) {
      return res.status(400).json({ success: false, message: 'Invalid email or password' });
    }

    return res.json({
      success: true,
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
    console.error(err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

/* =========================
   PROFILE
========================= */
router.get('/me', protect, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, name, email, role, bio, profile_pic, created_at FROM users WHERE id = $1',
      [req.user.id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.put("/profile", protect, upload.single("profilePic"), async (req, res) => {
    try {
        const { name, bio } = req.body;

        let profilePic = null;

        if (req.file) {
            profilePic = req.file.filename;
        }

        const result = await pool.query(
            `UPDATE users 
             SET name = $1,
                 bio = $2,
                 profile_pic = COALESCE($3, profile_pic)
             WHERE id = $4
             RETURNING id, name, bio, profile_pic, email, role`,
            [name, bio, profilePic, req.user.id]
        );

        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;
