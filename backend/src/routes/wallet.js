const express = require('express');
const { body, validationResult } = require('express-validator');

const { v4: uuidv4 } = require('uuid');
const { authenticate, requireKyc } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const opay = require('../services/opay');
const palmpay = require('../services/palmpay');

const router = express.Router();
const prisma = require('../lib/prisma');

// GET /api/wallet
router.get('/', authenticate, asyncHandler(async (req, res) => {
  const wallet = await prisma.wallet.findUnique({ where: { userId: req.user.id } });
  if (!wallet) return res.status(404).json({ error: 'Wallet not found' });
  res.json({ wallet });
}));

// GET /api/wallet/transactions
router.get('/transactions', authenticate, asyncHandler(async (req, res) => {
  const { page = '1', limit = '20', type } = req.query;
  const skip = (parseInt(page) - 1) * parseInt(limit);
  const where = { userId: req.user.id };
  if (type) where.type = type;

  const [transactions, total] = await Promise.all([
    prisma.transaction.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take: parseInt(limit) }),
    prisma.transaction.count({ where })
  ]);

  res.json({ transactions, pagination: { page: parseInt(page), limit: parseInt(limit), total } });
}));

// GET /api/wallet/payment-methods  — which providers are configured
router.get('/payment-methods', authenticate, asyncHandler(async (req, res) => {
  res.json({
    methods: [
      {
        id: 'OPAY',
        name: 'OPay',
        icon: '📱',
        description: 'Pay with your OPay wallet',
        available: opay.isConfigured(),
        sandbox: opay.isSandbox,
      },
      {
        id: 'PALMPAY',
        name: 'PalmPay',
        icon: '💚',
        description: 'Pay with your PalmPay wallet',
        available: palmpay.isConfigured(),
      },
    ]
  });
}));

// POST /api/wallet/deposit/initiate  — creates a payment link (OPay or PalmPay checkout)
router.post('/deposit/initiate', authenticate, requireKyc,
  [
    body('amount').isFloat({ min: 100 }).withMessage('Minimum deposit is ₦100'),
    body('provider').isIn(['OPAY', 'PALMPAY']).withMessage('Provider must be OPAY or PALMPAY'),
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { amount, provider } = req.body;
    const depositAmount = parseFloat(amount);
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { id: true, fullName: true, phone: true }
    });

    // reference format: DEP-{userId}-{timestamp} so webhook can find the user
    const reference = `DEP-${user.id}-${Date.now()}`;
    const appUrl = process.env.APP_URL || 'http://localhost:3001';
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

    const callbackUrl = `${appUrl}/api/webhooks/${provider.toLowerCase()}`;
    const returnUrl = `${frontendUrl}/deposit-complete?ref=${reference}`;

    let result;

    if (provider === 'OPAY') {
      if (!opay.isConfigured()) {
        return res.status(503).json({ error: 'OPay is not configured. Add credentials to .env' });
      }
      result = await opay.initiateDeposit({
        reference,
        amount: depositAmount,
        userPhone: user.phone,
        userName: user.fullName,
        callbackUrl,
        returnUrl,
      });
      return res.json({
        provider: 'OPAY',
        paymentUrl: result.cashierUrl,
        reference,
        amount: depositAmount,
        message: 'Redirect user to paymentUrl to complete deposit',
      });
    }

    if (provider === 'PALMPAY') {
      if (!palmpay.isConfigured()) {
        return res.status(503).json({ error: 'PalmPay is not configured. Add credentials to .env' });
      }
      result = await palmpay.initiateDeposit({
        reference,
        amount: depositAmount,
        userPhone: user.phone,
        userName: user.fullName,
        callbackUrl,
        returnUrl,
      });
      return res.json({
        provider: 'PALMPAY',
        paymentUrl: result.paymentUrl,
        reference,
        amount: depositAmount,
        message: 'Redirect user to paymentUrl to complete deposit',
      });
    }
  })
);

// POST /api/wallet/deposit/confirm  — manual credit (dev/sandbox fallback only)
// In production webhooks automatically credit the wallet. This endpoint is for testing.
router.post('/deposit/confirm', authenticate, requireKyc,
  [body('amount').isFloat({ min: 100 })],
  asyncHandler(async (req, res) => {
    if (process.env.NODE_ENV === 'production') {
      return res.status(403).json({ error: 'Manual deposit not allowed in production' });
    }

    const amount = parseFloat(req.body.amount);
    const reference = `DEV-${uuidv4()}`;

    await prisma.$transaction(async (tx) => {
      const wallet = await tx.wallet.update({
        where: { userId: req.user.id },
        data: { balance: { increment: amount }, totalDeposited: { increment: amount } },
      });
      await tx.transaction.create({
        data: {
          userId: req.user.id,
          type: 'DEPOSIT',
          amount,
          balanceBefore: parseFloat(wallet.balance) - amount,
          balanceAfter: parseFloat(wallet.balance),
          status: 'COMPLETED',
          reference,
          description: '[DEV] Manual deposit',
        },
      });
    });

    res.json({ message: `₦${amount.toLocaleString()} credited to wallet (dev mode)`, reference });
  })
);

module.exports = router;
