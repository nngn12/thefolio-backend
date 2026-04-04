require("dotenv").config();

const express = require("express");
const cors = require("cors");
const path = require("path");

const authRoutes = require("./routes/auth.routes");
const postRoutes = require("./routes/post.routes");
const commentRoutes = require("./routes/comment.routes");
const messageRoutes = require("./routes/message.routes");
const adminRoutes = require("./routes/admin.routes");

const app = express();

// ✅ Middleware
app.use(express.json());

// 1. UPDATED: Flexible CORS to handle any Vercel preview or production URL
app.use(cors({
  origin: (origin, callback) => {
    const allowedOrigins = [
      "http://localhost:3000",
      "https://thefolio-frontend-6m2l1ra5c-nngn12s-projects.vercel.app"
    ];
    // Allow requests with no origin (like mobile apps or curl) or matched origins
    if (!origin || allowedOrigins.includes(origin) || origin.endsWith(".vercel.app")) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true
}));

// 2. ADDED: Static folder to serve your uploaded photos
// This allows the frontend to access images via http://your-backend.com/uploads/filename.jpg
app.use("/uploads", express.static(path.resolve(__dirname, "uploads")));
// ✅ Routes
app.use("/api/auth", authRoutes);
app.use("/api/posts", postRoutes);
app.use("/api/comments", commentRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/admin", adminRoutes);

// ✅ Test route
app.get("/", (req, res) => res.send("API is running..."));

// ✅ 404 handler
app.use((req, res) => {
  res.status(404).json({ message: "API route not found" });
});

// ✅ Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({ message: err.message || "Server Error" });
});

// ✅ Server start
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));