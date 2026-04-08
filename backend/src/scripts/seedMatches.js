/**
 * Seeds realistic demo matches for all 10 sport categories.
 * Run with: node src/scripts/seedMatches.js
 * Also called automatically on startup when a sport has no matches.
 */

const prisma = require('../lib/prisma');

const now = new Date();
const h = (hours) => new Date(now.getTime() + hours * 3600000);

const DEMO_MATCHES = [
  // ── FOOTBALL ──────────────────────────────────────────────────────────────
  { sport: 'FOOTBALL', league: 'Premier League', home: 'Arsenal', away: 'Chelsea', status: 'LIVE', start: h(-1), odds: [{ outcome: 'HOME_WIN', label: 'Arsenal Win', value: 2.10 }, { outcome: 'DRAW', label: 'Draw', value: 3.40 }, { outcome: 'AWAY_WIN', label: 'Chelsea Win', value: 3.20 }] },
  { sport: 'FOOTBALL', league: 'Premier League', home: 'Liverpool', away: 'Man City', status: 'UPCOMING', start: h(2), odds: [{ outcome: 'HOME_WIN', label: 'Liverpool Win', value: 2.60 }, { outcome: 'DRAW', label: 'Draw', value: 3.20 }, { outcome: 'AWAY_WIN', label: 'Man City Win', value: 2.50 }] },
  { sport: 'FOOTBALL', league: 'La Liga', home: 'Real Madrid', away: 'Barcelona', status: 'UPCOMING', start: h(4), odds: [{ outcome: 'HOME_WIN', label: 'Real Madrid Win', value: 2.20 }, { outcome: 'DRAW', label: 'Draw', value: 3.30 }, { outcome: 'AWAY_WIN', label: 'Barcelona Win', value: 2.90 }] },
  { sport: 'FOOTBALL', league: 'Bundesliga', home: 'Bayern Munich', away: 'Borussia Dortmund', status: 'UPCOMING', start: h(6), odds: [{ outcome: 'HOME_WIN', label: 'Bayern Win', value: 1.65 }, { outcome: 'DRAW', label: 'Draw', value: 4.00 }, { outcome: 'AWAY_WIN', label: 'Dortmund Win', value: 4.50 }] },
  { sport: 'FOOTBALL', league: 'Serie A', home: 'Juventus', away: 'Inter Milan', status: 'UPCOMING', start: h(8), odds: [{ outcome: 'HOME_WIN', label: 'Juventus Win', value: 2.30 }, { outcome: 'DRAW', label: 'Draw', value: 3.10 }, { outcome: 'AWAY_WIN', label: 'Inter Win', value: 2.80 }] },
  { sport: 'FOOTBALL', league: 'Champions League', home: 'PSG', away: 'Man United', status: 'UPCOMING', start: h(24), odds: [{ outcome: 'HOME_WIN', label: 'PSG Win', value: 1.90 }, { outcome: 'DRAW', label: 'Draw', value: 3.60 }, { outcome: 'AWAY_WIN', label: 'Man United Win', value: 3.80 }] },
  { sport: 'FOOTBALL', league: 'NPFL', home: 'Enyimba FC', away: 'Kano Pillars', status: 'LIVE', start: h(-0.5), odds: [{ outcome: 'HOME_WIN', label: 'Enyimba Win', value: 2.00 }, { outcome: 'DRAW', label: 'Draw', value: 3.20 }, { outcome: 'AWAY_WIN', label: 'Kano Win', value: 3.50 }] },
  { sport: 'FOOTBALL', league: 'NPFL', home: 'Shooting Stars', away: 'Lobi Stars', status: 'UPCOMING', start: h(3), odds: [{ outcome: 'HOME_WIN', label: 'Shooting Stars', value: 2.40 }, { outcome: 'DRAW', label: 'Draw', value: 3.10 }, { outcome: 'AWAY_WIN', label: 'Lobi Stars', value: 2.70 }] },

  // ── BASKETBALL ────────────────────────────────────────────────────────────
  { sport: 'BASKETBALL', league: 'NBA', home: 'LA Lakers', away: 'Golden State Warriors', status: 'LIVE', start: h(-1.5), odds: [{ outcome: 'HOME_WIN', label: 'Lakers Win', value: 1.85 }, { outcome: 'AWAY_WIN', label: 'Warriors Win', value: 1.95 }] },
  { sport: 'BASKETBALL', league: 'NBA', home: 'Boston Celtics', away: 'Miami Heat', status: 'UPCOMING', start: h(3), odds: [{ outcome: 'HOME_WIN', label: 'Celtics Win', value: 1.55 }, { outcome: 'AWAY_WIN', label: 'Heat Win', value: 2.40 }] },
  { sport: 'BASKETBALL', league: 'NBA', home: 'Chicago Bulls', away: 'Brooklyn Nets', status: 'UPCOMING', start: h(5), odds: [{ outcome: 'HOME_WIN', label: 'Bulls Win', value: 2.10 }, { outcome: 'AWAY_WIN', label: 'Nets Win', value: 1.70 }] },
  { sport: 'BASKETBALL', league: 'NBA', home: 'Phoenix Suns', away: 'Dallas Mavericks', status: 'UPCOMING', start: h(7), odds: [{ outcome: 'HOME_WIN', label: 'Suns Win', value: 1.75 }, { outcome: 'AWAY_WIN', label: 'Mavs Win', value: 2.05 }] },
  { sport: 'BASKETBALL', league: 'EuroLeague', home: 'Real Madrid Basket', away: 'CSKA Moscow', status: 'UPCOMING', start: h(26), odds: [{ outcome: 'HOME_WIN', label: 'Real Madrid Win', value: 1.60 }, { outcome: 'AWAY_WIN', label: 'CSKA Win', value: 2.30 }] },

  // ── TENNIS ───────────────────────────────────────────────────────────────
  { sport: 'TENNIS', league: 'ATP Masters', home: 'N. Djokovic', away: 'C. Alcaraz', status: 'LIVE', start: h(-0.5), odds: [{ outcome: 'HOME_WIN', label: 'Djokovic Win', value: 1.90 }, { outcome: 'AWAY_WIN', label: 'Alcaraz Win', value: 1.90 }] },
  { sport: 'TENNIS', league: 'ATP Masters', home: 'C. Alcaraz', away: 'J. Sinner', status: 'UPCOMING', start: h(4), odds: [{ outcome: 'HOME_WIN', label: 'Alcaraz Win', value: 1.80 }, { outcome: 'AWAY_WIN', label: 'Sinner Win', value: 2.00 }] },
  { sport: 'TENNIS', league: 'WTA', home: 'I. Swiatek', away: 'A. Sabalenka', status: 'UPCOMING', start: h(5), odds: [{ outcome: 'HOME_WIN', label: 'Swiatek Win', value: 1.65 }, { outcome: 'AWAY_WIN', label: 'Sabalenka Win', value: 2.20 }] },
  { sport: 'TENNIS', league: 'ATP 500', home: 'R. Nadal', away: 'A. Zverev', status: 'UPCOMING', start: h(24), odds: [{ outcome: 'HOME_WIN', label: 'Nadal Win', value: 2.40 }, { outcome: 'AWAY_WIN', label: 'Zverev Win', value: 1.55 }] },

  // ── BOXING / MMA ──────────────────────────────────────────────────────────
  { sport: 'BOXING', league: 'UFC 300', home: 'Islam Makhachev', away: 'Charles Oliveira', status: 'UPCOMING', start: h(48), odds: [{ outcome: 'HOME_WIN', label: 'Makhachev Win', value: 1.45 }, { outcome: 'AWAY_WIN', label: 'Oliveira Win', value: 2.70 }] },
  { sport: 'BOXING', league: 'WBC Heavyweight', home: 'Tyson Fury', away: 'Anthony Joshua', status: 'UPCOMING', start: h(72), odds: [{ outcome: 'HOME_WIN', label: 'Fury Win', value: 1.55 }, { outcome: 'AWAY_WIN', label: 'Joshua Win', value: 2.40 }] },
  { sport: 'BOXING', league: 'UFC Fight Night', home: 'Conor McGregor', away: 'Dustin Poirier', status: 'UPCOMING', start: h(120), odds: [{ outcome: 'HOME_WIN', label: 'McGregor Win', value: 2.20 }, { outcome: 'AWAY_WIN', label: 'Poirier Win', value: 1.65 }] },

  // ── CRICKET ───────────────────────────────────────────────────────────────
  { sport: 'CRICKET', league: 'IPL 2025', home: 'Mumbai Indians', away: 'Chennai Super Kings', status: 'LIVE', start: h(-1), odds: [{ outcome: 'HOME_WIN', label: 'MI Win', value: 1.75 }, { outcome: 'AWAY_WIN', label: 'CSK Win', value: 2.05 }] },
  { sport: 'CRICKET', league: 'IPL 2025', home: 'Royal Challengers', away: 'Kolkata Knight Riders', status: 'UPCOMING', start: h(5), odds: [{ outcome: 'HOME_WIN', label: 'RCB Win', value: 2.10 }, { outcome: 'AWAY_WIN', label: 'KKR Win', value: 1.72 }] },
  { sport: 'CRICKET', league: 'T20 International', home: 'Nigeria', away: 'Kenya', status: 'UPCOMING', start: h(24), odds: [{ outcome: 'HOME_WIN', label: 'Nigeria Win', value: 1.60 }, { outcome: 'AWAY_WIN', label: 'Kenya Win', value: 2.30 }] },
  { sport: 'CRICKET', league: 'Test Series', home: 'England', away: 'Australia', status: 'UPCOMING', start: h(48), odds: [{ outcome: 'HOME_WIN', label: 'England Win', value: 2.30 }, { outcome: 'DRAW', label: 'Draw', value: 3.00 }, { outcome: 'AWAY_WIN', label: 'Australia Win', value: 2.40 }] },

  // ── NFL ───────────────────────────────────────────────────────────────────
  { sport: 'NFL', league: 'NFL', home: 'Kansas City Chiefs', away: 'San Francisco 49ers', status: 'UPCOMING', start: h(48), odds: [{ outcome: 'HOME_WIN', label: 'Chiefs Win', value: 1.80 }, { outcome: 'AWAY_WIN', label: '49ers Win', value: 2.00 }] },
  { sport: 'NFL', league: 'NFL', home: 'Dallas Cowboys', away: 'Philadelphia Eagles', status: 'UPCOMING', start: h(50), odds: [{ outcome: 'HOME_WIN', label: 'Cowboys Win', value: 2.10 }, { outcome: 'AWAY_WIN', label: 'Eagles Win', value: 1.72 }] },
  { sport: 'NFL', league: 'NFL Playoffs', home: 'Buffalo Bills', away: 'Baltimore Ravens', status: 'UPCOMING', start: h(72), odds: [{ outcome: 'HOME_WIN', label: 'Bills Win', value: 1.90 }, { outcome: 'AWAY_WIN', label: 'Ravens Win', value: 1.90 }] },

  // ── ESPORTS ───────────────────────────────────────────────────────────────
  { sport: 'ESPORTS', league: 'CS2 Major', home: 'Team Vitality', away: 'NaVi', status: 'LIVE', start: h(-0.5), odds: [{ outcome: 'HOME_WIN', label: 'Vitality Win', value: 1.65 }, { outcome: 'AWAY_WIN', label: 'NaVi Win', value: 2.20 }] },
  { sport: 'ESPORTS', league: 'LoL World Championship', home: 'T1', away: 'Gen.G', status: 'UPCOMING', start: h(6), odds: [{ outcome: 'HOME_WIN', label: 'T1 Win', value: 1.55 }, { outcome: 'AWAY_WIN', label: "Gen.G Win", value: 2.40 }] },
  { sport: 'ESPORTS', league: 'Dota 2 International', home: 'Team Spirit', away: 'OG', status: 'UPCOMING', start: h(12), odds: [{ outcome: 'HOME_WIN', label: 'Team Spirit Win', value: 1.80 }, { outcome: 'AWAY_WIN', label: 'OG Win', value: 2.00 }] },
  { sport: 'ESPORTS', league: 'CS2 Pro League', home: 'Astralis', away: 'FaZe Clan', status: 'UPCOMING', start: h(3), odds: [{ outcome: 'HOME_WIN', label: 'Astralis Win', value: 2.30 }, { outcome: 'AWAY_WIN', label: 'FaZe Win', value: 1.60 }] },

  // ── VIRTUAL ───────────────────────────────────────────────────────────────
  { sport: 'VIRTUAL', league: 'Virtual Football', home: 'Virtual United', away: 'Virtual City', status: 'UPCOMING', start: h(0.05), odds: [{ outcome: 'HOME_WIN', label: 'Home Win', value: 2.10 }, { outcome: 'DRAW', label: 'Draw', value: 3.20 }, { outcome: 'AWAY_WIN', label: 'Away Win', value: 3.00 }] },
  { sport: 'VIRTUAL', league: 'Virtual Football', home: 'Virtual Rovers', away: 'Virtual Athletic', status: 'UPCOMING', start: h(0.1), odds: [{ outcome: 'HOME_WIN', label: 'Home Win', value: 1.85 }, { outcome: 'DRAW', label: 'Draw', value: 3.50 }, { outcome: 'AWAY_WIN', label: 'Away Win', value: 3.80 }] },
  { sport: 'VIRTUAL', league: 'Virtual Basketball', home: 'V-Bulls', away: 'V-Lakers', status: 'UPCOMING', start: h(0.08), odds: [{ outcome: 'HOME_WIN', label: 'V-Bulls Win', value: 1.90 }, { outcome: 'AWAY_WIN', label: 'V-Lakers Win', value: 1.90 }] },

  // ── POLITICS ──────────────────────────────────────────────────────────────
  { sport: 'POLITICS', league: 'Nigerian Politics', home: 'APC', away: 'PDP', status: 'UPCOMING', start: h(2000), odds: [{ outcome: 'HOME_WIN', label: 'APC Wins', value: 1.60 }, { outcome: 'AWAY_WIN', label: 'PDP Wins', value: 2.20 }] },
  { sport: 'POLITICS', league: 'Global Politics', home: 'Democrats', away: 'Republicans', status: 'UPCOMING', start: h(3000), odds: [{ outcome: 'HOME_WIN', label: 'Democrats Win', value: 1.95 }, { outcome: 'AWAY_WIN', label: 'Republicans Win', value: 1.85 }] },

  // ── ENTERTAINMENT ─────────────────────────────────────────────────────────
  { sport: 'ENTERTAINMENT', league: 'Big Brother Naija', home: 'Housemate A', away: 'Housemate B', status: 'UPCOMING', start: h(24), odds: [{ outcome: 'HOME_WIN', label: 'Housemate A Wins', value: 2.50 }, { outcome: 'AWAY_WIN', label: 'Housemate B Wins', value: 1.55 }] },
  { sport: 'ENTERTAINMENT', league: 'Afrobeats Awards', home: 'Burna Boy', away: 'Davido', status: 'UPCOMING', start: h(48), odds: [{ outcome: 'HOME_WIN', label: 'Burna Boy Wins', value: 1.70 }, { outcome: 'AWAY_WIN', label: 'Davido Wins', value: 2.10 }] },
];

