const express = require('express');
const { body, validationResult } = require('express-validator');

const { authenticate, requireKyc } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');

const router = express.Router();
const prisma = require('../lib/prisma');

// GET /api/betslip — active betslip items
router.get('/', authenticate, asyncHandler(async (req, res) => {
  const betslips = await prisma.betslip.findMany({
    where: { userId: req.user.id, status: 'OPEN' },
    include: { items: { include: { match: true, odd: true } } },
    orderBy: { createdAt: 'desc' },
    take: 1
  });

  // Also return settled betslips for history
  const history = await prisma.betslip.findMany({
    where: { userId: req.user.id, status: { not: 'OPEN' } },
    include: { items: { include: { match: true, odd: true } } },
    orderBy: { createdAt: 'desc' },
    take: 10
  });

  res.json({ active: betslips[0] || null, history });
}));

// POST /api/betslip/place
router.post('/place', authenticate, requireKyc,
  [
    body('items').isArray({ min: 1 }).withMessage('At least one selection required'),
    body('items.*.oddId').isUUID().withMessage('Valid odd ID required'),
    body('stake').isFloat({ min: 50 }).withMessage('Minimum stake is ₦50'),
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { items, stake } = req.body;
    const stakeAmount = parseFloat(stake);

    // Load wallet
    const wallet = await prisma.wallet.findUnique({ where: { userId: req.user.id } });
    if (!wallet || parseFloat(wallet.balance) < stakeAmount) {
      return res.status(400).json({ error: 'Insufficient balance' });
    }

    // Check spending limit
    const limit = await prisma.spendingLimit.findUnique({ where: { userId: req.user.id } });
    if (limit) {
      const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
      const monthlyStaked = await prisma.transaction.aggregate({
        where: { userId: req.user.id, type: 'STAKE', createdAt: { gte: startOfMonth } },
        _sum: { amount: true }
      });
      const spent = parseFloat(monthlyStaked._sum.amount || 0) + stakeAmount;
      if (spent > parseFloat(limit.monthlyLimit)) {
        return res.status(400).json({ error: `Monthly spending limit of ₦${limit.monthlyLimit} reached` });
      }
    }

    // Load odds and calculate total
    const oddIds = items.map(i => i.oddId);
    const odds = await prisma.odd.findMany({
      where: { id: { in: oddIds }, isActive: true },
      include: { match: true }
    });

    if (odds.length !== items.length) {
      return res.status(400).json({ error: 'One or more selected odds are unavailable' });
    }

    // Check no duplicate matches
    const matchIds = odds.map(o => o.matchId);
    if (new Set(matchIds).size !== matchIds.length) {
      return res.status(400).json({ error: 'Cannot select multiple outcomes for the same match' });
    }

    const totalOdds = odds.reduce((acc, o) => acc * parseFloat(o.value), 1);
    const potentialWin = parseFloat((stakeAmount * totalOdds).toFixed(2));

    const betslip = await prisma.$transaction(async (tx) => {
      // Deduct stake from wallet
      await tx.wallet.update({
        where: { userId: req.user.id },
        data: {
          balance: { decrement: stakeAmount },
          lockedBalance: { increment: 0 },
          totalStaked: { increment: stakeAmount }
        }
      });

      // Record transaction
      const updatedWallet = await tx.wallet.findUnique({ where: { userId: req.user.id } });
      await tx.transaction.create({
        data: {
          userId: req.user.id,
          type: 'STAKE',
          amount: stakeAmount,
          balanceBefore: parseFloat(updatedWallet.balance) + stakeAmount,
          balanceAfter: parseFloat(updatedWallet.balance),
          status: 'COMPLETED',
          description: `Betslip stake`
        }
      });

      // Create betslip
      const slip = await tx.betslip.create({
        data: {
          userId: req.user.id,
          totalOdds,
          stake: stakeAmount,
          potentialWin,
          items: {
            create: odds.map((odd) => ({
              matchId: odd.matchId,
              oddId: odd.id,
              outcome: odd.outcome,
              oddValue: parseFloat(odd.value)
            }))
          }
        },
        include: { items: { include: { match: true, odd: true } } }
      });

      // Update BSR monthly bets
      await tx.bsr.update({
        where: { userId: req.user.id },
        data: { totalBets: { increment: 1 }, monthlyBets: { increment: 1 } }
      });

      return slip;
    });

    res.status(201).json({ betslip, message: 'Bet placed successfully!' });
  })
);

// GET /api/betslip/history
router.get('/history', authenticate, asyncHandler(async (req, res) => {
  const { page = '1', limit = '20' } = req.query;
  const skip = (parseInt(page) - 1) * parseInt(limit);

  const [betslips, total] = await Promise.all([
    prisma.betslip.findMany({
      where: { userId: req.user.id },
      include: { items: { include: { match: true, odd: true } } },
      orderBy: { createdAt: 'desc' },
      skip,
      take: parseInt(limit)
    }),
    prisma.betslip.count({ where: { userId: req.user.id } })
  ]);

  res.json({ betslips, pagination: { page: parseInt(page), limit: parseInt(limit), total } });
}));

module.exports = router;
