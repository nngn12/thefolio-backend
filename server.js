// backend/server.js
require("dotenv").config();

const express = require("express");
const cors    = require("cors");
const path    = require("path");

const connectDB = require("./config/db");

const authRoutes    = require("./routes/auth.routes");
const postRoutes    = require("./routes/post.routes");
const commentRoutes = require("./routes/comment.routes");
const messageRoutes = require("./routes/message.routes");
const adminRoutes   = require("./routes/admin.routes");

const app = express();

connectDB();
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// ── CORS: reads FRONTEND_URL from Render environment variables ──
// In Render dashboard → Environment → Add:  FRONTEND_URL = https://your-app.vercel.app
const allowedOrigins = [
  "http://localhost:3000",
  "https://thefolio-eight.vercel.app", // Added your Vercel app explicitly here
  process.env.FRONTEND_URL,
].filter(Boolean);
app.use(cors({
  origin: (origin, callback) => {
    // Allow Postman / curl (no origin header)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    console.error("CORS blocked origin:", origin);
    return callback(new Error("Not allowed by CORS"));
  },
  credentials: true,
}));

app.use(express.json());

app.use("/api/auth",     authRoutes);
app.use("/api/posts",    postRoutes);
app.use("/api/comments", commentRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/admin",    adminRoutes);

app.get("/", (req, res) => res.send("TheFolio API is running ✓"));

app.use((req, res) => res.status(404).json({ message: "API route not found" }));

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({ message: err.message || "Server Error" });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
