const express = require('express');
const pool = require('../config/db');
const router = express.Router();

// GET /api/admin/users — list all members, active or inactive
router.get('/users', async (req, res) => {
  try {
    const users = await pool.query("SELECT * FROM users WHERE role='member' ORDER BY id ASC");
    res.json(users.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// PUT /api/admin/users/:id/status — toggle user active/inactive
router.put('/users/:id/status', async (req, res) => {
  try {
    const userRes = await pool.query('SELECT * FROM users WHERE id = $1', [req.params.id]);
    if (userRes.rows.length === 0 || userRes.rows[0].role === 'admin')
      return res.status(404).json({ message: 'User not found' });

    const newStatus = userRes.rows[0].status === 'active' ? 'inactive' : 'active';
    const result = await pool.query(
      'UPDATE users SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING id, name, email, role, status',
      [newStatus, req.params.id]
    );
    res.json({ message: `User is now ${newStatus}`, user: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
});

// DELETE /api/admin/users/:id — Delete a member
router.delete('/users/:id', async (req, res) => {
  try {
    await pool.query("DELETE FROM users WHERE id = $1 AND role != 'admin'", [req.params.id]);
    res.json({ message: "User removed" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/posts — list all posts with author info
router.get('/posts', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT p.*, u.name AS author_name, u.email AS author_email
       FROM posts p
       JOIN users u ON p.author_id = u.id
       ORDER BY p.created_at DESC`
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
});

// POST /api/admin/messages — Public route for Contact Us form
router.post('/messages', async (req, res) => {
  try {
    const { name, email, message } = req.body;
    if (!name || !email || !message) {
      return res.status(400).json({ message: "All fields are required" });
    }
    const result = await pool.query(
      "INSERT INTO messages (name, email, message) VALUES ($1, $2, $3) RETURNING *",
      [name, email, message]
    );
    res.status(201).json({ message: "Message sent successfully", data: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// GET /api/admin/messages — Private route for Dashboard (Updated to allow email filtering)
router.get('/messages', async (req, res) => {
  const { email } = req.query;
  try {
    let query = "SELECT * FROM messages";
    let params = [];

    if (email) {
      query += " WHERE email = $1";
      params.push(email);
    }

    query += " ORDER BY created_at DESC";
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// PUT /api/admin/messages/:id/read — Mark message as read
router.put('/messages/:id/read', async (req, res) => {
  try {
    await pool.query("UPDATE messages SET read = true WHERE id = $1", [req.params.id]);
    res.json({ message: "Message marked as read" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/admin/messages/:id — Delete a message
router.delete('/messages/:id', async (req, res) => {
  try {
    await pool.query("DELETE FROM messages WHERE id = $1", [req.params.id]);
    res.json({ message: "Message deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- NEW ROUTES FOR THREADED COMMUNICATION ---

// PUT /api/admin/messages/:id — USER REPLY (Appends message and marks unread for Admin)
router.put('/messages/:id', async (req, res) => {
  const { message, read } = req.body;
  try {
    const result = await pool.query(
      "UPDATE messages SET message = $1, read = $2 WHERE id = $3 RETURNING *",
      [message, read, req.params.id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/admin/messages/:id/reply — ADMIN REPLY (Saves reply text)
router.put('/messages/:id/reply', async (req, res) => {
  try {
    const { reply_text } = req.body;
    if (!reply_text) return res.status(400).json({ message: "Reply cannot be empty" });

    const result = await pool.query(
      "UPDATE messages SET reply_text = $1, read = true WHERE id = $2 RETURNING *",
      [reply_text, req.params.id]
    );
    res.json({ message: "Reply saved", data: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;