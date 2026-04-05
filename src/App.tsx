import { useState } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AppLayout } from './components/layout/AppLayout';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { FillPage } from './pages/FillPage';
import { PipelinePage } from './pages/PipelinePage';
import { RankingPage } from './pages/RankingPage';
import { VendasPage } from './pages/VendasPage';
import { ExtratosPage } from './pages/ExtratosPage';
import { TimePage } from './pages/TimePage';
import { IdentidadePage } from './pages/IdentidadePage';
import { ConfigPage } from './pages/ConfigPage';
import { TvPage } from './pages/TvPage';
import { BadgesPage } from './pages/BadgesPage';
import { ToastContainer } from './components/ui/Toast';
import { ConfettiContainer } from './components/ui/Confetti';

export interface UserSession {
  id: string;
  name: string;
  role: string;
  email: string;
}

function App() {
  const [user, setUser] = useState<UserSession | null>(() => {
    const saved = localStorage.getItem('vantagem_session');
    return saved ? JSON.parse(saved) : null;
  });

  const handleLogin = (u: UserSession) => {
    localStorage.setItem('vantagem_session', JSON.stringify(u));
    setUser(u);
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
          <Route path="tv" element={<TvPage />} />
          {/* Manager+ only */}
          {isManager && <Route path="pipeline" element={<PipelinePage />} />}
          {isManager && <Route path="extratos" element={<ExtratosPage />} />}
          {/* Head/Founder only */}
          {isHead && <Route path="time" element={<TimePage />} />}
          {isHead && <Route path="config" element={<ConfigPage />} />}
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
