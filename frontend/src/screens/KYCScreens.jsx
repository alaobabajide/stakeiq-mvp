import { useState } from 'react';
import { useApp } from '../context/AppContext';
import api from '../api/client';

// ── KYC Step Progress Bar ────────────────────────────────────────
function KycProgress({ step, total }) {
  return (
    <div className="progress-wrap" style={{ flexShrink: 0 }}>
      <div className="progress-label">Step {step} of {total}</div>
      <div className="progress-track">
        <div className="progress-fill" style={{ width: `${(step / total) * 100}%` }} />
      </div>
    </div>
  );
}

function KycSteps({ current }) {
  const steps = [
    { label: 'BVN', key: 1 }, { label: 'ID Card', key: 2 },
    { label: 'Selfie', key: 3 }, { label: 'Address', key: 4 }, { label: 'Done', key: 5 }
  ];
  return (
    <div style={{ display: 'flex', gap: 0, margin: '16px 0 20px' }}>
      {steps.map((s, i) => {
        const isDone = s.key < current;
        const isActive = s.key === current;
        return (
          <div key={s.key} style={{ flex: 1, textAlign: 'center', position: 'relative' }}>
            {i < steps.length - 1 && (
              <div style={{ position: 'absolute', top: 14, left: '60%', width: '80%', height: 2, background: isDone ? '#1A7A4A' : '#E2E6F0' }} />
            )}
            <div style={{
              width: 28, height: 28, borderRadius: '50%', margin: '0 auto 4px',
              background: isDone ? '#1A7A4A' : isActive ? '#0D1B3E' : '#E2E6F0',
              color: isDone || isActive ? '#fff' : '#8A95B0',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 11, fontWeight: 700, fontFamily: "'Outfit',sans-serif",
              position: 'relative', zIndex: 1
            }}>
              {isDone ? '✓' : s.key}
            </div>
            <div style={{ fontSize: 10, color: isActive ? '#0D1B3E' : '#8A95B0', fontWeight: isActive ? 700 : 400 }}>{s.label}</div>
          </div>
        );
      })}
    </div>
  );
}

// ── KYC 1: Intro ─────────────────────────────────────────────────
export function KYC1Screen() {
  const { goTo } = useApp();
  return (
    <div className="screen">
      <div className="top-bar">
        <button className="back-btn" onClick={() => goTo('register')}>←</button>
        <div className="top-bar-title">Verify Your Identity</div>
      </div>
      <KycProgress step={1} total={5} />
      <div className="page-pad scroll-area" style={{ flex: 1 }}>
        <KycSteps current={1} />
        <div style={{ textAlign: 'center', padding: '24px 0 20px' }}>
          <div style={{ fontSize: 64, marginBottom: 14 }}>🔐</div>
          <div className="page-title" style={{ textAlign: 'center', marginBottom: 8 }}>Why do we need this?</div>
          <div className="page-sub" style={{ textAlign: 'center' }}>
            Nigerian law requires us to confirm who you are before you can deposit or withdraw money. This keeps your money safe.
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
          {[
            { icon: '🪪', text: 'Government ID card or NIN slip' },
            { icon: '📱', text: 'Your BVN number (11 digits)' },
            { icon: '🤳', text: 'A selfie photo of your face' },
          ].map(i => (
            <div key={i.text} style={{ display: 'flex', gap: 12, alignItems: 'center', background: '#F7F8FC', borderRadius: 12, padding: 12 }}>
              <div style={{ fontSize: 22 }}>{i.icon}</div>
              <div style={{ fontSize: 13, color: '#5a6480' }}>{i.text}</div>
            </div>
          ))}
        </div>
        <button className="btn btn-primary" onClick={() => goTo('kyc2')}>I'm Ready → Start Verification →</button>
        <p style={{ fontSize: 11, color: '#8A95B0', textAlign: 'center', marginTop: 10 }}>
          Verification takes about 3 minutes. Your data is encrypted and protected.
        </p>
      </div>
    </div>
  );
}

