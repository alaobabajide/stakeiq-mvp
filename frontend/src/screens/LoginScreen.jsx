import { useState } from 'react';
import { useApp } from '../context/AppContext';
import PinInput from '../components/PinInput';
import api from '../api/client';

export default function LoginScreen() {
  const { goTo, login, showToast } = useApp();
  const [phone, setPhone] = useState('');
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!phone || pin.length !== 4) { showToast('Enter phone and 4-digit PIN'); return; }
    setLoading(true);
    try {
      const r = await api.post('/auth/login', { phone, pin });
      login(r.data.token, r.data.user);
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
        <button className="back-btn" onClick={() => goTo('splash')}>←</button>
        <div className="top-bar-title">Log In</div>
      </div>
      <div className="page-pad" style={{ flex: 1 }}>
        <div className="page-title">Welcome back 👋</div>
        <div className="page-sub">Enter your phone and PIN to continue.</div>

        <div className="input-wrap">
          <label className="input-label">Phone Number</label>
          <input className="input-field" type="tel" placeholder="e.g. 08123456789"
            value={phone} onChange={e => setPhone(e.target.value)} />
        </div>

        <PinInput label="Your 4-Digit PIN" value={pin} onChange={setPin} />

        <div style={{ height: 12 }} />
        <button className="btn btn-primary" onClick={submit} disabled={loading}>
          {loading ? 'Logging in...' : 'Log In →'}
        </button>
        <div style={{ textAlign: 'center', marginTop: 16 }}>
          <span style={{ fontSize: 14, color: '#5a6480' }}>Don't have an account? </span>
          <span style={{ fontSize: 14, color: '#F0A500', fontWeight: 700, cursor: 'pointer' }} onClick={() => goTo('register')}>
            Sign up
          </span>
        </div>

        {/* Demo hint */}
        <div style={{ marginTop: 24, background: '#F7F8FC', borderRadius: 12, padding: 14, border: '1px solid #E2E6F0' }}>
          <div style={{ fontSize: 12, color: '#5a6480', textAlign: 'center' }}>
            <strong>Demo account:</strong><br />Phone: 08123456789 · PIN: 1234
          </div>
        </div>
      </div>
    </div>
  );
}
