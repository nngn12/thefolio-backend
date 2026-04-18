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

const uploadDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);

// ✅ 1. ULTIMATE CORS FIX
const allowedOrigins = [
  "http://localhost:3000",
  "https://thefolio-frontend-zeta.vercel.app",
  "https://thefolio-eight.vercel.app",
  process.env.FRONTEND_URL,
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or Postman)
    if (!origin) return callback(null, true);

    // Check if origin is in our list OR is any Vercel subdomain
    const isAllowed = allowedOrigins.includes(origin) || 
                      origin.endsWith(".vercel.app") || 
                      origin.includes("vercel.app");

    if (isAllowed) {
      callback(null, true);
    } else {
      console.error("🚫 CORS blocked origin:", origin);
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  // Added common headers to prevent preflight failures
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "Accept"]
}));

// Handle pre-flight OPTIONS requests globally
app.options("*", cors());

app.use(express.json());
app.use("/uploads", express.static(uploadDir));

// API Routes
app.use("/api/auth",     authRoutes);
app.use("/api/posts",    postRoutes);
app.use("/api/comments", commentRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/admin",    adminRoutes);

app.get("/", (req, res) => res.send("TheFolio API is running ✓"));

app.use((req, res) => res.status(404).json({ message: "API route not found" }));

app.use((err, req, res, next) => {
  // Logic fix: Don't crash the server on CORS errors, just return status
  if (err.message === "Not allowed by CORS") {
    return res.status(403).json({ message: err.message });
  }
  console.error(err.stack);
  res.status(err.status || 500).json({ message: err.message || "Server Error" });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
