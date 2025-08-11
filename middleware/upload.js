const multer = require('multer');
// Use memory storage so files are not saved to disk
const storage = multer.memoryStorage();

// Multer instance
const upload = multer({
  storage,
  limits: {
    fileSize: 8 * 1024 * 1024 // 5 MB limit (you can adjust this)
  },
  fileFilter: (req, file, cb) => {
    // Accept only images
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'), false);
    }
  }
});

module.exports = upload;
