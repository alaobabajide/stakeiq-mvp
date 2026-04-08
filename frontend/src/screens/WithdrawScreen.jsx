import { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import BottomNav from '../components/BottomNav';
import PinInput from '../components/PinInput';
import api from '../api/client';

const METHODS = [
  { id: 'OPAY', name: 'OPay', sub: 'Fastest — instant', icon: '📱' },
  { id: 'PALMPAY', name: 'PalmPay', sub: 'Under 2 minutes', icon: '💚' },
  { id: 'BANK_TRANSFER', name: 'Bank Transfer', sub: '5-10 minutes', icon: '🏦' },
];
const QUICK_AMOUNTS = [500, 1000, 2000];

export default function WithdrawScreen() {
  const { goTo, showToast, wallet, refreshWallet } = useApp();
  const [amount, setAmount] = useState(1000);
  const [method, setMethod] = useState('OPAY');
  const [accountNumber, setAccountNumber] = useState('');
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => { refreshWallet(); }, []);

  const balance = parseFloat(wallet?.balance || 0);

  const submit = async () => {
    if (!accountNumber.trim()) { showToast('Enter account number'); return; }
    if (pin.length !== 4) { showToast('Enter your 4-digit PIN'); return; }
    if (amount < 500) { showToast('Minimum withdrawal is ₦500'); return; }
    if (amount > balance) { showToast('Insufficient balance'); return; }
    setLoading(true);
    try {
      await api.post('/withdraw/request', { amount, method, accountNumber, pin });
      refreshWallet();
      showToast(`✅ ₦${amount.toLocaleString()} sent to ${method}! Arriving in under 5 minutes 🚀`);
      setPin('');
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
        <div className="top-bar-title">Withdraw Money</div>
      </div>

      <div className="page-pad scroll-area" style={{ flex: 1 }}>
        <div className="guarantee-badge">
          <div style={{ fontSize: 24 }}>⚡</div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#1A7A4A' }}>5-Minute Guarantee</div>
            <div style={{ fontSize: 12, color: '#5a6480' }}>Money in your account in 5 minutes or we give you a ₦500 bonus</div>
          </div>
        </div>

        <div style={{ background: '#0D1B3E', borderRadius: 14, padding: 14, marginBottom: 16 }}>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginBottom: 2 }}>Available to Withdraw</div>
          <div style={{ fontFamily: "'Outfit',sans-serif", fontSize: 32, fontWeight: 800, color: '#fff' }}>₦{balance.toLocaleString()}</div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>Minimum withdrawal: ₦500</div>
        </div>

        <div className="section-title">How much?</div>
        <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
          {[...QUICK_AMOUNTS, balance].map((a, i) => (
            <div key={i} className={`chip${amount === a ? ' active' : ''}`} onClick={() => setAmount(a)}>
              {i === QUICK_AMOUNTS.length ? 'All' : `₦${a.toLocaleString()}`}
            </div>
          ))}
        </div>
        <div className="input-wrap">
          <label className="input-label">Amount (₦)</label>
          <input className="input-field" type="number" value={amount}
            onChange={e => setAmount(Math.max(500, parseInt(e.target.value) || 500))}
            style={{ fontSize: 22, fontWeight: 700, textAlign: 'center' }} />
        </div>

        <div className="section-title" style={{ marginTop: 4 }}>Send to</div>
        {METHODS.map(m => (
          <div key={m.id}
            onClick={() => setMethod(m.id)}
            style={{
              background: '#fff', border: `2px solid ${method === m.id ? '#F0A500' : '#E2E6F0'}`,
              background: method === m.id ? '#fff3d6' : '#fff',
              borderRadius: 12, padding: 14, marginBottom: 10,
              display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer'
            }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: '#F7F8FC', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>{m.icon}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: "'Outfit',sans-serif", fontSize: 14, fontWeight: 700 }}>{m.name}</div>
              <div style={{ fontSize: 12, color: '#8A95B0' }}>{m.sub}</div>
            </div>
            <div style={{ fontSize: 18, color: method === m.id ? '#F0A500' : '#E2E6F0' }}>{method === m.id ? '✓' : '○'}</div>
          </div>
        ))}

        <div className="input-wrap" style={{ marginTop: 8 }}>
          <label className="input-label">Account Number / Phone</label>
          <input className="input-field" type="tel" placeholder="e.g. 0812 345 6789"
            value={accountNumber} onChange={e => setAccountNumber(e.target.value)} />
        </div>

        <div style={{ background: '#F7F8FC', borderRadius: 12, padding: 12, marginBottom: 16, border: '1px solid #E2E6F0' }}>
          <PinInput label="🔐 Enter your PIN to confirm withdrawal" value={pin} onChange={setPin} />
        </div>

        <button className="btn btn-green" onClick={submit} disabled={loading} style={{ marginBottom: 8 }}>
          {loading ? 'Processing...' : `Withdraw ₦${amount.toLocaleString()} to ${method} ⚡`}
        </button>
        <p style={{ fontSize: 11, color: '#8A95B0', textAlign: 'center', marginBottom: 20 }}>
          If your money doesn't arrive in 5 minutes, you will automatically receive a ₦500 bonus.
        </p>
      </div>

      <BottomNav active="withdraw" />
    </div>
  );
}
