require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const auth = require('./middleware/auth');
const authRoutes = require('./routes/auth');
const guestRoutes = require('./routes/guests');
const eventRoutes = require('./routes/events');
const regRoutes = require('./routes/registrations');
const reviewRoutes = require('./routes/reviews');
const dashboardRoutes = require('./routes/dashboard');
const matchingRoutes = require('./routes/matching');
const publicRoutes = require('./routes/public');

const app = express();
app.use(cors());
app.use(express.json());

// Public routes (no auth)
app.use('/api/public', publicRoutes);

// Auth
app.use('/api/auth', authRoutes);

// Protected routes
app.use('/api/guests', auth, guestRoutes);
app.use('/api/events', auth, eventRoutes);
app.use('/api/registrations', auth, regRoutes);
app.use('/api/reviews', auth, reviewRoutes);
app.use('/api/dashboard', auth, dashboardRoutes);
app.use('/api/matching', auth, matchingRoutes);
app.use('/api/guests-io', auth, require('./routes/importExport'));
app.use('/api/fortune', auth, require('./routes/fortune'));

// Serve frontends in production
// 注意：Express 5 不再支持 app.get('*') 通配符，改用兜底中间件实现 SPA fallback
if (process.env.NODE_ENV === 'production') {
  app.use('/apply', express.static(path.join(__dirname, '../mobile/dist')));
  app.use(express.static(path.join(__dirname, '../client/dist')));
  app.use((req, res, next) => {
    if (req.method !== 'GET' || req.path.startsWith('/api')) return next();
    if (req.path.startsWith('/apply')) {
      return res.sendFile(path.join(__dirname, '../mobile/dist/index.html'));
    }
    res.sendFile(path.join(__dirname, '../client/dist/index.html'));
  });
}

// 全局错误处理：日志留在服务端，客户端只收到通用提示（防止泄露堆栈与路径）
app.use((err, req, res, next) => {
  console.error(`[error] ${req.method} ${req.path}:`, err.message);
  if (res.headersSent) return next(err);
  res.status(500).json({ error: '服务器内部错误，请稍后重试' });
});

const { startBackupSchedule } = require('./backup');
startBackupSchedule();

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
