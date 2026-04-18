// backend/server.js
require("dotenv").config();

const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs");

// ✅ Database Connection (Using your connectDB style)
const pool = require("./config/db");
pool.connect()
  .then(() => console.log("✅ Connected to PostgreSQL: thefolio"))
  .catch(err => console.error("❌ DB connection error:", err.message));

// ✅ Route Imports
const authRoutes    = require("./routes/auth.routes");
const postRoutes    = require("./routes/post.routes");
const commentRoutes = require("./routes/comment.routes");
const messageRoutes = require("./routes/message.routes");
const adminRoutes   = require("./routes/admin.routes");

const app = express();

// ✅ Ensure Uploads Directory Exists
const uploadDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);

// ✅ Middleware
app.use(express.json());
app.use("/uploads", express.static(uploadDir));

// ✅ Refined CORS: Merging dynamic logic with Environment Variables
const allowedOrigins = [
  "http://localhost:3000",
  "https://thefolio-frontend-zeta.vercel.app",
  "https://thefolio-eight.vercel.app",
  process.env.FRONTEND_URL,
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    // Logic: Explicitly listed OR dynamic Vercel preview branch
    if (allowedOrigins.includes(origin) || origin.endsWith(".vercel.app")) {
      return callback(null, true);
    }
    console.error("CORS blocked origin:", origin);
    return callback(new Error("Not allowed by CORS"));
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));

// Handle pre-flight OPTIONS requests globally
app.options("*", cors());

// ✅ API Routes
app.use("/api/auth",     authRoutes);
app.use("/api/posts",    postRoutes);
app.use("/api/comments", commentRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/admin",    adminRoutes);

// ✅ Base/Health Route
app.get("/", (req, res) => res.send("TheFolio API is running ✓"));

// ✅ Error Handling
app.use((req, res) => res.status(404).json({ message: "API route not found" }));

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({ message: err.message || "Server Error" });
});

// ✅ Server Start
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
