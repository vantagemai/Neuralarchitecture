import { getTotalFichas } from './xp';

export interface Level {
  rank: number;
  name: string;
  minXp: number;        // fichas threshold (key kept for compat)
  color: string;
  icon: string;
  criteria?: string;
  award?: string;
}

// Career progression aligned with Vantagem.ai portal
export const LEVELS: Level[] = [
  { rank: 1, name: 'Spark',    minXp: 0,       color: 'text-t3',        icon: '⚡', criteria: '1a venda' },
  { rank: 2, name: 'Hustle',   minXp: 500,     color: 'text-vgold',     icon: '🔥', criteria: '5 clientes ativos', award: '$500 bonus + Kit' },
  { rank: 3, name: 'Bronze',   minXp: 2000,    color: 'text-amber-600', icon: '🥉', criteria: '$3k MRR proprio', award: 'Car $400/mo' },
  { rank: 4, name: 'Silver',   minXp: 8000,    color: 'text-gray-400',  icon: '🥈', criteria: '$10k MRR total', award: 'Car $800/mo + Silver Ring + Retreat' },
  { rank: 5, name: 'Gold',     minXp: 25000,   color: 'text-vgold',     icon: '🥇', criteria: '$30k MRR total', award: 'Car $1.5k/mo + Gold Ring + Viagem' },
  { rank: 6, name: 'Platinum', minXp: 80000,   color: 'text-vpurp',     icon: '💠', criteria: '$80k MRR total', award: 'Car $2.5k/mo + $15k bonus + Mastermind' },
  { rank: 7, name: 'Diamond',  minXp: 250000,  color: 'text-vblue',     icon: '💎', criteria: '$200k+ MRR rede', award: 'Car $4k/mo + Diamond Ring + Lifetime' },
];

export function getLevel(userId?: string): Level {
  const fichas = getTotalFichas(userId);
  let current = LEVELS[0];
  for (const lvl of LEVELS) {
    if (fichas >= lvl.minXp) current = lvl;
  }
  return current;
}

export function getNextLevel(userId?: string): { next: Level | null; progress: number; xpNeeded: number } {
  const fichas = getTotalFichas(userId);
  const current = getLevel(userId);
  const idx = LEVELS.indexOf(current);

  if (idx >= LEVELS.length - 1) {
    return { next: null, progress: 100, xpNeeded: 0 };
  }

  const next = LEVELS[idx + 1];
  const rangeStart = current.minXp;
  const rangeEnd = next.minXp;
  const progress = Math.min(100, Math.round(((fichas - rangeStart) / (rangeEnd - rangeStart)) * 100));
  const xpNeeded = rangeEnd - fichas;

  return { next, progress, xpNeeded };
}

export function getLevelByXp(xp: number): Level {
  let current = LEVELS[0];
  for (const lvl of LEVELS) {
    if (xp >= lvl.minXp) current = lvl;
  }
  return current;
}
