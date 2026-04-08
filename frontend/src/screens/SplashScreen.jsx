import { useApp } from '../context/AppContext';

export default function SplashScreen() {
  const { goTo } = useApp();

  return (
    <div className="screen" style={{ background: 'linear-gradient(160deg,#0D1B3E 0%,#1a2a60 100%)', alignItems: 'center', justifyContent: 'center', padding: '40px 28px' }}>
      <div style={{ fontFamily: "'Outfit',sans-serif", fontSize: 42, fontWeight: 800, color: '#fff', letterSpacing: -1, marginBottom: 6 }}>
        Stake<span style={{ color: '#F0A500' }}>IQ</span>
      </div>
      <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 14, marginBottom: 48, textAlign: 'center' }}>
        Bet smarter. Win more. Lose less.
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, width: '100%', marginBottom: 40 }}>
        {[
          { val: '60M+', lbl: 'Daily bettors' },
          { val: '5 min', lbl: 'Payout guarantee' },
          { val: 'BSR', lbl: 'Track your skill' },
          { val: 'Free', lbl: 'Tipster tips' },
        ].map(s => (
          <div key={s.lbl} style={{ background: 'rgba(255,255,255,0.08)', borderRadius: 12, padding: 14, textAlign: 'center', border: '1px solid rgba(255,255,255,0.1)' }}>
            <div style={{ fontFamily: "'Outfit',sans-serif", fontSize: 22, fontWeight: 800, color: '#F0A500' }}>{s.val}</div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)', marginTop: 2 }}>{s.lbl}</div>
          </div>
        ))}
      </div>

      <button className="btn btn-primary" onClick={() => goTo('onboard')} style={{ marginBottom: 12, width: '100%' }}>
        Get Started — It's Free
      </button>
      <button className="btn btn-ghost" style={{ color: 'rgba(255,255,255,0.5)', width: '100%' }} onClick={() => goTo('login')}>
        I already have an account
      </button>
    </div>
  );
}
