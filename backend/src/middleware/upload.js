const multer  = require('multer');
const path    = require('path');
const fs      = require('fs');

// Always resolve uploads relative to the backend root (2 levels up from middleware/)
const UPLOADS_ROOT = path.join(__dirname, '../../uploads');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(UPLOADS_ROOT, 'maintenance');
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `maint-${Date.now()}-${Math.random().toString(36).slice(2,8)}${ext}`);
  },
});

const fileFilter = (req, file, cb) => {
  const allowed = ['.jpg','.jpeg','.png','.webp','.gif'];
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowed.includes(ext)) cb(null, true);
  else cb(new Error('Only image files are allowed'), false);
};

module.exports = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});
