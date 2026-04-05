import { useState } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AppLayout } from './components/layout/AppLayout';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
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
    <BrowserRouter>
      <Routes>
        <Route element={
          <AppLayout
            userName={user.name}
            userRole={user.role}
            onLogout={handleLogout}
          />
        }>
          <Route index element={<DashboardPage />} />
          <Route path="fill" element={<PlaceholderPage title="Fill Diário" description="Registre sua atividade diária por canal: Cold Call, Instagram, WhatsApp, Calls e Visitas." />} />
          <Route path="pipeline" element={<PlaceholderPage title="Pipeline" description="Funil de oportunidades: Geradas → Qualificadas → Em Fechamento → Vendas." />} />
          <Route path="ranking" element={<PlaceholderPage title="Ranking" description="Ranking duplo: Atividade (score de prospecção) vs Resultado (comissão gerada)." />} />
          <Route path="vendas" element={<PlaceholderPage title="Vendas" description="Registre vendas, calcule comissões automaticamente, atribua setters." />} />
          <Route path="extratos" element={<PlaceholderPage title="Extratos" description="Comissões detalhadas por pessoa, por mês, com filtros." />} />
          <Route path="time" element={<PlaceholderPage title="Time" description="Gerencie colaboradores: adicionar, editar função, definir plano de comissão." />} />
          <Route path="identidade" element={<PlaceholderPage title="Identidade 180 Dias" description="Configure sua visão de vida, metas financeiras, e acompanhe seu progresso." />} />
          <Route path="tv" element={<PlaceholderPage title="Painel TV" description="Tela fullscreen para o escritório com ranking em tempo real." />} />
          <Route path="config" element={<PlaceholderPage title="Configurações" description="PINs de acesso, premiações, tabela de comissões." />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
