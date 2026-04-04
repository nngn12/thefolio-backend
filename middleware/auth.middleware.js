// backend/middleware/auth.middleware.js
const jwt = require('jsonwebtoken');
const pool = require('../config/db');

const protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization?.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({ message: 'Not authorized — please log in first' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const result = await pool.query(
      'SELECT id, name, email, role, status, bio, profile_pic FROM users WHERE id = $1',
      [decoded.id]
    );

    if (result.rows.length === 0 || result.rows[0].status === 'inactive') {
      return res.status(401).json({ message: 'Account not found or deactivated' });
    }

    req.user = result.rows[0];
    next();
  } catch (err) {
    console.error(err);
    return res.status(401).json({ message: 'Token is invalid or has expired' });
  }
};

// Export as object so destructuring works
module.exports = { protect };