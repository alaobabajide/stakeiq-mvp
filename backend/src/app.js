require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');

const authRoutes = require('./routes/auth');
const kycRoutes = require('./routes/kyc');
const matchRoutes = require('./routes/matches');
const betslipRoutes = require('./routes/betslip');
const walletRoutes = require('./routes/wallet');
const tipsterRoutes = require('./routes/tipsters');
const withdrawRoutes = require('./routes/withdraw');
const statsRoutes = require('./routes/stats');
const webhookRoutes = require('./routes/webhooks');
const referralRoutes = require('./routes/referrals');
const billRoutes = require('./routes/bills');
const { errorHandler } = require('./middleware/errorHandler');

const app = express();

// ── Health check: FIRST, before everything ───────────────────────────────────
app.get('/health', (req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

// ── Security ─────────────────────────────────────────────────────────────────
app.use(helmet({ contentSecurityPolicy: false })); // CSP off so React loads
app.use(cors({ origin: '*', credentials: true }));

// ── Rate limiting ─────────────────────────────────────────────────────────────
const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 300 });
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 20 });
app.use('/api/auth', authLimiter);
app.use(limiter);

// ── Webhooks (raw body, before json parser) ───────────────────────────────────
app.use('/api/webhooks', webhookRoutes);

// ── Body parsing ──────────────────────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ── Static file uploads ───────────────────────────────────────────────────────
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// ── API routes ────────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/kyc', kycRoutes);
app.use('/api/matches', matchRoutes);
app.use('/api/betslip', betslipRoutes);
app.use('/api/wallet', walletRoutes);
app.use('/api/tipsters', tipsterRoutes);
app.use('/api/withdraw', withdrawRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/referrals', referralRoutes);
app.use('/api/bills', billRoutes);

// ── Serve React frontend ──────────────────────────────────────────────────────
const frontendDist = path.join(__dirname, '../../frontend/dist');
app.use(express.static(frontendDist));
app.get('*', (req, res) => {
  res.sendFile(path.join(frontendDist, 'index.html'), (err) => {
    if (err) res.status(200).sendFile(path.join(frontendDist, 'index.html'));
  });
});

// ── Error handler ─────────────────────────────────────────────────────────────
app.use(errorHandler);

// ── Start server ──────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3001;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ StakeIQ running on port ${PORT}`);
  console.log(`   NODE_ENV: ${process.env.NODE_ENV || 'development'}`);
  console.log(`   DATABASE: ${process.env.DATABASE_URL ? '✅ configured' : '❌ DATABASE_URL not set!'}`);
});

module.exports = app;
