// backend/middleware/upload.js
const multer = require('multer');
const path = require('path');
const fs = require('fs');
// Create uploads/ folder if it does not exist yet
if (!fs.existsSync('uploads')) {
    fs.mkdirSync('uploads');
}
// Where and how to save uploaded files
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, 'uploads/'),
    filename: (req, file, cb) => {
        // Create a unique filename: timestamp + random number + original extension
        const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
        cb(null, unique + path.extname(file.originalname));
        // Example result: 1719123456789-342156789.jpg
    },
});
// Only allow image file types
const fileFilter = (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp|jfif/;
    const ext =
        allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mime = allowedTypes.test(file.mimetype);
    if (ext && mime) return cb(null, true);
    cb(new Error('Only image files are allowed (jpg, jpeg, png, gif, webp, jfif)'));
};
const upload = multer({
    storage,
    fileFilter,
    limits: { fileSize: 5 * 1024 * 1024 }, // max 5 MB per file
});
module.exports = upload;