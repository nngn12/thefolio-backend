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

app.use(cors({
  origin: ["http://localhost:3000", process.env.FRONTEND_URL],
  credentials: true
}));

app.use("/api/auth", authRoutes);
app.use("/api/posts", postRoutes);
app.use("/api/comments", commentRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/admin", adminRoutes);

app.get("/", (req, res) => res.send("API is running..."));

app.use((req, res) => res.status(404).json({ message: "API route not found" }));

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({ message: err.message || "Server Error" });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));