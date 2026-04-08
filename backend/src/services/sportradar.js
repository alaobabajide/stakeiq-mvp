/**
 * Sportradar Unified Odds Feed (UOF) Integration
 * Docs: https://developer.sportradar.com/
 *
 * In sandbox/dev mode this returns mock data.
 * Set SPORTRADAR_API_KEY in env to enable live feed.
 */

const axios = require('axios');

const BASE_URL = process.env.SPORTRADAR_BASE_URL || 'https://api.sportradar.com/oddscomparison-prematch/production/v2/en';
const API_KEY = process.env.SPORTRADAR_API_KEY;

const SPORT_MAP = {
  FOOTBALL: 'sr:sport:1',
  BASKETBALL: 'sr:sport:2',
  TENNIS: 'sr:sport:5',
  BOXING: 'sr:sport:9',
  CRICKET: 'sr:sport:21',
  NFL: 'sr:sport:16',
  ESPORTS: 'sr:sport:109',
};

async function getLiveMatches(sport = 'FOOTBALL') {
  if (!API_KEY) return getMockMatches(sport);
  try {
    const sportId = SPORT_MAP[sport] || SPORT_MAP.FOOTBALL;
    const resp = await axios.get(`${BASE_URL}/schedules/live/schedule.json`, {
      params: { api_key: API_KEY },
      timeout: 8000,
    });
    return resp.data;
  } catch (err) {
    console.error('[Sportradar] getLiveMatches error:', err.message);
    return getMockMatches(sport);
  }
}

async function getMatchOdds(matchId) {
  if (!API_KEY) return getMockOdds(matchId);
  try {
    const resp = await axios.get(`${BASE_URL}/sport_events/${matchId}/odds_summary.json`, {
      params: { api_key: API_KEY },
      timeout: 8000,
    });
    return resp.data;
  } catch (err) {
    console.error('[Sportradar] getMatchOdds error:', err.message);
    return getMockOdds(matchId);
  }
}

async function getUpcomingMatches(sport = 'FOOTBALL', days = 3) {
  if (!API_KEY) return getMockMatches(sport);
  try {
    const now = new Date();
    const end = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
    const startStr = now.toISOString().slice(0, 10);
    const endStr = end.toISOString().slice(0, 10);
    const resp = await axios.get(`${BASE_URL}/schedules/${startStr}/schedule.json`, {
      params: { api_key: API_KEY },
      timeout: 8000,
    });
    return resp.data;
  } catch (err) {
    console.error('[Sportradar] getUpcomingMatches error:', err.message);
    return getMockMatches(sport);
  }
}

// ── Mock data for sandbox / no API key ────────────────────────────────────────
function getMockMatches(sport) {
  const templates = {
    FOOTBALL: [
      { home: 'Arsenal', away: 'Chelsea', league: 'Premier League', leagueCode: 'EPL' },
      { home: 'Real Madrid', away: 'Barcelona', league: 'La Liga', leagueCode: 'LIGA' },
      { home: 'Bayern Munich', away: 'Dortmund', league: 'Bundesliga', leagueCode: 'BL' },
    ],
    BASKETBALL: [
      { home: 'LA Lakers', away: 'Golden State Warriors', league: 'NBA', leagueCode: 'NBA' },
      { home: 'Chicago Bulls', away: 'Miami Heat', league: 'NBA', leagueCode: 'NBA' },
    ],
    TENNIS: [
      { home: 'Djokovic N.', away: 'Alcaraz C.', league: 'ATP Masters', leagueCode: 'ATP' },
    ],
    NFL: [
      { home: 'Kansas City Chiefs', away: 'San Francisco 49ers', league: 'NFL', leagueCode: 'NFL' },
    ],
  };

  const matches = (templates[sport] || templates.FOOTBALL).map((m, i) => ({
    id: `mock-${sport.toLowerCase()}-${i}`,
    homeTeam: m.home,
    awayTeam: m.away,
    league: m.league,
    leagueCode: m.leagueCode,
    sportCategory: sport,
    status: i === 0 ? 'LIVE' : 'UPCOMING',
    startTime: new Date(Date.now() + i * 3600000).toISOString(),
    odds: {
      homeWin: +(1.5 + Math.random()).toFixed(2),
      draw: +(3.0 + Math.random()).toFixed(2),
      awayWin: +(2.0 + Math.random()).toFixed(2),
    },
  }));

  return { matches, source: 'mock' };
}

function getMockOdds(matchId) {
  return {
    matchId,
    odds: {
      homeWin: +(1.5 + Math.random()).toFixed(2),
      draw: +(3.2 + Math.random()).toFixed(2),
      awayWin: +(2.1 + Math.random()).toFixed(2),
      over25: +(1.8 + Math.random() * 0.5).toFixed(2),
      under25: +(1.9 + Math.random() * 0.5).toFixed(2),
    },
    source: 'mock',
  };
}

// ── Sports lobby counts (live match counts per category) ──────────────────────
async function getSportLobbyCounts() {
  // In production these would come from Sportradar UOF real-time feed
  // For now returns plausible mock values
  return {
    FOOTBALL: { live: 12, upcoming: 48, leagues: 18 },
    BASKETBALL: { live: 6, upcoming: 22, leagues: 8 },
    TENNIS: { live: 4, upcoming: 16, leagues: 5 },
    BOXING: { live: 1, upcoming: 4, leagues: 2 },
    CRICKET: { live: 3, upcoming: 10, leagues: 4 },
    NFL: { live: 0, upcoming: 8, leagues: 1 },
    ESPORTS: { live: 8, upcoming: 30, leagues: 12 },
    VIRTUAL: { live: 24, upcoming: 0, leagues: 6 },
    POLITICS: { live: 0, upcoming: 5, leagues: 2 },
    ENTERTAINMENT: { live: 0, upcoming: 3, leagues: 1 },
  };
}

module.exports = { getLiveMatches, getMatchOdds, getUpcomingMatches, getSportLobbyCounts };
