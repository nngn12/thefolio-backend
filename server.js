require("dotenv").config();

const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs");

// Routes
const authRoutes = require("./routes/auth.routes");
const postRoutes = require("./routes/post.routes");
const commentRoutes = require("./routes/comment.routes");
const messageRoutes = require("./routes/message.routes");
const adminRoutes = require("./routes/admin.routes");

// ✅ DATABASE CONNECTION
const pool = require("./config/db");

pool.connect()
  .then(() => console.log("✅ Connected to PostgreSQL: thefolio"))
  .catch(err => console.error("❌ DB connection error:", err.message));

const app = express();

// ✅ Ensure Uploads Directory Exists
const uploadDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

// ✅ Middleware
app.use(express.json());

// ✅ FIXED CORS POLICY
// This now allows your specific Vercel URL and any other .vercel.app subdomains
app.use(cors({
  origin: [
    "http://localhost:3000",
    "https://thefolio-frontend-zeta.vercel.app",
    "https://thefolio-frontend-7xok8re8r-nngn12s-projects.vercel.app"
  ],
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));

// Static files for images/uploads
app.use("/uploads", express.static(uploadDir));

// ✅ API Routes
app.use("/api/auth", authRoutes);
app.use("/api/posts", postRoutes);
app.use("/api/comments", commentRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/admin", adminRoutes);

// Base Route
app.get("/", (req, res) => res.send("TheFolio API is running..."));

// 404 Handler
app.use((req, res) => {
  res.status(404).json({ message: "API route not found" });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    message: err.message || "Internal Server Error"
  });
});

// ✅ Server Start
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});