// backend/server.js
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

app.use(cors({
  origin: [
    "http://localhost:3000", // local development
    'https://thefolio-frontend-6m2l1ra5c-nngn12s-projects.vercel.app' // production (Vercel)
  ].filter(Boolean), // removes undefined if not set
  credentials: true
}));

// ✅ Routes
app.use("/api/auth", authRoutes);
app.use("/api/posts", postRoutes);
app.use("/api/comments", commentRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/admin", adminRoutes);

// ✅ Test route
app.get("/", (req, res) => res.send("API is running..."));

// ✅ 404 handler
app.use((req, res) => res.status(404).json({ message: "API route not found" }));

// ✅ Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({ message: err.message || "Server Error" });
});

// ✅ Server start
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));