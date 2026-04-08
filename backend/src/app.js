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
const { errorHandler } = require('./middleware/errorHandler');

const app = express();

// Security
app.use(helmet());
app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:5173', credentials: true }));

// Rate limiting
const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 200 });
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 20, message: 'Too many attempts, try again in 15 minutes' });
app.use('/api/auth', authLimiter);
app.use(limiter);

// Webhooks must use raw body BEFORE express.json() parses it
app.use('/api/webhooks', webhookRoutes);

// Body parsing (after webhooks)
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Static uploads
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Health check
app.get('/health', (req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/kyc', kycRoutes);
app.use('/api/matches', matchRoutes);
app.use('/api/betslip', betslipRoutes);
app.use('/api/wallet', walletRoutes);
app.use('/api/tipsters', tipsterRoutes);
app.use('/api/withdraw', withdrawRoutes);
app.use('/api/stats', statsRoutes);

// 404
app.use((req, res) => res.status(404).json({ error: 'Route not found' }));

// Error handler
app.use(errorHandler);

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`StakeIQ API running on port ${PORT}`));

module.exports = app;
