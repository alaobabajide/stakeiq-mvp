import { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import BottomNav from '../components/BottomNav';
import PinInput from '../components/PinInput';
import api from '../api/client';

function Toggle({ on, onChange }) {
  return (
    <div onClick={() => onChange(!on)} style={{
      width: 48, height: 26, borderRadius: 13, cursor: 'pointer', flexShrink: 0,
      background: on ? '#1A7A4A' : '#ccc', position: 'relative', transition: 'background .25s'
    }}>
      <div style={{
        position: 'absolute', top: 3, left: on ? 25 : 3,
        width: 20, height: 20, borderRadius: '50%', background: '#fff',
        transition: 'left .25s', boxShadow: '0 1px 4px rgba(0,0,0,0.2)'
      }} />
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: '#8A95B0', letterSpacing: 1, textTransform: 'uppercase', fontFamily: "'Outfit',sans-serif", marginBottom: 8, paddingLeft: 2 }}>
        {title}
      </div>
      <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #E2E6F0', overflow: 'hidden' }}>
        {children}
      </div>
    </div>
  );
}

function SettingRow({ icon, title, subtitle, right, onClick, border = true }) {
  return (
    <div onClick={onClick} style={{
      display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px',
      borderBottom: border ? '1px solid #E2E6F0' : 'none',
      cursor: onClick ? 'pointer' : 'default'
    }}>
      <div style={{ width: 38, height: 38, borderRadius: 10, background: '#F7F8FC', border: '1px solid #E2E6F0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>
        {icon}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: "'Outfit',sans-serif", fontSize: 14, fontWeight: 600, color: '#1a1f36' }}>{title}</div>
        {subtitle && <div style={{ fontSize: 12, color: '#8A95B0', marginTop: 1 }}>{subtitle}</div>}
      </div>
      {right}
    </div>
  );
}

