import { useState } from 'react';
import { Eye, EyeOff, LogIn, UserPlus, Sun, Moon, Loader2 } from 'lucide-react';
import type { UserSession } from '../App';
import { getTheme, toggleTheme } from '../lib/theme';
import { Logo } from '../components/ui/Logo';
import { authLogin, authRegister } from '../lib/auth';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface LoginPageProps {
  onLogin: (user: UserSession) => void;
}

export function LoginPage({ onLogin }: LoginPageProps) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('Setter');
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (mode === 'register') {
        if (!name.trim() || !email.trim() || !password.trim()) {
          setError('Preencha todos os campos');
          return;
        }
        if (!EMAIL_REGEX.test(email.trim())) {
          setError('Email invalido');
          return;
        }
        if (password.trim().length < 6) {
          setError('Senha deve ter no minimo 6 caracteres');
          return;
        }
        const result = await authRegister(name.trim(), email.trim(), password, role);
        if (!result.success) {
          setError(result.error || 'Erro ao criar conta');
          return;
        }
        onLogin(result.session!);
      } else {
        if (!email.trim() || !password.trim()) {
          setError('Preencha email e senha');
          return;
        }
        const result = await authLogin(email.trim(), password);
        if (!result.success) {
          setError(result.error || 'Email ou senha incorretos');
          return;
        }
        onLogin(result.session!);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-canvas flex items-center justify-center px-4 relative overflow-hidden">
      {/* Background effects */}
      <div className="fixed inset-0 opacity-[0.03]" style={{
        backgroundImage: 'linear-gradient(rgba(241,16,19,.5) 1px, transparent 1px), linear-gradient(90deg, rgba(241,16,19,.5) 1px, transparent 1px)',
        backgroundSize: '60px 60px'
      }} />
      <div className="fixed top-[-20%] right-[-10%] w-[50vw] max-w-[500px] h-[50vw] max-h-[500px] rounded-full bg-vred/5 blur-[120px]" />
      <div className="fixed bottom-[-20%] left-[-10%] w-[40vw] max-w-[400px] h-[40vw] max-h-[400px] rounded-full bg-vpurp/5 blur-[100px]" />

      <div className="relative w-full max-w-md animate-in">
        {/* Logo */}
        <div className="flex flex-col items-center mb-10">
          <Logo size="xl" />
        </div>

        {/* Card */}
        <div className="bg-surface border border-b1 p-5 shadow-lg shadow-black/10">
          {/* Tabs */}
          <div className="flex gap-1 bg-elevated rounded-lg p-1 mb-5">
            <button
              onClick={() => { setMode('login'); setError(''); }}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-md text-sm font-semibold transition-all ${
                mode === 'login'
                  ? 'bg-vred text-white shadow-sm shadow-vred/15'
                  : 'text-t3 hover:text-t1'
              }`}
            >
              <LogIn size={16} /> Entrar
            </button>
            <button
              onClick={() => { setMode('register'); setError(''); }}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-md text-sm font-semibold transition-all ${
                mode === 'register'
                  ? 'bg-vred text-white shadow-sm shadow-vred/15'
                  : 'text-t3 hover:text-t1'
              }`}
            >
              <UserPlus size={16} /> Cadastrar
            </button>
          </div>

          {error && (
            <div className="bg-vred/8 border border-vred/20 text-vred text-sm rounded-lg px-4 py-3 mb-6">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'register' && (
              <div>
                <label className="block text-xs text-t3 uppercase tracking-wider font-semibold mb-2">
                  Nome completo
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Ex: João Silva"
                  className="w-full bg-elevated border border-b1 rounded-lg px-4 py-3 text-sm text-t1 placeholder:text-t4 outline-none focus:border-vred/40 transition-colors"
                />
              </div>
            )}

            <div>
              <label className="block text-xs text-t3 uppercase tracking-wider font-semibold mb-2">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="seu@email.com"
                className="w-full bg-elevated border border-b1 rounded-lg px-4 py-3 text-sm text-t1 placeholder:text-t4 outline-none focus:border-vred/40 transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs text-t3 uppercase tracking-wider font-semibold mb-2">
                Senha
              </label>
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-elevated border border-b1 rounded-lg px-4 py-3 text-sm text-t1 placeholder:text-t4 outline-none focus:border-vred/40 transition-colors pr-12"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-t4 hover:text-t2"
                >
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {mode === 'register' && (
              <div>
                <label className="block text-xs text-t3 uppercase tracking-wider font-semibold mb-2">
                  Função
                </label>
                <select
                  value={role}
                  onChange={e => setRole(e.target.value)}
                  className="w-full bg-elevated border border-b1 rounded-lg px-4 py-3 text-sm text-t1 outline-none focus:border-vred/40 transition-colors appearance-none cursor-pointer"
                >
                  <option value="Setter">Setter</option>
                  <option value="Vendedor">Closer / Vendedor</option>
                  <option value="Social Seller">Social Seller</option>
                </select>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-vred hover:bg-vred-dark text-white font-bold py-3.5 rounded-lg transition-all duration-200 shadow-sm shadow-vred/15 hover:shadow-vred/40 hover:-translate-y-0.5 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 size={18} className="animate-spin" /> : null}
              {loading ? 'Conectando...' : mode === 'login' ? 'Entrar →' : 'Criar Conta →'}
            </button>
          </form>
        </div>

        <div className="flex items-center justify-center gap-3 mt-5">
          <p className="text-2xs text-t4 font-mono tracking-wider">
            v2.0 · Sistemas de Escala
          </p>
          <button
            onClick={() => { toggleTheme(); setError(''); }}
            className="p-1.5 rounded-lg text-t4 hover:text-t2 hover:bg-elevated transition-colors"
            title="Alternar tema"
          >
            {getTheme() === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
          </button>
        </div>
      </div>
    </div>
  );
}
