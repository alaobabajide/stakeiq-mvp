import { useState } from 'react';
import { useApp } from '../context/AppContext';
import api from '../api/client';

const QUICK_STAKES = [100, 200, 500, 1000];

export default function BetslipScreen() {
  const { goTo, showToast, betslipItems, toggleOdd, clearBetslip, refreshWallet, user } = useApp();
  const [stake, setStake] = useState(500);
  const [loading, setLoading] = useState(false);

  const totalOdds = betslipItems.reduce((acc, i) => acc * i.oddValue, 1);
  const potentialWin = (stake * totalOdds).toFixed(2);

  const placeBet = async () => {
    if (!user) { showToast('Please log in first'); return; }
    if (user.kycStatus !== 'APPROVED') { showToast('Complete KYC to place bets'); return; }
    if (betslipItems.length === 0) { showToast('Add at least one selection'); return; }
    if (stake < 50) { showToast('Minimum stake is ₦50'); return; }
    setLoading(true);
    try {
      await api.post('/betslip/place', {
        items: betslipItems.map(i => ({ oddId: i.oddId })),
        stake
      });
      clearBetslip();
      refreshWallet();
      showToast('🎉 Bet placed! Good luck!');
      goTo('home');
    } catch (e) {
      showToast(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="screen">
      <div className="top-bar">
        <button className="back-btn" onClick={() => goTo('home')}>←</button>
        <div className="top-bar-title">My Betslip</div>
      </div>

      <div className="page-pad scroll-area" style={{ flex: 1 }}>
        {betslipItems.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: '#8A95B0' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🎯</div>
            <div style={{ fontFamily: "'Outfit',sans-serif", fontSize: 16, fontWeight: 700, marginBottom: 8 }}>No selections yet</div>
            <div style={{ fontSize: 14 }}>Go back to matches and tap the odds you want to bet on.</div>
            <button className="btn btn-primary" style={{ marginTop: 24 }} onClick={() => goTo('home')}>Browse Matches</button>
          </div>
        ) : (
          <>
            {betslipItems.map((item) => (
              <div key={item.oddId} style={{ background: '#F7F8FC', borderRadius: 14, padding: 14, marginBottom: 12, border: '1px solid #E2E6F0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                  <div>
                    <div style={{ fontSize: 11, color: '#8A95B0', fontFamily: "'Outfit',sans-serif" }}>{item.matchLabel}</div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#1a1f36', marginTop: 2 }}>{item.label.split('—')[0].trim()}</div>
                  </div>
                  <div style={{ color: '#C0392B', fontSize: 18, cursor: 'pointer' }}
                    onClick={() => { toggleOdd(item); showToast('Removed from betslip'); }}>✕</div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontSize: 13, color: '#5a6480' }}>{item.outcome.replace('_', ' ')}</div>
                  <div style={{ fontFamily: "'Outfit',sans-serif", fontSize: 16, fontWeight: 800, color: '#0D1B3E' }}>{item.oddValue.toFixed(2)}</div>
                </div>
              </div>
            ))}

            {/* Stake calculator */}
            <div style={{ background: '#0D1B3E', borderRadius: 16, padding: 16, marginBottom: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)' }}>Total Odds</div>
                <div style={{ fontFamily: "'Outfit',sans-serif", fontSize: 16, fontWeight: 800, color: '#F0A500' }}>{totalOdds.toFixed(2)}</div>
              </div>
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', marginBottom: 8 }}>Stake Amount</div>
              <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                {QUICK_STAKES.map(s => (
                  <div key={s} onClick={() => setStake(s)} style={{
                    background: stake === s ? '#F0A500' : 'rgba(255,255,255,0.08)',
                    borderRadius: 10, padding: '8px 12px', fontSize: 13,
                    color: stake === s ? '#0D1B3E' : '#fff', fontWeight: stake === s ? 700 : 400,
                    fontFamily: "'Outfit',sans-serif", cursor: 'pointer', flex: 1, textAlign: 'center'
                  }}>₦{s >= 1000 ? `${s / 1000}K` : s}</div>
                ))}
              </div>
              <input
                className="input-field" type="number" value={stake}
                onChange={e => setStake(Math.max(50, parseInt(e.target.value) || 50))}
                style={{ background: 'rgba(255,255,255,0.08)', borderColor: 'rgba(255,255,255,0.15)', color: '#fff', fontSize: 18, textAlign: 'center' }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 12, background: 'rgba(255,255,255,0.06)', borderRadius: 10, padding: 10 }}>
                <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)' }}>Possible Win</div>
                <div style={{ fontFamily: "'Outfit',sans-serif", fontSize: 17, fontWeight: 800, color: '#F0A500' }}>₦{parseFloat(potentialWin).toLocaleString()}</div>
              </div>
            </div>

            <div className="guarantee-badge">
              <div style={{ fontSize: 22 }}>⚡</div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#1A7A4A' }}>Instant Payout Guarantee</div>
                <div style={{ fontSize: 12, color: '#5a6480' }}>If you win, money arrives in under 5 minutes</div>
              </div>
            </div>

            <button className="btn btn-primary" style={{ marginBottom: 8 }} onClick={placeBet} disabled={loading}>
              {loading ? 'Placing bet...' : `Place Bet — ₦${stake.toLocaleString()}`}
            </button>
            <button className="btn btn-ghost" onClick={() => goTo('home')}>Back to Matches</button>
          </>
        )}
      </div>
    </div>
  );
}
