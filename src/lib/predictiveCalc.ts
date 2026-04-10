/**
 * Calculadora Preditiva — quanto falta para cada objetivo
 *
 * Funil padrao Setter:
 *   100 ligacoes → 3 reunioes agendadas → ~1 venda (a cada ~10 reunioes)
 *
 * Ganhos por venda (media):
 *   Seller: 50% setup + 40% recorrencia
 *   Setter: 5% setup + 5% recorrencia + $100 bonus a cada 10 reunioes
 *
 * Fichas por dia (media):
 *   contacts * 1 + responses * 2 + 10 (fill) + vendas * 500
 */

import { getSession, getMonthSales, db, type FillData } from './store';
import { getTotalFichas } from './xp';
// Level thresholds are inlined to avoid circular dependencies

// ── Conversion Rates (padrao da operacao) ──
const CALLS_PER_MEETING = 33;   // ~100 ligacoes / 3 reunioes
const MEETINGS_PER_SALE = 10;   // 10 reunioes → 1 venda
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

export interface PredictiveResult {
  // Per sale (average)
  avgCommPerSale: number;        // total commission per sale (setup + rec)
  avgBonusPerSale: number;       // bonus allocation per sale

  // Calls to targets
  callsToMonthlyGoal: number;    // ligacoes ate bater a meta mensal
  callsToObjective: number;      // ligacoes ate o dreamItemValue (bem desejado)
  callsToNextLevel: number;      // ligacoes ate proximo nivel
  callsToNextPrize: number;      // ligacoes ate proximo premio (fichas)

  // Days to targets (based on daily call rate)
  daysToMonthlyGoal: number;
  daysToObjective: number;
  daysToNextLevel: number;

  // Readable strings
  callsToMonthlyGoalLabel: string;
  callsToObjectiveLabel: string;
  callsToNextLevelLabel: string;
  daysToMonthlyGoalLabel: string;
  daysToObjectiveLabel: string;
}

// CalcParams used internally by getPredictiveData

function calcCallsForMoney(targetMoney: number, role: string): number {
  if (targetMoney <= 0) return 0;

  const isSetter = role === 'Setter' || role === 'Social Seller';

  // Revenue per sale based on role
  const commPerSale = isSetter
    ? (AVG_SETUP * SETTER_SETUP_PCT) + (AVG_REC * SETTER_REC_PCT)
    : (AVG_SETUP * SELLER_SETUP_PCT) + (AVG_REC * SELLER_REC_PCT);

  // Bonus per sale (setter gets $100 per 10 meetings, 10 meetings = 1 sale)
  const bonusPerSale = isSetter ? BONUS_PER_10 : 0;

  const totalPerSale = commPerSale + bonusPerSale;
  if (totalPerSale <= 0) return Infinity;

  const salesNeeded = Math.ceil(targetMoney / totalPerSale);
  return salesNeeded * CALLS_PER_SALE;
}

function calcCallsForFichas(targetFichas: number, dailyCalls: number): number {
  if (targetFichas <= 0) return 0;
  if (dailyCalls <= 0) return Infinity;

  // Per day: contacts generate fichas + responses + fill + occasional sale
  const responsesPerDay = dailyCalls * 0.05; // ~5% response rate
  const fichasPerDay = (dailyCalls * FICHAS_PER_CONTACT) +
    (responsesPerDay * FICHAS_PER_RESPONSE) +
    FICHAS_PER_FILL;

  // Sales contribute fichas too: dailyCalls / CALLS_PER_SALE = sales per day fraction
  const salesPerDay = dailyCalls / CALLS_PER_SALE;
  const saleFichasPerDay = salesPerDay * FICHAS_PER_SALE;

  const totalFichasPerDay = fichasPerDay + saleFichasPerDay;
  if (totalFichasPerDay <= 0) return Infinity;

  const daysNeeded = Math.ceil(targetFichas / totalFichasPerDay);
  return daysNeeded * dailyCalls;
}

