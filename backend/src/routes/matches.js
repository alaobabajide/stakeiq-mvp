const express = require('express');

const { authenticate } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');

const router = express.Router();
const prisma = require('../lib/prisma');

// GET /api/matches?status=LIVE&league=
router.get('/', authenticate, asyncHandler(async (req, res) => {
  const { status, league, page = '1', limit = '20' } = req.query;
  const skip = (parseInt(page) - 1) * parseInt(limit);

  const where = {};
  if (status) where.status = status;
  if (league) where.league = { contains: league, mode: 'insensitive' };
  else where.status = { in: ['LIVE', 'UPCOMING'] };

  const [matches, total] = await Promise.all([
    prisma.match.findMany({
      where,
      include: { odds: { where: { isActive: true } } },
      orderBy: [{ status: 'asc' }, { startTime: 'asc' }],
      skip,
      take: parseInt(limit)
    }),
    prisma.match.count({ where })
  ]);

  res.json({ matches, pagination: { page: parseInt(page), limit: parseInt(limit), total } });
}));

// GET /api/matches/live
router.get('/live', authenticate, asyncHandler(async (req, res) => {
  const matches = await prisma.match.findMany({
    where: { status: 'LIVE' },
    include: { odds: { where: { isActive: true } } },
    orderBy: { startTime: 'asc' }
  });
  res.json({ matches });
}));

// GET /api/matches/upcoming
router.get('/upcoming', authenticate, asyncHandler(async (req, res) => {
  const matches = await prisma.match.findMany({
    where: { status: 'UPCOMING', startTime: { gte: new Date() } },
    include: { odds: { where: { isActive: true } } },
    orderBy: { startTime: 'asc' },
    take: 20
  });
  res.json({ matches });
}));

// GET /api/matches/:id
router.get('/:id', authenticate, asyncHandler(async (req, res) => {
  const match = await prisma.match.findUnique({
    where: { id: req.params.id },
    include: { odds: { where: { isActive: true } } }
  });
  if (!match) return res.status(404).json({ error: 'Match not found' });
  res.json({ match });
}));

module.exports = router;
