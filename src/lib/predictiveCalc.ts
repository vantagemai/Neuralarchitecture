/**
 * Calculadora Preditiva V2 — quanto falta para cada objetivo material
 *
 * Funil padrao Setter:
 *   100 ligacoes → 3 reunioes agendadas → ~1 venda (a cada ~10 reunioes)
 *
 * Ganhos por venda (media):
 *   Seller: 50% setup + 40% recorrencia
 *   Setter: 5% setup + 5% recorrencia + $100 bonus a cada 10 reunioes
 *
 * V2: Per-item predictions + role progression comparison
 */

import { getSession, getMonthSales, getLifetimeCommission, db, type FillData } from './store';
import { getTotalFichas } from './xp';
import { getNIProfile, type MaterialItem } from './niProfile';
import { LEVELS } from './levels';
import { PRIZE_CATALOG } from './prizes';

// ── Conversion Rates ──
const CALLS_PER_MEETING = 33;
const MEETINGS_PER_SALE = 10;
export const CALLS_PER_SALE = CALLS_PER_MEETING * MEETINGS_PER_SALE; // 330
const BONUS_PER_10 = 100;

// Average sale values (midpoint of ranges)
const AVG_SETUP = 1000;
const AVG_REC = 400;

// Commission rates
const SELLER_SETUP_PCT = 0.50;
const SELLER_REC_PCT = 0.40;
const SETTER_SETUP_PCT = 0.05;
const SETTER_REC_PCT = 0.05;

// Fichas per action
const FICHAS_PER_CONTACT = 1;
const FICHAS_PER_RESPONSE = 2;
const FICHAS_PER_FILL = 10;
const FICHAS_PER_SALE = 500;

// ── Interfaces ──

export interface ItemPrediction {
  item: MaterialItem;
  remainingValue: number;
  earnedSoFar: number;
  percentComplete: number;
  callsNeeded: number;
  salesNeeded: number;
  meetingsNeeded: number;
  daysNeeded: number;
  callsAsPartner: number;
  daysAsPartner: number;
}

export interface PredictiveResult {
  // Per sale (average)
  avgCommPerSale: number;
  avgBonusPerSale: number;

  // Calls to targets
  callsToMonthlyGoal: number;
  callsToObjective: number;
  callsToNextLevel: number;
  callsToNextPrize: number;

  // Days to targets
  daysToMonthlyGoal: number;
  daysToObjective: number;
  daysToNextLevel: number;

  // Labels
  callsToMonthlyGoalLabel: string;
  callsToObjectiveLabel: string;
  callsToNextLevelLabel: string;
  daysToMonthlyGoalLabel: string;
  daysToObjectiveLabel: string;

  // V2: Per-item predictions + lifetime data
  itemPredictions: ItemPrediction[];
  lifetimeComm: number;
}

// ── Calculation helpers ──

export function calcPredictionForMoney(targetMoney: number, role: string): {
  calls: number; sales: number; meetings: number;
} {
  if (targetMoney <= 0) return { calls: 0, sales: 0, meetings: 0 };

  const isSetter = role === 'Setter' || role === 'Social Seller';
  const commPerSale = isSetter
    ? (AVG_SETUP * SETTER_SETUP_PCT) + (AVG_REC * SETTER_REC_PCT)
    : (AVG_SETUP * SELLER_SETUP_PCT) + (AVG_REC * SELLER_REC_PCT);
  const bonusPerSale = isSetter ? BONUS_PER_10 : 0;
  const totalPerSale = commPerSale + bonusPerSale;

  if (totalPerSale <= 0) return { calls: Infinity, sales: Infinity, meetings: Infinity };

  const sales = Math.ceil(targetMoney / totalPerSale);
  const meetings = sales * MEETINGS_PER_SALE;
  const calls = sales * CALLS_PER_SALE;
  return { calls, sales, meetings };
}

function calcCallsForFichas(targetFichas: number, dailyCalls: number): number {
  if (targetFichas <= 0) return 0;
  if (dailyCalls <= 0) return Infinity;

  const responsesPerDay = dailyCalls * 0.05;
  const fichasPerDay = (dailyCalls * FICHAS_PER_CONTACT) +
    (responsesPerDay * FICHAS_PER_RESPONSE) +
    FICHAS_PER_FILL;
  const salesPerDay = dailyCalls / CALLS_PER_SALE;
  const saleFichasPerDay = salesPerDay * FICHAS_PER_SALE;
  const totalFichasPerDay = fichasPerDay + saleFichasPerDay;

  if (totalFichasPerDay <= 0) return Infinity;

  const daysNeeded = Math.ceil(targetFichas / totalFichasPerDay);
  return daysNeeded * dailyCalls;
}

// ── Main ──

