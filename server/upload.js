const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

// 照片统一存到 server/uploads/，随机文件名防遍历（URL 不可猜测）
const UPLOAD_DIR = path.join(__dirname, 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const EXT_BY_MIME = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
};

const storage = multer.diskStorage({
  destination: UPLOAD_DIR,
  filename: (req, file, cb) => {
    cb(null, crypto.randomBytes(16).toString('hex') + EXT_BY_MIME[file.mimetype]);
  },
});

const photoUpload = multer({
  storage,
  limits: { fileSize: 8 * 1024 * 1024 }, // 单张最大 8MB
  fileFilter: (req, file, cb) => {
    if (!EXT_BY_MIME[file.mimetype]) return cb(new Error('仅支持 JPG/PNG/WebP 图片'));
    cb(null, true);
  },
});

// 校验客户端回传的照片文件名（只接受本系统生成的格式，防止注入任意路径）
const PHOTO_NAME_RE = /^[a-f0-9]{32}\.(jpg|png|webp)$/;
function sanitizePhotos(input, max = 3) {
  let arr = input;
  if (typeof arr === 'string') {
    try { arr = JSON.parse(arr); } catch { return null; }
  }
  if (!Array.isArray(arr)) return null;
  const clean = arr.filter(f => typeof f === 'string' && PHOTO_NAME_RE.test(f)).slice(0, max);
  return JSON.stringify(clean);
}

module.exports = { photoUpload, UPLOAD_DIR, sanitizePhotos };
