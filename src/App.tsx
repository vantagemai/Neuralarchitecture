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
import { PlaceholderPage } from './pages/PlaceholderPage';

function App() {
  const [user, setUser] = useState<{ name: string; role: string } | null>(() => {
    const saved = localStorage.getItem('vantagem_session');
    return saved ? JSON.parse(saved) : null;
  });

  const handleLogin = (name: string, role: string) => {
    const session = { name, role };
    localStorage.setItem('vantagem_session', JSON.stringify(session));
    setUser(session);
  };

  const handleLogout = () => {
    localStorage.removeItem('vantagem_session');
    setUser(null);
  };

  if (!user) {
    return <LoginPage onLogin={handleLogin} />;
  }

  return (
    <BrowserRouter basename="/Neuralarchitecture">
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
          <Route path="pipeline" element={<PipelinePage />} />
          <Route path="ranking" element={<RankingPage />} />
          <Route path="vendas" element={<VendasPage />} />
          <Route path="extratos" element={<ExtratosPage />} />
          <Route path="time" element={<TimePage />} />
          <Route path="identidade" element={<IdentidadePage />} />
          <Route path="config" element={<ConfigPage />} />
          <Route path="tv" element={<PlaceholderPage title="Painel TV" description="Acesse painel-tv.html para a versão fullscreen." />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
