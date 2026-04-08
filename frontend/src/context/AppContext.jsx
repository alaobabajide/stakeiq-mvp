import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import api from '../api/client';

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [screen, setScreen] = useState('splash');
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem('stakeiq_token'));
  const [toast, setToast] = useState({ msg: '', visible: false });
  const [betslipItems, setBetslipItems] = useState([]); // { oddId, matchId, outcome, label, oddValue, matchLabel }
  const [wallet, setWallet] = useState(null);
  const [stats, setStats] = useState(null);

  const showToast = useCallback((msg) => {
    setToast({ msg, visible: true });
    setTimeout(() => setToast(t => ({ ...t, visible: false })), 2400);
  }, []);

  const goTo = useCallback((s) => setScreen(s), []);

  const login = useCallback((token, userData) => {
    localStorage.setItem('stakeiq_token', token);
    setToken(token);
    setUser(userData);
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('stakeiq_token');
    setToken(null);
    setUser(null);
    delete api.defaults.headers.common['Authorization'];
    setScreen('splash');
  }, []);

  // Bootstrap auth
  useEffect(() => {
    if (token) {
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      api.get('/auth/me').then(r => setUser(r.data.user)).catch(() => logout());
    }
  }, []);

  const toggleOdd = useCallback((item) => {
    setBetslipItems(prev => {
      const existingMatch = prev.find(i => i.matchId === item.matchId);
      if (existingMatch) {
        if (existingMatch.oddId === item.oddId) {
          // deselect
          return prev.filter(i => i.matchId !== item.matchId);
        } else {
          // replace outcome for this match
          return prev.map(i => i.matchId === item.matchId ? item : i);
        }
      }
      return [...prev, item];
    });
  }, []);

  const clearBetslip = useCallback(() => setBetslipItems([]), []);

  const refreshWallet = useCallback(async () => {
    if (!token) return;
    try {
      const r = await api.get('/wallet');
      setWallet(r.data.wallet);
    } catch {}
  }, [token]);

  const refreshStats = useCallback(async () => {
    if (!token) return;
    try {
      const r = await api.get('/stats/me');
      setStats(r.data);
    } catch {}
  }, [token]);

  return (
    <AppContext.Provider value={{
      screen, goTo, user, setUser, token, login, logout,
      toast, showToast, betslipItems, toggleOdd, clearBetslip,
      wallet, refreshWallet, stats, refreshStats
    }}>
      {children}
    </AppContext.Provider>
  );
}

export const useApp = () => useContext(AppContext);