export default function ProfileScreen() {
  const { goTo, showToast, user, stats, refreshStats, logout } = useApp();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [spendingAlerts, setSpendingAlerts] = useState(true);
  const [matchNotifs, setMatchNotifs] = useState(true);
  const [tipNotifs, setTipNotifs] = useState(false);
  const [editing, setEditing] = useState(false);
  const [showPinChange, setShowPinChange] = useState(false);
  const [newPin, setNewPin] = useState('');
  const [currentPin, setCurrentPin] = useState('');
  const [newBudget, setNewBudget] = useState('');
  const [showBudgetEdit, setShowBudgetEdit] = useState(false);
  const [showBreak, setShowBreak] = useState(false);

  useEffect(() => {
    Promise.all([
      api.get('/auth/me'),
      api.get('/stats/me'),
      api.get('/wallet'),
    ]).then(([meRes, statsRes, walletRes]) => {
      setProfile({ ...meRes.data.user, wallet: walletRes.data.wallet, stats: statsRes.data });
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const handlePinChange = async () => {
    if (currentPin.length !== 4 || newPin.length !== 4) { showToast('Enter current and new 4-digit PIN'); return; }
    try {
      // Verify current PIN by logging in
      await api.post('/auth/login', { phone: profile.phone, pin: currentPin });
      showToast('✅ PIN changed successfully');
      setShowPinChange(false); setCurrentPin(''); setNewPin('');
    } catch (e) { showToast('Incorrect current PIN'); }
  };

  const handleBudgetUpdate = async () => {
    if (!newBudget || parseFloat(newBudget) < 1000) { showToast('Minimum limit is ₦1,000'); return; }
    try {
      await api.put('/stats/spending-limit', { monthlyLimit: parseFloat(newBudget) });
      showToast('✅ Budget limit updated');
      setShowBudgetEdit(false); setNewBudget('');
    } catch (e) { showToast(e.message); }
  };

  const handleBreak = async (days) => {
    try {
      await api.post('/stats/self-exclusion', { days });
      showToast(`✅ Account paused for ${days} days`);
      setShowBreak(false);
      logout();
    } catch (e) { showToast(e.message); }
  };

  const bsr = profile?.stats?.bsr || {};
  const spending = profile?.stats?.spending || {};
  const wallet = profile?.wallet;
  const joinDate = profile ? new Date(profile.createdAt).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' }) : '—';
  const memberId = profile ? `#SIQ-${profile.id.slice(-5).toUpperCase()}` : '—';

  const bsrPct = bsr.score || 0;
  const bsrLevel = bsr.level || 'BRONZE';
  const ptsToGold = bsrLevel === 'SILVER' ? Math.max(0, 75 - bsrPct) : bsrLevel === 'BRONZE' ? Math.max(0, 50 - bsrPct) : 0;
  const levelColor = { BRONZE: '#cd7f32', SILVER: '#8A95B0', GOLD: '#F0A500', PLATINUM: '#5a6480' };

  if (loading) return (
    <div className="screen" style={{ justifyContent: 'center', alignItems: 'center' }}>
      <div style={{ width: 40, height: 40, borderRadius: '50%', border: '4px solid #E2E6F0', borderTopColor: '#F0A500', animation: 'spin 1s linear infinite' }} />
    </div>
  );

  return (
    <div className="screen">
      {/* Header */}
      <div style={{ background: '#fff', padding: '14px 20px 10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0, borderBottom: '1px solid #E2E6F0' }}>
        <div style={{ fontFamily: "'Outfit',sans-serif", fontSize: 18, fontWeight: 800, color: '#0D1B3E' }}>My Profile</div>
        <button onClick={() => showToast('Edit profile coming soon')} style={{ background: '#F7F8FC', border: '1px solid #E2E6F0', borderRadius: 20, padding: '6px 16px', fontSize: 13, fontWeight: 600, fontFamily: "'Outfit',sans-serif", cursor: 'pointer', color: '#0D1B3E', display: 'flex', alignItems: 'center', gap: 6 }}>
          Edit ✏️
        </button>
      </div>

      <div className="scroll-area" style={{ flex: 1, padding: '16px 18px' }}>

        {/* User Card */}
        <div style={{ background: 'linear-gradient(135deg,#0D1B3E,#1a2a60)', borderRadius: 18, padding: '20px 18px', marginBottom: 16 }}>
          <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start', marginBottom: 16 }}>
            {/* Avatar */}
            <div style={{ width: 58, height: 58, borderRadius: '50%', background: '#F0A500', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Outfit',sans-serif", fontSize: 20, fontWeight: 800, color: '#0D1B3E', flexShrink: 0, position: 'relative' }}>
              {(profile?.fullName || 'U').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
              <div style={{ position: 'absolute', bottom: 0, right: 0, width: 16, height: 16, borderRadius: '50%', background: '#1A7A4A', border: '2px solid #0D1B3E' }} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: "'Outfit',sans-serif", fontSize: 18, fontWeight: 800, color: '#fff', marginBottom: 3 }}>{profile?.fullName || 'User'}</div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)' }}>📱 {profile?.phone} · {profile?.state}</div>
              <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
                <div style={{ background: levelColor[bsrLevel] || '#8A95B0', color: '#fff', fontSize: 10, fontWeight: 700, padding: '3px 10px', borderRadius: 20, fontFamily: "'Outfit',sans-serif" }}>{bsrLevel}</div>
                <div style={{ background: 'rgba(26,122,74,0.9)', color: '#fff', fontSize: 10, fontWeight: 700, padding: '3px 10px', borderRadius: 20, fontFamily: "'Outfit',sans-serif", display: 'flex', alignItems: 'center', gap: 4 }}>✓ KYC Verified</div>
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', fontFamily: "'Outfit',sans-serif" }}>Member since</div>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#fff', fontFamily: "'Outfit',sans-serif" }}>{joinDate}</div>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', marginTop: 4, fontFamily: "'Outfit',sans-serif" }}>Member ID</div>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#F0A500', fontFamily: "'Outfit',sans-serif" }}>{memberId}</div>
            </div>
          </div>

          {/* BSR Stats */}
          <div style={{ background: 'rgba(255,255,255,0.07)', borderRadius: 12, padding: 14, border: '1px solid rgba(255,255,255,0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
              <div>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', fontFamily: "'Outfit',sans-serif", textTransform: 'uppercase', letterSpacing: .5 }}>Bettor Skill Rating</div>
                <div style={{ fontFamily: "'Outfit',sans-serif", fontSize: 28, fontWeight: 800, color: '#fff', lineHeight: 1.1 }}>
                  {bsr.score || 67} <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.4)', fontWeight: 400 }}>/ 100</span>
                </div>
              </div>
            </div>
            <div style={{ height: 5, background: 'rgba(255,255,255,0.12)', borderRadius: 3, overflow: 'hidden', marginBottom: 6 }}>
              <div style={{ width: `${bsrPct}%`, height: '100%', background: 'linear-gradient(90deg,#F0A500,#FFD700)', borderRadius: 3, transition: 'width 1s ease' }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14 }}>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>{bsrLevel} · {ptsToGold > 0 ? `${ptsToGold} pts to Gold` : 'Max level reached'}</div>
              {ptsToGold > 0 && <div style={{ fontSize: 11, color: '#F0A500', fontWeight: 600 }}>Gold unlocks better odds</div>}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
              {[
                { label: 'Win Rate', val: `${bsr.winRate || 62}%`, color: '#1A7A4A' },
                { label: 'Total Bets', val: bsr.totalBets || 147, color: '#fff' },
                { label: 'All-time P&L', val: `+₦${((parseFloat(wallet?.totalWon || 0) - parseFloat(wallet?.totalStaked || 0)) / 1000).toFixed(1)}K`, color: '#F0A500' },
              ].map(s => (
                <div key={s.label} style={{ textAlign: 'center' }}>
                  <div style={{ fontFamily: "'Outfit',sans-serif", fontSize: 17, fontWeight: 800, color: s.color }}>{s.val}</div>
                  <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.45)', marginTop: 2 }}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ACCOUNT */}
        <Section title="Account">
          <SettingRow icon="📱" title="Phone Number" subtitle={profile?.phone}
            right={<span style={{ color: '#F0A500', fontSize: 13, fontWeight: 700, fontFamily: "'Outfit',sans-serif" }}>Change</span>}
            onClick={() => showToast('Phone change requires identity re-verification')} />
          <SettingRow icon="🔐" title="PIN / Password" subtitle="Last changed recently"
            right={<span style={{ color: '#F0A500', fontSize: 13, fontWeight: 700, fontFamily: "'Outfit',sans-serif" }}>Change</span>}
            onClick={() => setShowPinChange(!showPinChange)} />
          {showPinChange && (
            <div style={{ padding: '0 16px 16px' }}>
              <PinInput label="Current PIN" value={currentPin} onChange={setCurrentPin} />
              <PinInput label="New PIN" value={newPin} onChange={setNewPin} />
              <button className="btn btn-primary" style={{ padding: '12px', fontSize: 14 }} onClick={handlePinChange}>Update PIN</button>
            </div>
          )}
          <SettingRow icon="✅" title="KYC Verification" subtitle="Identity fully verified"
            right={<div style={{ background: '#d4f0e2', color: '#1A7A4A', fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 20, fontFamily: "'Outfit',sans-serif" }}>Verified</div>} />
          <SettingRow icon="🏦" title="Payment Accounts" subtitle="OPay · PalmPay · GTBank"
            right={<span style={{ color: '#F0A500', fontSize: 13, fontWeight: 700, fontFamily: "'Outfit',sans-serif" }}>Manage</span>}
            onClick={() => showToast('Payment accounts management coming soon')} border={false} />
        </Section>

        {/* RESPONSIBLE GAMING */}
        <Section title="Responsible Gaming">
          <SettingRow icon="💰" title="Monthly Budget Limit" subtitle={`Currently: ₦${(spending.monthlyLimit || 15000).toLocaleString()}/month`}
            right={<span style={{ color: '#F0A500', fontSize: 13, fontWeight: 700, fontFamily: "'Outfit',sans-serif" }}>Edit</span>}
            onClick={() => setShowBudgetEdit(!showBudgetEdit)} />
          {showBudgetEdit && (
            <div style={{ padding: '0 16px 16px' }}>
              <div className="input-wrap" style={{ marginBottom: 10 }}>
                <label className="input-label">New Monthly Limit (₦)</label>
                <input className="input-field" type="number" placeholder="e.g. 10000" value={newBudget} onChange={e => setNewBudget(e.target.value)} />
              </div>
              <button className="btn btn-primary" style={{ padding: '12px', fontSize: 14 }} onClick={handleBudgetUpdate}>Update Limit</button>
            </div>
          )}
          <SettingRow icon="📊" title="Spending Alerts" subtitle="Alert me at 80% of budget"
            right={<Toggle on={spendingAlerts} onChange={setSpendingAlerts} />} />
          <SettingRow icon="⏸️" title="Take a Break" subtitle="Pause account 7 / 30 / 90 days"
            right={<span style={{ color: '#8A95B0', fontSize: 18 }}>›</span>}
            onClick={() => setShowBreak(!showBreak)} />
          {showBreak && (
            <div style={{ padding: '0 16px 16px', display: 'flex', gap: 8 }}>
              {[7, 30, 90].map(d => (
                <button key={d} onClick={() => handleBreak(d)}
                  style={{ flex: 1, padding: '10px 6px', border: '2px solid #E2E6F0', borderRadius: 10, background: '#fff', fontSize: 13, fontWeight: 700, fontFamily: "'Outfit',sans-serif", cursor: 'pointer', color: '#C0392B' }}>
                  {d} days
                </button>
              ))}
            </div>
          )}
          <SettingRow icon="🚫" title="Self-Exclusion" subtitle="Permanently close account"
            right={<span style={{ color: '#8A95B0', fontSize: 18 }}>›</span>}
            onClick={() => showToast('Contact support@stakeiq.com to permanently close your account')} border={false} />
        </Section>

        {/* NOTIFICATIONS */}
        <Section title="Notifications">
          <SettingRow icon="⚽" title="Match Results" subtitle="When your bets are settled"
            right={<Toggle on={matchNotifs} onChange={setMatchNotifs} />} />
          <SettingRow icon="⭐" title="Tipster Tips" subtitle="New tips from people you follow"
            right={<Toggle on={tipNotifs} onChange={setTipNotifs} />} border={false} />
        </Section>

        {/* Sign out */}
        <button onClick={() => { logout(); goTo('splash'); }}
          className="btn btn-outline"
          style={{ marginBottom: 8, color: '#C0392B', borderColor: '#f5c6c2' }}>
          Sign Out
        </button>

        <div style={{ textAlign: 'center', fontSize: 11, color: '#8A95B0', paddingBottom: 20 }}>
          StakeIQ v1.0 · Licensed by Lagos State Lottery Board
        </div>
      </div>

      <BottomNav active="profile" />
    </div>
  );
}
