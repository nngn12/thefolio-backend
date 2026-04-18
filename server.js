require("dotenv").config();

const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs");

// ✅ Database Connection
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

// ✅ App Initialization MUST happen before app.use
const app = express();

// ✅ THE SLEDGEHAMMER CORS FIX
app.use(cors({
  origin: "*", 
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "Accept"]
}));

// Globally handle preflight requests
app.options("*", cors());

// ✅ Ensure Uploads Directory Exists
const uploadDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);

// ✅ Middleware
app.use(express.json());
app.use("/uploads", express.static(uploadDir));

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
