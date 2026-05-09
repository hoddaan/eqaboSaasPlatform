const multer = require('multer');
const path   = require('path');
const fs     = require('fs');
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '../../uploads/halls');
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `hall-${req.params.id||'img'}-${Date.now()}${ext}`);
  },
});
module.exports = multer({ storage, limits: { fileSize: 5*1024*1024 } });
