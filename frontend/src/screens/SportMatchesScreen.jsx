import { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import BottomNav from '../components/BottomNav';
import api from '../api/client';

function MatchCard({ match, betslipItems, onToggle }) {
  const isSelected = (oddId) => betslipItems.some(i => i.oddId === oddId);

  const handleOdd = (odd) => {
    onToggle({
      oddId: odd.id,
      matchId: match.id,
      outcome: odd.outcome,
      label: `${odd.label} — ${match.homeTeam} vs ${match.awayTeam}`,
      oddValue: parseFloat(odd.value),
      matchLabel: `${match.homeTeam} vs ${match.awayTeam}`,
    });
  };

  const homeOdd = match.odds?.find(o => o.outcome === 'HOME_WIN');
  const drawOdd = match.odds?.find(o => o.outcome === 'DRAW');
  const awayOdd = match.odds?.find(o => o.outcome === 'AWAY_WIN');

  return (
    <div style={{ background: '#fff', borderRadius: 14, padding: '14px 16px', marginBottom: 10, border: '1px solid #E2E6F0' }}>
      <div style={{ fontSize: 10, fontWeight: 600, color: '#8A95B0', textTransform: 'uppercase', letterSpacing: .5, marginBottom: 8, fontFamily: "'Outfit',sans-serif" }}>
        {match.status === 'LIVE' ? '🔴 ' : ''}{match.league}
        {match.minute ? ` · ${match.minute}'` : match.startTime ? ` · ${new Date(match.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : ''}
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

const STATUS_TABS = ['ALL', 'LIVE', 'UPCOMING'];

export default function SportMatchesScreen() {
  const { goTo, activeSport, betslipItems, toggleOdd } = useApp();
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusTab, setStatusTab] = useState('ALL');

  const sport = activeSport || { id: 'FOOTBALL', name: 'Football', icon: '⚽', color: '#1A7A4A', bg: '#d4f0e2' };

  useEffect(() => {
    setLoading(true);
    setMatches([]);
    const params = new URLSearchParams({ sport: sport.id });
    if (statusTab !== 'ALL') params.set('status', statusTab);
    api.get(`/matches?${params}`)
      .then(r => setMatches(r.data.matches || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [sport.id, statusTab]);

  const liveMatches = matches.filter(m => m.status === 'LIVE');
  const upcomingMatches = matches.filter(m => m.status === 'UPCOMING');
  const totalOdds = betslipItems.reduce((acc, i) => acc * i.oddValue, 1);
  const estimatedWin = (500 * totalOdds).toFixed(0);

  return (
    <div className="screen">
      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg,#0D1B3E,#1a2a60)', padding: '14px 20px 20px', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
          <button className="back-btn" style={{ background: 'rgba(255,255,255,0.12)', border: 'none', color: '#fff', borderRadius: 10, width: 36, height: 36, fontSize: 18, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            onClick={() => goTo('lobby')}>←</button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: sport.bg || '#F7F8FC', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>
              {sport.icon}
            </div>
            <div>
              <div style={{ fontFamily: "'Outfit',sans-serif", fontSize: 18, fontWeight: 800, color: '#fff' }}>{sport.name}</div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>{matches.length} markets available</div>
            </div>
          </div>
          {liveMatches.length > 0 && (
            <div style={{ background: '#C0392B', borderRadius: 20, padding: '4px 10px', display: 'flex', alignItems: 'center', gap: 4 }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#fff' }} />
              <span style={{ fontSize: 10, fontWeight: 800, color: '#fff', fontFamily: "'Outfit',sans-serif" }}>{liveMatches.length} LIVE</span>
            </div>
          )}
        </div>

        {/* Status tabs */}
        <div style={{ display: 'flex', gap: 6 }}>
          {STATUS_TABS.map(tab => (
            <button key={tab} onClick={() => setStatusTab(tab)}
              style={{
                background: statusTab === tab ? '#F0A500' : 'rgba(255,255,255,0.1)',
                border: 'none', borderRadius: 20, padding: '6px 16px',
                fontSize: 12, fontWeight: 700, color: statusTab === tab ? '#0D1B3E' : 'rgba(255,255,255,0.7)',
                cursor: 'pointer', fontFamily: "'Outfit',sans-serif",
              }}>
              {tab === 'ALL' ? 'All Matches' : tab === 'LIVE' ? '🔴 Live' : '⏰ Upcoming'}
            </button>
          ))}
        </div>
      </div>

      <div className="scroll-area" style={{ flex: 1, padding: '16px 18px' }}>
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[1, 2, 3].map(i => <div key={i} className="skel" style={{ height: 120, borderRadius: 14 }} />)}
          </div>
        ) : matches.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: '#8A95B0' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>{sport.icon}</div>
            <div style={{ fontFamily: "'Outfit',sans-serif", fontSize: 16, fontWeight: 700, color: '#0D1B3E', marginBottom: 6 }}>No {sport.name} matches right now</div>
            <div style={{ fontSize: 13, color: '#8A95B0', marginBottom: 20 }}>Check back soon — markets update in real-time</div>
            <button onClick={() => goTo('lobby')} className="btn btn-primary" style={{ padding: '12px 24px', fontSize: 14 }}>
              Browse Other Sports
            </button>
          </div>
        ) : (
          <>
            {(statusTab === 'ALL' || statusTab === 'LIVE') && liveMatches.length > 0 && (
              <>
                <div className="section-title">Live Now 🔴</div>
                {liveMatches.map(m => <MatchCard key={m.id} match={m} betslipItems={betslipItems} onToggle={toggleOdd} />)}
              </>
            )}
            {(statusTab === 'ALL' || statusTab === 'UPCOMING') && upcomingMatches.length > 0 && (
              <>
                <div className="section-title" style={{ marginTop: liveMatches.length > 0 ? 8 : 0 }}>Upcoming ⏰</div>
                {upcomingMatches.map(m => <MatchCard key={m.id} match={m} betslipItems={betslipItems} onToggle={toggleOdd} />)}
              </>
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

      <BottomNav active="lobby" />
    </div>
  );
}
