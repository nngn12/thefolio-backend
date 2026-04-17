const express = require("express");
const pool = require('../config/db');
const router = express.Router();

// 1. IMPORT YOUR AUTH MIDDLEWARE (Crucial!)
// Adjust the path to where your auth.middleware.js is located
const { protect } = require('../middleware/auth.middleware');

/* =========================
   POST A NEW MESSAGE
========================= */
router.post("/", async (req, res) => {
  try {
    const { name, email, message, recipient_id } = req.body; // Added recipient_id

    if (!name || !email || !message) {
      return res.status(400).json({ message: "All fields are required" });
    }

    // Include recipient_id so it shows up in that specific user's dashboard later
    const result = await pool.query(
      "INSERT INTO messages (name, email, message, recipient_id) VALUES ($1, $2, $3, $4) RETURNING *",
      [name, email, message, recipient_id]
    );

    res.status(201).json({
      message: "Message sent!",
      data: result.rows[0]
    });
  } catch (err) {
    console.error("Database Error:", err.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

/* =========================
   GET USER-SPECIFIC MESSAGES
========================= */
// We use 'protect' to get the req.user.id from the JWT token
router.get('/my-messages', protect, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM messages 
       WHERE recipient_id = $1 
       ORDER BY created_at DESC`,
      [req.user.id] // req.user is populated by your protect middleware
    );
    res.json(result.rows);
  } catch (err) {
    console.error("Fetch Error:", err.message);
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;