const express = require('express');
const pool = require('../config/db');
const { protect } = require('../middleware/auth.middleware');
const { memberOrAdmin } = require('../middleware/role.middleware');
const upload = require('../middleware/upload');

const router = express.Router();

/* =========================
   GET ALL POSTS (PUBLIC)
========================= */
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
    res.status(500).json({ message: err.message });
  }
});

/* =========================
   GET SINGLE POST
========================= */
router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT p.*, u.name AS author_name, u.profile_pic AS author_pic
       FROM posts p 
       JOIN users u ON p.author_id = u.id
       WHERE p.id = $1 AND p.status = 'published'`,
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Post not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/* =========================
   CREATE POST (MULTIPLE IMAGES)
========================= */
router.post('/', protect, memberOrAdmin, upload.array('images', 5), async (req, res) => {
  try {
    const { title, body } = req.body;

    // ✅ Fix: Get all filenames and join them into a string
    const imageString = req.files && req.files.length > 0
      ? req.files.map(f => f.filename).join(',')
      : '';

    const result = await pool.query(
      'INSERT INTO posts (title, body, image, author_id) VALUES ($1, $2, $3, $4) RETURNING id',
      [title, body, imageString, req.user.id]
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
    res.status(500).json({ message: err.message });
  }
});

/* =========================
   UPDATE POST (MULTIPLE IMAGES)
========================= */
router.put('/:id', protect, memberOrAdmin, upload.array('images', 5), async (req, res) => {
  try {
    const postRes = await pool.query('SELECT * FROM posts WHERE id = $1', [req.params.id]);

    if (postRes.rows.length === 0) {
      return res.status(404).json({ message: 'Post not found' });
    }

    const post = postRes.rows[0];
    const isOwner = post.author_id === req.user.id;
    if (!isOwner && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const { title, body } = req.body;
    let image = post.image;

    // ✅ Handle new multiple uploads
    if (req.files && req.files.length > 0) {
      image = req.files.map(f => f.filename).join(',');
    }

    if (req.body.removeImage === "true") {
      image = "";
    }

    const result = await pool.query(
      `UPDATE posts 
       SET title = $1, body = $2, image = $3, updated_at = CURRENT_TIMESTAMP 
       WHERE id = $4 
       RETURNING *`,
      [title || post.title, body || post.body, image, req.params.id]
    );

    res.json(result.rows[0]);

  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: err.message });
  }
});

/* =========================
   DELETE POST
========================= */
router.delete('/:id', protect, memberOrAdmin, async (req, res) => {
  try {
    const postRes = await pool.query('SELECT * FROM posts WHERE id = $1', [req.params.id]);

    if (postRes.rows.length === 0) {
      return res.status(404).json({ message: 'Post not found' });
    }

    const post = postRes.rows[0];
    const isOwner = post.author_id === req.user.id;
    if (!isOwner && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized' });
    }

    await pool.query('DELETE FROM posts WHERE id = $1', [req.params.id]);
    res.json({ message: 'Post deleted successfully' });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;