async function seedMatches(sportCategory = null) {
  const toSeed = sportCategory
    ? DEMO_MATCHES.filter(m => m.sport === sportCategory)
    : DEMO_MATCHES;

  let created = 0;
  let skipped = 0;

  for (const demo of toSeed) {
    try {
      // Check if a match with same teams and sport already exists
      const existing = await prisma.match.findFirst({
        where: {
          homeTeam: demo.home,
          awayTeam: demo.away,
          sportCategory: demo.sport,
        },
      });

      if (existing) { skipped++; continue; }

      const match = await prisma.match.create({
        data: {
          league: demo.league,
          homeTeam: demo.home,
          awayTeam: demo.away,
          status: demo.status,
          startTime: demo.start,
          sportCategory: demo.sport,
        },
      });

      for (const odd of demo.odds) {
        await prisma.odd.create({
          data: {
            matchId: match.id,
            outcome: odd.outcome,
            label: odd.label,
            value: odd.value,
            isActive: true,
          },
        });
      }
      created++;
    } catch (err) {
      console.error(`[Seed] Error seeding ${demo.home} vs ${demo.away}:`, err.message);
    }
  }

  console.log(`[Seed] ${sportCategory || 'ALL'}: ${created} created, ${skipped} already existed`);
  return { created, skipped };
}

// Run directly
if (require.main === module) {
  seedMatches()
    .then(() => process.exit(0))
    .catch(err => { console.error(err); process.exit(1); });
}

module.exports = { seedMatches };
