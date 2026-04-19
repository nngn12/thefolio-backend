const express = require('express');
const pool = require('../config/db');
const { protect } = require('../middleware/auth.middleware');
const { adminOnly } = require('../middleware/role.middleware');

const router = express.Router();

// 🔐 Protect all admin routes
router.use(protect, adminOnly);

// =======================
// USERS - GET ALL (FIXED: Filter out admins here)
// =======================
router.get('/users', async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT id, name, email, status, role FROM users WHERE role != 'admin' OR role IS NULL ORDER BY id DESC"
    );
    res.json(result.rows);
  } catch (err) {
    console.error('GET USERS ERROR:', err.message);
    res.status(500).json({ message: err.message });
  }
});

// =======================
// DELETE USER (NEW: Fixes your 404 error)
// =======================
router.delete('/users/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Safety: check if user is admin before deleting
    const check = await pool.query('SELECT role FROM users WHERE id = $1', [id]);
    if (check.rows.length > 0 && check.rows[0].role === 'admin') {
      return res.status(403).json({ message: "Cannot delete admin accounts" });
    }

    const result = await pool.query('DELETE FROM users WHERE id = $1 RETURNING id', [id]);

    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({ message: 'User deleted successfully' });
  } catch (err) {
    console.error('DELETE USER ERROR:', err.message);
    res.status(500).json({ message: err.message });
  }
});

// =======================
// TOGGLE USER STATUS
// =======================
router.put('/users/:id/status', async (req, res) => {
  try {
    const userRes = await pool.query(
      'SELECT * FROM users WHERE id = $1',
      [req.params.id]
    );

    if (userRes.rows.length === 0 || userRes.rows[0].role === 'admin') {
      return res.status(404).json({ message: 'User not found or is an admin' });
    }

    const newStatus = userRes.rows[0].status === 'active' ? 'inactive' : 'active';

    const result = await pool.query(
      `UPDATE users 
       SET status = $1, updated_at = CURRENT_TIMESTAMP 
       WHERE id = $2 
       RETURNING id, name, email, status`,
      [newStatus, req.params.id]
    );

    res.json({
      message: `User is now ${newStatus}`,
      user: result.rows[0]
    });
  } catch (err) {
    console.error('STATUS ERROR:', err.message);
    res.status(500).json({ message: err.message });
  }
});

// =======================
// POSTS - GET ALL
// =======================
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
    console.error('GET POSTS ERROR:', err.message);
    res.status(500).json({ message: err.message });
  }
});

// =======================
// MESSAGES - GET ALL
// =======================
router.get('/messages', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM messages ORDER BY created_at DESC'
    );
    res.json(result.rows);
  } catch (err) {
    console.error('GET MESSAGES ERROR:', err.message);
    res.status(500).json({ message: err.message });
  }
});

// =======================
// REMOVE POST
// =======================
router.put('/posts/:id/remove', async (req, res) => {
  try {
    const result = await pool.query(
      `UPDATE posts 
       SET status = 'removed', updated_at = CURRENT_TIMESTAMP 
       WHERE id = $1 
       RETURNING *`,
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Post not found' });
    }

    res.json({
      message: 'Post has been removed',
      post: result.rows[0]
    });
  } catch (err) {
    console.error('REMOVE POST ERROR:', err.message);
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
