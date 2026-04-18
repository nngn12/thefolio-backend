const jwt = require("jsonwebtoken");
const pool = require("../config/db");

const protect = async (req, res, next) => {
  let token;

  // 1. Check if token exists
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    token = req.headers.authorization.split(" ")[1];
  }

  if (!token) {
    return res.status(401).json({ message: "Not authorized — please log in first" });
  }

  try {
    // 2. Verify Token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // 3. Simplified Query: Removed is_active and is_verified columns
    const result = await pool.query(
      "SELECT id, name, email, role, bio, profile_pic FROM users WHERE id = $1",
      [decoded.id]
    );

    const user = result.rows[0];

    // 4. Handle missing user
    if (!user) {
      return res.status(401).json({ message: "User no longer exists" });
    }

    // ✅ REMOVED: is_active check
    // ✅ REMOVED: is_verified check

    // 5. Success - Attach user to request object
    req.user = user;
    next();

  } catch (err) {
    console.error("JWT ERROR:", err.message);
    return res.status(401).json({ message: "Token is invalid or has expired" });
  }
};

module.exports = { protect };
