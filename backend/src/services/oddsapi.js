/**
 * The Odds API Integration — https://the-odds-api.com
 *
 * Free tier: 500 credits/month
 * Covers: Soccer, NBA, NFL, Tennis, MMA, Cricket, and more
 *
 * Get your free key at https://the-odds-api.com → "Get API Key"
 * Set ODDS_API_KEY in your .env file.
 */

const axios = require('axios');

const BASE_URL = 'https://api.the-odds-api.com/v4';
const API_KEY = process.env.ODDS_API_KEY;

// ── Sport key mapping: our categories → Odds API sport keys ───────────────────
const SPORT_KEYS = {
  FOOTBALL: [
    'soccer_epl',
    'soccer_spain_la_liga',
    'soccer_germany_bundesliga',
    'soccer_italy_serie_a',
    'soccer_france_ligue_one',
    'soccer_uefa_champs_league',
    'soccer_uefa_europa_league',
    'soccer_africa_cup_of_nations',
    'soccer_conmebol_copa_libertadores',
  ],
  BASKETBALL: [
    'basketball_nba',
    'basketball_euroleague',
    'basketball_ncaab',
  ],
  TENNIS: [
    'tennis_atp_french_open',
    'tennis_wta_french_open',
    'tennis_atp_us_open',
    'tennis_wta_us_open',
    'tennis_atp_wimbledon',
    'tennis_wta_wimbledon',
    'tennis_atp_australian_open',
  ],
  BOXING: [
    'mma_mixed_martial_arts',
    'boxing_boxing',
  ],
  CRICKET: [
    'cricket_ipl',
    'cricket_test_match',
    'cricket_international_t20',
  ],
  NFL: [
    'americanfootball_nfl',
    'americanfootball_ncaaf',
  ],
  ESPORTS: [
    'esports_lol',
    'esports_csgo',
    'esports_dota2',
  ],
  POLITICS: [
    'politics',
  ],
};

// League/sport title mappings for display
const SPORT_TITLE = {
  soccer_epl: 'English Premier League',
  soccer_spain_la_liga: 'La Liga',
  soccer_germany_bundesliga: 'Bundesliga',
  soccer_italy_serie_a: 'Serie A',
  soccer_france_ligue_one: 'Ligue 1',
  soccer_uefa_champs_league: 'UEFA Champions League',
  soccer_uefa_europa_league: 'UEFA Europa League',
  soccer_africa_cup_of_nations: 'Africa Cup of Nations',
  soccer_conmebol_copa_libertadores: 'Copa Libertadores',
  basketball_nba: 'NBA',
  basketball_euroleague: 'EuroLeague',
  basketball_ncaab: 'NCAA Basketball',
  tennis_atp_french_open: 'ATP French Open',
  tennis_wta_french_open: 'WTA French Open',
  tennis_atp_us_open: 'ATP US Open',
  tennis_wta_us_open: 'WTA US Open',
  tennis_atp_wimbledon: 'ATP Wimbledon',
  tennis_wta_wimbledon: 'WTA Wimbledon',
  tennis_atp_australian_open: 'ATP Australian Open',
  mma_mixed_martial_arts: 'MMA / UFC',
  boxing_boxing: 'Boxing',
  cricket_ipl: 'IPL',
  cricket_test_match: 'Cricket Test',
  cricket_international_t20: 'T20 International',
  americanfootball_nfl: 'NFL',
  americanfootball_ncaaf: 'NCAA Football',
  esports_lol: 'League of Legends',
  esports_csgo: 'CS2',
  esports_dota2: 'Dota 2',
  politics: 'Politics',
};

// In-memory cache to preserve credits (5 min TTL)
const cache = new Map();
const CACHE_TTL_MS = 5 * 60 * 1000;

function getCached(key) {
  const entry = cache.get(key);
  if (entry && Date.now() - entry.at < CACHE_TTL_MS) return entry.data;
  return null;
}
function setCache(key, data) {
  cache.set(key, { data, at: Date.now() });
}

