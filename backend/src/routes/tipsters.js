const express = require('express');

const { authenticate } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');

const router = express.Router();
const prisma = require('../lib/prisma');

// GET /api/tipsters — list all tipsters sorted by BSR
router.get('/', authenticate, asyncHandler(async (req, res) => {
  const { filter } = req.query; // 'free' | 'premium' | 'all'

  const where = { isVerified: true };
  if (filter === 'free') where.isFree = true;
  if (filter === 'premium') where.isFree = false;

  const tipsters = await prisma.tipster.findMany({
    where,
    include: {
      user: { select: { bsr: true, fullName: true } },
      _count: { select: { subscriptions: true } }
    },
    orderBy: { subscriberCount: 'desc' }
  });

  const enriched = tipsters.map((t) => ({
    id: t.id,
    displayName: t.displayName,
    bio: t.bio,
    isFree: t.isFree,
    subscriptionPrice: parseFloat(t.subscriptionPrice || 0),
    subscriberCount: t._count.subscriptions,
    totalTips: t.totalTips,
    bsrScore: t.user.bsr?.score || 0,
    bsrLevel: t.user.bsr?.level || 'BRONZE',
    winRate: parseFloat(t.user.bsr?.winRate || 0),
    isVerified: t.isVerified
  }));

  res.json({ tipsters: enriched });
}));

// GET /api/tipsters/:id
router.get('/:id', authenticate, asyncHandler(async (req, res) => {
  const tipster = await prisma.tipster.findUnique({
    where: { id: req.params.id },
    include: {
      user: { select: { bsr: true } },
      tips: { orderBy: { createdAt: 'desc' }, take: 10 }
    }
  });
  if (!tipster) return res.status(404).json({ error: 'Tipster not found' });

  res.json({ tipster: { ...tipster, bsr: tipster.user.bsr } });
}));

// POST /api/tipsters/apply
router.post('/apply', authenticate, asyncHandler(async (req, res) => {
  const { displayName, bio, subscriptionPrice, isFree } = req.body;
  if (!displayName) return res.status(400).json({ error: 'Display name required' });

  // Check if already a tipster
  const existing = await prisma.tipster.findUnique({ where: { userId: req.user.id } });
  if (existing) return res.status(409).json({ error: 'You already have a tipster profile' });

  const tipster = await prisma.tipster.create({
    data: {
      userId: req.user.id,
      displayName,
      bio: bio || null,
      subscriptionPrice: isFree ? null : parseFloat(subscriptionPrice || 0),
      isFree: !!isFree,
      isVerified: false
    }
  });

  await prisma.user.update({ where: { id: req.user.id }, data: { role: 'TIPSTER' } });

  res.status(201).json({ tipster, message: 'Tipster application submitted for review' });
}));

module.exports = router;
