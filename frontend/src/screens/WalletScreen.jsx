import { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import BottomNav from '../components/BottomNav';
import PinInput from '../components/PinInput';
import api from '../api/client';

const ELECTRICITY_DISCOS = [
  { id: 'IKEDC', label: 'Ikeja Electric (IKEDC) — Lagos' },
  { id: 'AEDC', label: 'AEDC — Abuja' },
  { id: 'EKEDC', label: 'EKEDC — Eko, Lagos' },
  { id: 'IBEDC', label: 'IBEDC — Ibadan' },
  { id: 'PHED', label: 'PHED — Port Harcourt' },
  { id: 'EEDC', label: 'EEDC — Enugu' },
  { id: 'YEDC', label: 'JED — Jos' },
  { id: 'KAEDCO', label: 'KAEDCO — Kano' },
  { id: 'KEDCO', label: 'KEDCO — Kaduna' },
  { id: 'BEDC', label: 'BEDC — Benin' },
];

const CABLE_PLANS = {
  DSTV: [
    { code: 'dstv-padi', label: 'DSTV Padi', price: 2500 },
    { code: 'dstv-yanga', label: 'DSTV Yanga', price: 3500 },
    { code: 'dstv-confam', label: 'DSTV Confam', price: 6200 },
    { code: 'dstv-compact', label: 'DSTV Compact', price: 15700 },
    { code: 'dstv-compactplus', label: 'DSTV Compact Plus', price: 24850 },
    { code: 'dstv-premium', label: 'DSTV Premium', price: 37000 },
  ],
  GOTV: [
    { code: 'gotv-smallie', label: 'GOtv Smallie', price: 1575 },
    { code: 'gotv-jinja', label: 'GOtv Jinja', price: 2715 },
    { code: 'gotv-jolli', label: 'GOtv Jolli', price: 4115 },
    { code: 'gotv-max', label: 'GOtv Max', price: 6400 },
  ],
  STARTIMES: [
    { code: 'nova', label: 'Nova', price: 900 },
    { code: 'basic', label: 'Basic', price: 1850 },
    { code: 'smart', label: 'Smart', price: 2600 },
    { code: 'classic', label: 'Classic', price: 3100 },
  ],
};

function Tab({ tabs, active, onChange }) {
  return (
    <div style={{ display: 'flex', gap: 0, background: '#F7F8FC', borderRadius: 10, padding: 3, marginBottom: 14 }}>
      {tabs.map(t => (
        <button key={t.id} onClick={() => onChange(t.id)}
          style={{
            flex: 1, padding: '7px 4px', border: 'none', borderRadius: 8,
            background: active === t.id ? '#fff' : 'transparent',
            fontSize: 12, fontWeight: 700, color: active === t.id ? '#0D1B3E' : '#8A95B0',
            cursor: 'pointer', boxShadow: active === t.id ? '0 1px 4px rgba(0,0,0,.08)' : 'none',
            fontFamily: "'Outfit',sans-serif",
          }}>
          {t.label}
        </button>
      ))}
    </div>
  );
}

function BillItem({ icon, label, onClick }) {
  return (
    <div onClick={onClick} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, cursor: 'pointer', padding: '8px 4px', borderRadius: 10, background: '#F7F8FC', border: '1.5px solid #E2E6F0', transition: 'all .12s' }}>
      <div style={{ fontSize: 20 }}>{icon}</div>
      <div style={{ fontSize: 9, fontWeight: 700, color: '#5a6480', textAlign: 'center', lineHeight: 1.2 }}>{label}</div>
    </div>
  );
}

