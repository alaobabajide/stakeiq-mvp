import { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import BottomNav from '../components/BottomNav';
import api from '../api/client';

export default function SpendScreen() {
  const { goTo, showToast, stats, refreshStats } = useApp();
  const [loading, setLoading] = useState(!stats);
  const [localStats, setLocalStats] = useState(stats);
  const [newLimit, setNewLimit] = useState('');

  useEffect(() => {
    refreshStats();
    api.get('/stats/me').then(r => { setLocalStats(r.data); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  const s = localStats?.spending || {};
  const bsr = localStats?.bsr || {};

  const handleLimitUpdate = async () => {
    if (!newLimit || parseFloat(newLimit) < 1000) { showToast('Minimum limit is ₦1,000'); return; }
    try {
      await api.put('/stats/spending-limit', { monthlyLimit: parseFloat(newLimit) });
      showToast('Budget limit updated ✓');
      setNewLimit('');
      api.get('/stats/me').then(r => setLocalStats(r.data)).catch(() => {});
    } catch (e) {
      showToast(e.message);
    }
  };

  const handleBreak = async (days) => {
    try {
      await api.post('/stats/self-exclusion', { days });
      showToast(`Account paused for ${days} days ✓`);
    } catch (e) {
      showToast(e.message);
    }
  };

  if (loading) return (
    <div className="screen" style={{ justifyContent: 'center', alignItems: 'center' }}>
      <div style={{ width: 40, height: 40, borderRadius: '50%', border: '4px solid #E2E6F0', borderTopColor: '#F0A500', animation: 'spin 1s linear infinite' }} />
    </div>
  );

  const budgetPct = s.budgetUsedPct || 0;

  return (
    <div className="screen">
      <div className="top-bar">
        <button className="back-btn" onClick={() => goTo('home')}>←</button>
        <div className="top-bar-title">My Stats & Spending</div>
      </div>

      <div className="page-pad scroll-area" style={{ flex: 1 }}>
        {/* Spend card */}
        <div style={{ background: '#0D1B3E', borderRadius: 16, padding: 18, marginBottom: 14 }}>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', fontFamily: "'Outfit',sans-serif", textTransform: 'uppercase', letterSpacing: .5 }}>This Month — Total Spent</div>
          <div style={{ fontFamily: "'Outfit',sans-serif", fontSize: 32, fontWeight: 800, color: '#fff', margin: '4px 0' }}>₦{(s.thisMonth || 0).toLocaleString()}</div>
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>
            Monthly budget: ₦{(s.monthlyLimit || 0).toLocaleString()} · ₦{(s.budgetRemaining || 0).toLocaleString()} remaining
          </div>
          <div style={{ marginTop: 10, height: 6, background: 'rgba(255,255,255,0.15)', borderRadius: 3, overflow: 'hidden' }}>
            <div style={{ width: `${budgetPct}%`, height: '100%', background: budgetPct > 80 ? '#C0392B' : '#F0A500', borderRadius: 3 }} />
          </div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 4 }}>{budgetPct}% of monthly budget used</div>
        </div>

        {/* Traffic lights */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
          {[
            { bg: '#d4f0e2', dot: '🟢', label: 'Won', val: s.won || 0, color: '#1A7A4A' },
            { bg: '#fff3cd', dot: '🟡', label: 'Spent', val: s.thisMonth || 0, color: '#9a6e00' },
            { bg: '#fdecea', dot: '🔴', label: 'Net', val: s.net || 0, color: '#C0392B', prefix: (s.net || 0) < 0 ? '-' : '+' },
          ].map(t => (
            <div key={t.label} style={{ flex: 1, padding: '10px 8px', borderRadius: 10, background: t.bg, textAlign: 'center' }}>
              <div style={{ fontSize: 20, marginBottom: 4 }}>{t.dot}</div>
              <div style={{ fontSize: 10, fontWeight: 600, fontFamily: "'Outfit',sans-serif", textTransform: 'uppercase', color: t.color }}>{t.label}</div>
              <div style={{ fontFamily: "'Outfit',sans-serif", fontSize: 16, fontWeight: 800, color: t.color, marginTop: 2 }}>
                {t.prefix}₦{Math.abs(t.val).toLocaleString()}
              </div>
            </div>
          ))}
        </div>

        {/* BSR Progress */}
        <div style={{ background: '#F7F8FC', borderRadius: 14, padding: 14, marginBottom: 14, border: '1px solid #E2E6F0' }}>
          <div className="section-title" style={{ marginBottom: 10 }}>Your BSR Progress</div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
            <div style={{ fontSize: 13, color: '#5a6480' }}>Current BSR Score</div>
            <div style={{ fontFamily: "'Outfit',sans-serif", fontSize: 16, fontWeight: 800, color: '#0D1B3E' }}>{bsr.score} / 100</div>
          </div>
          <div style={{ height: 8, background: '#E2E6F0', borderRadius: 4, overflow: 'hidden', marginBottom: 8 }}>
            <div style={{ width: `${bsr.score}%`, height: '100%', background: 'linear-gradient(90deg,#0D1B3E,#F0A500)', borderRadius: 4 }} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <div style={{ background: '#fff', borderRadius: 10, padding: 10, border: '1px solid #E2E6F0' }}>
              <div style={{ fontSize: 11, color: '#8A95B0', fontFamily: "'Outfit',sans-serif" }}>Win Rate</div>
              <div style={{ fontFamily: "'Outfit',sans-serif", fontSize: 17, fontWeight: 800, color: '#1A7A4A' }}>{bsr.winRate}%</div>
            </div>
            <div style={{ background: '#fff', borderRadius: 10, padding: 10, border: '1px solid #E2E6F0' }}>
              <div style={{ fontSize: 11, color: '#8A95B0', fontFamily: "'Outfit',sans-serif" }}>Bets This Month</div>
              <div style={{ fontFamily: "'Outfit',sans-serif", fontSize: 17, fontWeight: 800, color: '#0D1B3E' }}>{bsr.monthlyBets}</div>
            </div>
          </div>
        </div>

        {/* Budget Alert */}
        {budgetPct >= 70 && (
          <div style={{ background: '#fff3d6', borderRadius: 14, padding: 14, border: '1px solid #f0c040', marginBottom: 14 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#0D1B3E', marginBottom: 6 }}>⚠️ Budget Alert</div>
            <div style={{ fontSize: 12, color: '#5a6480', lineHeight: 1.6 }}>
              You have used {budgetPct}% of your monthly budget. You have ₦{(s.budgetRemaining || 0).toLocaleString()} left. Would you like to set a lower limit?
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
              <input className="input-field" type="number" placeholder="New limit e.g. 10000"
                style={{ flex: 1, padding: '8px 12px', fontSize: 14 }}
                value={newLimit} onChange={e => setNewLimit(e.target.value)} />
              <button className="btn btn-sm btn-outline" style={{ padding: '8px 14px', fontSize: 12, whiteSpace: 'nowrap' }}
                onClick={handleLimitUpdate}>Update</button>
            </div>
          </div>
        )}

        {/* Self exclusion */}
        <div style={{ background: '#fdecea', borderRadius: 14, padding: 14, border: '1px solid #f5c6c2', marginBottom: 20 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#C0392B', marginBottom: 6 }}>🔴 Need a Break?</div>
          <div style={{ fontSize: 12, color: '#5a6480', lineHeight: 1.6 }}>
            If betting is becoming too much, you can pause your account for 7, 30, or 90 days. This is free and easy to do.
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
            {[7, 30, 90].map(d => (
              <button key={d} className="btn btn-sm btn-red" style={{ flex: 1, fontSize: 12, padding: '8px 6px' }}
                onClick={() => handleBreak(d)}>{d} days</button>
            ))}
          </div>
        </div>
      </div>

      <BottomNav active="spend" />
    </div>
  );
}
