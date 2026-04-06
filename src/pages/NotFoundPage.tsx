import { ArrowLeft } from 'lucide-react';
import { Logo } from '../components/ui/Logo';

export function NotFoundPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
      <div className="text-3xl font-black font-mono text-vred neon-red mb-4">404</div>
      <h1 className="text-xl font-bold mb-2">Pagina nao encontrada</h1>
      <p className="text-sm text-t3 mb-6 max-w-md">
        A rota que voce tentou acessar nao existe. Verifique o endereco ou volte ao dashboard.
      </p>
      <a href="/Neuralarchitecture/" className="flex items-center gap-2 bg-vred hover:bg-vred-dark text-white font-bold px-6 py-3 rounded-lg transition-colors">
        <ArrowLeft size={16} /> Voltar ao Dashboard
      </a>
      <div className="mt-5 opacity-30">
        <Logo size="sm" />
      </div>
    </div>
  );
}
