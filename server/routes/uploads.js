const router = require('express').Router();
const { photoUpload } = require('../upload');

// 管理后台上传嘉宾照片，返回文件名（前端存入 guests.photos）
router.post('/photo', (req, res) => {
  photoUpload.single('photo')(req, res, err => {
    if (err) return res.status(400).json({ error: err.message || '上传失败' });
    if (!req.file) return res.status(400).json({ error: '未收到图片文件' });
    res.json({ filename: req.file.filename, url: `/uploads/${req.file.filename}` });
  });
});

module.exports = router;
