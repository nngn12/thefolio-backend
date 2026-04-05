require("dotenv").config();

const express = require("express");
const cors = require("cors");
const path = require("path");

const authRoutes = require("./routes/auth.routes");
const postRoutes = require("./routes/post.routes");
const commentRoutes = require("./routes/comment.routes");
const messageRoutes = require("./routes/message.routes");
const adminRoutes = require("./routes/admin.routes");

// ✅ DATABASE CONNECTION
const pool = require("./config/db");

pool.connect()
  .then(() => console.log("✅ Connected to database"))
  .catch(err => console.error("❌ DB connection error:", err.message));

const app = express();

// ✅ Middleware
app.use(express.json());

// CORS
app.use(cors({
  origin: (origin, callback) => {
    const allowedOrigins = [
      "http://localhost:3000",
      "https://thefolio-frontend-6m2l1ra5c-nngn12s-projects.vercel.app"
    ];
    if (!origin || allowedOrigins.includes(origin) || origin.endsWith(".vercel.app")) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true
}));

// Static uploads
app.use("/uploads", express.static(path.resolve(__dirname, "uploads")));

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/posts", postRoutes);
app.use("/api/comments", commentRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/admin", adminRoutes);

// Test route
app.get("/", (req, res) => res.send("API is running..."));

// 404 handler
app.use((req, res) => {
  res.status(404).json({ message: "API route not found" });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({ message: err.message || "Server Error" });
});

// Server start
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));