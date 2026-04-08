const express = require('express');
const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');
const { PrismaClient } = require('@prisma/client');
const { v4: uuidv4 } = require('uuid');
const { authenticate, requireKyc } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const opay = require('../services/opay');
const palmpay = require('../services/palmpay');

const router = express.Router();
const prisma = new PrismaClient();

// GET /api/withdraw/methods
router.get('/methods', authenticate, asyncHandler(async (req, res) => {
  res.json({
    methods: [
      { id: 'OPAY', name: 'OPay', description: 'Instant — OPay wallet', icon: '📱', available: opay.isConfigured() },
      { id: 'PALMPAY', name: 'PalmPay', description: 'Under 2 minutes', icon: '💚', available: palmpay.isConfigured() },
      { id: 'BANK_TRANSFER', name: 'Bank Transfer', description: '5-10 minutes', icon: '🏦', available: true },
    ]
  });
}));

// POST /api/withdraw/request
router.post('/request', authenticate, requireKyc,
  [
    body('amount').isFloat({ min: 500 }).withMessage('Minimum withdrawal is ₦500'),
    body('method').isIn(['OPAY', 'PALMPAY', 'BANK_TRANSFER']).withMessage('Valid payment method required'),
    body('accountNumber').notEmpty().withMessage('Account number required'),
    body('pin').isLength({ min: 4, max: 4 }).isNumeric().withMessage('PIN required'),
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { amount, method, accountNumber, accountName, bankCode, pin } = req.body;
    const withdrawAmount = parseFloat(amount);

    // Verify PIN
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { pinHash: true, fullName: true, phone: true }
    });
    const pinValid = await bcrypt.compare(pin, user.pinHash);
    if (!pinValid) return res.status(401).json({ error: 'Incorrect PIN' });

    // Check balance
    const wallet = await prisma.wallet.findUnique({ where: { userId: req.user.id } });
    if (parseFloat(wallet.balance) < withdrawAmount) {
      return res.status(400).json({ error: 'Insufficient balance' });
    }

    const reference = `WDR-${req.user.id}-${Date.now()}`;

    // ── Deduct balance & create records ──────────────────────────────────────
    const withdrawal = await prisma.$transaction(async (tx) => {
      const updatedWallet = await tx.wallet.update({
        where: { userId: req.user.id },
        data: { balance: { decrement: withdrawAmount }, totalWithdrawn: { increment: withdrawAmount } }
      });

      await tx.transaction.create({
        data: {
          userId: req.user.id,
          type: 'WITHDRAWAL',
          amount: withdrawAmount,
          balanceBefore: parseFloat(updatedWallet.balance) + withdrawAmount,
          balanceAfter: parseFloat(updatedWallet.balance),
          status: 'COMPLETED',
          reference,
          description: `Withdrawal to ${method} — ${accountNumber}`,
          metadata: { method, accountNumber, accountName }
        }
      });

      return tx.withdrawal.create({
        data: {
          userId: req.user.id,
          amount: withdrawAmount,
          method,
          accountNumber,
          accountName: accountName || user.fullName,
          bankName: method === 'BANK_TRANSFER' ? (req.body.bankName || null) : method,
          status: 'PROCESSING',
          reference,
        }
      });
    });

    // ── Dispatch real payout via OPay or PalmPay ──────────────────────────────
    let providerResponse = null;
    let payoutError = null;

    try {
      if (method === 'OPAY' && opay.isConfigured()) {
        providerResponse = await opay.payoutToWallet({
          reference,
          amount: withdrawAmount,
          recipientPhone: accountNumber,
          recipientName: accountName || user.fullName,
          reason: 'StakeIQ withdrawal',
        });
      } else if (method === 'PALMPAY' && palmpay.isConfigured()) {
        providerResponse = await palmpay.payoutToWallet({
          reference,
          amount: withdrawAmount,
          recipientPhone: accountNumber,
          recipientName: accountName || user.fullName,
          reason: 'StakeIQ withdrawal',
        });
      } else if (method === 'BANK_TRANSFER') {
        // Try OPay bank transfer first, fall back to PalmPay
        if (opay.isConfigured()) {
          providerResponse = await opay.payoutToBank({
            reference,
            amount: withdrawAmount,
            accountNumber,
            accountName: accountName || user.fullName,
            bankCode: bankCode || '',
            reason: 'StakeIQ withdrawal',
          });
        } else if (palmpay.isConfigured()) {
          providerResponse = await palmpay.payoutToBank({
            reference,
            amount: withdrawAmount,
            accountNumber,
            accountName: accountName || user.fullName,
            bankCode: bankCode || '',
            reason: 'StakeIQ withdrawal',
          });
        }
        // If neither is configured, mark as PROCESSING (manual handling)
      }

      // Mark as COMPLETED if provider accepted immediately
      if (providerResponse) {
        await prisma.withdrawal.update({
          where: { id: withdrawal.id },
          data: { status: 'COMPLETED', processedAt: new Date() }
        });
      }
    } catch (err) {
      payoutError = err.message;
      console.error(`[Withdraw] Payout failed for ${reference}:`, err.message);

      // Reverse the withdrawal — refund balance
      await prisma.$transaction(async (tx) => {
        await tx.wallet.update({
          where: { userId: req.user.id },
          data: { balance: { increment: withdrawAmount }, totalWithdrawn: { decrement: withdrawAmount } }
        });
        await tx.withdrawal.update({
          where: { id: withdrawal.id },
          data: { status: 'FAILED', failureReason: err.message }
        });
        await tx.transaction.create({
          data: {
            userId: req.user.id,
            type: 'REFUND',
            amount: withdrawAmount,
            balanceBefore: parseFloat(wallet.balance) - withdrawAmount,
            balanceAfter: parseFloat(wallet.balance),
            status: 'COMPLETED',
            description: `Refund — withdrawal failed: ${err.message}`,
          }
        });
      });

      return res.status(502).json({
        error: `Payout failed: ${err.message}. Your balance has been refunded.`
      });
    }

    res.status(201).json({
      withdrawal: { ...withdrawal, status: providerResponse ? 'COMPLETED' : 'PROCESSING' },
      message: providerResponse
        ? `₦${withdrawAmount.toLocaleString()} sent to your ${method} account! Should arrive within 5 minutes.`
        : `₦${withdrawAmount.toLocaleString()} withdrawal queued. Will arrive shortly.`,
      providerConfigured: !!(method === 'OPAY' ? opay.isConfigured() : method === 'PALMPAY' ? palmpay.isConfigured() : opay.isConfigured() || palmpay.isConfigured()),
    });
  })
);

// GET /api/withdraw/history
router.get('/history', authenticate, asyncHandler(async (req, res) => {
  const withdrawals = await prisma.withdrawal.findMany({
    where: { userId: req.user.id },
    orderBy: { createdAt: 'desc' },
    take: 20
  });
  res.json({ withdrawals });
}));

module.exports = router;
