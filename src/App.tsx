import { useState, useEffect, lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { AppLayout } from './components/layout/AppLayout';
import { LoginPage } from './pages/LoginPage';
import { ToastContainer } from './components/ui/Toast';
import { ConfettiContainer } from './components/ui/Confetti';
import { OnboardingTour, shouldShowOnboarding } from './components/ui/OnboardingTour';
import { initSupabase, isOnline } from './lib/supabase';
import { hydrateFromSupabase, subscribeSales, subscribeShoutouts, subscribeNotifications } from './lib/supabaseSync';
import { playNotification } from './lib/sounds';

// Lazy-loaded pages (code splitting)
const DashboardPage = lazy(() => import('./pages/DashboardPage').then(m => ({ default: m.DashboardPage })));
const FillPage = lazy(() => import('./pages/FillPage').then(m => ({ default: m.FillPage })));
const PremiacoesPage = lazy(() => import('./pages/PremiacoesPage').then(m => ({ default: m.PremiacoesPage })));
const RankingPage = lazy(() => import('./pages/RankingPage').then(m => ({ default: m.RankingPage })));
const VendasPage = lazy(() => import('./pages/VendasPage').then(m => ({ default: m.VendasPage })));
const ExtratosPage = lazy(() => import('./pages/ExtratosPage').then(m => ({ default: m.ExtratosPage })));
const TimePage = lazy(() => import('./pages/TimePage').then(m => ({ default: m.TimePage })));
const IdentidadePage = lazy(() => import('./pages/IdentidadePage').then(m => ({ default: m.IdentidadePage })));
const ConfigPage = lazy(() => import('./pages/ConfigPage').then(m => ({ default: m.ConfigPage })));
const TvPage = lazy(() => import('./pages/TvPage').then(m => ({ default: m.TvPage })));
const BadgesPage = lazy(() => import('./pages/BadgesPage').then(m => ({ default: m.BadgesPage })));
const DesafiosPage = lazy(() => import('./pages/DesafiosPage').then(m => ({ default: m.DesafiosPage })));
const CoachingPage = lazy(() => import('./pages/CoachingPage').then(m => ({ default: m.CoachingPage })));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage').then(m => ({ default: m.NotFoundPage })));
const PerfilPage = lazy(() => import('./pages/PerfilPage').then(m => ({ default: m.PerfilPage })));

// Scroll restoration on route change
function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);
  return null;
}

// Loading fallback
function PageLoader() {
  return (
    <div className="flex items-center justify-center py-24">
      <div className="w-6 h-6 border-2 border-vred/30 border-t-vred rounded-full animate-spin" />
    </div>
  );
}

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
      <ScrollToTop />
      <ToastContainer />
      <ConfettiContainer />
      {showOnboarding && <OnboardingTour onClose={() => setShowOnboarding(false)} />}

      <Suspense fallback={<PageLoader />}>
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
      </Suspense>
    </BrowserRouter>
  );
}

export default App;
