import { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import BottomNav from '../components/BottomNav';
import api from '../api/client';

const BSR_LEVEL_COLOR = { BRONZE: '#cd7f32', SILVER: '#C0C0C0', GOLD: '#F0A500', PLATINUM: '#e5e4e2' };

function MatchCard({ match, betslipItems, onToggle }) {
  const isSelected = (oddId) => betslipItems.some(i => i.oddId === oddId);

  const handleOdd = (odd) => {
    onToggle({
      oddId: odd.id,
      matchId: match.id,
      outcome: odd.outcome,
      label: `${odd.label} — ${match.homeTeam} vs ${match.awayTeam}`,
      oddValue: parseFloat(odd.value),
      matchLabel: `${match.homeTeam} vs ${match.awayTeam}`
    });
  };

  const homeOdd = match.odds?.find(o => o.outcome === 'HOME_WIN');
  const drawOdd = match.odds?.find(o => o.outcome === 'DRAW');
  const awayOdd = match.odds?.find(o => o.outcome === 'AWAY_WIN');

  return (
    <div style={{ background: '#fff', borderRadius: 14, padding: '14px 16px', marginBottom: 10, border: '1px solid #E2E6F0' }}>
      <div style={{ fontSize: 10, fontWeight: 600, color: '#8A95B0', textTransform: 'uppercase', letterSpacing: .5, marginBottom: 8, fontFamily: "'Outfit',sans-serif" }}>
        {match.status === 'LIVE' ? '🔴 ' : ''}{match.league}{match.minute ? ` · ${match.minute}'` : match.startTime ? ` · ${new Date(match.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : ''}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <div style={{ fontFamily: "'Outfit',sans-serif", fontSize: 14, fontWeight: 700, color: '#1a1f36', flex: 1 }}>{match.homeTeam}</div>
        <div style={{
          background: match.status === 'LIVE' ? '#C0392B' : '#0D1B3E',
          color: '#fff', borderRadius: 8, padding: '5px 10px',
          fontFamily: "'Outfit',sans-serif", fontSize: 12, fontWeight: 700, textAlign: 'center', minWidth: 52
        }}>
          {match.homeScore !== null && match.awayScore !== null ? `${match.homeScore} - ${match.awayScore}` : 'vs'}
        </div>
        <div style={{ fontFamily: "'Outfit',sans-serif", fontSize: 14, fontWeight: 700, color: '#1a1f36', flex: 1, textAlign: 'right' }}>{match.awayTeam}</div>
      </div>
      <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
        {[
          { odd: homeOdd, fallback: `${match.homeTeam} Win` },
          { odd: drawOdd, fallback: 'Draw' },
          { odd: awayOdd, fallback: `${match.awayTeam} Win` },
        ].map(({ odd, fallback }) => odd ? (
          <div key={odd.id}
            onClick={() => handleOdd(odd)}
            style={{
              flex: 1, padding: '9px 6px', borderRadius: 9, textAlign: 'center', cursor: 'pointer',
              background: isSelected(odd.id) ? '#0D1B3E' : '#F7F8FC',
              border: `1.5px solid ${isSelected(odd.id) ? '#0D1B3E' : '#E2E6F0'}`,
              transition: 'all .15s'
            }}>
            <div style={{ fontSize: 9, color: isSelected(odd.id) ? 'rgba(255,255,255,0.6)' : '#8A95B0', textTransform: 'uppercase', fontWeight: 600 }}>{odd.label || fallback}</div>
            <div style={{ fontSize: 14, fontWeight: 800, color: isSelected(odd.id) ? '#F0A500' : '#1a1f36', fontFamily: "'Outfit',sans-serif" }}>{parseFloat(odd.value).toFixed(2)}</div>
          </div>
        ) : null)}
      </div>
    </div>
  );
}

export default function HomeScreen() {
  const { goTo, user, showToast, betslipItems, toggleOdd, wallet, refreshWallet } = useApp();
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('Football');
  const [bsr, setBsr] = useState(null);

  useEffect(() => {
    refreshWallet();
    api.get('/matches').then(r => setMatches(r.data.matches || [])).catch(() => {}).finally(() => setLoading(false));
    api.get('/stats/me').then(r => setBsr(r.data.bsr)).catch(() => {});
  }, []);

  const liveMatches = matches.filter(m => m.status === 'LIVE');
  const upcomingMatches = matches.filter(m => m.status === 'UPCOMING');
  const totalOdds = betslipItems.reduce((acc, i) => acc * i.oddValue, 1);
  const estimatedWin = (500 * totalOdds).toFixed(0);

  return (
    <div className="screen">
      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg,#0D1B3E,#1a2a60)', padding: '20px 20px 28px', flexShrink: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', marginBottom: 2, fontFamily: "'Outfit',sans-serif" }}>Good afternoon 🌤</div>
            <div style={{ fontFamily: "'Outfit',sans-serif", fontSize: 20, fontWeight: 800, color: '#fff' }}>{user?.fullName?.split(' ')[0] || 'Bettor'}</div>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.1)', borderRadius: '50%', width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, cursor: 'pointer' }}
            onClick={() => showToast('🔔 No new notifications')}>🔔</div>
        </div>
        {bsr && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12, background: 'rgba(255,255,255,0.1)', borderRadius: 12, padding: '10px 14px', border: '1px solid rgba(255,255,255,0.12)' }}>
            <div>
              <div style={{ fontFamily: "'Outfit',sans-serif", fontSize: 28, fontWeight: 800, color: '#F0A500' }}>{bsr.score}</div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>Your Bettor Skill Rating</div>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', marginBottom: 4 }}>{bsr.level} Level</div>
              <div style={{ height: 4, background: 'rgba(255,255,255,0.15)', borderRadius: 2, overflow: 'hidden' }}>
                <div style={{ width: `${bsr.score}%`, height: '100%', background: '#F0A500', borderRadius: 2 }} />
              </div>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', marginTop: 3 }}>
                {bsr.level === 'SILVER' ? `${75 - bsr.score} more points → Gold` : `${bsr.score}/100`}
              </div>
            </div>
            <div style={{ background: '#F0A500', color: '#0D1B3E', fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 20, fontFamily: "'Outfit',sans-serif" }}>{bsr.level}</div>
          </div>
        )}
      </div>

      {/* Sports Lobby + Tipsters Banners */}
      <div style={{ padding: '12px 20px 0', flexShrink: 0, display: 'flex', gap: 10 }}>
        <div onClick={() => goTo('lobby')}
          style={{ flex: 1, background: 'linear-gradient(90deg,#F0A500,#FFD700)', borderRadius: 14, padding: '12px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', boxShadow: '0 4px 12px rgba(240,165,0,0.3)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ fontSize: 20 }}>🏟️</div>
            <div>
              <div style={{ fontFamily: "'Outfit',sans-serif", fontSize: 13, fontWeight: 800, color: '#0D1B3E' }}>Sports Lobby</div>
              <div style={{ fontSize: 10, color: 'rgba(13,27,62,0.6)' }}>10 sports</div>
            </div>
          </div>
          <div style={{ fontSize: 18, color: '#0D1B3E', fontWeight: 800 }}>›</div>
        </div>
        <div onClick={() => goTo('tipsters')}
          style={{ flex: 1, background: 'linear-gradient(90deg,#2D1B69,#4A2C99)', borderRadius: 14, padding: '12px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', boxShadow: '0 4px 12px rgba(45,27,105,0.35)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ fontSize: 20 }}>⭐</div>
            <div>
              <div style={{ fontFamily: "'Outfit',sans-serif", fontSize: 13, fontWeight: 800, color: '#fff' }}>Tipsters</div>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.6)' }}>Top picks</div>
            </div>
          </div>
          <div style={{ fontSize: 18, color: '#F0A500', fontWeight: 800 }}>›</div>
        </div>
      </div>

      {/* Wallet */}
      <div style={{ display: 'flex', gap: 10, padding: '0 20px', marginTop: 0, flexShrink: 0 }}>
        <div style={{ flex: 1, background: '#fff', borderRadius: 14, padding: 14, boxShadow: '0 4px 20px rgba(13,27,62,0.12)' }}>
          <div style={{ fontSize: 11, color: '#8A95B0', fontFamily: "'Outfit',sans-serif", fontWeight: 600, textTransform: 'uppercase', letterSpacing: .5 }}>Balance</div>
          <div style={{ fontFamily: "'Outfit',sans-serif", fontSize: 20, fontWeight: 800, color: '#1a1f36', marginTop: 3 }}>
            ₦{parseFloat(wallet?.balance || 0).toLocaleString()}
          </div>
          <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
            <button style={{ background: '#F0A500', color: '#0D1B3E', border: 'none', borderRadius: 8, fontSize: 11, fontWeight: 700, padding: '5px 10px', cursor: 'pointer', fontFamily: "'Outfit',sans-serif" }}
              onClick={() => goTo('deposit')}>Deposit</button>
            <button style={{ background: '#0D1B3E', color: '#fff', border: 'none', borderRadius: 8, fontSize: 11, fontWeight: 700, padding: '5px 10px', cursor: 'pointer', fontFamily: "'Outfit',sans-serif" }}
              onClick={() => goTo('withdraw')}>Withdraw</button>
          </div>
        </div>
        <div style={{ flex: 1, background: '#fff', borderRadius: 14, padding: 14, boxShadow: '0 4px 20px rgba(13,27,62,0.12)' }}>
          <div style={{ fontSize: 11, color: '#8A95B0', fontFamily: "'Outfit',sans-serif", fontWeight: 600, textTransform: 'uppercase', letterSpacing: .5 }}>Today's P&L</div>
          <div style={{ fontFamily: "'Outfit',sans-serif", fontSize: 20, fontWeight: 800, color: '#1A7A4A', marginTop: 3 }}>
            +₦{parseFloat(wallet?.totalWon || 0).toLocaleString()}
          </div>
          <button style={{ background: '#0D1B3E', color: '#fff', border: 'none', borderRadius: 8, fontSize: 11, fontWeight: 700, padding: '5px 10px', marginTop: 8, cursor: 'pointer', fontFamily: "'Outfit',sans-serif" }}
            onClick={() => goTo('spend')}>View Stats</button>
        </div>
      </div>

      {/* Matches */}
      <div className="scroll-area" style={{ flex: 1, padding: '16px 18px' }}>
        <div className="scrollx" style={{ marginBottom: 16 }}>
          {['⚽ Football', '🔴 Live Now', '🏆 Champions Lg', '🇳🇬 NPFL', '🏀 Basketball'].map(c => (
            <div key={c} className={`chip${filter === c ? ' active' : ''}`} onClick={() => setFilter(c)}>{c}</div>
          ))}
        </div>

        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[1, 2, 3].map(i => <div key={i} className="skel" style={{ height: 120, borderRadius: 14 }} />)}
          </div>
        ) : (
          <>
            {liveMatches.length > 0 && (
              <>
                <div className="section-title">Live Matches 🔴 <span onClick={() => showToast('Loading more matches...')}>See all →</span></div>
                {liveMatches.map(m => <MatchCard key={m.id} match={m} betslipItems={betslipItems} onToggle={toggleOdd} />)}
              </>
            )}
            {upcomingMatches.length > 0 && (
              <>
                <div className="section-title" style={{ marginTop: 8 }}>Upcoming <span onClick={() => showToast('Loading upcoming...')}>See all →</span></div>
                {upcomingMatches.map(m => <MatchCard key={m.id} match={m} betslipItems={betslipItems} onToggle={toggleOdd} />)}
              </>
            )}
            {matches.length === 0 && (
              <div style={{ textAlign: 'center', padding: 40, color: '#8A95B0' }}>No matches available</div>
            )}
          </>
        )}
        <div style={{ height: 12 }} />
      </div>

      {/* Betslip bar */}
      {betslipItems.length > 0 && (
        <div style={{ background: '#0D1B3E', padding: '12px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', flexShrink: 0 }}
          onClick={() => goTo('betslip')}>
          <div style={{ background: '#F0A500', color: '#0D1B3E', width: 22, height: 22, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, fontFamily: "'Outfit',sans-serif" }}>
            {betslipItems.length}
          </div>
          <div style={{ color: '#fff', fontFamily: "'Outfit',sans-serif", fontSize: 14, fontWeight: 700, marginLeft: 8, flex: 1 }}>View Betslip</div>
          <div style={{ color: '#F0A500', fontFamily: "'Outfit',sans-serif", fontSize: 15, fontWeight: 800 }}>
            ₦500 → ₦{parseInt(estimatedWin).toLocaleString()}
          </div>
        </div>
      )}

      <BottomNav active="home" />
    </div>
  );
}
