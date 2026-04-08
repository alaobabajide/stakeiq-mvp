import { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import BottomNav from '../components/BottomNav';
import api from '../api/client';

const AVATAR_COLORS = ['#1a3a70', '#1a7a4a', '#6a1a9a', '#c0392b', '#e67e22'];

export default function TipstersScreen() {
  const { goTo, showToast } = useApp();
  const [tipsters, setTipsters] = useState([]);
  const [filter, setFilter] = useState('All');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/tipsters${filter === 'Free' ? '?filter=free' : filter === 'Premium' ? '?filter=premium' : ''}`)
      .then(r => setTipsters(r.data.tipsters || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [filter]);

  const initials = (name) => name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  return (
    <div className="screen">
      <div className="top-bar">
        <button className="back-btn" onClick={() => goTo('home')}>←</button>
        <div className="top-bar-title">Top Tipsters</div>
      </div>

      <div className="page-pad scroll-area" style={{ flex: 1 }}>
        <div className="page-sub">Follow Nigeria's best tipsters. See their real win records before you subscribe.</div>

        <div className="scrollx" style={{ marginBottom: 16 }}>
          {['All', 'Free Tips', 'Premium', 'Football'].map(f => (
            <div key={f} className={`chip${filter === f ? ' active' : ''}`} onClick={() => setFilter(f)}>{f}</div>
          ))}
        </div>

        {loading ? (
          [1, 2, 3].map(i => <div key={i} className="skel" style={{ height: 80, borderRadius: 14, marginBottom: 10 }} />)
        ) : tipsters.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 40, color: '#8A95B0' }}>No tipsters found</div>
        ) : (
          tipsters.map((t, idx) => (
            <div key={t.id}
              onClick={() => showToast(`Opening ${t.displayName} profile...`)}
              style={{ background: '#fff', borderRadius: 14, padding: 14, marginBottom: 10, border: '1px solid #E2E6F0', display: 'flex', gap: 12, alignItems: 'flex-start', cursor: 'pointer' }}>
              <div style={{
                width: 46, height: 46, borderRadius: '50%',
                background: AVATAR_COLORS[idx % AVATAR_COLORS.length],
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: "'Outfit',sans-serif", fontSize: 16, fontWeight: 800, color: '#fff', flexShrink: 0
              }}>{initials(t.displayName)}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: "'Outfit',sans-serif", fontSize: 14, fontWeight: 700, color: '#1a1f36' }}>{t.displayName}</div>
                <div style={{ fontSize: 12, color: '#8A95B0', marginTop: 2 }}>
                  BSR: <span style={{ color: '#F0A500', fontWeight: 700 }}>{t.bsrScore}</span>
                  {' · '}<span style={{ color: '#1A7A4A', fontWeight: 700 }}>{t.winRate}% Win Rate</span>
                  {' · '}{t.totalTips} tips
                </div>
                <div style={{ fontSize: 11, color: t.isFree ? '#1A7A4A' : '#8A95B0', marginTop: 3 }}>
                  {t.isFree ? 'Free tips' : `₦${t.subscriptionPrice.toLocaleString()}/month`}
                  {' · '}{t.subscriberCount.toLocaleString()} {t.isFree ? 'followers' : 'subscribers'}
                </div>
              </div>
              <div style={{
                background: t.bsrLevel === 'GOLD' ? '#0D1B3E' : 'rgba(13,27,62,0.1)',
                color: t.bsrLevel === 'GOLD' ? '#F0A500' : '#0D1B3E',
                fontFamily: "'Outfit',sans-serif", fontSize: 11, fontWeight: 800,
                padding: '3px 8px', borderRadius: 20, flexShrink: 0
              }}>{t.bsrLevel}</div>
            </div>
          ))
        )}

        <div style={{ background: '#0D1B3E', borderRadius: 14, padding: 16, marginTop: 8 }}>
          <div style={{ fontFamily: "'Outfit',sans-serif", fontSize: 14, fontWeight: 700, color: '#fff', marginBottom: 6 }}>🎯 Are you a tipster?</div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', marginBottom: 12, lineHeight: 1.6 }}>
            Earn money from your predictions. Build your verified BSR record and start charging subscriptions.
          </div>
          <button className="btn btn-sm btn-primary" onClick={() => showToast('Tipster application coming soon!')}>
            Apply to Become a Tipster
          </button>
        </div>

        <div style={{ height: 16 }} />
      </div>

      <BottomNav active="tipsters" />
    </div>
  );
}
