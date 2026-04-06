import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AppLayout } from './components/layout/AppLayout';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { FillPage } from './pages/FillPage';
import { PremiacoesPage } from './pages/PremiacoesPage';
import { RankingPage } from './pages/RankingPage';
import { VendasPage } from './pages/VendasPage';
import { ExtratosPage } from './pages/ExtratosPage';
import { TimePage } from './pages/TimePage';
import { IdentidadePage } from './pages/IdentidadePage';
import { ConfigPage } from './pages/ConfigPage';
import { TvPage } from './pages/TvPage';
import { BadgesPage } from './pages/BadgesPage';
import { DesafiosPage } from './pages/DesafiosPage';
import { CoachingPage } from './pages/CoachingPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { PerfilPage } from './pages/PerfilPage';
import { ToastContainer } from './components/ui/Toast';
import { ConfettiContainer } from './components/ui/Confetti';
import { OnboardingTour, shouldShowOnboarding } from './components/ui/OnboardingTour';
import { initSupabase, isOnline } from './lib/supabase';
import { hydrateFromSupabase, subscribeSales, subscribeShoutouts, subscribeNotifications } from './lib/supabaseSync';
import { playNotification } from './lib/sounds';

export interface UserSession {
  id: string;
  name: string;
  role: string;
  email: string;
}

// Seed default admin — always ensure it exists
function seedDefaultAdmin() {
  const PREFIX = 'vops_';
  const existing = localStorage.getItem(PREFIX + 'ops_users');
  const users: any[] = existing ? JSON.parse(existing) : [];
  const adminExists = users.some((u: any) => u.email === 'admin@vantagem.ai');
  if (!adminExists) {
    const admin = {
      id: 'u_admin_head',
      name: 'Admin Head',
      email: 'admin@vantagem.ai',
      password: 'admin123',
      role: 'Head',
      plan: 'FOUNDER',
      active: true,
      createdAt: Date.now(),
    };
    users.push(admin);
    localStorage.setItem(PREFIX + 'ops_users', JSON.stringify(users));
    console.log('[Seed] Admin account created: admin@vantagem.ai / admin123');
  }
}
seedDefaultAdmin();

function App() {
  const [user, setUser] = useState<UserSession | null>(() => {
    const saved = localStorage.getItem('vantagem_session');
    return saved ? JSON.parse(saved) : null;
  });

  const [showOnboarding, setShowOnboarding] = useState(false);
  const [, setSupabaseStatus] = useState<'connecting' | 'online' | 'offline'>('connecting');

  // Initialize Supabase on mount
  useEffect(() => {
    initSupabase().then(async (online) => {
      setSupabaseStatus(online ? 'online' : 'offline');
      if (online) {
        await hydrateFromSupabase();
        // Set up real-time subscriptions
        subscribeSales(() => {
          document.dispatchEvent(new Event('xp-update'));
        });
        subscribeShoutouts(() => {
          document.dispatchEvent(new Event('xp-update'));
        });
        if (user?.id) {
          subscribeNotifications(user.id, () => {
            playNotification();
            document.dispatchEvent(new Event('xp-update'));
          });
        }
      }
    });
  }, [user?.id]);

  const handleLogin = (u: UserSession) => {
    localStorage.setItem('vantagem_session', JSON.stringify(u));
    setUser(u);
    // Check onboarding after login
    setTimeout(() => {
      if (shouldShowOnboarding()) setShowOnboarding(true);
    }, 500);
    // Re-hydrate after login
    if (isOnline()) hydrateFromSupabase();
  };

  const handleLogout = () => {
    localStorage.removeItem('vantagem_session');
    setUser(null);
  };

  if (!user) {
    return (
      <>
        <LoginPage onLogin={handleLogin} />
        <ToastContainer />
      </>
    );
  }

  // Role-based route filtering
  const isHead = user.role === 'Head' || user.role === 'Founder';
  const isManager = isHead || user.role === 'Partner';

  return (
    <BrowserRouter basename="/Neuralarchitecture">
      <ToastContainer />
      <ConfettiContainer />
      {showOnboarding && <OnboardingTour onClose={() => setShowOnboarding(false)} />}

      {/* Supabase status now shown in StatusBar */}

      <Routes>
        <Route element={
          <AppLayout
            userName={user.name}
            userRole={user.role}
            onLogout={handleLogout}
          />
        }>
          <Route index element={<DashboardPage />} />
          <Route path="fill" element={<FillPage />} />
          <Route path="vendas" element={<VendasPage />} />
          <Route path="ranking" element={<RankingPage />} />
          <Route path="identidade" element={<IdentidadePage />} />
          <Route path="badges" element={<BadgesPage />} />
          <Route path="desafios" element={<DesafiosPage />} />
          <Route path="tv" element={<TvPage />} />
          <Route path="perfil/:userId" element={<PerfilPage />} />
          {/* Manager+ only */}
          <Route path="premiacoes" element={<PremiacoesPage />} />
          {isManager && <Route path="extratos" element={<ExtratosPage />} />}
          {isManager && <Route path="coaching" element={<CoachingPage />} />}
          {/* Head/Founder only */}
          {isHead && <Route path="time" element={<TimePage />} />}
          {isHead && <Route path="config" element={<ConfigPage />} />}
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