export function getPredictiveData(userId?: string): PredictiveResult {
  const id = userId || getSession()?.id || 'anon';
  const session = getSession();
  const role = session?.role || 'Setter';
  const isSetter = role === 'Setter' || role === 'Social Seller';

  const dailyCalls = getUserAvgDailyCalls(id);
  const effectiveDailyCalls = dailyCalls || 50;

  // Current month commission (for monthly goal)
  const allSales = getMonthSales();
  const mySales = allSales.filter(s => s.sellerId === id || s.sellerName === (session?.name || ''));
  const currentMonthComm = mySales.reduce((t, s) => t + (s.sellerSetupComm || 0) + (s.sellerRecComm || 0), 0);

  // Lifetime commission (for material items — fixes the monthly reset bug)
  const lifetimeComm = getLifetimeCommission(id, session?.name);

  // NIProfile
  const profile = getNIProfile(id);
  const metaM = profile?.metaM || 0;

  // Current fichas and level
  const currentFichas = getTotalFichas(id);

  // Level thresholds from canonical source
  const levelThresholds = LEVELS.map(l => l.minXp);
  const currentLevelIdx = levelThresholds.findIndex((_t, i) =>
    i === levelThresholds.length - 1 || currentFichas < levelThresholds[i + 1]
  );
  const nextLevelFichas = currentLevelIdx < levelThresholds.length - 1
    ? levelThresholds[currentLevelIdx + 1] - currentFichas
    : 0;

  // Next prize from canonical source
  const prizeThresholds = PRIZE_CATALOG.map(p => p.fichas);
  const nextPrizeFichas = prizeThresholds.find(p => p > currentFichas)
    ? (prizeThresholds.find(p => p > currentFichas)! - currentFichas)
    : 0;

  // Average commission per sale
  const avgCommPerSale = isSetter
    ? (AVG_SETUP * SETTER_SETUP_PCT) + (AVG_REC * SETTER_REC_PCT)
    : (AVG_SETUP * SELLER_SETUP_PCT) + (AVG_REC * SELLER_REC_PCT);
  const avgBonusPerSale = isSetter ? BONUS_PER_10 : 0;

  // Monthly goal prediction (uses current month commission)
  const remainingForMonthly = Math.max(0, metaM - currentMonthComm);
  const monthlyPred = calcPredictionForMoney(remainingForMonthly, role);

  // Per-item predictions (uses lifetime commission)
  const materials = profile?.materials || [];
  const itemPredictions: ItemPrediction[] = materials.map(item => {
    const remaining = Math.max(0, item.value - lifetimeComm);
    const currentPred = calcPredictionForMoney(remaining, role);
    const partnerPred = calcPredictionForMoney(remaining, 'Partner');

    return {
      item,
      remainingValue: remaining,
      earnedSoFar: item.value > 0 ? Math.min(lifetimeComm, item.value) : 0,
      percentComplete: item.value > 0 ? Math.min(100, Math.round((lifetimeComm / item.value) * 100)) : 0,
      callsNeeded: currentPred.calls,
      salesNeeded: currentPred.sales,
      meetingsNeeded: currentPred.meetings,
      daysNeeded: currentPred.calls > 0 ? Math.ceil(currentPred.calls / effectiveDailyCalls) : 0,
      callsAsPartner: partnerPred.calls,
      daysAsPartner: partnerPred.calls > 0 ? Math.ceil(partnerPred.calls / effectiveDailyCalls) : 0,
    };
  });

  // Backward compat: flat fields point to priority-1 item
  const primary = itemPredictions.find(p => p.item.priority === 1) || itemPredictions[0];
  const callsToObjective = primary?.callsNeeded || 0;
  const daysToObjective = primary?.daysNeeded || 0;

  // Level/prize predictions
  const callsToNextLevel = calcCallsForFichas(nextLevelFichas, effectiveDailyCalls);
  const callsToNextPrize = calcCallsForFichas(nextPrizeFichas, effectiveDailyCalls);
  const daysToMonthlyGoal = monthlyPred.calls > 0 ? Math.ceil(monthlyPred.calls / effectiveDailyCalls) : 0;
  const daysToNextLevel = callsToNextLevel > 0 ? Math.ceil(callsToNextLevel / effectiveDailyCalls) : 0;

  return {
    avgCommPerSale,
    avgBonusPerSale,
    callsToMonthlyGoal: monthlyPred.calls,
    callsToObjective,
    callsToNextLevel,
    callsToNextPrize,
    daysToMonthlyGoal,
    daysToObjective,
    daysToNextLevel,
    callsToMonthlyGoalLabel: monthlyPred.calls > 0
      ? `${monthlyPred.calls.toLocaleString()} ligacoes`
      : 'Meta batida!',
    callsToObjectiveLabel: callsToObjective > 0
      ? `${callsToObjective.toLocaleString()} ligacoes`
      : primary ? 'Objetivo alcancado!' : '',
    callsToNextLevelLabel: callsToNextLevel > 0
      ? `${callsToNextLevel.toLocaleString()} ligacoes`
      : 'Nivel maximo!',
    daysToMonthlyGoalLabel: daysToMonthlyGoal > 0
      ? `~${daysToMonthlyGoal} dias uteis`
      : '',
    daysToObjectiveLabel: daysToObjective > 0
      ? `~${daysToObjective} dias uteis`
      : '',
    itemPredictions,
    lifetimeComm,
  };
}

/** Media de ligacoes/dia nos ultimos 7 dias */
function getUserAvgDailyCalls(userId: string): number {
  let totalCalls = 0;
  let daysWithData = 0;

  for (let i = 0; i < 7; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    const fill = db.get<FillData>(`ops_fill_${dateStr}_${userId}`);
    if (fill) {
      const calls = Object.values(fill.channels).reduce((t, ch) => t + (parseInt(ch.a) || 0), 0);
      totalCalls += calls;
      daysWithData++;
    }
  }

  return daysWithData > 0 ? Math.round(totalCalls / daysWithData) : 0;
}
