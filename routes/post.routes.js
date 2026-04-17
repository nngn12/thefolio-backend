const express = require('express');
const pool = require('../config/db');
const { protect } = require('../middleware/auth.middleware');
const { memberOrAdmin } = require('../middleware/role.middleware');
const upload = require('../middleware/upload');
const { createClient } = require('@supabase/supabase-js');

const router = express.Router();

// ✅ Initialize Supabase Client
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

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
    if (result.rows.length === 0) return res.status(404).json({ message: 'Post not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/* =========================
   CREATE POST (UPLOAD TO SUPABASE)
========================= */
router.post('/', protect, memberOrAdmin, upload.array('images', 5), async (req, res) => {
  try {
    const { title, body } = req.body;
    const uploadedUrls = [];

    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        const fileName = `post-${Date.now()}-${Math.floor(Math.random() * 1000)}${require('path').extname(file.originalname)}`;

        // Upload to Supabase Bucket
        const { data, error } = await supabase.storage
          .from('post-images')
          .upload(fileName, file.buffer, { contentType: file.mimetype });

        if (error) throw error;

        // Get Public URL
        const { data: { publicUrl } } = supabase.storage.from('post-images').getPublicUrl(fileName);
        uploadedUrls.push(publicUrl);
      }
    }

    const imageString = uploadedUrls.join(',');

    const result = await pool.query(
      'INSERT INTO posts (title, body, image, author_id) VALUES ($1, $2, $3, $4) RETURNING id',
      [title, body, imageString, req.user.id]
    );

    const post = await pool.query(
      `SELECT p.*, u.name AS author_name, u.profile_pic AS author_pic FROM posts p 
       JOIN users u ON p.author_id = u.id WHERE p.id = $1`, [result.rows[0].id]
    );

    res.status(201).json(post.rows[0]);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/* =========================
   UPDATE POST (UPLOAD TO SUPABASE)
========================= */
router.put('/:id', protect, memberOrAdmin, upload.array('images', 5), async (req, res) => {
  try {
    const postRes = await pool.query('SELECT * FROM posts WHERE id = $1', [req.params.id]);
    if (postRes.rows.length === 0) return res.status(404).json({ message: 'Post not found' });

    const post = postRes.rows[0];
    if (post.author_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const { title, body, removeImage } = req.body;
    let imageString = post.image;

    if (removeImage === "true") imageString = "";

    if (req.files && req.files.length > 0) {
      const newUrls = [];
      for (const file of req.files) {
        const fileName = `post-${Date.now()}-${Math.floor(Math.random() * 1000)}${require('path').extname(file.originalname)}`;
        const { error } = await supabase.storage.from('post-images').upload(fileName, file.buffer, { contentType: file.mimetype });
        if (error) throw error;
        const { data: { publicUrl } } = supabase.storage.from('post-images').getPublicUrl(fileName);
        newUrls.push(publicUrl);
      }
      imageString = newUrls.join(',');
    }

    const result = await pool.query(
      `UPDATE posts SET title = $1, body = $2, image = $3, updated_at = CURRENT_TIMESTAMP WHERE id = $4 RETURNING *`,
      [title || post.title, body || post.body, imageString, req.params.id]
    );

    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/* =========================
   DELETE POST
========================= */
router.delete('/:id', protect, memberOrAdmin, async (req, res) => {
  try {
    const postRes = await pool.query('SELECT * FROM posts WHERE id = $1', [req.params.id]);
    if (postRes.rows.length === 0) return res.status(404).json({ message: 'Post not found' });

    if (postRes.rows[0].author_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized' });
    }

    await pool.query('DELETE FROM posts WHERE id = $1', [req.params.id]);
    res.json({ message: 'Post deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;