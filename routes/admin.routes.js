const express = require('express');
const pool = require('../config/db');
const { protect } = require('../middleware/auth.middleware');
const { adminOnly } = require('../middleware/role.middleware');

const router = express.Router();

// Apply protection to all admin routes below
router.use(protect, adminOnly);

// PUT /api/admin/users/:id/status — Toggle User status (Active/Inactive)
router.put('/users/:id/status', async (req, res) => {
  try {
    const userRes = await pool.query('SELECT * FROM users WHERE id = $1', [req.params.id]);

    if (userRes.rows.length === 0 || userRes.rows[0].role === 'admin') {
      return res.status(404).json({ message: 'User not found or is an admin' });
    }

    const newStatus = userRes.rows[0].status === 'active' ? 'inactive' : 'active';

    const result = await pool.query(
      `UPDATE users 
       SET status = $1, updated_at = CURRENT_TIMESTAMP 
       WHERE id = $2 
       RETURNING id, name, email, role, status`,
      [newStatus, req.params.id]
    );

    res.json({ message: `User is now ${newStatus}`, user: result.rows[0] });
  } catch (err) {
    console.error('Admin User Status Error:', err.message);
    res.status(500).json({ message: err.message });
  }
});

// GET /api/admin/posts — List all posts for moderation
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
    console.error('Admin Get Posts Error:', err.message);
    res.status(500).json({ message: err.message });
  }
});

// PUT /api/admin/posts/:id/remove — Soft delete/remove a post
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

    res.json({ message: 'Post has been removed', post: result.rows[0] });
  } catch (err) {
    console.error('Admin Remove Post Error:', err.message);
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;