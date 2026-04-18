const jwt = require("jsonwebtoken");
const pool = require("../config/db");

const protect = async (req, res, next) => {
  let token;

  // 1. Check if token exists in headers
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

    // 3. Fetch user including verification and activity status
    const result = await pool.query(
      "SELECT id, name, email, role, is_active, is_verified, bio, profile_pic FROM users WHERE id = $1",
      [decoded.id]
    );

    const user = result.rows[0];

    // 4. FIX: Handle missing user
    if (!user) {
      return res.status(401).json({ message: "User no longer exists" });
    }

    // 5. REQUIREMENT FIX: Check Deactivation (403 Forbidden)
    if (user.is_active === false) {
      return res.status(403).json({ message: "Your account has been deactivated by an admin" });
    }

    // 6. REQUIREMENT FIX: Check OTP Verification
    if (user.is_verified === false) {
      return res.status(403).json({ message: "Please verify your email via OTP to continue" });
    }

    // 7. Success - Attach user to request object
    req.user = user;
    next();

  } catch (err) {
    console.error("JWT ERROR:", err.message);
    return res.status(401).json({ message: "Token is invalid or has expired" });
  }
};

module.exports = { protect };
