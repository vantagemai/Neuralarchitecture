import { db, today, currentMonth } from './store';

const PREFIX = 'vops_';
function bulkSet(key: string, value: unknown): void {
  localStorage.setItem(PREFIX + key, JSON.stringify(value));
}
function rand(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
function removeAccents(s: string): string {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}
function pick<T>(arr: T[]): T { return arr[rand(0, arr.length - 1)]; }
function dateStr(d: Date): string { return d.toISOString().split('T')[0]; }
function daysAgo(n: number): Date { const d = new Date(); d.setDate(d.getDate() - n); return d; }

function generateAvatar(name: string, color: string): string {
  const initials = name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200"><rect width="200" height="200" fill="${color}"/><text x="100" y="115" text-anchor="middle" fill="white" font-family="Inter,sans-serif" font-size="72" font-weight="700">${initials}</text></svg>`;
  return 'data:image/svg+xml;base64,' + btoa(svg);
}

const MALE = ['Lucas','Pedro','Rafael','Gabriel','Thiago','Matheus','Bruno','Felipe','Guilherme','Leonardo','Gustavo','Rodrigo','Diego','Andre','Vinicius','Henrique','Marcelo','Eduardo','Daniel','Joao','Carlos','Ricardo','Paulo','Fernando','Alexandre','Caio','Renan','Igor','Fabio','Leandro','Victor','Samuel','Marcos','Arthur','Nicolas','Enzo','Luan','Breno','Otavio','Julio','Murilo','Hugo','Tiago','Alan','Wesley','Davi','Emanuel','Elias','Nathan','Douglas'];
const FEMALE = ['Ana','Mariana','Juliana','Camila','Isabela','Beatriz','Leticia','Amanda','Carolina','Fernanda','Gabriela','Larissa','Bruna','Patricia','Natalia','Vanessa','Raquel','Aline','Daniela','Priscila','Tatiana','Monica','Renata','Cristina','Bianca','Debora','Viviane','Simone','Carla','Flavia','Luciana','Sandra','Helena','Laura','Sophia','Valentina','Alice','Luiza','Manuela','Clara','Giovanna','Milena','Yasmin','Luana','Marina','Rafaela','Thais','Livia','Julia','Stella'];
const SURNAMES = ['Silva','Santos','Oliveira','Souza','Rodrigues','Ferreira','Almeida','Nascimento','Lima','Araujo','Melo','Barbosa','Ribeiro','Martins','Carvalho','Gomes','Rocha','Pereira','Costa','Dias','Moreira','Lopes','Nunes','Duarte','Vieira','Freitas','Monteiro','Cardoso','Pinto','Teixeira','Mendes','Castro','Correia','Reis','Campos','Azevedo','Ramos','Cunha','Fonseca','Machado','Medeiros','Braga','Coelho','Moura','Brito','Andrade','Tavares','Amaral','Figueiredo','Nogueira','Batista','Resende','Siqueira','Queiroz','Magalhaes','Pires','Sampaio','Vasconcelos','Dantas','Guimaraes'];

const COLORS = ['#7C8A99','#8B7E6A','#6B8B7B','#8B6B7E','#6A7E8B','#9B8B7B','#7B8B6B','#6B7B9B','#8B7B8B','#7B9B8B','#A08070','#7080A0','#80A070','#A07080','#70A080','#907060','#609070','#706090','#906070','#609090'];

const OBS_POOL = ['Dia produtivo!','Bastante follow-up hoje','Foco em cold call','Instagram bombando','Dia de calls','Muitas respostas','Prospecao intensa','Bom dia de visitas','Follow-up de proposals','Pipeline movimentando'];

const SHOUTOUT_MSGS = ['Arrasou na apresentacao!','Top closer merecido!','Maquina de prospecao!','Exemplo de consistencia.','Fechou o deal impossivel!','Melhor follow-up do time.','Levou o time nas costas!','Vendeu no primeiro dia!','Bateu meta antes do dia 15.','Obrigado pela ajuda no pitch!','Que energia positiva!','Inspiracao pro time todo.','Cold call master!','Resiliencia absurda.','Nao desiste nunca!','Profissionalismo top.','Criatividade nas abordagens.','Mentalidade de campeao.','Sempre disponivel pra ajudar.','Lideranca pelo exemplo.'];

const CARS = ['BMW M3','Porsche 911','Mercedes AMG','Audi RS7','Tesla Model S','Range Rover','Lamborghini Huracan','Corvette C8','Mustang GT','Toyota Supra','Camaro SS','Golf GTI','BMW X6','Mercedes GLE','Audi Q8','Volvo XC90','Jaguar F-Type','McLaren 570S','Ferrari Roma','Maserati Ghibli'];
const HOMES = ['Apto alto padrao','Casa com piscina','Cobertura duplex','Flat na praia','Casa condominio','Penthouse centro','Sitio moderno','Loft industrial','Casa na serra','Mansao litoral','Triplex urbano','Studio design','Casa campo','Apto jardim','Vila exclusiva','Chacara premium','Terraco panoramico','Casa inteligente','Refugio montanha','Apto beira-mar'];
const BODIES = ['Shape definido','6 pack abs','Atleta funcional','Crossfit beast','Runner body','Yoga + forca','Swimmer build','MMA fighter','Wellness total','Bodybuilder lean','Calistenia pro','Triatleta','Pilates strong','Funcional elite','Maratonista'];
const STYLES = ['Elegante executivo','Streetwear premium','Minimalista chique','Esportivo luxo','CEO casual','Designer fashion','Classic menswear','Tech mogul','Mediterranean','Boho premium','Urban modern','Scandinavian','Avant-garde','Ivy league','Coastal chic'];
const ANCHORS = ['Cada dia e uma oportunidade.','Disciplina e a ponte entre metas e conquistas.','O sucesso e construido tijolo por tijolo.','Nao pare ate se orgulhar.','A dor e temporaria, a gloria e para sempre.','Foco no processo, resultados vem.','Seja quem voce precisava antes.','Consistencia vence talento.','O caminho e longo mas vale a pena.','Transforme pressao em diamantes.','Sonhe grande, execute maior.','Hoje e o melhor dia pra comecar.','Excelencia e habito, nao ato.','Sua unica competicao e voce de ontem.','O impossivel e questao de tempo.'];

const DEAL_NAMES = ['TechCorp - Enterprise','StartupXYZ - Growth','GlobalTrade - Expansao','InnovateLtd - Consultoria','AlphaGroup - Full Stack','BetaInc - Marketing','OmegaSys - Integration','DeltaTech - Custom','SigmaCorp - Scale','LambdaDev - Pro','CloudFirst - Migration','DataPro - Analytics','FinanceHub - Premium','EduTech - Campus','HealthPlus - Platform','RetailMax - Omnichannel','LogiFlow - Automation','MediaPulse - Content','LegalEase - Compliance','GreenEnergy - Smart','AgroTech - Field','CyberShield - Security','FoodChain - Delivery','TravelNow - Booking','PropTech - Management','AutoDrive - Fleet','SportsPro - Tracking','FashionAI - Styling','PetCare - Wellness','SocialBuzz - Engagement'];

type Role = 'Founder' | 'Partner' | 'Vendedor' | 'Setter' | 'Social Seller';

interface ChannelRange { min: number; max: number }
const CHANNEL_RANGES: Record<Role, Record<string, ChannelRange>> = {
  Setter:          { coldcall: {min:20,max:60}, instagram: {min:15,max:50}, whatsapp: {min:10,max:30}, calls: {min:3,max:10}, visitas: {min:3,max:8} },
  Vendedor:        { coldcall: {min:5,max:25},  instagram: {min:10,max:35}, whatsapp: {min:10,max:30}, calls: {min:10,max:30}, visitas: {min:2,max:8} },
  Partner:         { coldcall: {min:3,max:15},  instagram: {min:5,max:20},  whatsapp: {min:5,max:20},  calls: {min:8,max:25}, visitas: {min:3,max:10} },
  Founder:         { coldcall: {min:0,max:8},   instagram: {min:3,max:15},  whatsapp: {min:5,max:15},  calls: {min:5,max:20}, visitas: {min:2,max:6} },
  'Social Seller': { coldcall: {min:5,max:15},  instagram: {min:30,max:80}, whatsapp: {min:20,max:50}, calls: {min:2,max:8},  visitas: {min:2,max:6} },
};
const DISCIPLINE: Record<Role, number> = { Founder: 0.85, Partner: 0.8, Vendedor: 0.75, Setter: 0.7, 'Social Seller': 0.75 };

const SETUP_VALUES: Record<Role, number[]> = {
  Founder: [997, 1497, 1997, 2997],
  Partner: [497, 997, 1497, 1997],
  Vendedor: [197, 297, 497, 997],
  Setter: [],
  'Social Seller': [],
};
const REC_VALUES: Record<Role, number[]> = {
  Founder: [197, 297, 497],
  Partner: [147, 197, 297],
  Vendedor: [47, 97, 147],
  Setter: [],
  'Social Seller': [],
};
const COMM_RATES: Record<string, { setup: number; rec: number }> = {
  FOUNDER: { setup: 0.5, rec: 0.4 },
  PARTNER: { setup: 0.3, rec: 0.2 },
  SETTER:  { setup: 0.05, rec: 0.05 },
};

// ─── clearAllData ───
export function clearAllData(): { removed: number } {
  let removed = 0;
  for (let i = localStorage.length - 1; i >= 0; i--) {
    const key = localStorage.key(i);
    if (!key) continue;
    if (key.startsWith('vops_') && key !== 'vops_ops_config') {
      localStorage.removeItem(key);
      removed++;
    } else if (key.startsWith('vantagem_avatar_')) {
      localStorage.removeItem(key);
      removed++;
    }
  }
  return { removed };
}

// ─── runDemoSeed ───
export async function runDemoSeed(): Promise<{ users: number; sales: number; fills: number }> {
  const existing = db.get<any[]>('ops_users') || [];

  // ── Generate 100 users ──
  interface DemoUser { id: string; name: string; email: string; password: string; role: Role; plan: string; active: boolean; createdAt: number; color: string }
  const users: DemoUser[] = [];
  const usedNames = new Set<string>();

  function makeName(i: number): { first: string; last: string; full: string } {
    for (let attempt = 0; attempt < 100; attempt++) {
      const isFemale = i % 2 === 0;
      const first = isFemale ? pick(FEMALE) : pick(MALE);
      const last = pick(SURNAMES);
      const full = `${first} ${last}`;
      if (!usedNames.has(full)) { usedNames.add(full); return { first, last, full }; }
    }
    const first = MALE[i % MALE.length];
    const last = SURNAMES[i % SURNAMES.length];
    return { first, last, full: `${first} ${last} ${i}` };
  }

  for (let i = 0; i < 100; i++) {
    const idx = i + 1;
    let role: Role, plan: string, daysBack: number;
    if (idx <= 5) { role = 'Founder'; plan = 'FOUNDER'; daysBack = rand(70, 90); }
    else if (idx <= 15) { role = 'Partner'; plan = 'PARTNER'; daysBack = rand(50, 80); }
    else if (idx <= 40) { role = 'Vendedor'; plan = 'PARTNER'; daysBack = rand(30, 70); }
    else if (idx <= 50) { role = 'Social Seller'; plan = 'SETTER'; daysBack = rand(10, 50); }
    else { role = 'Setter'; plan = 'SETTER'; daysBack = rand(5, 60); }

    const { first, last, full } = makeName(i);
    const email = `${removeAccents(first).toLowerCase()}.${removeAccents(last).toLowerCase()}@vantagem.ai`;
    const color = COLORS[i % COLORS.length];

    users.push({
      id: `u_demo_${idx}`,
      name: full,
      email,
      password: 'demo123',
      role,
      plan,
      active: true,
      createdAt: daysAgo(daysBack).getTime(),
      color,
    });
  }

  // Save users
  const merged = [...existing.filter((u: any) => !u.id.startsWith('u_demo_')), ...users.map(({ color: _, ...u }) => u)];
  db.set('ops_users', merged);

  // Avatars
  users.forEach(u => localStorage.setItem(`vantagem_avatar_${u.id}`, generateAvatar(u.name, u.color)));

  // ── Generate fills (90 days) ──
  let fillCount = 0;
  const fillDatesMap = new Map<string, string[]>(); // userId → sorted fill dates
  const fillContactsMap = new Map<string, number>(); // userId → total contacts
  const fillResponsesMap = new Map<string, number>(); // userId → total responses

  for (let dayOffset = 0; dayOffset < 90; dayOffset++) {
    const d = daysAgo(dayOffset);
    const ds = dateStr(d);
    const dayOfWeek = d.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

    for (const u of users) {
      // Only fill after createdAt
      if (d.getTime() < u.createdAt) continue;

      const baseRate = isWeekend ? 0.4 : 0.75;
      const rate = baseRate * DISCIPLINE[u.role];
      if (Math.random() > rate) continue;

      const ranges = CHANNEL_RANGES[u.role];
      const channels: Record<string, { a: string; b: string }> = {};
      let totalA = 0, totalB = 0;
      for (const [ch, r] of Object.entries(ranges)) {
        const a = rand(r.min, r.max);
        const b = Math.round(a * (0.3 + Math.random() * 0.2));
        channels[ch] = { a: a.toString(), b: b.toString() };
        totalA += a;
        totalB += b;
      }

      const fill = {
        userId: u.id, userName: u.name, userRole: u.role,
        channels, obs: dayOffset === 0 ? pick(OBS_POOL) : '',
        score: totalA,
        ts: d.getTime() + rand(28800000, 64800000),
      };
      bulkSet(`ops_fill_${ds}_${u.id}`, fill);
      fillCount++;

      // Track for XP/streak
      const dates = fillDatesMap.get(u.id) || [];
      dates.push(ds);
      fillDatesMap.set(u.id, dates);
      fillContactsMap.set(u.id, (fillContactsMap.get(u.id) || 0) + totalA);
      fillResponsesMap.set(u.id, (fillResponsesMap.get(u.id) || 0) + totalB);
    }
  }

  // ── Generate sales (~300 with weekly ramp-up) ──
  let saleCount = 0;
  const totalSales = rand(250, 350);
  const closers = users.filter(u => u.role !== 'Setter' && u.role !== 'Social Seller');
  const setters = users.filter(u => u.role === 'Setter' || u.role === 'Social Seller');
  const salesPerUser = new Map<string, number>();

  // Weekly weights (13 weeks, ramp up)
  const weeks: { start: Date; end: Date; weight: number }[] = [];
  let totalWeight = 0;
  for (let w = 0; w < 13; w++) {
    const weight = 1 + w * 0.4;
    weeks.push({ start: daysAgo(90 - w * 7), end: daysAgo(Math.max(0, 83 - w * 7)), weight });
    totalWeight += weight;
  }

  // Distribute sales across weeks
  let salesPlaced = 0;
  for (const week of weeks) {
    const weekSales = Math.round((week.weight / totalWeight) * totalSales);
    for (let s = 0; s < weekSales && salesPlaced < totalSales; s++) {
      // Weight seller by role
      const roleWeights: Record<Role, number> = { Founder: 4, Partner: 3, Vendedor: 2, Setter: 0, 'Social Seller': 0 };
      const weighted: DemoUser[] = closers.flatMap(c => Array(roleWeights[c.role]).fill(c) as DemoUser[]);
      const seller = pick(weighted);
      const setter = Math.random() < 0.4 ? pick(setters) : null;
      const setupValue: number = pick(SETUP_VALUES[seller.role]);
      const recValue: number = pick(REC_VALUES[seller.role]);
      const commRate = COMM_RATES[seller.plan] || COMM_RATES.PARTNER;

      const saleDay = rand(0, 6);
      const saleDate = new Date(week.start);
      saleDate.setDate(saleDate.getDate() + saleDay);
      if (saleDate > new Date()) continue;

      const sale = {
        id: `ops_sale_${Date.now()}_${salesPlaced}`,
        date: dateStr(saleDate),
        sellerId: seller.id, sellerName: seller.name, sellerRole: seller.role,
        setterId: setter?.id, setterName: setter?.name,
        setupValue, recValue,
        sellerSetupComm: Math.round(setupValue * commRate.setup),
        sellerRecComm: Math.round(recValue * commRate.rec),
        setterSetupComm: setter ? Math.round(setupValue * 0.05) : 0,
        setterRecComm: setter ? Math.round(recValue * 0.05) : 0,
        ts: saleDate.getTime() + rand(28800000, 64800000),
      };
      bulkSet(sale.id, sale);
      salesPlaced++;
      saleCount++;
      salesPerUser.set(seller.id, (salesPerUser.get(seller.id) || 0) + 1);
    }
  }

  // ── Derive XP from actual data ──
  for (const u of users) {
    const contacts = fillContactsMap.get(u.id) || 0;
    const responses = fillResponsesMap.get(u.id) || 0;
    const fills = fillDatesMap.get(u.id) || [];
    const sales = salesPerUser.get(u.id) || 0;

    let xp = contacts * 1 + responses * 2 + fills.length * 10 + sales * 500;

    // Streak calculation
    const sorted = [...fills].sort();
    let current = 0, best = 0, streak = 0;
    let lastDate = '';
    for (const ds of sorted) {
      if (!lastDate) { streak = 1; }
      else {
        const prev = new Date(lastDate);
        const curr = new Date(ds);
        const diff = Math.round((curr.getTime() - prev.getTime()) / 86400000);
        if (diff === 1) streak++;
        else if (diff === 0) { /* same day */ }
        else streak = 1;
      }
      if (streak > best) best = streak;
      lastDate = ds;
    }
    // Is streak active?
    const todayStr = today();
    const yesterday = dateStr(daysAgo(1));
    if (lastDate === todayStr || lastDate === yesterday) current = streak;
    else current = 0;

    // Streak bonuses
    if (best >= 7) xp += 100;
    if (best >= 14) xp += 250;
    if (best >= 30) xp += 500;
    if (best >= 60) xp += 1000;

    bulkSet(`xp_${u.id}`, xp);
    bulkSet(`streak_${u.id}`, { current, best, lastFillDate: lastDate || '', freezesUsed: 0, freezeMonth: currentMonth() });

    // XP events (last 50)
    const events: any[] = [];
    if (fills.length > 0) events.push({ type: 'fill_complete', amount: fills.length * 10, ts: Date.now() - rand(0, 7) * 86400000, description: `${fills.length} fills completos` });
    if (contacts > 0) events.push({ type: 'fill_contact', amount: contacts, ts: Date.now() - rand(0, 7) * 86400000, description: `${contacts} contatos` });
    if (responses > 0) events.push({ type: 'fill_response', amount: responses * 2, ts: Date.now() - rand(0, 7) * 86400000, description: `${responses} respostas` });
    if (sales > 0) events.push({ type: 'sale_setup', amount: sales * 500, ts: Date.now() - rand(0, 14) * 86400000, description: `${sales} vendas` });
    bulkSet(`xp_events_${u.id}`, events);

    // Achievements
    const achs: { id: string; unlockedAt: number }[] = [];
    const addAch = (id: string, daysBack: number) => achs.push({ id, unlockedAt: Date.now() - daysBack * 86400000 });
    if (fills.length >= 1) addAch('first_fill', rand(30, 80));
    if (fills.length >= 10) addAch('fill_10', rand(20, 60));
    if (fills.length >= 50) addAch('fill_50', rand(5, 30));
    if (sales >= 1) addAch('first_sale', rand(10, 60));
    if (sales >= 5) addAch('sales_5', rand(5, 30));
    if (sales >= 20) addAch('sales_20', rand(1, 15));
    if (best >= 7) addAch('streak_7', rand(15, 60));
    if (best >= 14) addAch('streak_14', rand(10, 40));
    if (best >= 30) addAch('streak_30', rand(5, 20));
    if (best >= 60) addAch('streak_60', rand(1, 10));
    if (xp >= 1000) addAch('fichas_1000', rand(20, 60));
    if (xp >= 10000) addAch('fichas_10000', rand(1, 20));
    bulkSet(`achievements_${u.id}`, achs);

    // Goals
    const goals = (u.role === 'Setter' || u.role === 'Social Seller') ? { dailyContacts: rand(50, 80), dailyScore: rand(40, 70), monthlySales: 0, monthlyRevenue: 0 }
      : u.role === 'Vendedor' ? { dailyContacts: rand(40, 60), dailyScore: rand(35, 55), monthlySales: rand(5, 12), monthlyRevenue: rand(3000, 8000) }
      : u.role === 'Partner' ? { dailyContacts: rand(25, 40), dailyScore: rand(25, 45), monthlySales: rand(8, 15), monthlyRevenue: rand(5000, 15000) }
      : { dailyContacts: rand(15, 30), dailyScore: rand(20, 40), monthlySales: rand(10, 20), monthlyRevenue: rand(10000, 30000) };
    bulkSet(`goals_${u.id}`, goals);
  }

  // ── Identity profiles (top 30: Founders + Partners + first 15 Vendedores) ──
  const profileUsers = [...users.filter(u => u.role === 'Founder'), ...users.filter(u => u.role === 'Partner'), ...users.filter(u => u.role === 'Vendedor').slice(0, 15)];
  profileUsers.forEach((u, i) => {
    const metaM = u.role === 'Founder' ? rand(10000, 30000) : u.role === 'Partner' ? rand(5000, 15000) : rand(3000, 8000);
    bulkSet(`ni_profile_${u.id}`, {
      metaM, meta180: metaM * 6,
      car: CARS[i % CARS.length], home: HOMES[i % HOMES.length],
      body: BODIES[i % BODIES.length], style: STYLES[i % STYLES.length],
      impact: 'Transformar vidas atraves de vendas consultivas',
      anchor: ANCHORS[i % ANCHORS.length],
      startDate: dateStr(new Date(u.createdAt)),
      images: {},
    });
  });

  // ── Shoutouts (60-80) ──
  const shoutCount = rand(60, 80);
  for (let i = 0; i < shoutCount; i++) {
    const from = pick(users);
    let to = pick(users);
    while (to.id === from.id) to = pick(users);
    bulkSet(`ops_shoutout_${Date.now()}_${i}`, {
      id: `ops_shoutout_${Date.now()}_${i}`,
      fromId: from.id, fromName: from.name,
      toId: to.id, toName: to.name,
      message: pick(SHOUTOUT_MSGS),
      emoji: pick(['🔥', '💪', '🎯', '👑', '🚀', '⭐']),
      ts: Date.now() - rand(0, 90) * 86400000,
      reactions: {},
    });
  }

  // ── Pipeline deals (20-30) ──
  const stages = ['lead', 'contact', 'proposal', 'negotiation', 'closed'];
  const dealCount = rand(20, 30);
  for (let i = 0; i < dealCount; i++) {
    const assigned = pick(closers);
    const stageIdx = rand(0, 4);
    bulkSet(`ops_deal_${Date.now()}_${i}`, {
      id: `ops_deal_${Date.now()}_${i}`,
      name: DEAL_NAMES[i % DEAL_NAMES.length],
      company: DEAL_NAMES[i % DEAL_NAMES.length].split(' - ')[0],
      value: rand(500, 15000),
      stage: stages[stageIdx],
      assignedTo: assigned.id, assignedName: assigned.name,
      createdAt: dateStr(daysAgo(rand(3, 60))),
      probability: [10, 30, 60, 80, 100][stageIdx],
      notes: '', ts: Date.now() - rand(0, 30) * 86400000,
    });
  }

  // ── Notifications (5-10 per user, last 7 days) ──
  users.forEach(u => {
    const notifs = Array.from({ length: rand(5, 10) }, (_, ni) => ({
      id: `noti_${u.id}_${ni}`,
      type: pick(['sale', 'badge', 'shoutout', 'streak']),
      title: pick([
        `${pick(users).name} fechou uma venda!`,
        'Badge desbloqueado!',
        `${pick(users).name} te reconheceu!`,
        `Streak de ${rand(3, 30)} dias!`,
      ]),
      detail: pick(['Parabens!', 'Continue assim!', 'Voce e top!', 'Mandou bem!']),
      icon: pick(['💰', '⭐', '🔥', '🎯', '💎', '🚀']),
      ts: Date.now() - rand(0, 168) * 3600000,
      read: Math.random() > 0.3,
    }));
    bulkSet(`notifications_${u.id}`, notifs);
  });

  return { users: users.length, sales: saleCount, fills: fillCount };
}