// ── Bill Payment Sheet ────────────────────────────────────────────────────────
function BillSheet({ type, onClose, onSuccess, wallet }) {
  const { showToast } = useApp();
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState('form'); // form | confirm | success
  const [result, setResult] = useState(null);

  // Airtime state
  const [network, setNetwork] = useState('MTN');
  const [phone, setPhone] = useState('');
  const [amount, setAmount] = useState(500);

  // Electricity state
  const [disco, setDisco] = useState('IKEDC');
  const [meter, setMeter] = useState('');
  const [meterType, setMeterType] = useState('prepaid');
  const [elecAmount, setElecAmount] = useState(3500);
  const [customerName, setCustomerName] = useState('');
  const [verifying, setVerifying] = useState(false);

  // Cable state
  const [cableProvider, setCableProvider] = useState('DSTV');
  const [smartcard, setSmartcard] = useState('');
  const [cablePlan, setCablePlan] = useState(CABLE_PLANS.DSTV[2]);

  const CASHBACK = { ELECTRICITY: 0.01, CABLE_TV: 0.015, AIRTIME: 0.005, DATA: 0.005 };
  const getCategory = () => type === 'electricity' ? 'ELECTRICITY' : type === 'cable' ? 'CABLE_TV' : 'AIRTIME';
  const getAmount = () => type === 'airtime' || type === 'data' ? amount : type === 'electricity' ? elecAmount : cablePlan?.price || 0;
  const cashback = parseFloat((getAmount() * (CASHBACK[getCategory()] || 0)).toFixed(2));
  const bsrPoints = Math.floor(getAmount() / 1000) * 2;

  const verifyMeter = async () => {
    if (!meter) return;
    setVerifying(true);
    try {
      const r = await api.post('/bills/verify-meter', { disco, meterNumber: meter });
      setCustomerName(r.data.name);
    } catch (e) {
      setCustomerName('');
    } finally { setVerifying(false); }
  };

  const submit = async () => {
    if (pin.length !== 4) { showToast('Enter your 4-digit PIN'); return; }
    const bal = parseFloat(wallet?.balance || 0);
    if (bal < getAmount()) { showToast('Insufficient balance'); return; }
    setLoading(true);
    try {
      let res;
      if (type === 'airtime') {
        if (!phone) { showToast('Enter phone number'); return; }
        res = await api.post('/bills/airtime', { network, phone, amount });
      } else if (type === 'electricity') {
        if (!meter) { showToast('Enter meter number'); return; }
        res = await api.post('/bills/electricity', { disco, meterNumber: meter, meterType, amount: elecAmount, phone });
      } else if (type === 'cable') {
        if (!smartcard) { showToast('Enter smartcard number'); return; }
        res = await api.post('/bills/cable', { provider: cableProvider, smartcard, variationCode: cablePlan.code, amount: cablePlan.price, phone });
      }
      setResult(res.data);
      setStep('success');
      onSuccess(res.data);
    } catch (e) {
      showToast(e.response?.data?.error || e.message);
    } finally { setLoading(false); }
  };

  return (
    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: '#fff', zIndex: 30, overflowY: 'auto', borderRadius: 40 }}>
      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg,#0D1B3E,#1a2a60)', padding: '14px 18px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
          <button onClick={onClose} style={{ width: 34, height: 34, borderRadius: '50%', background: 'rgba(255,255,255,.12)', border: 'none', color: '#fff', fontSize: 18, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>←</button>
          <div style={{ fontSize: 16, fontWeight: 800, color: '#fff', fontFamily: "'Outfit',sans-serif" }}>
            {type === 'airtime' ? '📱 Buy Airtime' : type === 'data' ? '📶 Buy Data' : type === 'electricity' ? '⚡ Pay Electricity' : '📺 Pay Cable TV'}
          </div>
        </div>
        <div style={{ background: 'rgba(255,255,255,.08)', borderRadius: 11, padding: 11 }}>
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,.45)', marginBottom: 2 }}>Pay from wallet</div>
          <div style={{ fontSize: 21, fontWeight: 800, color: '#fff', fontFamily: "'Outfit',sans-serif" }}>₦{parseFloat(wallet?.balance || 0).toLocaleString()} available</div>
        </div>
      </div>

      {step === 'success' ? (
        <div style={{ padding: '40px 20px', textAlign: 'center' }}>
          <div style={{ width: 72, height: 72, background: '#d4f0e2', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 36, margin: '0 auto 20px' }}>✅</div>
          <div style={{ fontFamily: "'Outfit',sans-serif", fontSize: 20, fontWeight: 800, color: '#1A7A4A', marginBottom: 8 }}>Payment Successful!</div>
          <div style={{ fontSize: 13, color: '#5a6480', marginBottom: 20, lineHeight: 1.6 }}>{result?.message}</div>
          {result?.token && (
            <div style={{ background: '#0D1B3E', borderRadius: 12, padding: '12px 16px', marginBottom: 16 }}>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,.5)', marginBottom: 4 }}>Electricity Token</div>
              <div style={{ fontFamily: "'Outfit',sans-serif", fontSize: 18, fontWeight: 800, color: '#F0A500', letterSpacing: 2 }}>{result.token}</div>
            </div>
          )}
          {cashback > 0 && (
            <div style={{ background: '#d4f0e2', borderRadius: 12, padding: '10px 14px', marginBottom: 20, border: '1px solid #1A7A4A' }}>
              <div style={{ fontSize: 13, color: '#1A7A4A', fontWeight: 700 }}>🎁 ₦{cashback} cashback + {bsrPoints} BSR points earned!</div>
            </div>
          )}
          <button onClick={onClose} className="btn btn-primary">Done</button>
        </div>
      ) : (
        <div style={{ padding: '14px 18px' }}>
          {/* AIRTIME FORM */}
          {type === 'airtime' && (
            <>
              <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
                {['MTN', 'AIRTEL', 'GLO', 'ETISALAT'].map(n => (
                  <div key={n} onClick={() => setNetwork(n)}
                    style={{ flex: 1, minWidth: 70, padding: '10px 6px', borderRadius: 10, textAlign: 'center', cursor: 'pointer', border: `2px solid ${network === n ? '#F0A500' : '#E2E6F0'}`, background: network === n ? '#fff3d6' : '#fff', fontFamily: "'Outfit',sans-serif", fontSize: 12, fontWeight: 700, color: '#0D1B3E' }}>
                    {n === 'ETISALAT' ? '9mobile' : n}
                  </div>
                ))}
              </div>
              <div className="input-wrap">
                <label className="input-label">Phone Number</label>
                <input className="input-field" type="tel" placeholder="e.g. 0812 345 6789" value={phone} onChange={e => setPhone(e.target.value)} />
              </div>
              <div style={{ display: 'flex', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
                {[100, 200, 500, 1000].map(a => (
                  <div key={a} className={`chip${amount === a ? ' active' : ''}`} onClick={() => setAmount(a)}>₦{a}</div>
                ))}
              </div>
              <div className="input-wrap">
                <label className="input-label">Amount (₦)</label>
                <input className="input-field" type="number" value={amount} onChange={e => setAmount(parseInt(e.target.value) || 100)} style={{ fontSize: 20, fontWeight: 700, textAlign: 'center' }} />
              </div>
            </>
          )}

          {/* ELECTRICITY FORM */}
          {type === 'electricity' && (
            <>
              <div style={{ background: '#fff3d6', borderRadius: 10, padding: '9px 12px', marginBottom: 12, border: '1px solid #f0c040', fontSize: 12, color: '#7a5000' }}>
                ⚡ <strong>Saved meter found:</strong> {disco} Prepaid
              </div>
              <div className="input-wrap">
                <label className="input-label">Select Provider</label>
                <select className="input-field" value={disco} onChange={e => { setDisco(e.target.value); setCustomerName(''); }}>
                  {ELECTRICITY_DISCOS.map(d => <option key={d.id} value={d.id}>{d.label}</option>)}
                </select>
              </div>
              <div className="input-wrap">
                <label className="input-label">Meter Number</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input className="input-field" type="tel" placeholder="Enter meter number" value={meter}
                    onChange={e => { setMeter(e.target.value); setCustomerName(''); }}
                    onBlur={verifyMeter} style={{ flex: 1, letterSpacing: 2 }} />
                  <button onClick={verifyMeter} style={{ background: '#0D1B3E', color: '#fff', border: 'none', borderRadius: 10, padding: '0 14px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                    {verifying ? '...' : 'Verify'}
                  </button>
                </div>
                {customerName && <div style={{ fontSize: 12, color: '#1A7A4A', marginTop: 4, fontWeight: 600 }}>✓ {customerName}</div>}
              </div>
              <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                {['prepaid', 'postpaid'].map(t => (
                  <div key={t} onClick={() => setMeterType(t)}
                    style={{ flex: 1, padding: '9px', borderRadius: 10, textAlign: 'center', cursor: 'pointer', border: `2px solid ${meterType === t ? '#F0A500' : '#E2E6F0'}`, background: meterType === t ? '#fff3d6' : '#fff', fontFamily: "'Outfit',sans-serif", fontSize: 12, fontWeight: 700, textTransform: 'capitalize' }}>
                    {t}
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
                {[1000, 2000, 3500, 5000].map(a => (
                  <div key={a} className={`chip${elecAmount === a ? ' active' : ''}`} onClick={() => setElecAmount(a)}>₦{a.toLocaleString()}</div>
                ))}
              </div>
              <div className="input-wrap">
                <label className="input-label">Amount (₦)</label>
                <input className="input-field" type="number" value={elecAmount} onChange={e => setElecAmount(parseInt(e.target.value) || 1000)} style={{ fontSize: 20, fontWeight: 700, textAlign: 'center' }} />
              </div>
            </>
          )}

          {/* CABLE FORM */}
          {type === 'cable' && (
            <>
              <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                {['DSTV', 'GOTV', 'STARTIMES'].map(p => (
                  <div key={p} onClick={() => { setCableProvider(p); setCablePlan(CABLE_PLANS[p][2] || CABLE_PLANS[p][0]); }}
                    style={{ flex: 1, padding: '10px 6px', borderRadius: 10, textAlign: 'center', cursor: 'pointer', border: `2px solid ${cableProvider === p ? '#F0A500' : '#E2E6F0'}`, background: cableProvider === p ? '#fff3d6' : '#fff', fontFamily: "'Outfit',sans-serif", fontSize: 12, fontWeight: 700 }}>
                    {p}
                  </div>
                ))}
              </div>
              <div className="input-wrap">
                <label className="input-label">Smartcard / IUC Number</label>
                <input className="input-field" type="tel" placeholder="Enter smartcard number" value={smartcard} onChange={e => setSmartcard(e.target.value)} style={{ letterSpacing: 2 }} />
              </div>
              <div className="input-wrap">
                <label className="input-label">Select Plan</label>
                <select className="input-field" value={cablePlan.code} onChange={e => {
                  const plan = CABLE_PLANS[cableProvider].find(p => p.code === e.target.value);
                  if (plan) setCablePlan(plan);
                }}>
                  {(CABLE_PLANS[cableProvider] || []).map(p => (
                    <option key={p.code} value={p.code}>{p.label} — ₦{p.price.toLocaleString()}</option>
                  ))}
                </select>
              </div>
            </>
          )}

          {/* Confirmation summary */}
          <div style={{ background: '#0D1B3E', borderRadius: 13, padding: 13, marginBottom: 11 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,.08)' }}>
              <span style={{ fontSize: 12, color: 'rgba(255,255,255,.5)' }}>Amount</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>₦{getAmount().toLocaleString()}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,.08)' }}>
              <span style={{ fontSize: 12, color: 'rgba(255,255,255,.5)' }}>Cashback ({type === 'electricity' ? '1%' : type === 'cable' ? '1.5%' : '0.5%'})</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#F0A500' }}>+₦{cashback}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,.08)' }}>
              <span style={{ fontSize: 12, color: 'rgba(255,255,255,.5)' }}>BSR bonus</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#F0A500' }}>+{bsrPoints} pts</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0' }}>
              <span style={{ fontSize: 12, color: 'rgba(255,255,255,.5)' }}>Balance after</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>₦{Math.max(0, parseFloat(wallet?.balance || 0) - getAmount()).toLocaleString()}</span>
            </div>
          </div>

          {cashback > 0 && (
            <div style={{ background: '#d4f0e2', borderRadius: 11, padding: '10px 12px', display: 'flex', gap: 8, alignItems: 'center', marginBottom: 11, border: '1.5px solid #1A7A4A' }}>
              <div style={{ fontSize: 17 }}>🎁</div>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#1A7A4A' }}>You earn ₦{cashback} cashback + {bsrPoints} BSR points</div>
            </div>
          )}

          <div style={{ background: '#F7F8FC', borderRadius: 12, padding: 12, marginBottom: 12, border: '1px solid #E2E6F0' }}>
            <PinInput label="🔐 Enter your PIN to confirm" value={pin} onChange={setPin} />
          </div>

          <button className="btn btn-green" onClick={submit} disabled={loading} style={{ marginBottom: 8 }}>
            {loading ? 'Processing...' : `Pay ₦${getAmount().toLocaleString()} ⚡`}
          </button>
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <div style={{ height: 20 }} />
        </div>
      )}
    </div>
  );
}

// ── Main Wallet Screen ────────────────────────────────────────────────────────
export default function WalletScreen() {
  const { goTo, showToast, wallet, refreshWallet } = useApp();
  const [tab, setTab] = useState('bills');
  const [sheet, setSheet] = useState(null); // 'airtime' | 'data' | 'electricity' | 'cable'
  const [bills, setBills] = useState([]);
  const [cashbackSummary, setCashbackSummary] = useState({ totalCashback: 0, totalBsrPoints: 0, paymentCount: 0 });
  const [transactions, setTransactions] = useState([]);
  const [claimingCashback, setClaimingCashback] = useState(false);

  const balance = parseFloat(wallet?.balance || 0);
  const winnings = parseFloat(wallet?.totalWon || 0);
  const deposited = parseFloat(wallet?.totalDeposited || 0);

  useEffect(() => {
    refreshWallet();
    api.get('/bills/history').then(r => setBills(r.data.bills || [])).catch(() => {});
    api.get('/bills/cashback-summary').then(r => setCashbackSummary(r.data)).catch(() => {});
    api.get('/wallet/transactions?limit=10').then(r => setTransactions(r.data.transactions || [])).catch(() => {});
  }, []);

  const handleBillSuccess = () => {
    refreshWallet();
    api.get('/bills/history').then(r => setBills(r.data.bills || [])).catch(() => {});
    api.get('/bills/cashback-summary').then(r => setCashbackSummary(r.data)).catch(() => {});
  };

  const claimCashback = async () => {
    if (cashbackSummary.totalCashback <= 0) { showToast('No cashback to claim'); return; }
    setClaimingCashback(true);
    // Cashback is already credited in real-time per payment — this just refreshes display
    setTimeout(() => {
      showToast(`✅ ₦${cashbackSummary.totalCashback} cashback already in your wallet!`);
      setClaimingCashback(false);
    }, 800);
  };

  const BILL_CATEGORIES = [
    {
      title: '📱 Airtime & Data',
      items: [
        { icon: '📱', label: 'MTN Airtime', onClick: () => setSheet('airtime') },
        { icon: '📱', label: 'Airtel Airtime', onClick: () => setSheet('airtime') },
        { icon: '📱', label: 'Glo Airtime', onClick: () => setSheet('airtime') },
        { icon: '📱', label: '9mobile', onClick: () => setSheet('airtime') },
        { icon: '📶', label: 'MTN Data', onClick: () => setSheet('data') },
        { icon: '📶', label: 'Airtel Data', onClick: () => setSheet('data') },
        { icon: '📶', label: 'Glo Data', onClick: () => setSheet('data') },
        { icon: '📶', label: '9mobile Data', onClick: () => setSheet('data') },
      ],
    },
    {
      title: '⚡ Electricity — All 11 DISCOs',
      items: [
        { icon: '⚡', label: 'Ikeja Electric', onClick: () => setSheet('electricity') },
        { icon: '⚡', label: 'AEDC (Abuja)', onClick: () => setSheet('electricity') },
        { icon: '⚡', label: 'EKEDC (Eko)', onClick: () => setSheet('electricity') },
        { icon: '⚡', label: 'More DISCOs', onClick: () => setSheet('electricity') },
      ],
    },
    {
      title: '📺 Cable TV',
      items: [
        { icon: '📺', label: 'DSTV', onClick: () => setSheet('cable') },
        { icon: '📺', label: 'GOtv', onClick: () => setSheet('cable') },
        { icon: '📺', label: 'StarTimes', onClick: () => setSheet('cable') },
        { icon: '🎬', label: 'Showmax', onClick: () => showToast('Showmax coming soon') },
      ],
    },
    {
      title: '🎓 Education & Other',
      items: [
        { icon: '📚', label: 'WAEC PIN', onClick: () => showToast('WAEC payment coming soon') },
        { icon: '📚', label: 'JAMB', onClick: () => showToast('JAMB payment coming soon') },
        { icon: '📚', label: 'NECO', onClick: () => showToast('NECO payment coming soon') },
        { icon: '🌐', label: 'Internet', onClick: () => showToast('Internet subscription coming soon') },
      ],
    },
  ];

  const TXN_ICONS = { DEPOSIT: '💰', WITHDRAWAL: '💸', STAKE: '🎯', WIN: '🏆', REFUND: '↩️', BONUS: '🎁' };
  const TXN_COLORS = { DEPOSIT: '#1A7A4A', WITHDRAWAL: '#C0392B', STAKE: '#C0392B', WIN: '#1A7A4A', REFUND: '#F0A500', BONUS: '#1A7A4A' };

  return (
    <div className="screen" style={{ position: 'relative' }}>
      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg,#0D1B3E,#1a2a60)', padding: '18px 20px 26px', flexShrink: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <div style={{ fontSize: 17, fontWeight: 800, color: '#fff', fontFamily: "'Outfit',sans-serif" }}>StakeIQ Wallet 💳</div>
          <button onClick={() => goTo('spend')} style={{ background: 'rgba(255,255,255,.1)', border: 'none', borderRadius: 10, padding: '5px 10px', fontSize: 11, color: 'rgba(255,255,255,.7)', cursor: 'pointer', fontFamily: "'Outfit',sans-serif" }}>
            My Stats →
          </button>
        </div>

        {/* Balance card */}
        <div style={{ background: 'rgba(255,255,255,.08)', borderRadius: 14, padding: 16, border: '1px solid rgba(255,255,255,.12)', marginBottom: 12 }}>
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,.45)', textTransform: 'uppercase', letterSpacing: .5, fontWeight: 600, marginBottom: 4 }}>Total Balance</div>
          <div style={{ fontSize: 34, fontWeight: 800, color: '#fff', letterSpacing: -1, fontFamily: "'Outfit',sans-serif" }}>₦{balance.toLocaleString()}</div>
          <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
            <div style={{ background: 'rgba(255,255,255,.08)', borderRadius: 7, padding: '3px 9px', fontSize: 11, color: 'rgba(255,255,255,.6)' }}>
              Winnings: <span style={{ color: '#F0A500', fontWeight: 700 }}>₦{winnings.toLocaleString()}</span>
            </div>
            <div style={{ background: 'rgba(255,255,255,.08)', borderRadius: 7, padding: '3px 9px', fontSize: 11, color: 'rgba(255,255,255,.6)' }}>
              Deposited: <span style={{ color: '#fff', fontWeight: 700 }}>₦{deposited.toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* Quick actions */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
          <div onClick={() => goTo('deposit')} style={{ background: '#F0A500', borderRadius: 10, padding: '9px 6px', textAlign: 'center', cursor: 'pointer' }}>
            <div style={{ fontSize: 17, marginBottom: 2 }}>↓</div>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#0D1B3E' }}>Deposit</div>
          </div>
          <div onClick={() => goTo('withdraw')} style={{ background: 'rgba(255,255,255,.1)', borderRadius: 10, padding: '9px 6px', textAlign: 'center', cursor: 'pointer' }}>
            <div style={{ fontSize: 17, marginBottom: 2 }}>💸</div>
            <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,.8)' }}>Withdraw</div>
          </div>
          <div onClick={() => showToast('Transfer feature coming soon')} style={{ background: 'rgba(255,255,255,.1)', borderRadius: 10, padding: '9px 6px', textAlign: 'center', cursor: 'pointer' }}>
            <div style={{ fontSize: 17, marginBottom: 2 }}>↗️</div>
            <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,.8)' }}>Transfer</div>
          </div>
        </div>
      </div>

      <div className="scroll-area" style={{ flex: 1, padding: '13px 16px' }}>
        {/* Responsible gaming nudge */}
        <div onClick={() => setSheet('electricity')}
          style={{ background: '#fff3d6', borderRadius: 12, padding: '10px 13px', display: 'flex', gap: 9, alignItems: 'center', marginBottom: 13, border: '1.5px solid #f0c040', cursor: 'pointer' }}>
          <div style={{ fontSize: 19 }}>💡</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#0D1B3E' }}>Pay your bills before betting</div>
            <div style={{ fontSize: 11, color: '#5a6480' }}>Use your wallet balance for essentials first</div>
          </div>
          <div style={{ fontSize: 13, color: '#D4891A', fontWeight: 700 }}>Pay →</div>
        </div>

        <Tab
          tabs={[{ id: 'bills', label: 'Pay Bills' }, { id: 'recent', label: 'Recent' }, { id: 'rewards', label: 'Rewards' }]}
          active={tab}
          onChange={setTab}
        />

        {/* BILLS TAB */}
        {tab === 'bills' && (
          <>
            {/* Quick billers */}
            <div className="section-title" style={{ marginBottom: 10 }}>Quick Pay</div>
            <div style={{ display: 'flex', gap: 12, overflowX: 'auto', marginBottom: 14, paddingBottom: 4, scrollbarWidth: 'none' }}>
              {[
                { icon: '⚡', label: 'IKEDC\n624…034', onClick: () => setSheet('electricity') },
                { icon: '📱', label: 'MTN\n0812…789', onClick: () => setSheet('airtime') },
                { icon: '📺', label: 'DSTV\nCompact', onClick: () => setSheet('cable') },
                { icon: '📶', label: 'Airtel\n1GB Data', onClick: () => setSheet('data') },
                { icon: '➕', label: 'Add\nBiller', onClick: () => showToast('Coming soon') },
              ].map((b, i) => (
                <div key={i} onClick={b.onClick} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, cursor: 'pointer', flexShrink: 0 }}>
                  <div style={{ width: 50, height: 50, borderRadius: '50%', background: i === 4 ? 'transparent' : '#F7F8FC', border: i === 4 ? '2px dashed #E2E6F0' : '2px solid #E2E6F0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 21 }}>{b.icon}</div>
                  <div style={{ fontSize: 9, color: '#5a6480', fontWeight: 600, textAlign: 'center', lineHeight: 1.2, whiteSpace: 'pre' }}>{b.label}</div>
                </div>
              ))}
            </div>

            {/* All categories */}
            {BILL_CATEGORIES.map(cat => (
              <div key={cat.title} style={{ background: '#fff', borderRadius: 13, padding: 13, marginBottom: 9, border: '1px solid #E2E6F0' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#8A95B0', textTransform: 'uppercase', letterSpacing: .5, marginBottom: 9 }}>{cat.title}</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 7 }}>
                  {cat.items.map(item => (
                    <BillItem key={item.label} icon={item.icon} label={item.label} onClick={item.onClick} />
                  ))}
                </div>
              </div>
            ))}
            <div style={{ height: 6 }} />
          </>
        )}

        {/* RECENT TAB */}
        {tab === 'recent' && (
          <div style={{ background: '#fff', borderRadius: 13, border: '1px solid #E2E6F0', padding: '0 14px' }}>
            {transactions.length === 0 && bills.length === 0 ? (
              <div style={{ padding: '40px 0', textAlign: 'center', color: '#8A95B0', fontSize: 13 }}>No transactions yet</div>
            ) : (
              <>
                {bills.slice(0, 5).map((b, i) => (
                  <div key={b.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 0', borderBottom: '0.5px solid #E2E6F0' }}>
                    <div style={{ width: 34, height: 34, borderRadius: 9, background: '#fff3e0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15 }}>
                      {b.category === 'ELECTRICITY' ? '⚡' : b.category === 'CABLE_TV' ? '📺' : '📱'}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#1a1f36' }}>{b.provider}</div>
                      <div style={{ fontSize: 11, color: '#8A95B0' }}>{b.accountNumber} · {new Date(b.createdAt).toLocaleDateString()}</div>
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#C0392B' }}>-₦{parseFloat(b.amount).toLocaleString()}</div>
                  </div>
                ))}
                {transactions.slice(0, 5).map((t, i) => (
                  <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 0', borderBottom: i < 4 ? '0.5px solid #E2E6F0' : 'none' }}>
                    <div style={{ width: 34, height: 34, borderRadius: 9, background: '#F7F8FC', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15 }}>
                      {TXN_ICONS[t.type] || '💰'}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#1a1f36' }}>{t.description || t.type}</div>
                      <div style={{ fontSize: 11, color: '#8A95B0' }}>{new Date(t.createdAt).toLocaleDateString()}</div>
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: TXN_COLORS[t.type] || '#1a1f36' }}>
                      {['DEPOSIT', 'WIN', 'BONUS', 'REFUND'].includes(t.type) ? '+' : '-'}₦{parseFloat(t.amount).toLocaleString()}
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
        )}

        {/* REWARDS TAB */}
        {tab === 'rewards' && (
          <>
            <div style={{ background: 'linear-gradient(135deg,#0D1B3E,#1a3a70)', borderRadius: 14, padding: 15, marginBottom: 12 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#fff', marginBottom: 4 }}>🎁 Bill Payment Cashback</div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,.6)', marginBottom: 12, lineHeight: 1.5 }}>Pay bills from your StakeIQ wallet and earn cashback + BSR points.</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {[
                  { label: 'Electricity', rate: '1%' },
                  { label: 'Airtime/Data', rate: '0.5%' },
                  { label: 'Cable TV', rate: '1.5%' },
                  { label: 'BSR per ₦1K', rate: '+2 pts' },
                ].map(r => (
                  <div key={r.label} style={{ background: 'rgba(255,255,255,.1)', borderRadius: 10, padding: 9, textAlign: 'center' }}>
                    <div style={{ fontSize: 17, fontWeight: 800, color: '#F0A500', fontFamily: "'Outfit',sans-serif" }}>{r.rate}</div>
                    <div style={{ fontSize: 10, color: 'rgba(255,255,255,.5)' }}>{r.label}</div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ background: '#fff', borderRadius: 13, border: '1px solid #E2E6F0', padding: 14 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#0D1B3E', marginBottom: 8 }}>Your cashback this month</div>
              <div style={{ fontSize: 28, fontWeight: 800, color: '#1A7A4A', marginBottom: 3, fontFamily: "'Outfit',sans-serif" }}>₦{cashbackSummary.totalCashback.toLocaleString()}</div>
              <div style={{ fontSize: 12, color: '#8A95B0', marginBottom: 14 }}>
                From {cashbackSummary.paymentCount} bill payments · +{cashbackSummary.totalBsrPoints} BSR points
              </div>
              <button className="btn btn-green" onClick={claimCashback} disabled={claimingCashback} style={{ padding: '12px', fontSize: 14 }}>
                {claimingCashback ? 'Checking...' : `View ₦${cashbackSummary.totalCashback.toLocaleString()} cashback`}
              </button>
            </div>
          </>
        )}
      </div>

      <BottomNav active="wallet" />

      {/* Bill Payment Sheet (overlay) */}
      {sheet && (
        <BillSheet
          type={sheet}
          wallet={wallet}
          onClose={() => setSheet(null)}
          onSuccess={(data) => { handleBillSuccess(); showToast(data.message); }}
        />
      )}
    </div>
  );
}
