const express = require("express");
const pool = require("../config/db");
const { protect } = require("../middleware/auth.middleware");
const { memberOrAdmin } = require("../middleware/role.middleware");

const router = express.Router();


// ✅ GET comments for a post
router.get("/:postId", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT c.*, u.name AS author_name, u.profile_pic AS author_pic
       FROM comments c
       JOIN users u ON c.author_id = u.id
       WHERE c.post_id = $1
       ORDER BY c.created_at DESC`,
      [req.params.postId]
    );

    res.json(result.rows);
  } catch (err) {
    console.error("Fetch Comments Error:", err.message);
    res.status(500).json({ message: err.message });
  }
});


// ✅ POST comment
router.post("/:postId", protect, memberOrAdmin, async (req, res) => {
  try {
    const result = await pool.query(
      "INSERT INTO comments (post_id, author_id, body) VALUES ($1, $2, $3) RETURNING id",
      [req.params.postId, req.user.id, req.body.body]
    );

    const comment = await pool.query(
      `SELECT c.*, u.name AS author_name, u.profile_pic AS author_pic
       FROM comments c
       JOIN users u ON c.author_id = u.id
       WHERE c.id = $1`,
      [result.rows[0].id]
    );

    res.status(201).json(comment.rows[0]);

  } catch (err) {
    console.error("Comment Post Error:", err.message);
    res.status(500).json({ message: err.message });
  }
});


// ✅ DELETE comment
router.delete("/:id", protect, memberOrAdmin, async (req, res) => {
  try {
    const commentRes = await pool.query(
      "SELECT * FROM comments WHERE id = $1",
      [req.params.id]
    );

    if (commentRes.rows.length === 0) {
      return res.status(404).json({ message: "Comment not found" });
    }

    const comment = commentRes.rows[0];
    const isOwner = comment.author_id === req.user.id;

    if (!isOwner && req.user.role !== "admin") {
      return res.status(403).json({ message: "Not authorized" });
    }

    await pool.query("DELETE FROM comments WHERE id = $1", [req.params.id]);

    res.json({ message: "Comment deleted" });

  } catch (err) {
    console.error("Comment Delete Error:", err.message);
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;