export function getPredictiveData(userId?: string): PredictiveResult {
  const id = userId || getSession()?.id || 'anon';
  const session = getSession();
  const role = session?.role || 'Setter';
  const isSetter = role === 'Setter' || role === 'Social Seller';

  // Get user's real daily call average (last 7 days)
  const dailyCalls = getUserAvgDailyCalls(id);

  // Current accumulated data
  const allSales = getMonthSales(); // only this month, but used for estimation
  const mySales = allSales.filter(s => s.sellerId === id || s.sellerName === (session?.name || ''));
  const currentMonthComm = mySales.reduce((t, s) => t + (s.sellerSetupComm || 0) + (s.sellerRecComm || 0), 0);

  // NIProfile for goals
  const niProfile = db.get<any>(`ni_profile_${id}`);
  const metaM = niProfile?.metaM || 0;            // meta mensal
  const dreamItemValue = niProfile?.dreamItemValue || 0; // valor do bem (carro, casa, etc)

  // Current fichas and level
  const currentFichas = getTotalFichas(id);

  // Level thresholds
  const LEVEL_THRESHOLDS = [0, 500, 2000, 8000, 25000, 80000, 250000];
  const currentLevelIdx = LEVEL_THRESHOLDS.findIndex((_t, i) =>
    i === LEVEL_THRESHOLDS.length - 1 || currentFichas < LEVEL_THRESHOLDS[i + 1]
  );
  const nextLevelFichas = currentLevelIdx < LEVEL_THRESHOLDS.length - 1
    ? LEVEL_THRESHOLDS[currentLevelIdx + 1] - currentFichas
    : 0;

  // Next prize (imported from prizes.ts logic inline to avoid circular dep)
  const PRIZE_THRESHOLDS = [500, 2000, 10000, 30000, 50000, 60000, 150000, 300000];
  const nextPrizeFichas = PRIZE_THRESHOLDS.find(p => p > currentFichas)
    ? (PRIZE_THRESHOLDS.find(p => p > currentFichas)! - currentFichas)
    : 0;

  // Average commission per sale
  const avgCommPerSale = isSetter
    ? (AVG_SETUP * SETTER_SETUP_PCT) + (AVG_REC * SETTER_REC_PCT)
    : (AVG_SETUP * SELLER_SETUP_PCT) + (AVG_REC * SELLER_REC_PCT);
  const avgBonusPerSale = isSetter ? BONUS_PER_10 : 0;

  // Remaining money for monthly goal
  const remainingForMonthly = Math.max(0, metaM - currentMonthComm);

  // Remaining money for dream item (long-term, all-time accumulation)
  const remainingForDream = Math.max(0, dreamItemValue - currentMonthComm);

  // Calls needed
  const callsToMonthlyGoal = calcCallsForMoney(remainingForMonthly, role);
  const callsToObjective = dreamItemValue > 0 ? calcCallsForMoney(remainingForDream, role) : 0;
  const callsToNextLevel = calcCallsForFichas(nextLevelFichas, dailyCalls || 50);
  const callsToNextPrize = calcCallsForFichas(nextPrizeFichas, dailyCalls || 50);

  // Days to targets
  const effectiveDailyCalls = dailyCalls || 50;
  const daysToMonthlyGoal = callsToMonthlyGoal > 0 ? Math.ceil(callsToMonthlyGoal / effectiveDailyCalls) : 0;
  const daysToObjective = callsToObjective > 0 ? Math.ceil(callsToObjective / effectiveDailyCalls) : 0;
  const daysToNextLevel = callsToNextLevel > 0 ? Math.ceil(callsToNextLevel / effectiveDailyCalls) : 0;

  return {
    avgCommPerSale,
    avgBonusPerSale,
    callsToMonthlyGoal,
    callsToObjective,
    callsToNextLevel,
    callsToNextPrize,
    daysToMonthlyGoal,
    daysToObjective,
    daysToNextLevel,
    callsToMonthlyGoalLabel: callsToMonthlyGoal > 0
      ? `${callsToMonthlyGoal.toLocaleString()} ligacoes`
      : 'Meta batida!',
    callsToObjectiveLabel: callsToObjective > 0
      ? `${callsToObjective.toLocaleString()} ligacoes`
      : dreamItemValue > 0 ? 'Objetivo alcancado!' : '',
    callsToNextLevelLabel: callsToNextLevel > 0
      ? `${callsToNextLevel.toLocaleString()} ligacoes`
      : 'Nivel maximo!',
    daysToMonthlyGoalLabel: daysToMonthlyGoal > 0
      ? `~${daysToMonthlyGoal} dias uteis`
      : '',
    daysToObjectiveLabel: daysToObjective > 0
      ? `~${daysToObjective} dias uteis`
      : '',
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
