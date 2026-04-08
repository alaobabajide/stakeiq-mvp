const express = require('express');

const { authenticate } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const { syncSportToDb, getSportLobbyCounts, needsSync } = require('../services/oddsapi');
const { seedMatches } = require('../scripts/seedMatches');

const router = express.Router();
const prisma = require('../lib/prisma');

// Ensure a sport has data — seed demo if empty, sync from API if key available
async function ensureSportData(sportCategory) {
  if (!sportCategory) return;

  const count = await prisma.match.count({
    where: { sportCategory, status: { in: ['LIVE', 'UPCOMING'] } },
  });

  if (count === 0) {
    // No data at all — seed demo matches immediately
    await seedMatches(sportCategory);
  }

  // If API key available and sync is stale, refresh in background
  if (process.env.ODDS_API_KEY && needsSync(sportCategory)) {
    syncSportToDb(sportCategory, prisma).catch(() => {});
  }
}

// GET /api/matches/lobby — real DB counts per sport
router.get('/lobby', authenticate, asyncHandler(async (req, res) => {
  // Ensure all sports have at least demo data
  const allSports = ['FOOTBALL','BASKETBALL','TENNIS','BOXING','CRICKET','NFL','ESPORTS','VIRTUAL','POLITICS','ENTERTAINMENT'];
  await Promise.all(allSports.map(s => ensureSportData(s)));

  const counts = await getSportLobbyCounts(prisma);
  res.json({ lobby: counts });
}));

// POST /api/matches/sync — manually trigger live sync for a sport
router.post('/sync', authenticate, asyncHandler(async (req, res) => {
  const { sport } = req.body;
  if (!process.env.ODDS_API_KEY) {
    return res.status(400).json({
      error: 'ODDS_API_KEY not configured',
      hint: 'Get your free key at https://the-odds-api.com and set it as an env variable',
    });
  }
  const category = (sport || 'FOOTBALL').toUpperCase();
  const result = await syncSportToDb(category, prisma);
  res.json({ success: true, category, ...result });
}));

// GET /api/matches?status=LIVE&league=&sport=FOOTBALL
router.get('/', authenticate, asyncHandler(async (req, res) => {
  const { status, league, sport, page = '1', limit = '20' } = req.query;
  const skip = (parseInt(page) - 1) * parseInt(limit);
  const sportCategory = sport ? sport.toUpperCase() : null;

  // Ensure this sport has data before querying
  if (sportCategory) {
    await ensureSportData(sportCategory);
  }

  const where = {};
  if (status) where.status = status;
  if (league) where.league = { contains: league, mode: 'insensitive' };
  else where.status = { in: ['LIVE', 'UPCOMING'] };
  if (sportCategory) where.sportCategory = sportCategory;

  const [matches, total] = await Promise.all([
    prisma.match.findMany({
      where,
      include: { odds: { where: { isActive: true } } },
      orderBy: [{ status: 'asc' }, { startTime: 'asc' }],
      skip,
      take: parseInt(limit),
    }),
    prisma.match.count({ where }),
  ]);

  res.json({ matches, pagination: { page: parseInt(page), limit: parseInt(limit), total } });
}));

// GET /api/matches/live
router.get('/live', authenticate, asyncHandler(async (req, res) => {
  const matches = await prisma.match.findMany({
    where: { status: 'LIVE' },
    include: { odds: { where: { isActive: true } } },
    orderBy: { startTime: 'asc' },
  });
  res.json({ matches });
}));

// GET /api/matches/upcoming
router.get('/upcoming', authenticate, asyncHandler(async (req, res) => {
  const matches = await prisma.match.findMany({
    where: { status: 'UPCOMING', startTime: { gte: new Date() } },
    include: { odds: { where: { isActive: true } } },
    orderBy: { startTime: 'asc' },
    take: 20,
  });
  res.json({ matches });
}));

// GET /api/matches/:id
router.get('/:id', authenticate, asyncHandler(async (req, res) => {
  const match = await prisma.match.findUnique({
    where: { id: req.params.id },
    include: { odds: { where: { isActive: true } } },
  });
  if (!match) return res.status(404).json({ error: 'Match not found' });
  res.json({ match });
}));

module.exports = router;
