const express = require('express');
const { body, validationResult } = require('express-validator');

const { authenticate } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');

const router = express.Router();
const prisma = require('../lib/prisma');

// GET /api/stats/me — spending dashboard data
router.get('/me', authenticate, asyncHandler(async (req, res) => {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const [wallet, bsr, spendingLimit, monthlyStaked, monthlyWon, monthlyBets, todayPnl] = await Promise.all([
    prisma.wallet.findUnique({ where: { userId: req.user.id } }),
    prisma.bsr.findUnique({ where: { userId: req.user.id } }),
    prisma.spendingLimit.findUnique({ where: { userId: req.user.id } }),
    prisma.transaction.aggregate({
      where: { userId: req.user.id, type: 'STAKE', status: 'COMPLETED', createdAt: { gte: startOfMonth } },
      _sum: { amount: true }
    }),
    prisma.transaction.aggregate({
      where: { userId: req.user.id, type: 'WIN', status: 'COMPLETED', createdAt: { gte: startOfMonth } },
      _sum: { amount: true }
    }),
    prisma.betslip.count({
      where: { userId: req.user.id, createdAt: { gte: startOfMonth } }
    }),
    prisma.transaction.aggregate({
      where: { userId: req.user.id, type: { in: ['WIN', 'STAKE'] }, status: 'COMPLETED', createdAt: { gte: startOfDay } },
      _sum: { amount: true }
    })
  ]);

  const totalSpent = parseFloat(monthlyStaked._sum.amount || 0);
  const totalWon = parseFloat(monthlyWon._sum.amount || 0);
  const netPnl = totalWon - totalSpent;
  const monthlyLimit = parseFloat(spendingLimit?.monthlyLimit || 50000);
  const budgetUsedPct = Math.min(100, Math.round((totalSpent / monthlyLimit) * 100));
  const budgetRemaining = Math.max(0, monthlyLimit - totalSpent);

  res.json({
    wallet: {
      balance: parseFloat(wallet?.balance || 0),
      totalStaked: parseFloat(wallet?.totalStaked || 0),
      totalWon: parseFloat(wallet?.totalWon || 0)
    },
    bsr: {
      score: bsr?.score || 0,
      level: bsr?.level || 'BRONZE',
      winRate: parseFloat(bsr?.winRate || 0),
      totalBets: bsr?.totalBets || 0,
      monthlyBets: bsr?.monthlyBets || 0
    },
    spending: {
      thisMonth: totalSpent,
      won: totalWon,
      net: netPnl,
      monthlyLimit,
      budgetRemaining,
      budgetUsedPct
    }
  });
}));

// PUT /api/stats/spending-limit
router.put('/spending-limit', authenticate,
  [body('monthlyLimit').isFloat({ min: 1000 }).withMessage('Minimum limit is ₦1,000')],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const limit = await prisma.spendingLimit.upsert({
      where: { userId: req.user.id },
      update: { monthlyLimit: parseFloat(req.body.monthlyLimit) },
      create: { userId: req.user.id, monthlyLimit: parseFloat(req.body.monthlyLimit) }
    });

    res.json({ spendingLimit: limit, message: 'Spending limit updated' });
  })
);

// POST /api/stats/self-exclusion
router.post('/self-exclusion', authenticate,
  [body('days').isIn([7, 30, 90]).withMessage('Duration must be 7, 30, or 90 days')],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { days, reason } = req.body;
    const endDate = new Date(Date.now() + days * 24 * 60 * 60 * 1000);

    // Deactivate any existing exclusion
    await prisma.selfExclusion.updateMany({
      where: { userId: req.user.id, isActive: true },
      data: { isActive: false }
    });

    const exclusion = await prisma.selfExclusion.create({
      data: { userId: req.user.id, endDate, durationDays: days, reason: reason || null }
    });

    res.status(201).json({
      exclusion,
      message: `Your account will be paused for ${days} days until ${endDate.toLocaleDateString()}`
    });
  })
);

module.exports = router;
