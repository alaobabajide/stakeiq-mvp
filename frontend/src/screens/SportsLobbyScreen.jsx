import { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import BottomNav from '../components/BottomNav';
import api from '../api/client';

const SPORTS = [
  {
    id: 'FOOTBALL',
    name: 'Football',
    icon: '⚽',
    desc: 'Premier League, La Liga, Serie A & more',
    leagues: '18 leagues',
    color: '#1A7A4A',
    bg: '#d4f0e2',
  },
  {
    id: 'BASKETBALL',
    name: 'Basketball',
    icon: '🏀',
    desc: 'NBA, EuroLeague & international',
    leagues: '8 leagues',
    color: '#E05A1C',
    bg: '#fde8da',
  },
  {
    id: 'TENNIS',
    name: 'Tennis',
    icon: '🎾',
    desc: 'ATP, WTA, Grand Slams',
    leagues: '5 tours',
    color: '#7B2FBE',
    bg: '#ede3f8',
  },
  {
    id: 'BOXING',
    name: 'Boxing / MMA',
    icon: '🥊',
    desc: 'World title fights & UFC events',
    leagues: '2 promotions',
    color: '#C0392B',
    bg: '#fde8e8',
  },
  {
    id: 'CRICKET',
    name: 'Cricket',
    icon: '🏏',
    desc: 'IPL, Test matches, T20 World Cup',
    leagues: '4 leagues',
    color: '#0D6EFD',
    bg: '#ddeeff',
  },
  {
    id: 'NFL',
    name: 'American Football',
    icon: '🏈',
    desc: 'NFL regular season & playoffs',
    leagues: '1 league',
    color: '#0D1B3E',
    bg: '#e0e4f0',
  },
  {
    id: 'ESPORTS',
    name: 'Esports',
    icon: '🎮',
    desc: 'CS2, League of Legends, Dota 2 & more',
    leagues: '12 titles',
    color: '#6C3FF7',
    bg: '#ece8ff',
  },
  {
    id: 'VIRTUAL',
    name: 'Virtual Sports',
    icon: '🤖',
    desc: 'Fast-paced virtual football every 3 mins',
    leagues: '6 sports',
    color: '#F0A500',
    bg: '#fff3d6',
  },
  {
    id: 'POLITICS',
    name: 'Politics',
    icon: '🗳️',
    desc: 'Elections, referendums & political events',
    leagues: '2 markets',
    color: '#1a6eb0',
    bg: '#ddeeff',
  },
  {
    id: 'ENTERTAINMENT',
    name: 'Entertainment',
    icon: '🎬',
    desc: 'Award shows, reality TV & pop culture',
    leagues: '1 market',
    color: '#8A2BE2',
    bg: '#f0e6ff',
  },
];

export default function SportsLobbyScreen() {
  const { goTo, showToast } = useApp();
  const [counts, setCounts] = useState({});

  useEffect(() => {
    api.get('/matches/lobby')
      .then(res => setCounts(res.data.lobby || {}))
      .catch(() => {});
  }, []);

  const handleSportSelect = (sport) => {
    // Navigate to home with sport filter — for now show toast
    showToast(`Loading ${sport.name} markets...`);
    goTo('home');
  };

  return (
    <div className="screen">
      <div className="top-bar">
        <button className="back-btn" onClick={() => goTo('home')}>←</button>
        <div className="top-bar-title">Sports Lobby</div>
      </div>

      {/* Powered by badge */}
      <div style={{ padding: '10px 18px 0' }}>
        <div style={{ background: 'linear-gradient(90deg,#0D1B3E,#1a2a60)', borderRadius: 12, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
          <div style={{ fontSize: 20 }}>⚡</div>
          <div>
            <div style={{ fontFamily: "'Outfit',sans-serif", fontSize: 13, fontWeight: 700, color: '#fff' }}>Powered by Sportradar UOF</div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>Real-time odds from 100+ global sports markets</div>
          </div>
          <div style={{ marginLeft: 'auto', background: '#1A7A4A', borderRadius: 20, padding: '3px 10px' }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#fff', fontFamily: "'Outfit',sans-serif" }}>LIVE</div>
          </div>
        </div>
      </div>

      <div className="scroll-area" style={{ flex: 1, padding: '0 18px 16px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          {SPORTS.map(sport => {
            const c = counts[sport.id] || {};
            const liveCount = c.live ?? 0;
            return (
              <div
                key={sport.id}
                onClick={() => handleSportSelect(sport)}
                style={{
                  background: '#fff',
                  borderRadius: 16,
                  border: '1px solid #E2E6F0',
                  padding: 14,
                  cursor: 'pointer',
                  position: 'relative',
                  overflow: 'hidden',
                  transition: 'transform .15s',
                  active: { transform: 'scale(0.97)' },
                }}
              >
                {/* Live badge */}
                {liveCount > 0 && (
                  <div style={{
                    position: 'absolute', top: 10, right: 10,
                    background: '#C0392B', borderRadius: 20,
                    padding: '2px 8px', display: 'flex', alignItems: 'center', gap: 3
                  }}>
                    <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#fff', animation: 'pulse 1s infinite' }} />
                    <span style={{ fontSize: 9, fontWeight: 800, color: '#fff', fontFamily: "'Outfit',sans-serif" }}>{liveCount} LIVE</span>
                  </div>
                )}

                {/* Icon */}
                <div style={{
                  width: 44, height: 44, borderRadius: 12,
                  background: sport.bg,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 22, marginBottom: 10
                }}>
                  {sport.icon}
                </div>

                <div style={{ fontFamily: "'Outfit',sans-serif", fontSize: 14, fontWeight: 700, color: '#0D1B3E', marginBottom: 3 }}>
                  {sport.name}
                </div>
                <div style={{ fontSize: 11, color: '#8A95B0', marginBottom: 8, lineHeight: 1.3 }}>
                  {sport.desc}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontSize: 10, color: sport.color, fontWeight: 700, fontFamily: "'Outfit',sans-serif" }}>
                    {sport.leagues}
                  </div>
                  {c.upcoming > 0 && (
                    <div style={{ fontSize: 10, color: '#8A95B0' }}>{c.upcoming} upcoming</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div style={{ textAlign: 'center', fontSize: 11, color: '#8A95B0', marginTop: 16, paddingBottom: 8 }}>
          Odds update in real-time via Sportradar Unified Odds Feed
        </div>
      </div>

      <BottomNav active="home" />
    </div>
  );
}
