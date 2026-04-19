const express = require("express");
const pool = require("../config/db");

const router = express.Router();

// =======================
// SEND MESSAGE (PUBLIC)
// =======================
router.post("/", async (req, res) => {
  try {
    const { name, email, message } = req.body;

    if (!name || !email || !message) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const result = await pool.query(
      `INSERT INTO messages (name, email, message, created_at)
       VALUES ($1, $2, $3, NOW())
       RETURNING *`,
      [name, email, message]
    );

    res.status(201).json({
      message: "Message sent successfully",
      data: result.rows[0],
    });
  } catch (err) {
    console.error("SEND MESSAGE ERROR:", err.message);
    res.status(500).json({ message: err.message });
  }
});

// =======================
// GET ALL MESSAGES
// =======================
router.get("/", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM messages ORDER BY created_at DESC"
    );

    res.json(result.rows);
  } catch (err) {
    console.error("GET MESSAGES ERROR:", err.message);
    res.status(500).json({ message: err.message });
  }
});

// Add this to your routes/message.routes.js

// =======================
// REPLY TO MESSAGE (ADMIN)
// =======================
router.put("/:id/reply", async (req, res) => {
  try {
    const { id } = req.params;
    const { reply_text } = req.body;

    if (!reply_text) {
      return res.status(400).json({ message: "Reply text is required" });
    }

    const result = await pool.query(
      `UPDATE messages 
       SET reply_text = $1, read = true 
       WHERE id = $2 
       RETURNING *`,
      [reply_text, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Message not found" });
    }

    res.json({
      message: "Reply sent successfully",
      data: result.rows[0],
    });
  } catch (err) {
    console.error("REPLY ERROR:", err.message);
    res.status(500).json({ message: err.message });
  }
});

// ... existing POST and GET routes ...

// =======================
// REPLY TO MESSAGE (ADMIN)
// =======================
router.put("/:id/reply", async (req, res) => {
  try {
    const { id } = req.params;
    const { reply_text } = req.body;

    if (!reply_text) {
      return res.status(400).json({ message: "Reply text is required" });
    }

    const result = await pool.query(
      `UPDATE messages 
       SET reply_text = $1, read = true 
       WHERE id = $2 
       RETURNING *`,
      [reply_text, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Message not found" });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error("REPLY ERROR:", err.message);
    res.status(500).json({ message: err.message });
  }
});

// DELETE MESSAGE
router.delete("/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query("DELETE FROM messages WHERE id = $1", [id]);
        
        if (result.rowCount === 0) {
            return res.status(404).json({ message: "Message not found" });
        }
        res.json({ message: "Message deleted successfully" });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;
