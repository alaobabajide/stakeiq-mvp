import { useState } from 'react';
import { useApp } from '../context/AppContext';
import PinInput from '../components/PinInput';
import api from '../api/client';

const STATES = ['Lagos','Abuja (FCT)','Kano','Rivers','Oyo','Anambra','Enugu','Delta','Other'];

export default function RegisterScreen() {
  const { goTo, login, showToast } = useApp();
  const [form, setForm] = useState({ fullName: '', phone: '', dateOfBirth: '', state: '', pin: '' });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const validate = () => {
    const e = {};
    if (!form.fullName.trim()) e.fullName = 'Name is required';
    if (!form.phone.match(/^0\d{10}$|^\+234\d{10}$/)) e.phone = 'Valid Nigerian number required';
    if (!form.dateOfBirth) e.dateOfBirth = 'Date of birth required';
    if (!form.state) e.state = 'State required';
    if (form.pin.length !== 4) e.pin = 'PIN must be 4 digits';
    setErrors(e);
    return !Object.keys(e).length;
  };

  const submit = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      const r = await api.post('/auth/register', {
        fullName: form.fullName,
        phone: form.phone,
        dateOfBirth: form.dateOfBirth,
        state: form.state,
        pin: form.pin
      });
      login(r.data.token, r.data.user);
      goTo('kyc1');
    } catch (e) {
      showToast(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="screen">
      <div className="top-bar">
        <button className="back-btn" onClick={() => goTo('onboard')}>←</button>
        <div className="top-bar-title">Create Account</div>
      </div>

      <div className="page-pad scroll-area" style={{ flex: 1 }}>
        <div className="page-title">Welcome! 👋</div>
        <div className="page-sub">Fill in your details below. It only takes 2 minutes.</div>

        <div className="input-wrap">
          <label className="input-label">Your Full Name</label>
          <input className={`input-field${errors.fullName ? ' error' : ''}`} placeholder="e.g. Chukwuemeka Okafor"
            value={form.fullName} onChange={e => set('fullName', e.target.value)} />
          {errors.fullName && <div className="input-hint" style={{ color: '#C0392B' }}>{errors.fullName}</div>}
          <div className="input-hint">Enter your name exactly as it appears on your ID card</div>
        </div>

        <div className="input-wrap">
          <label className="input-label">Phone Number</label>
          <div style={{ display: 'flex', gap: 8 }}>
            <input className="input-field" style={{ width: 80 }} value="+234" readOnly />
            <input className={`input-field${errors.phone ? ' error' : ''}`} type="tel" placeholder="0812 345 6789"
              style={{ flex: 1 }} value={form.phone} onChange={e => set('phone', e.target.value)} />
          </div>
          {errors.phone && <div className="input-hint" style={{ color: '#C0392B' }}>{errors.phone}</div>}
          <div className="input-hint">Your OPay or PalmPay number so we can pay you fast</div>
        </div>

        <div className="input-wrap">
          <label className="input-label">Date of Birth</label>
          <input className={`input-field${errors.dateOfBirth ? ' error' : ''}`} type="date"
            value={form.dateOfBirth} onChange={e => set('dateOfBirth', e.target.value)} />
          {errors.dateOfBirth && <div className="input-hint" style={{ color: '#C0392B' }}>{errors.dateOfBirth}</div>}
          <div className="input-hint">You must be 18 or older to use StakeIQ</div>
        </div>

        <div className="input-wrap">
          <label className="input-label">State</label>
          <select className={`input-field${errors.state ? ' error' : ''}`} value={form.state} onChange={e => set('state', e.target.value)}>
            <option value="">Choose your state...</option>
            {STATES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          {errors.state && <div className="input-hint" style={{ color: '#C0392B' }}>{errors.state}</div>}
        </div>

        <PinInput label="Create a 4-Digit PIN" value={form.pin} onChange={v => set('pin', v)} />
        {errors.pin && <div className="input-hint" style={{ color: '#C0392B', marginTop: -10, marginBottom: 10 }}>{errors.pin}</div>}
        <div className="input-hint" style={{ marginBottom: 16 }}>Remember this PIN — you will use it every time you log in</div>

        <div style={{ background: '#fff3d6', borderRadius: 12, padding: '12px 14px', marginBottom: 18, border: '1px solid #f0c040' }}>
          <div style={{ fontSize: 12, color: '#0D1B3E', lineHeight: 1.6 }}>
            <strong>⚠️ Age verification:</strong> You must be 18 or older. We will check your BVN and ID card to confirm. This is required by Nigerian law.
          </div>
        </div>

        <button className="btn btn-primary" style={{ marginBottom: 10 }} onClick={submit} disabled={loading}>
          {loading ? 'Creating account...' : 'Continue to Verify My Identity →'}
        </button>
        <p style={{ fontSize: 11, color: '#8A95B0', textAlign: 'center', lineHeight: 1.5, paddingBottom: 20 }}>
          By continuing you agree to our Terms of Use and confirm you are 18+. Need help? Call 0800-STAKEIQ.
        </p>
      </div>
    </div>
  );
}
