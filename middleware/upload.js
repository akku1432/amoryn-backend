const multer = require('multer');
const path = require('path');
const fs = require('fs');

// ensure uploads directory path
const uploadDir = path.join(__dirname, '..', 'uploads');

// Storage config
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // create uploads folder if not exists
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir); // absolute path
  },
  filename: function (req, file, cb) {
    // sanitize filename (replace spaces) to avoid URL issues
    const safeName = file.originalname.replace(/\s+/g, '_');
    cb(null, Date.now() + '-' + safeName);
  }
});

const upload = multer({ storage });

module.exports = upload;
