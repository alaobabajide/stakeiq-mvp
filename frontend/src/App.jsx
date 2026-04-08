import { AppProvider, useApp } from './context/AppContext';
import Toast from './components/Toast';
import SplashScreen from './screens/SplashScreen';
import OnboardScreen from './screens/OnboardScreen';
import RegisterScreen from './screens/RegisterScreen';
import LoginScreen from './screens/LoginScreen';
import { KYC1Screen, KYC2Screen, KYC3Screen, KYC4Screen, KYC5Screen } from './screens/KYCScreens';
import HomeScreen from './screens/HomeScreen';
import BetslipScreen from './screens/BetslipScreen';
import TipstersScreen from './screens/TipstersScreen';
import WithdrawScreen from './screens/WithdrawScreen';
import SpendScreen from './screens/SpendScreen';
import DepositScreen from './screens/DepositScreen';

const SCREENS = {
  splash: SplashScreen,
  onboard: OnboardScreen,
  register: RegisterScreen,
  login: LoginScreen,
  kyc1: KYC1Screen,
  kyc2: KYC2Screen,
  kyc3: KYC3Screen,
  kyc4: KYC4Screen,
  kyc5: KYC5Screen,
  home: HomeScreen,
  betslip: BetslipScreen,
  tipsters: TipstersScreen,
  withdraw: WithdrawScreen,
  spend: SpendScreen,
  deposit: DepositScreen,
};

function AppShell() {
  const { screen } = useApp();
  const ActiveScreen = SCREENS[screen] || SplashScreen;

  return (
    <div className="shell">
      {/* Status Bar */}
      <div className="status-bar">
        <span>9:41</span>
        <span>📶 3G &nbsp; 🔋 72%</span>
      </div>

      <ActiveScreen />
      <Toast />
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <AppShell />
    </AppProvider>
  );
}
