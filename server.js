require("dotenv").config();

const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs");

const pool = require("./config/db");
pool.connect()
  .then(() => console.log("✅ Connected to PostgreSQL: thefolio"))
  .catch(err => console.error("❌ DB connection error:", err.message));

const authRoutes    = require("./routes/auth.routes");
const postRoutes    = require("./routes/post.routes");
const commentRoutes = require("./routes/comment.routes");
const messageRoutes = require("./routes/message.routes");
const adminRoutes   = require("./routes/admin.routes");

const app = express();

// Ensure uploads folder exists
const uploadDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);

// ✅ FIXED CORS (works with Vercel + credentials)
app.use(cors({
  origin: true, // dynamically allow all origins safely
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "Accept"]
}));

// Handle preflight requests
app.options("*", cors());

// Middleware
app.use(express.json());
app.use("/uploads", express.static(uploadDir));

// ✅ API Routes (AFTER CORS)
app.use("/api/auth",     authRoutes);
app.use("/api/posts",    postRoutes);
app.use("/api/comments", commentRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/admin",    adminRoutes);

// Test route
app.get("/", (req, res) => res.send("TheFolio API is running ✓"));

// 404 handler
app.use((req, res) => res.status(404).json({ message: "API route not found" }));

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({ message: err.message || "Server Error" });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
