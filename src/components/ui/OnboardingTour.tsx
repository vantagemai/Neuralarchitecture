import { useState } from 'react';
import { X, ArrowRight } from 'lucide-react';
import { db, getSession } from '../../lib/store';

interface Step {
  title: string;
  description: string;
  icon: string;
  link: string;
}

const STEPS: Step[] = [
  { title: 'Dashboard', description: 'Visao geral do time: KPIs, graficos, atividade do dia.', icon: '📊', link: '/' },
  { title: 'Fill Diario', description: 'Registre sua atividade de prospeccao por canal, todos os dias.', icon: '📋', link: '/fill' },
  { title: 'Vendas', description: 'Registre vendas e acompanhe suas comissoes em tempo real.', icon: '💰', link: '/vendas' },
  { title: 'Ranking', description: 'Compare seu desempenho com o time. Atividade, receita e XP.', icon: '🏆', link: '/ranking' },
  { title: 'Conquistas', description: 'Desbloqueie badges, suba de nivel e acompanhe seu XP.', icon: '⭐', link: '/badges' },
];

function onboardingKey(): string {
  const id = getSession()?.id || 'anon';
  return `onboarding_done_${id}`;
}

export function shouldShowOnboarding(): boolean {
  return !db.get<boolean>(onboardingKey());
}

export function OnboardingTour({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState(0);
  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;

  const finish = () => {
    db.set(onboardingKey(), true);
    onClose();
  };

  const next = () => {
    if (isLast) finish();
    else setStep(s => s + 1);
  };

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center">
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

      {/* Card */}
      <div className="relative bg-surface border border-b1 rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl animate-in">
        <button onClick={finish} className="absolute top-4 right-4 text-t4 hover:text-t2 transition-colors">
          <X size={18} />
        </button>

        {/* Progress */}
        <div className="flex gap-1 mb-6">
          {STEPS.map((_, i) => (
            <div key={i} className={`h-1 flex-1 rounded-full transition-all ${i <= step ? 'bg-vred' : 'bg-muted'}`} />
          ))}
        </div>

        {/* Icon */}
        <div className="text-5xl mb-4">{current.icon}</div>

        {/* Content */}
        <h2 className="text-xl font-bold mb-2">{current.title}</h2>
        <p className="text-sm text-t3 mb-6 leading-relaxed">{current.description}</p>

        {/* Step indicator */}
        <div className="text-[10px] text-t4 uppercase tracking-wider mb-4">
          Passo {step + 1} de {STEPS.length}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between">
          {step > 0 ? (
            <button onClick={() => setStep(s => s - 1)} className="text-sm text-t3 hover:text-t1 transition-colors">
              ← Voltar
            </button>
          ) : (
            <button onClick={finish} className="text-sm text-t4 hover:text-t2 transition-colors">
              Pular tour
            </button>
          )}
          <button onClick={next}
            className="flex items-center gap-2 bg-vred hover:bg-vred-dark text-white font-bold px-6 py-2.5 rounded-lg transition-colors">
            {isLast ? 'Comecar!' : 'Proximo'} <ArrowRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
