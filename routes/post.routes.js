const express = require('express');
const pool = require('../config/db');
const { protect } = require('../middleware/auth.middleware');
const { memberOrAdmin } = require('../middleware/role.middleware');
const upload = require('../middleware/upload');

const router = express.Router();

// GET /api/posts — Public: all published posts
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT p.*, u.name AS author_name, u.profile_pic AS author_pic
       FROM posts p
       JOIN users u ON p.author_id = u.id
       WHERE p.status = 'published'
       ORDER BY p.created_at DESC`
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
});

// GET /api/posts/:id — Public: single post
router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT p.*, u.name AS author_name, u.profile_pic AS author_pic
       FROM posts p
       JOIN users u ON p.author_id = u.id
       WHERE p.id = $1 AND p.status = 'published'`,
      [req.params.id]
    );

    if (result.rows.length === 0)
      return res.status(404).json({ message: 'Post not found' });

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
});

// POST /api/posts — Create a post
router.post('/', protect, memberOrAdmin, upload.single('image'), async (req, res) => {
  const { title, body } = req.body;
  const image = req.file ? req.file.filename : '';

  try {
    const result = await pool.query(
      'INSERT INTO posts (title, body, image, author_id) VALUES ($1, $2, $3, $4) RETURNING *',
      [title, body, image, req.user.id]
    );

    const post = await pool.query(
      `SELECT p.*, u.name AS author_name, u.profile_pic AS author_pic
       FROM posts p
       JOIN users u ON p.author_id = u.id
       WHERE p.id = $1`,
      [result.rows[0].id]
    );

    res.status(201).json(post.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
});

// PUT /api/posts/:id — Update a post
router.put('/:id', protect, memberOrAdmin, upload.single('image'), async (req, res) => {
  try {
    const postRes = await pool.query('SELECT * FROM posts WHERE id = $1', [req.params.id]);
    if (postRes.rows.length === 0) return res.status(404).json({ message: 'Post not found' });

    const post = postRes.rows[0];
    const isOwner = post.author_id === req.user.id;
    if (!isOwner && req.user.role !== 'admin') return res.status(403).json({ message: 'Not authorized' });

    const { title, body } = req.body;
    const image = req.file ? req.file.filename : post.image;

    const updated = await pool.query(
      `UPDATE posts
       SET title = $1, body = $2, image = $3, updated_at = CURRENT_TIMESTAMP
       WHERE id = $4
       RETURNING *`,
      [title || post.title, body || post.body, image, req.params.id]
    );

    const postWithAuthor = await pool.query(
      `SELECT p.*, u.name AS author_name, u.profile_pic AS author_pic
       FROM posts p
       JOIN users u ON p.author_id = u.id
       WHERE p.id = $1`,
      [updated.rows[0].id]
    );

    res.json(postWithAuthor.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
});

// DELETE /api/posts/:id — Delete a post
router.delete('/:id', protect, memberOrAdmin, async (req, res) => {
  try {
    const postRes = await pool.query('SELECT * FROM posts WHERE id = $1', [req.params.id]);
    if (postRes.rows.length === 0) return res.status(404).json({ message: 'Post not found' });

    const post = postRes.rows[0];
    const isOwner = post.author_id === req.user.id;
    if (!isOwner && req.user.role !== 'admin') return res.status(403).json({ message: 'Not authorized' });

    await pool.query('DELETE FROM posts WHERE id = $1', [req.params.id]);
    res.json({ message: 'Post deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
});

// GET /api/posts/user/:userId — Get all posts by a specific user
router.get("/user/:userId", protect, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT p.*, u.name AS author_name, u.profile_pic AS author_pic
       FROM posts p
       JOIN users u ON p.author_id = u.id
       WHERE p.author_id = $1
       ORDER BY p.created_at DESC`,
      [req.params.userId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;