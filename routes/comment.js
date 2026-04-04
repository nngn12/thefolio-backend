const express = require('express');
const router = express.Router();
const Comment = require('../models/Comment');
const auth = require('../middleware/auth');

// GET /api/comments/:postId
router.get('/:postId', async (req, res) => {
  const comments = await Comment.find({ post: req.params.postId })
    .populate('author', 'name profilePic')
    .sort({ createdAt: -1 });
  res.json(comments);
});

// POST /api/comments/:postId — members only
router.post('/:postId', auth, async (req, res) => {
  const comment = await Comment.create({
    post: req.params.postId,
    author: req.user._id,
    body: req.body.body,
  });
  await comment.populate('author', 'name profilePic');
  res.status(201).json(comment);
});

// DELETE /api/comments/:id — own comment or admin
router.delete('/:id', auth, async (req, res) => {
  const comment = await Comment.findById(req.params.id);
  if (!comment) return res.status(404).json({ message: 'Not found' });
  if (comment.author.toString() !== req.user._id.toString() && req.user.role !== 'admin')
    return res.status(403).json({ message: 'Forbidden' });
  await comment.deleteOne();
  res.json({ message: 'Deleted' });
});

module.exports = router;