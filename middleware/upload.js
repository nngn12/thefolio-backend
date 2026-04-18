const multer = require("multer");
const path = require("path");

// File filter (only images allowed)
const fileFilter = (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp|jfif/;
    const ext = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mime = allowedTypes.test(file.mimetype);

    if (ext && mime) return cb(null, true);

    cb(new Error("Only image files are allowed"));
};

// ✅ MEMORY STORAGE (required for Supabase)
const storage = multer.memoryStorage();

const upload = multer({
    storage,
    fileFilter,
    limits: { fileSize: 5 * 1024 * 1024 } // 5MB
});

module.exports = upload;