// Track last sync time per sport category
const lastSync = new Map();
const SYNC_INTERVAL_MS = 10 * 60 * 1000; // re-sync at most every 10 mins per sport

function needsSync(sportCategory) {
  const t = lastSync.get(sportCategory);
  return !t || Date.now() - t > SYNC_INTERVAL_MS;
}
function markSynced(sportCategory) {
  lastSync.set(sportCategory, Date.now());
}

// ── Fetch active sports list (free, no credit cost) ───────────────────────────
async function getActiveSports() {
  if (!API_KEY) return [];
  const cached = getCached('active_sports');
  if (cached) return cached;
  try {
    const resp = await axios.get(`${BASE_URL}/sports/`, {
      params: { apiKey: API_KEY, all: false },
      timeout: 10000,
    });
    setCache('active_sports', resp.data);
    return resp.data;
  } catch (err) {
    console.error('[OddsAPI] getActiveSports error:', err.message);
    return [];
  }
}

// ── Fetch odds for a single sport key ─────────────────────────────────────────
async function fetchOddsForKey(sportKey) {
  if (!API_KEY) return null;
  const cacheKey = `odds_${sportKey}`;
  const cached = getCached(cacheKey);
  if (cached) return cached;
  try {
    const resp = await axios.get(`${BASE_URL}/sports/${sportKey}/odds`, {
      params: {
        apiKey: API_KEY,
        regions: 'eu,uk',
        markets: 'h2h,totals',
        oddsFormat: 'decimal',
        dateFormat: 'iso',
      },
      timeout: 15000,
    });
    const remaining = resp.headers['x-requests-remaining'];
    if (remaining !== undefined) {
      console.log(`[OddsAPI] ${sportKey} synced — credits remaining: ${remaining}`);
    }
    setCache(cacheKey, resp.data);
    return resp.data;
  } catch (err) {
    if (err.response?.status === 422) {
      // Sport not currently active — not an error
      return [];
    }
    console.error(`[OddsAPI] fetchOddsForKey(${sportKey}) error:`, err.message);
    return null;
  }
}

// ── Convert Odds API event → DB-ready match + odds objects ────────────────────
function parseEvent(event, sportKey, sportCategory) {
  const now = new Date();
  const startTime = new Date(event.commence_time);
  const isLive = startTime <= now && now - startTime < 3 * 60 * 60 * 1000; // within 3 hrs
  const isPast = now - startTime > 3 * 60 * 60 * 1000;

  const status = isPast ? 'FINISHED' : isLive ? 'LIVE' : 'UPCOMING';

  // Pick the bookmaker with the most markets (prefer Pinnacle → Bet365 → first)
  const bookmaker =
    event.bookmakers?.find(b => b.key === 'pinnacle') ||
    event.bookmakers?.find(b => b.key === 'bet365') ||
    event.bookmakers?.[0];

  if (!bookmaker) return null;

  const h2h = bookmaker.markets?.find(m => m.key === 'h2h');
  const totals = bookmaker.markets?.find(m => m.key === 'totals');

  if (!h2h || h2h.outcomes?.length < 2) return null;

  // Sort outcomes: home, away, draw
  const homeOutcome = h2h.outcomes.find(o => o.name === event.home_team);
  const awayOutcome = h2h.outcomes.find(o => o.name === event.away_team);
  const drawOutcome = h2h.outcomes.find(o => o.name === 'Draw');

  if (!homeOutcome || !awayOutcome) return null;

  const matchData = {
    externalId: event.id,
    league: SPORT_TITLE[sportKey] || event.sport_title || sportKey,
    leagueCode: sportKey.toUpperCase().replace(/_/g, '-').slice(0, 20),
    homeTeam: event.home_team,
    awayTeam: event.away_team,
    status,
    startTime,
    sportCategory,
  };

  const oddsData = [];

  if (homeOutcome) {
    oddsData.push({ outcome: 'HOME_WIN', label: 'Home Win', value: homeOutcome.price });
  }
  if (drawOutcome) {
    oddsData.push({ outcome: 'DRAW', label: 'Draw', value: drawOutcome.price });
  }
  if (awayOutcome) {
    oddsData.push({ outcome: 'AWAY_WIN', label: 'Away Win', value: awayOutcome.price });
  }

  // Over/under from totals market
  if (totals) {
    const over = totals.outcomes?.find(o => o.name === 'Over');
    const under = totals.outcomes?.find(o => o.name === 'Under');
    if (over) oddsData.push({ outcome: 'OVER_25', label: 'Over', value: over.price });
    if (under) oddsData.push({ outcome: 'UNDER_25', label: 'Under', value: under.price });
  }

  return { matchData, oddsData };
}

