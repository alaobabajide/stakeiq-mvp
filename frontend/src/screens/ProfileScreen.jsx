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
  const { goTo, showToast, logout } = useApp();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [spendingAlerts, setSpendingAlerts] = useState(true);
  const [matchNotifs, setMatchNotifs] = useState(true);
  const [tipNotifs, setTipNotifs] = useState(false);
  const [payoutNotifs, setPayoutNotifs] = useState(true);
  const [promoNotifs, setPromoNotifs] = useState(true);
  const [showPinChange, setShowPinChange] = useState(false);
  const [newPin, setNewPin] = useState('');
  const [currentPin, setCurrentPin] = useState('');
  const [newBudget, setNewBudget] = useState('');
  const [showBudgetEdit, setShowBudgetEdit] = useState(false);
  const [showBreak, setShowBreak] = useState(false);
  const [referral, setReferral] = useState(null);
  const [codeCopied, setCodeCopied] = useState(false);

  useEffect(() => {
    Promise.all([
      api.get('/auth/me'),
      api.get('/stats/me'),
      api.get('/wallet'),
      api.get('/referrals/my').catch(() => null),
    ]).then(([meRes, statsRes, walletRes, refRes]) => {
      setProfile({ ...meRes.data.user, wallet: walletRes.data.wallet, stats: statsRes.data });
      if (refRes) setReferral(refRes.data);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const handlePinChange = async () => {
    if (currentPin.length !== 4 || newPin.length !== 4) { showToast('Enter current and new 4-digit PIN'); return; }
    try {
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

  const copyReferralCode = () => {
    const code = referral?.referralCode || '';
    if (navigator.clipboard) {
      navigator.clipboard.writeText(code).then(() => {
        setCodeCopied(true);
        setTimeout(() => setCodeCopied(false), 2000);
      });
    } else {
      showToast(`Your code: ${code}`);
    }
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
      {/* Gradient Header */}
      <div style={{ background: 'linear-gradient(135deg,#0D1B3E,#1a2a60)', padding: '14px 20px 32px', flexShrink: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div style={{ fontFamily: "'Outfit',sans-serif", fontSize: 18, fontWeight: 800, color: '#fff' }}>My Profile</div>
          <button onClick={() => showToast('Edit profile coming soon')} style={{ background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 20, padding: '6px 16px', fontSize: 13, fontWeight: 600, fontFamily: "'Outfit',sans-serif", cursor: 'pointer', color: '#fff' }}>
            Edit ✏️
          </button>
        </div>

        {/* Avatar + Info */}
        <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
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
      </div>

      {/* Floating BSR Card */}
      <div style={{ margin: '-14px 16px 0', position: 'relative', zIndex: 2, background: '#fff', borderRadius: 16, boxShadow: '0 4px 20px rgba(13,27,62,0.15)', border: '1px solid #E2E6F0', padding: 16, marginBottom: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
          <div>
            <div style={{ fontSize: 10, color: '#8A95B0', fontFamily: "'Outfit',sans-serif", textTransform: 'uppercase', letterSpacing: .5 }}>Bettor Skill Rating</div>
            <div style={{ fontFamily: "'Outfit',sans-serif", fontSize: 28, fontWeight: 800, color: '#0D1B3E', lineHeight: 1.1 }}>
              {bsr.score || 67} <span style={{ fontSize: 14, color: '#8A95B0', fontWeight: 400 }}>/ 100</span>
            </div>
          </div>
          <div style={{ background: levelColor[bsrLevel] + '22', border: `1px solid ${levelColor[bsrLevel]}44`, borderRadius: 20, padding: '4px 12px' }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: levelColor[bsrLevel], fontFamily: "'Outfit',sans-serif" }}>{bsrLevel}</div>
          </div>
        </div>
        <div style={{ height: 6, background: '#F0F1F5', borderRadius: 3, overflow: 'hidden', marginBottom: 8 }}>
          <div style={{ width: `${bsrPct}%`, height: '100%', background: 'linear-gradient(90deg,#F0A500,#FFD700)', borderRadius: 3, transition: 'width 1s ease' }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14 }}>
          <div style={{ fontSize: 11, color: '#8A95B0' }}>{ptsToGold > 0 ? `${ptsToGold} pts to next level` : 'Max level reached'}</div>
          {ptsToGold > 0 && <div style={{ fontSize: 11, color: '#F0A500', fontWeight: 600 }}>Gold unlocks better odds</div>}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
          {[
            { label: 'Win Rate', val: `${bsr.winRate || 62}%`, color: '#1A7A4A' },
            { label: 'Total Bets', val: bsr.totalBets || 147, color: '#0D1B3E' },
            { label: 'All-time P&L', val: `+₦${((parseFloat(wallet?.totalWon || 0) - parseFloat(wallet?.totalStaked || 0)) / 1000).toFixed(1)}K`, color: '#F0A500' },
          ].map(s => (
            <div key={s.label} style={{ textAlign: 'center', background: '#F7F8FC', borderRadius: 10, padding: '10px 6px' }}>
              <div style={{ fontFamily: "'Outfit',sans-serif", fontSize: 17, fontWeight: 800, color: s.color }}>{s.val}</div>
              <div style={{ fontSize: 10, color: '#8A95B0', marginTop: 2 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="scroll-area" style={{ flex: 1, padding: '20px 18px 16px' }}>

        {/* REFERRAL CARD */}
        {referral && (
          <div style={{ background: 'linear-gradient(135deg,#0D1B3E,#1a3a6e)', borderRadius: 18, padding: 18, marginBottom: 20, position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: -20, right: -20, width: 100, height: 100, borderRadius: '50%', background: 'rgba(240,165,0,0.1)' }} />
            <div style={{ position: 'absolute', bottom: -30, left: -10, width: 80, height: 80, borderRadius: '50%', background: 'rgba(255,255,255,0.05)' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
              <div>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', letterSpacing: 1, textTransform: 'uppercase', fontFamily: "'Outfit',sans-serif" }}>Refer Friends</div>
                <div style={{ fontFamily: "'Outfit',sans-serif", fontSize: 16, fontWeight: 800, color: '#fff', marginTop: 2 }}>Earn ₦500 per referral</div>
              </div>
              <div style={{ background: '#F0A500', borderRadius: 10, padding: '6px 12px' }}>
                <div style={{ fontSize: 10, color: '#0D1B3E', fontWeight: 800, fontFamily: "'Outfit',sans-serif" }}>₦500</div>
              </div>
            </div>

            <div style={{ background: 'rgba(255,255,255,0.08)', borderRadius: 12, padding: '12px 14px', marginBottom: 12, border: '1px dashed rgba(255,255,255,0.2)' }}>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', marginBottom: 4, fontFamily: "'Outfit',sans-serif" }}>Your Referral Code</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontFamily: "'Outfit',sans-serif", fontSize: 22, fontWeight: 800, color: '#F0A500', letterSpacing: 2 }}>{referral.referralCode}</div>
                <button onClick={copyReferralCode} style={{
                  background: codeCopied ? '#1A7A4A' : 'rgba(255,255,255,0.15)',
                  border: 'none', borderRadius: 8, padding: '8px 14px', cursor: 'pointer',
                  fontSize: 12, fontWeight: 700, color: '#fff', fontFamily: "'Outfit',sans-serif",
                  transition: 'background .2s'
                }}>
                  {codeCopied ? '✓ Copied!' : '📋 Copy'}
                </button>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div style={{ background: 'rgba(255,255,255,0.07)', borderRadius: 10, padding: '10px 12px' }}>
                <div style={{ fontFamily: "'Outfit',sans-serif", fontSize: 20, fontWeight: 800, color: '#fff' }}>{referral.friendsReferred || 0}</div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', marginTop: 2 }}>Friends referred</div>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.07)', borderRadius: 10, padding: '10px 12px' }}>
                <div style={{ fontFamily: "'Outfit',sans-serif", fontSize: 20, fontWeight: 800, color: '#F0A500' }}>₦{(referral.totalEarnings || 0).toLocaleString()}</div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', marginTop: 2 }}>Total earned</div>
              </div>
            </div>
          </div>
        )}

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
          <SettingRow icon="💸" title="Payout Alerts" subtitle="When withdrawals are processed"
            right={<Toggle on={payoutNotifs} onChange={setPayoutNotifs} />} />
          <SettingRow icon="⭐" title="Tipster Tips" subtitle="New tips from people you follow"
            right={<Toggle on={tipNotifs} onChange={setTipNotifs} />} />
          <SettingRow icon="🎁" title="Promotions" subtitle="Bonuses and special offers"
            right={<Toggle on={promoNotifs} onChange={setPromoNotifs} />} border={false} />
        </Section>

        {/* HELP & SUPPORT */}
        <Section title="Help & Support">
          <SettingRow icon="💬" title="WhatsApp Support" subtitle="Chat with us — usually replies in 2 mins"
            right={<span style={{ color: '#1A7A4A', fontSize: 13, fontWeight: 700, fontFamily: "'Outfit',sans-serif" }}>Open</span>}
            onClick={() => showToast('WhatsApp support: +234 800 STAKEIQ')} />
          <SettingRow icon="📞" title="Call Us Free" subtitle="0800-STAKEIQ (8am–10pm daily)"
            right={<span style={{ color: '#F0A500', fontSize: 13, fontWeight: 700, fontFamily: "'Outfit',sans-serif" }}>Call</span>}
            onClick={() => showToast('Calling 0800-STAKEIQ...')} />
          <SettingRow icon="📄" title="Terms & Privacy" subtitle="Read our terms of service"
            right={<span style={{ color: '#8A95B0', fontSize: 18 }}>›</span>}
            onClick={() => showToast('Terms & Privacy coming soon')} />
          <SettingRow icon="ℹ️" title="App Version" subtitle="StakeIQ v1.0 · Licensed by Lagos State Lottery Board"
            right={null} border={false} />
        </Section>

        {/* Sign out */}
        <button onClick={() => { logout(); goTo('splash'); }}
          className="btn btn-outline"
          style={{ marginBottom: 24, color: '#C0392B', borderColor: '#f5c6c2' }}>
          Sign Out
        </button>
      </div>

      <BottomNav active="profile" />
    </div>
  );
}
