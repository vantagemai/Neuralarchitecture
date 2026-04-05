/**
 * Demo Seed — Populates the system with 10 realistic team members
 * Run once from ConfigPage to see the full system in action.
 */

import { db, today, currentMonth } from './store';
import { upsertUsers } from './supabaseSync';

// Generate SVG avatar as data URI
function generateAvatar(name: string, color: string): string {
  const initials = name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200">
    <defs><linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:${color}"/>
      <stop offset="100%" style="stop-color:${darken(color)}"/>
    </linearGradient></defs>
    <rect width="200" height="200" rx="100" fill="url(#g)"/>
    <text x="100" y="108" text-anchor="middle" fill="white" font-family="Inter,sans-serif" font-size="72" font-weight="700">${initials}</text>
  </svg>`;
  return 'data:image/svg+xml;base64,' + btoa(svg);
}

function darken(hex: string): string {
  const r = Math.max(0, parseInt(hex.slice(1, 3), 16) - 40);
  const g = Math.max(0, parseInt(hex.slice(3, 5), 16) - 40);
  const b = Math.max(0, parseInt(hex.slice(5, 7), 16) - 40);
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

const MEMBERS = [
  { name: 'Lucas Ferreira', email: 'lucas@vantagem.ai', role: 'Founder', plan: 'FOUNDER', color: '#F11013' },
  { name: 'Ana Beatriz Costa', email: 'ana@vantagem.ai', role: 'Founder', plan: 'FOUNDER', color: '#E91E63' },
  { name: 'Pedro Henrique Silva', email: 'pedro@vantagem.ai', role: 'Partner', plan: 'PARTNER', color: '#5B9AF5' },
  { name: 'Mariana Oliveira', email: 'mariana@vantagem.ai', role: 'Partner', plan: 'PARTNER', color: '#9B7FE0' },
  { name: 'Rafael Santos', email: 'rafael@vantagem.ai', role: 'Vendedor', plan: 'PARTNER', color: '#00C864' },
  { name: 'Juliana Pereira', email: 'juliana@vantagem.ai', role: 'Vendedor', plan: 'PARTNER', color: '#FF6B6B' },
  { name: 'Gabriel Almeida', email: 'gabriel@vantagem.ai', role: 'Setter', plan: 'SETTER', color: '#FFD130' },
  { name: 'Camila Rodrigues', email: 'camila@vantagem.ai', role: 'Setter', plan: 'SETTER', color: '#FF9800' },
  { name: 'Thiago Nascimento', email: 'thiago@vantagem.ai', role: 'Setter', plan: 'SETTER', color: '#26C6DA' },
  { name: 'Isabela Martins', email: 'isabela@vantagem.ai', role: 'Setter', plan: 'SETTER', color: '#AB47BC' },
];

const CARS = ['BMW M3', 'Porsche 911', 'Mercedes AMG', 'Audi RS7', 'Tesla Model S', 'Range Rover', 'Lamborghini', 'Corvette C8', 'Mustang GT', 'Supra MK5'];
const HOMES = ['Apartamento alto padrao', 'Casa com piscina', 'Cobertura duplex', 'Flat na praia', 'Casa no condominio', 'Penthouse centro', 'Sitio moderno', 'Loft industrial', 'Casa container', 'Mansao serra'];
const BODIES = ['Shape definido', 'Marombeiro classic', '6 pack abs', 'Atleta funcional', 'Crossfit beast', 'Runner\'s body', 'Yoga + forca', 'Swimmer build', 'MMA fighter', 'Wellness total'];
const STYLES = ['Elegante executivo', 'Streetwear premium', 'Minimalista chique', 'Esportivo luxo', 'CEO casual', 'Designer fashion', 'Classic menswear', 'Boho premium', 'Tech mogul', 'Mediterranean'];
const ANCHORS = [
  'Cada dia e uma oportunidade de ser melhor que ontem.',
  'Disciplina e a ponte entre metas e conquistas.',
  'O sucesso e construido tijolo por tijolo, dia apos dia.',
  'Nao pare ate se orgulhar de quem voce se tornou.',
  'A dor e temporaria, a gloria e para sempre.',
  'Foco no processo, os resultados vem.',
  'Seja a pessoa que voce precisava quando era mais novo.',
  'Consistencia vence talento quando talento nao e consistente.',
  'O caminho e longo, mas a vista la de cima vale a pena.',
  'Transforme pressao em diamantes.',
];

const SHOUTOUT_MSGS = [
  'Arrasou na apresentacao hoje! 🔥',
  'Top closer da semana merecido!',
  'Que maquina de prospecao! Parabens!',
  'Exemplo de consistencia pro time inteiro.',
  'Fechou o deal impossivel! Lenda!',
  'Melhor follow-up que ja vi.',
  'Levou o time nas costas hoje. Respeito!',
  'Primeiro dia e ja vendeu? Fenomeno!',
  'Bateu a meta antes do dia 15. Absurdo.',
  'Obrigado por ajudar no meu pitch. Fez a diferenca!',
];

function rand(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randDate(daysBack: number): string {
  const d = new Date();
  d.setDate(d.getDate() - rand(0, daysBack));
  return d.toISOString().split('T')[0];
}

export async function runDemoSeed(): Promise<{ users: number; sales: number; fills: number }> {
  const existing = db.get<any[]>('ops_users') || [];

  // Create users
  const users = MEMBERS.map((m, i) => {
    const id = `u_demo_${i + 1}`;
    return {
      id,
      name: m.name,
      email: m.email,
      password: 'demo123',
      role: m.role,
      plan: m.plan,
      active: true,
      createdAt: Date.now() - rand(30, 90) * 86400000,
    };
  });

  // Merge with existing (keep admin)
  const merged = [...existing.filter((u: any) => !u.id.startsWith('u_demo_')), ...users];
  db.set('ops_users', merged);

  // Generate avatars
  users.forEach((u, i) => {
    const avatar = generateAvatar(u.name, MEMBERS[i].color);
    localStorage.setItem(`vantagem_avatar_${u.id}`, avatar);
  });

  // Generate Identity / Vision Board for each
  users.forEach((u, i) => {
    const metaM = rand(3000, 15000);
    const profile = {
      metaM,
      meta180: metaM * 6,
      car: CARS[i],
      home: HOMES[i],
      body: BODIES[i],
      style: STYLES[i],
      impact: 'Transformar vidas atraves de vendas consultivas',
      anchor: ANCHORS[i],
      startDate: randDate(60),
      images: {}, // No actual images, icons will show
    };
    db.set(`ni_profile_${u.id}`, profile);
  });

  // Generate Goals per user
  users.forEach(u => {
    const goals = {
      dailyContacts: rand(30, 80),
      dailyScore: rand(30, 70),
      monthlySales: rand(3, 15),
      monthlyRevenue: rand(2000, 12000),
    };
    db.set(`goals_${u.id}`, goals);
  });

  // Generate XP + Streaks + Achievements
  users.forEach((u, _i) => {
    const xp = rand(200, 8000);
    db.set(`xp_${u.id}`, xp);

    const streakDays = rand(0, 30);
    db.set(`streak_${u.id}`, {
      current: streakDays,
      best: streakDays + rand(0, 15),
      lastFillDate: streakDays > 0 ? today() : randDate(5),
      freezesUsed: 0,
      freezeMonth: currentMonth(),
    });

    // Give some achievements
    const possibleAch = ['first_fill', 'fill_10', 'first_sale', 'sales_5', 'streak_7', 'xp_1000'];
    const numAch = rand(1, Math.min(possibleAch.length, 3 + Math.floor(xp / 2000)));
    const achs = possibleAch.slice(0, numAch).map(id => ({ id, unlockedAt: Date.now() - rand(1, 30) * 86400000 }));
    db.set(`achievements_${u.id}`, achs);
  });

  // Generate XP events
  users.forEach(u => {
    const events = Array.from({ length: rand(5, 20) }, () => ({
      type: ['fill_complete', 'fill_contact', 'sale_setup', 'fill_response'][rand(0, 3)],
      amount: rand(5, 500),
      ts: Date.now() - rand(0, 30) * 86400000,
      description: ['Fill diario', 'Contatos', 'Venda registrada', 'Respostas'][rand(0, 3)],
    }));
    db.set(`xp_events_${u.id}`, events);
  });

  // Generate Fills for today + last 6 days
  let fillCount = 0;
  for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
    const d = new Date();
    d.setDate(d.getDate() - dayOffset);
    const dateStr = d.toISOString().split('T')[0];

    // Not all users fill every day
    const fillingUsers = users.filter(() => Math.random() > 0.2); // 80% chance

    fillingUsers.forEach(u => {
      const channels: Record<string, { a: string; b: string }> = {
        coldcall: { a: rand(5, 40).toString(), b: rand(2, 15).toString() },
        instagram: { a: rand(10, 60).toString(), b: rand(3, 20).toString() },
        whatsapp: { a: rand(5, 30).toString(), b: rand(2, 12).toString() },
        calls: { a: rand(3, 20).toString(), b: rand(1, 10).toString() },
        visitas: { a: rand(0, 5).toString(), b: rand(0, 3).toString() },
      };
      const score = Object.values(channels).reduce((t, ch) => t + parseInt(ch.a), 0);
      const obs = dayOffset === 0
        ? ['Dia produtivo!', 'Bastante follow-up', 'Foco em cold call', 'Instagram bombando', 'Dia de calls'][rand(0, 4)]
        : '';

      const fill = {
        userId: u.id,
        userName: u.name,
        userRole: u.role,
        channels,
        obs,
        score,
        ts: d.getTime() + rand(28800000, 64800000), // 8am-6pm
      };

      const fillKey = `ops_fill_${dateStr}_${u.id}`;
      db.set(fillKey, fill);
      fillCount++;
    });
  }

  // Generate Sales (this month + last month)
  let saleCount = 0;
  const closers = users.filter(u => ['Founder', 'Partner', 'Vendedor'].includes(u.role));
  const setters = users.filter(u => u.role === 'Setter');

  for (let i = 0; i < rand(15, 35); i++) {
    const seller = closers[rand(0, closers.length - 1)];
    const setter = Math.random() > 0.4 ? setters[rand(0, setters.length - 1)] : null;
    const setupValue = [97, 197, 297, 497, 997, 1497, 1997, 2997][rand(0, 7)];
    const recValue = [47, 97, 147, 197, 297, 497][rand(0, 5)];
    const date = randDate(45);
    const id = `ops_sale_${Date.now()}_${i}`;

    const sale = {
      id,
      date,
      sellerId: seller.id,
      sellerName: seller.name,
      sellerRole: seller.role,
      setterId: setter?.id,
      setterName: setter?.name,
      setupValue,
      recValue,
      sellerSetupComm: Math.round(setupValue * 0.5),
      sellerRecComm: Math.round(recValue * 0.4),
      setterSetupComm: setter ? Math.round(setupValue * 0.05) : 0,
      setterRecComm: setter ? Math.round(recValue * 0.05) : 0,
      ts: new Date(date).getTime() + rand(28800000, 64800000),
    };

    db.set(id, sale);
    saleCount++;
  }

  // Generate Shoutouts
  for (let i = 0; i < 8; i++) {
    const from = users[rand(0, users.length - 1)];
    let to = users[rand(0, users.length - 1)];
    while (to.id === from.id) to = users[rand(0, users.length - 1)];

    const shoutout = {
      id: `ops_shoutout_${Date.now()}_${i}`,
      fromId: from.id,
      fromName: from.name,
      toId: to.id,
      toName: to.name,
      message: SHOUTOUT_MSGS[rand(0, SHOUTOUT_MSGS.length - 1)],
      emoji: ['🔥', '💪', '🎯', '👑', '🚀', '⭐'][rand(0, 5)],
      ts: Date.now() - rand(0, 72) * 3600000, // last 3 days
      reactions: {},
    };
    db.set(shoutout.id, shoutout);
  }

  // Generate Pipeline Deals
  const stages = ['lead', 'contact', 'proposal', 'negotiation', 'closed'];
  const dealNames = [
    'Empresa ABC - Setup Premium', 'Tech Solutions - Plano Anual',
    'Digital Corp - Enterprise', 'StartUp XYZ - Growth Plan',
    'Global Trade - Expansao', 'Innovate Ltd - Consultoria',
    'Alpha Group - Full Stack', 'Beta Inc - Marketing Suite',
    'Omega Systems - Integration', 'Delta Tech - Custom',
    'Sigma Corp - Scale Plan', 'Lambda Dev - Pro License',
  ];

  for (let i = 0; i < rand(8, 12); i++) {
    const assigned = closers[rand(0, closers.length - 1)];
    const stage = stages[rand(0, stages.length - 1)];
    const deal = {
      id: `ops_deal_${Date.now()}_${i}`,
      name: dealNames[i % dealNames.length],
      company: dealNames[i % dealNames.length].split(' - ')[0],
      value: rand(500, 10000),
      stage,
      assignedTo: assigned.id,
      assignedName: assigned.name,
      createdAt: randDate(rand(3, 30)),
      probability: [10, 30, 60, 80, 100][stages.indexOf(stage)],
      notes: '',
      ts: Date.now() - rand(0, 30) * 86400000,
    };
    db.set(deal.id, deal);
  }

  // Generate Notifications
  users.forEach(u => {
    const notifs = Array.from({ length: rand(3, 8) }, (_, ni) => ({
      id: `noti_seed_${u.id}_${ni}`,
      type: ['sale', 'badge', 'shoutout', 'streak'][rand(0, 3)],
      title: [
        `${users[rand(0, users.length - 1)].name} fechou uma venda!`,
        'Badge desbloqueado: Consistente',
        `${users[rand(0, users.length - 1)].name} te mandou um shoutout!`,
        'Streak de 7 dias! 🔥',
      ][rand(0, 3)],
      detail: 'Parabens pelo progresso!',
      icon: ['💰', '⭐', '🔥', '🎯'][rand(0, 3)],
      ts: Date.now() - rand(0, 72) * 3600000,
      read: Math.random() > 0.4,
    }));
    db.set(`notifications_${u.id}`, notifs);
  });

  // Sync to Supabase (fire-and-forget)
  try {
    upsertUsers(merged);
  } catch {}

  return { users: users.length, sales: saleCount, fills: fillCount };
}