// ── Main sync: fetch from API and upsert into DB ──────────────────────────────
async function syncSportToDb(sportCategory, prisma) {
  if (!API_KEY) {
    console.log(`[OddsAPI] No API key set — skipping sync for ${sportCategory}`);
    return { synced: 0, skipped: 0, noKey: true };
  }

  const sportKeys = SPORT_KEYS[sportCategory] || [];
  if (sportKeys.length === 0) {
    console.log(`[OddsAPI] No sport keys mapped for ${sportCategory}`);
    return { synced: 0, skipped: 0 };
  }

  // Get active sports first (free) to avoid wasting credits on inactive ones
  const activeSports = await getActiveSports();
  const activeKeys = new Set(activeSports.map(s => s.key));

  let synced = 0;
  let skipped = 0;

  for (const sportKey of sportKeys) {
    if (activeKeys.size > 0 && !activeKeys.has(sportKey)) {
      skipped++;
      continue; // sport not active this season
    }

    const events = await fetchOddsForKey(sportKey);
    if (!events || events.length === 0) { skipped++; continue; }

    for (const event of events) {
      const parsed = parseEvent(event, sportKey, sportCategory);
      if (!parsed) continue;

      const { matchData, oddsData } = parsed;

      try {
        // Upsert match by externalId
        const match = await prisma.match.upsert({
          where: { externalId: matchData.externalId },
          update: {
            status: matchData.status,
            homeScore: matchData.homeScore ?? undefined,
            awayScore: matchData.awayScore ?? undefined,
          },
          create: matchData,
        });

        // Upsert odds
        for (const odd of oddsData) {
          await prisma.odd.upsert({
            where: { matchId_outcome: { matchId: match.id, outcome: odd.outcome } },
            update: { value: odd.value, isActive: true },
            create: {
              matchId: match.id,
              outcome: odd.outcome,
              label: odd.label,
              value: odd.value,
              isActive: true,
            },
          });
        }
        synced++;
      } catch (err) {
        console.error(`[OddsAPI] DB upsert error for event ${event.id}:`, err.message);
      }
    }
  }

  markSynced(sportCategory);
  console.log(`[OddsAPI] Sync done for ${sportCategory}: ${synced} matches upserted, ${skipped} skipped`);
  return { synced, skipped };
}

// ── Lobby counts: pulls from active sports list (free, no credits) ─────────────
async function getSportLobbyCounts(prisma) {
  // Get real counts from DB
  const counts = {};
  const categories = Object.keys(SPORT_KEYS).concat(['VIRTUAL', 'ENTERTAINMENT']);

  await Promise.all(
    categories.map(async (cat) => {
      const [live, upcoming] = await Promise.all([
        prisma.match.count({ where: { sportCategory: cat, status: 'LIVE' } }),
        prisma.match.count({ where: { sportCategory: cat, status: 'UPCOMING' } }),
      ]);
      counts[cat] = { live, upcoming };
    })
  );

  return counts;
}

module.exports = {
  syncSportToDb,
  getSportLobbyCounts,
  getActiveSports,
  needsSync,
  SPORT_KEYS,
};
