import { useApp } from '../context/AppContext';

const navItems = [
  { id: 'home', icon: '🏠', label: 'Home' },
  { id: 'tipsters', icon: '⭐', label: 'Tipsters' },
  { id: 'spend', icon: '📊', label: 'My Stats' },
  { id: 'withdraw', icon: '💸', label: 'Withdraw' },
  { id: 'profile', icon: '👤', label: 'Profile' },
];

export default function BottomNav({ active }) {
  const { goTo, showToast } = useApp();

  return (
    <div className="bottom-nav">
      {navItems.map(item => (
        <div
          key={item.id}
          className={`bn-item${active === item.id ? ' active' : ''}`}
          onClick={() => goTo(item.id)}
        >
          <div className="bn-icon">{item.icon}</div>
          <div className="bn-label">{item.label}</div>
        </div>
      ))}
    </div>
  );
}
