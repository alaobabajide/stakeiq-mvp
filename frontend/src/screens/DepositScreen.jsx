import { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import api from '../api/client';

const QUICK_AMOUNTS = [500, 1000, 2000, 5000];

export default function DepositScreen() {
  const { goTo, showToast, refreshWallet, user } = useApp();
  const [amount, setAmount] = useState(1000);
  const [provider, setProvider] = useState('OPAY');
  const [methods, setMethods] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isDev, setIsDev] = useState(false);

  useEffect(() => {
    api.get('/wallet/payment-methods').then(r => {
      setMethods(r.data.methods || []);
      // detect sandbox/dev mode
      const opayMethod = r.data.methods?.find(m => m.id === 'OPAY');
      setIsDev(opayMethod?.sandbox || !opayMethod?.available);
    }).catch(() => setIsDev(true));
  }, []);

  const handleDeposit = async () => {
    if (amount < 100) { showToast('Minimum deposit is ₦100'); return; }
    setLoading(true);
    try {
      if (isDev) {
        // Dev mode: direct credit (sandbox/no credentials)
        await api.post('/wallet/deposit/confirm', { amount });
        await refreshWallet();
        showToast(`✅ ₦${amount.toLocaleString()} added to wallet (sandbox mode)`);
        goTo('home');
        return;
      }

      // Production: get payment URL and redirect
      const r = await api.post('/wallet/deposit/initiate', { amount, provider });
      const paymentUrl = r.data.paymentUrl;
      if (!paymentUrl) { showToast('Failed to get payment link'); return; }

      // Open payment page in new tab
      window.open(paymentUrl, '_blank');
      showToast(`Opened ${provider} payment page — complete payment there`);
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
        <div className="top-bar-title">Add Money</div>
      </div>

      <div className="page-pad scroll-area" style={{ flex: 1 }}>

        {isDev && (
          <div style={{ background: '#fff3d6', border: '1px solid #f0c040', borderRadius: 12, padding: 12, marginBottom: 16 }}>
            <div style={{ fontSize: 12, color: '#7a5000', lineHeight: 1.6 }}>
              <strong>🔧 Sandbox mode</strong> — OPay/PalmPay credentials not set. Deposits are simulated instantly.<br />
              Add your API keys to <code>backend/.env</code> to enable live payments.
            </div>
          </div>
        )}

        {/* Amount */}
        <div className="section-title">How much?</div>
        <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
          {QUICK_AMOUNTS.map(a => (
            <div key={a} className={`chip${amount === a ? ' active' : ''}`} onClick={() => setAmount(a)}>
              ₦{a.toLocaleString()}
            </div>
          ))}
        </div>
        <div className="input-wrap">
          <label className="input-label">Amount (₦)</label>
          <input className="input-field" type="number" value={amount}
            onChange={e => setAmount(Math.max(100, parseInt(e.target.value) || 100))}
            style={{ fontSize: 22, fontWeight: 700, textAlign: 'center' }} />
          <div className="input-hint">Minimum deposit: ₦100</div>
        </div>

        {/* Provider */}
        {!isDev && (
          <>
            <div className="section-title" style={{ marginTop: 8 }}>Pay with</div>
            {methods.map(m => (
              <div key={m.id}
                onClick={() => m.available && setProvider(m.id)}
                style={{
                  border: `2px solid ${provider === m.id ? '#F0A500' : '#E2E6F0'}`,
                  background: provider === m.id ? '#fff3d6' : m.available ? '#fff' : '#f7f8fc',
                  borderRadius: 12, padding: 14, marginBottom: 10,
                  display: 'flex', alignItems: 'center', gap: 12,
                  cursor: m.available ? 'pointer' : 'not-allowed',
                  opacity: m.available ? 1 : 0.5,
                }}>
                <div style={{ fontSize: 28 }}>{m.icon}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: "'Outfit',sans-serif", fontSize: 14, fontWeight: 700 }}>{m.name}</div>
                  <div style={{ fontSize: 12, color: '#8A95B0' }}>
                    {m.available ? m.description : 'Not configured'}
                  </div>
                </div>
                <div style={{ fontSize: 18, color: provider === m.id ? '#F0A500' : '#E2E6F0' }}>
                  {provider === m.id ? '✓' : '○'}
                </div>
              </div>
            ))}
          </>
        )}

        {/* Info */}
        <div className="guarantee-badge" style={{ marginTop: 8 }}>
          <div style={{ fontSize: 22 }}>⚡</div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#1A7A4A' }}>Instant Credit</div>
            <div style={{ fontSize: 12, color: '#5a6480' }}>
              {isDev ? 'Funds added instantly in sandbox mode' : 'Wallet credited automatically after payment'}
            </div>
          </div>
        </div>

        <button className="btn btn-primary" style={{ marginBottom: 8, marginTop: 8 }} onClick={handleDeposit} disabled={loading}>
          {loading ? 'Processing...' : isDev
            ? `Add ₦${amount.toLocaleString()} (Sandbox)`
            : `Pay ₦${amount.toLocaleString()} with ${provider}`}
        </button>

        {!isDev && (
          <p style={{ fontSize: 11, color: '#8A95B0', textAlign: 'center' }}>
            You will be redirected to {provider} to complete your payment securely.
          </p>
        )}
      </div>
    </div>
  );
}
