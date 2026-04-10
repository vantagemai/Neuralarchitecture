import { getTotalFichas } from './xp';

export interface Prize {
  id: string;
  name: string;
  fichas: number;
  icon: string;
  tier: number;
}

export const PRIZE_CATALOG: Prize[] = [
  { id: 'caneca',  name: 'Caneca Vantagem',          fichas: 500,    icon: '☕',  tier: 1 },
  { id: 'jantar',  name: 'Jantar com Acompanhante',   fichas: 2000,   icon: '🍽️', tier: 2 },
  { id: 'viagem',  name: 'Viagem',                    fichas: 10000,  icon: '✈️',  tier: 3 },
  { id: 'pcx',     name: 'Honda PCX 160',             fichas: 30000,  icon: '🏍️', tier: 4 },
  { id: 'iphone',  name: 'iPhone 17 Pro Max',         fichas: 50000,  icon: '📱',  tier: 4 },
  { id: 'macbook', name: 'MacBook Pro',               fichas: 60000,  icon: '💻',  tier: 5 },
  { id: 'civic',   name: 'Honda Civic',               fichas: 150000, icon: '🚗',  tier: 6 },
  { id: 'bmw',     name: 'BMW 320i',                  fichas: 300000, icon: '🏎️', tier: 7 },
];

export function getNextRedeemablePrize(userId?: string): { prize: Prize; pct: number; fichasNeeded: number } | null {
  const fichas = getTotalFichas(userId);
  for (const prize of PRIZE_CATALOG) {
    if (fichas < prize.fichas) {
      return {
        prize,
        pct: Math.round((fichas / prize.fichas) * 100),
        fichasNeeded: prize.fichas - fichas,
      };
    }
  }
  return null; // user can afford everything
}
