import { useApp } from '../context/AppContext';

export default function OnboardScreen() {
  const { goTo } = useApp();

  return (
    <div className="screen">
      <div style={{ background: 'linear-gradient(135deg,#0D1B3E 0%,#1a3a70 100%)', padding: '32px 28px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
        <div style={{ fontSize: 64, marginBottom: 16 }}>⚽</div>
        <div style={{ fontFamily: "'Outfit',sans-serif", fontSize: 24, fontWeight: 800, color: '#fff', lineHeight: 1.2, marginBottom: 10 }}>
          Bet on football,<br />get paid in minutes
        </div>
        <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.65)', lineHeight: 1.6 }}>
          Place bets on Premier League, La Liga, NPFL and more. Win money sent straight to your phone in under 5 minutes.
        </div>
        <div style={{ display: 'flex', gap: 6, justifyContent: 'center', marginTop: 20 }}>
          <div style={{ width: 20, height: 8, borderRadius: 4, background: '#F0A500' }} />
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'rgba(255,255,255,0.25)' }} />
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'rgba(255,255,255,0.25)' }} />
        </div>
      </div>

      <div className="page-pad" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', flex: 1 }}>
        <div>
          <div className="info-banner">
            <div className="info-banner-icon">💡</div>
            <div className="info-banner-text"><strong>Simple to use:</strong> Even if this is your first time betting online, our app will guide you step by step. No confusion.</div>
          </div>
          <div className="info-banner" style={{ borderColor: '#1A7A4A', background: '#d4f0e2' }}>
            <div className="info-banner-icon">🛡️</div>
            <div className="info-banner-text"><strong>Safe & licensed:</strong> We are registered with the Lagos State Lottery Board. Your money is protected.</div>
          </div>
        </div>
        <div>
          <button className="btn btn-primary" onClick={() => goTo('register')} style={{ marginBottom: 10 }}>
            Create My Account
          </button>
          <button className="btn btn-outline" onClick={() => goTo('home')}>
            Skip for now
          </button>
        </div>
      </div>
    </div>
  );
}