// ── KYC 2: BVN ───────────────────────────────────────────────────
export function KYC2Screen() {
  const { goTo, showToast } = useApp();
  const [bvn, setBvn] = useState('');
  const [idType, setIdType] = useState('');
  const [idNumber, setIdNumber] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (bvn.length !== 11) { showToast('BVN must be 11 digits'); return; }
    if (!idType) { showToast('Select your ID type'); return; }
    if (!idNumber.trim()) { showToast('Enter your ID number'); return; }
    setLoading(true);
    try {
      await api.post('/kyc/bvn', { bvn, idType, idNumber });
      goTo('kyc3');
    } catch (e) {
      showToast(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="screen">
      <div className="top-bar">
        <button className="back-btn" onClick={() => goTo('kyc1')}>←</button>
        <div className="top-bar-title">BVN Verification</div>
      </div>
      <KycProgress step={2} total={5} />
      <div className="page-pad scroll-area" style={{ flex: 1 }}>
        <KycSteps current={2} />
        <div className="page-title">Enter Your BVN</div>
        <div className="page-sub">Your Bank Verification Number is 11 digits. Dial *565*0# on your phone to find it for free.</div>
        <div className="info-banner">
          <div className="info-banner-icon">💡</div>
          <div className="info-banner-text">To get your BVN: dial <strong>*565*0#</strong> on any phone. It will show 11 numbers. Enter those below.</div>
        </div>
        <div className="input-wrap">
          <label className="input-label">BVN Number (11 digits)</label>
          <input className="input-field" type="tel" placeholder="e.g. 22345678901" maxLength={11}
            style={{ fontSize: 20, letterSpacing: 2, textAlign: 'center' }}
            value={bvn} onChange={e => setBvn(e.target.value.replace(/\D/, '').slice(0, 11))} />
          <div className="input-hint">Your BVN is safe — we only use it to confirm your name and age</div>
        </div>
        <div className="input-wrap">
          <label className="input-label">Type of ID You Have</label>
          <select className="input-field" value={idType} onChange={e => setIdType(e.target.value)}>
            <option value="">Choose one...</option>
            <option value="NIN">National ID Card (NIN)</option>
            <option value="PVC">Voter's Card (PVC)</option>
            <option value="PASSPORT">International Passport</option>
            <option value="DRIVERS_LICENSE">Driver's Licence</option>
          </select>
        </div>
        <div className="input-wrap">
          <label className="input-label">ID Number</label>
          <input className="input-field" placeholder="Enter your ID number"
            value={idNumber} onChange={e => setIdNumber(e.target.value)} />
        </div>
        <div style={{ background: '#F7F8FC', borderRadius: 12, padding: 14, marginBottom: 20, border: '1px solid #E2E6F0' }}>
          <div style={{ fontSize: 12, color: '#5a6480', lineHeight: 1.7 }}>
            🔒 <strong>Your BVN is safe with us.</strong><br />
            We only use it to verify your name, age, and bank account. We cannot access your bank account or move any money using your BVN alone.
          </div>
        </div>
        <button className="btn btn-primary" onClick={submit} disabled={loading}>
          {loading ? 'Saving...' : 'Continue → Upload ID Photo →'}
        </button>
      </div>
    </div>
  );
}

// ── KYC 3: ID Upload ─────────────────────────────────────────────
export function KYC3Screen() {
  const { goTo, showToast } = useApp();
  const [frontTaken, setFrontTaken] = useState(false);
  const [backTaken, setBackTaken] = useState(false);

  return (
    <div className="screen">
      <div className="top-bar">
        <button className="back-btn" onClick={() => goTo('kyc2')}>←</button>
        <div className="top-bar-title">Upload Your ID Card</div>
      </div>
      <KycProgress step={3} total={5} />
      <div className="page-pad scroll-area" style={{ flex: 1 }}>
        <KycSteps current={3} />
        <div className="page-title">Photo of Your ID Card</div>
        <div className="page-sub">Take a clear photo of the front of your ID. Make sure all words are visible.</div>

        {[
          { taken: frontTaken, setTaken: setFrontTaken, label: 'Take Photo — Front of ID', icon: '📷' },
          { taken: backTaken, setTaken: setBackTaken, label: 'Take Photo — Back of ID', icon: '📷' },
        ].map((box, idx) => (
          <div key={idx} onClick={() => { box.setTaken(true); showToast('Photo captured ✓'); }}
            style={{
              border: box.taken ? '2.5px solid #1A7A4A' : '2.5px dashed #E2E6F0',
              background: box.taken ? '#d4f0e2' : '#F7F8FC',
              borderRadius: 16, padding: '28px 20px', textAlign: 'center',
              cursor: 'pointer', marginBottom: 12, transition: 'all .2s'
            }}>
            <div style={{ fontSize: 40, marginBottom: 10 }}>{box.taken ? '✅' : box.icon}</div>
            <div style={{ fontFamily: "'Outfit',sans-serif", fontSize: 14, fontWeight: 700, color: box.taken ? '#1A7A4A' : '#0D1B3E', marginBottom: 4 }}>
              {box.taken ? 'Photo taken ✓ looks good!' : box.label}
            </div>
            <div style={{ fontSize: 12, color: '#8A95B0' }}>Tap here to open your camera</div>
          </div>
        ))}

        <div style={{ background: '#F7F8FC', borderRadius: 12, padding: '12px 14px', marginBottom: 16, border: '1px solid #E2E6F0' }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#0D1B3E', marginBottom: 8 }}>📸 Tips for a good photo:</div>
          <div style={{ fontSize: 12, color: '#5a6480', lineHeight: 1.9 }}>
            ✓ Hold the card flat on a dark surface<br />
            ✓ Make sure all four corners are visible<br />
            ✓ All writing should be sharp and clear<br />
            ✗ Do not cover any part of the ID
          </div>
        </div>

        <button className="btn btn-primary" onClick={() => goTo('kyc4')}>
          Continue → Take Selfie →
        </button>
      </div>
    </div>
  );
}

// ── KYC 4: Selfie + Address ───────────────────────────────────────
export function KYC4Screen() {
  const { goTo, showToast } = useApp();
  const [selfieTaken, setSelfieTaken] = useState(false);
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('Lagos');
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!selfieTaken) { showToast('Please take your selfie first'); return; }
    if (!address.trim() || !city.trim()) { showToast('Please enter your address'); return; }
    setLoading(true);
    try {
      await api.post('/kyc/submit', { address, city, kycState: state });
      goTo('kyc5');
    } catch (e) {
      showToast(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="screen">
      <div className="top-bar">
        <button className="back-btn" onClick={() => goTo('kyc3')}>←</button>
        <div className="top-bar-title">Selfie & Address</div>
      </div>
      <KycProgress step={4} total={5} />
      <div className="page-pad scroll-area" style={{ flex: 1 }}>
        <KycSteps current={4} />
        <div className="page-title">Your Selfie</div>
        <div className="page-sub">Take a clear photo of your face. Look straight at the camera. No sunglasses or hats.</div>

        <div onClick={() => { setSelfieTaken(true); showToast('Selfie captured ✓'); }}
          style={{
            border: selfieTaken ? '2.5px solid #1A7A4A' : '2.5px dashed #E2E6F0',
            background: selfieTaken ? '#d4f0e2' : '#F7F8FC',
            borderRadius: 16, padding: '28px 20px', textAlign: 'center',
            cursor: 'pointer', marginBottom: 16
          }}>
          <div style={{ fontSize: 40, marginBottom: 10 }}>{selfieTaken ? '✅' : '🤳'}</div>
          <div style={{ fontFamily: "'Outfit',sans-serif", fontSize: 14, fontWeight: 700, color: selfieTaken ? '#1A7A4A' : '#0D1B3E', marginBottom: 4 }}>
            {selfieTaken ? 'Selfie taken ✓ looks good!' : 'Take Selfie Now'}
          </div>
          <div style={{ fontSize: 12, color: '#8A95B0' }}>We will match your face to your ID card</div>
        </div>

        <div className="page-title" style={{ fontSize: 17, marginBottom: 4 }}>Your Address</div>
        <div className="page-sub" style={{ marginBottom: 12 }}>We need this for our records. It helps us protect your account.</div>

        <div className="input-wrap">
          <label className="input-label">Street Address</label>
          <input className="input-field" placeholder="e.g. 12 Broad Street, Lagos Island"
            value={address} onChange={e => setAddress(e.target.value)} />
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <div className="input-wrap" style={{ flex: 1 }}>
            <label className="input-label">City</label>
            <input className="input-field" placeholder="e.g. Lagos" value={city} onChange={e => setCity(e.target.value)} />
          </div>
          <div className="input-wrap" style={{ flex: 1 }}>
            <label className="input-label">State</label>
            <select className="input-field" value={state} onChange={e => setState(e.target.value)}>
              <option>Lagos</option><option>Abuja</option><option>Kano</option><option>Other</option>
            </select>
          </div>
        </div>

        <div style={{ background: '#fff3d6', borderRadius: 12, padding: 12, marginBottom: 18, border: '1px solid #f0c040' }}>
          <div style={{ fontSize: 12, color: '#7a5000', lineHeight: 1.6 }}>
            ⚠️ <strong>Important:</strong> The name and date of birth in your selfie must match your ID card exactly.
          </div>
        </div>

        <button className="btn btn-primary" onClick={submit} disabled={loading} style={{ marginBottom: 20 }}>
          {loading ? 'Submitting...' : 'Submit for Verification →'}
        </button>
      </div>
    </div>
  );
}

// ── KYC 5: Success / Processing ───────────────────────────────────
export function KYC5Screen() {
  const { goTo, user } = useApp();
  const [done, setDone] = useState(false);

  // Simulate verification delay
  useState(() => {
    const t = setTimeout(() => setDone(true), 3200);
    return () => clearTimeout(t);
  });

  if (!done) {
    return (
      <div className="screen" style={{ justifyContent: 'center', alignItems: 'center', padding: 40 }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: 56, height: 56, borderRadius: '50%', border: '4px solid #E2E6F0', borderTopColor: '#F0A500', animation: 'spin 1s linear infinite', margin: '0 auto 16px' }} />
          <div style={{ fontFamily: "'Outfit',sans-serif", fontSize: 16, fontWeight: 700, color: '#0D1B3E' }}>Checking your details...</div>
          <div style={{ fontSize: 13, color: '#8A95B0', marginTop: 6 }}>This usually takes 10–30 seconds</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 20, maxWidth: 280 }}>
            {['Checking BVN...', 'Matching ID card...', 'Face verification...', 'Age confirmation...'].map(s => (
              <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#5a6480' }}>
                <div className="skel" style={{ width: 16, height: 16, borderRadius: '50%', flexShrink: 0 }} />
                {s}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="screen" style={{ justifyContent: 'center', alignItems: 'center', padding: 40 }}>
      <div style={{ textAlign: 'center', animation: 'popIn .4s ease' }}>
        <div style={{ width: 80, height: 80, background: '#d4f0e2', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 40, margin: '0 auto 20px' }}>✅</div>
        <div className="page-title" style={{ textAlign: 'center', color: '#1A7A4A', marginBottom: 8 }}>Verified! 🎉</div>
        <div className="page-sub" style={{ textAlign: 'center', marginBottom: 24 }}>
          Your identity has been confirmed. You can now deposit money and withdraw your winnings instantly.
        </div>
        <div style={{ background: '#d4f0e2', borderRadius: 14, padding: 16, marginBottom: 24, textAlign: 'left' }}>
          <div style={{ fontSize: 13, color: '#1A7A4A', fontWeight: 700, marginBottom: 8 }}>✓ Verification Complete</div>
          <div style={{ fontSize: 12, color: '#5a6480', lineHeight: 1.8 }}>
            ✓ BVN confirmed<br />✓ ID card matches<br />✓ Face matches ID<br />✓ Age: 18+ confirmed<br />
            ✓ Instant withdrawals: <strong>Unlocked</strong>
          </div>
        </div>
        <button className="btn btn-primary" onClick={() => goTo('home')}>
          Start Betting → Go to Home →
        </button>
      </div>
    </div>
  );
}
