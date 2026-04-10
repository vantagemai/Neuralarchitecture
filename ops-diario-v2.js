/**
 * OPS DIÁRIO v2 — Integration Module
 * Connects to the existing portal's ODB, auth, and tab system.
 * Include via: <script src="ops-diario-v2.js"></script> before </body>
 *
 * REQUIRES: ODB (global), opsGetSession(), opsRenderTabContent(),
 *           opsRenderHeadTabContent(), OPS_TABS
 */
(function(){
'use strict';

// ═══════════════════════════════════════════════════════════════
// SECTION 1: CONSTANTS & HELPERS
// ═══════════════════════════════════════════════════════════════

var V2_CHANNELS = [
  {id:'coldcall', icon:'📵', label:'Cold Call',  fA:'Contatos',    fB:'Respostas'},
  {id:'instagram',icon:'📸', label:'Instagram',  fA:'DMs Enviadas',fB:'Respostas'},
  {id:'whatsapp', icon:'💬', label:'WhatsApp',   fA:'Mensagens',   fB:'Respostas'},
  {id:'calls',    icon:'📞', label:'Calls',      fA:'Ligações',    fB:'Conectadas'},
  {id:'visitas',  icon:'🤝', label:'Visitas',    fA:'Agendadas',   fB:'Realizadas'},
];

var V2_CHANNEL_COLORS = {
  coldcall:'#F11013', instagram:'#9B7FE0', whatsapp:'#00C864',
  calls:'#5B9AF5', visitas:'#FFD130'
};

var V2_PLANS = {
  SETTER:   {label:'Setter',   setupPct:0.10, recPct:0.03, color:'#9B7FE0'},
  AUTONOMO: {label:'Autônomo', setupPct:0.10, recPct:0.10, color:'#888888'},
  PARTNER:  {label:'Partner',  setupPct:0.30, recPct:0.20, color:'#5B9AF5'},
  FOUNDER:  {label:'Founder',  setupPct:0.50, recPct:0.40, color:'#FFD130'},
};

var V2_NI_FIELDS = [
  {id:'car',  emoji:'🚗', label:'Meu Carro'},
  {id:'home', emoji:'🏠', label:'Minha Moradia'},
  {id:'body', emoji:'💪', label:'Meu Físico'},
  {id:'style',emoji:'✨', label:'Meu Estilo'},
];

// State
var v2State = { chartPeriod: 30, vendasTab: 'vhoje' };

// ── Portal bridge: detect ODB ──
function db(){ return window.ODB || null; }
function hasPortal(){ return !!db(); }

// ── Helpers ──
function v2today(){ return new Date().toISOString().split('T')[0]; }
function v2month(){ return new Date().toISOString().slice(0,7); }
function v2fmtDate(d){ if(!d)return''; var p=d.split('-'); return p[2]+'/'+p[1]+'/'+p[0]; }
function v2fmtTime(ts){ return new Date(ts).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'}); }
function v2fmt$(n){ return '$'+(parseFloat(n)||0).toFixed(0); }
function v2esc(s){ return String(s||'').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
function v2pct(a,b){ return b>0? Math.min(100, Math.round(a/b*100)) : 0; }

function v2calcScore(fill){
  if(!fill || !fill.channels) return 0;
  var t = 0;
  var ch = fill.channels;
  for(var k in ch){
    if(ch.hasOwnProperty(k)){
      var v = ch[k];
      t += parseInt(typeof v === 'object' ? (v.a||0) : v) || 0;
    }
  }
  return t;
}

function v2calcComm(plan, setupVal, recVal){
  var p = V2_PLANS[plan] || V2_PLANS.AUTONOMO;
  var s = (parseFloat(setupVal)||0) * p.setupPct;
  var r = (parseFloat(recVal)||0) * p.recPct;
  return {setup:s, rec:r, total:s+r};
}

function v2planBadge(plan){
  var p = V2_PLANS[plan];
  if(!p) return '<span class="opsv2-plan-badge" style="background:rgba(255,255,255,.06);color:#888;border:1px solid rgba(255,255,255,.1);">'+ v2esc(plan||'—') +'</span>';
  return '<span class="opsv2-plan-badge" style="background:'+p.color+'18;color:'+p.color+';border:1px solid '+p.color+'38;">'+p.label+'</span>';
}

// ── Image storage (localStorage per device) ──
var V2IMG = {
  get: function(k){ try{ return localStorage.getItem('ni_img_'+k)||null; }catch(e){ return null; } },
  set: function(k,v){ try{ localStorage.setItem('ni_img_'+k,v); return true; }catch(e){ return false; } },
};

// ── Image upload + compress ──
function v2compressImage(file, maxW, quality){
  maxW = maxW || 900; quality = quality || 0.72;
  return new Promise(function(resolve, reject){
    var reader = new FileReader();
    reader.onerror = function(){ reject(new Error('Erro ao ler arquivo')); };
    reader.onload = function(e){
      var img = new Image();
      img.onerror = function(){ reject(new Error('Imagem inválida')); };
      img.onload = function(){
        var canvas = document.createElement('canvas');
        var w = img.width, h = img.height;
        if(w > maxW){ h = Math.round(h*(maxW/w)); w = maxW; }
        canvas.width = w; canvas.height = h;
        canvas.getContext('2d').drawImage(img, 0, 0, w, h);
        var b64 = canvas.toDataURL('image/jpeg', quality);
        var kb = Math.round(b64.length * 0.75 / 1024);
        if(kb > 700){
          var b64b = canvas.toDataURL('image/jpeg', 0.5);
          if(Math.round(b64b.length*0.75/1024) > 700){
            reject(new Error('Imagem muito grande ('+kb+'kb). Reduza e tente novamente.'));
          } else { resolve(b64b); }
        } else { resolve(b64); }
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

function v2triggerUpload(field, userId, onDone){
  var inp = document.createElement('input');
  inp.type = 'file'; inp.accept = 'image/*';
  inp.onchange = function(e){
    var file = e.target.files[0]; if(!file) return;
    v2compressImage(file).then(function(b64){
      var ok = V2IMG.set(field+'_'+userId, b64);
      if(!ok){ alert('Armazenamento cheio.'); return; }
      if(onDone) onDone(b64);
    }).catch(function(err){ alert(err.message || 'Erro ao processar imagem.'); });
  };
  inp.click();
}

// ── Motivational engine ──
function v2getMotiveMsg(fp, name){
  var n = v2esc(name || 'você');
  if(fp >= 80) return {cls:'opsv2-motive-high', msg:n+', você está a '+(100-fp)+'% de fechar o mês. Não pare agora.'};
  if(fp >= 50) return {cls:'opsv2-motive-mid', msg:n+', você está na metade do caminho. A segunda metade é onde os fortes se separam.'};
  if(fp >= 20) return {cls:'opsv2-motive-mid', msg:'O mês está aberto. '+(100-fp)+'% ainda disponíveis. Cada conversa hoje é um tijolo da sua nova vida.'};
  return {cls:'opsv2-motive-low', msg:n+', a distância entre sua vida atual e a que você quer é medida em ação, não em tempo. Comece agora.'};
}

function v2calcDaysProgress(startDate){
  if(!startDate) return {elapsed:0, remaining:180, pct:0};
  var s = new Date(startDate+'T00:00:00Z'), n = new Date();
  var utcN = Date.UTC(n.getFullYear(), n.getMonth(), n.getDate());
  var utcS = Date.UTC(s.getUTCFullYear(), s.getUTCMonth(), s.getUTCDate());
  var elapsed = Math.max(0, Math.min(180, Math.round((utcN - utcS) / 86400000)));
  return {elapsed:elapsed, remaining:Math.max(0, 180-elapsed), pct:Math.round(elapsed/180*100)};
}

// ── Debounce ──
function v2debounce(fn, ms){
  var t; ms = ms || 200;
  return function(){ var a=arguments, self=this; clearTimeout(t); t=setTimeout(function(){ fn.apply(self,a); }, ms); };
}


// ═══════════════════════════════════════════════════════════════
// SECTION 2: DATA ACCESS (bridges to portal ODB)
// ═══════════════════════════════════════════════════════════════

async function v2get(k){ return db().get(k); }
async function v2set(k,v){ return db().set(k,v); }
async function v2list(p){ return db().list(p); }

async function v2getUsers(){
  return (await v2get('ops_users')) || [];
}

function v2getUserPlan(user){
  // Check for v2 plan field, fallback to role-based mapping
  if(user.plan) return user.plan;
  var roleMap = {setter:'SETTER', founder:'FOUNDER', partner:'PARTNER'};
  return roleMap[user.role] || 'AUTONOMO';
}

// ── Fill normalization: old format (number) -> new format ({a,b}) ──
function v2normalizeFill(raw){
  if(!raw || !raw.channels) return raw;
  var ch = raw.channels;
  for(var k in ch){
    if(ch.hasOwnProperty(k)){
      if(typeof ch[k] === 'number'){
        ch[k] = {a: ch[k], b: 0};
      } else if(typeof ch[k] === 'string'){
        ch[k] = {a: parseInt(ch[k])||0, b: 0};
      }
    }
  }
  return raw;
}

// ── Get fills for today ──
async function v2getTodayFills(){
  var keys = await v2list('ops_fill_' + v2today() + '_');
  var fills = await Promise.all(keys.map(function(k){ return v2get(k); }));
  return fills.filter(Boolean).map(v2normalizeFill);
}

// ── Get month fills for a user ──
async function v2getMonthFills(userId, ym){
  ym = ym || v2month();
  var allKeys = await v2list('ops_fill_');
  var monthKeys = allKeys.filter(function(k){
    var m = k.match(/ops_fill_(\d{4}-\d{2})-\d{2}_(.+)/);
    return m && m[1] === ym && m[2] === userId;
  });
  var fills = await Promise.all(monthKeys.map(function(k){ return v2get(k); }));
  return fills.filter(Boolean).map(v2normalizeFill);
}

// ── Get month sales ──
async function v2getMonthSales(ym){
  ym = ym || v2month();
  var allKeys = await v2list('ops_sale_');
  var keys = allKeys.filter(function(k){ return k.indexOf('ops_sale_' + ym) === 0 || k.indexOf('_' + ym + '_') >= 0; });
  var sales = await Promise.all(keys.map(function(k){ return v2get(k); }));
  return sales.filter(Boolean);
}

// ── Opportunity CRUD ──
async function v2getMonthOpps(ym){
  ym = ym || v2month();
  var keys = await v2list('ops_opp_' + ym);
  var opps = await Promise.all(keys.map(function(k){ return v2get(k); }));
  return opps.filter(Boolean);
}

async function v2createOpp(setterId, setterName, founderId, founderName, count){
  var id = 'ops_opp_' + v2month() + '_' + setterId + '_' + (founderId||'none') + '_' + Date.now();
  var opp = {
    id:id, date:v2today(), month:v2month(),
    setterId:setterId, setterName:setterName,
    founderId:founderId||null, founderName:founderName||null,
    countDeclared: parseInt(count)||0,
    countConfirmed:null, countQualified:null, countClosing:null, countLost:null,
    countFinal:null, status:'pending', confirmedAt:null, ts:Date.now()
  };
  await v2set(id, opp);
  return opp;
}

async function v2confirmOpp(oppId, data){
  var opp = await v2get(oppId); if(!opp) return;
  opp.countConfirmed = parseInt(data.confirmed)||0;
  opp.countQualified = parseInt(data.qualified)||0;
  opp.countClosing = parseInt(data.closing)||0;
  opp.countLost = parseInt(data.lost)||0;
  opp.status = 'confirmed'; opp.confirmedAt = Date.now();
  await v2set(oppId, opp);
}

async function v2headResolveOpp(oppId, finalCount){
  var opp = await v2get(oppId); if(!opp) return;
  opp.countFinal = parseInt(finalCount)||0;
  opp.status = 'head_reviewed';
  await v2set(oppId, opp);
}

// ── Setter bonus: blocked/released model ──
function v2calcSetterBonus(setterId, opps, sales){
  var qualifiedTotal = opps
    .filter(function(o){ return o.setterId === setterId && (o.status==='confirmed'||o.status==='head_reviewed'); })
    .reduce(function(s,o){ return s + (o.countFinal != null ? o.countFinal : (o.countQualified||0)); }, 0);
  var blockedUnits = Math.floor(qualifiedTotal / 10);
  var setterSales = sales.filter(function(s){ return s.setterId === setterId; }).length;
  var releasedUnits = Math.min(blockedUnits, setterSales);
  return {
    qualifiedTotal: qualifiedTotal,
    blockedUnits: blockedUnits, releasedUnits: releasedUnits,
    bonusBlocked: (blockedUnits - releasedUnits) * 100,
    bonusReleased: releasedUnits * 100,
    toNextBlock: qualifiedTotal % 10 === 0 ? 0 : 10 - (qualifiedTotal % 10),
    total: blockedUnits * 100
  };
}

// ── Head notes ──
async function v2saveHeadNote(text){
  await v2set('ops_headnote_' + v2today(), {text:text, ts:Date.now()});
}
async function v2getHeadNote(){
  return (await v2get('ops_headnote_' + v2today())) || {text:'', ts:null};
}

// ── Activity chart history ──
async function v2getUserFillHistory(userId, days){
  var result = [];
  var now = new Date();
  var allKeys = await v2list('ops_fill_');
  for(var i = days-1; i >= 0; i--){
    var d = new Date(now);
    d.setDate(d.getDate() - i);
    var dateStr = d.toISOString().split('T')[0];
    var keyName = 'ops_fill_' + dateStr + '_' + userId;
    var exists = allKeys.indexOf(keyName) >= 0;
    var fill = exists ? await v2get(keyName) : null;
    if(fill) fill = v2normalizeFill(fill);
    var channels = {};
    var total = 0;
    V2_CHANNELS.forEach(function(ch){
      var v = fill && fill.channels && fill.channels[ch.id];
      var n = parseInt(typeof v === 'object' ? (v && v.a || 0) : (v || 0)) || 0;
      channels[ch.id] = n;
      total += n;
    });
    result.push({date:dateStr, day:d.getDate(), month:d.getMonth()+1, total:total, channels:channels, hasFill:!!fill, isToday:dateStr===v2today()});
  }
  return result;
}


// ═══════════════════════════════════════════════════════════════
// SECTION 3: ACTIVITY CHART (SVG stacked bars)
// ═══════════════════════════════════════════════════════════════

function v2buildActivityChart(history, dailyTarget){
  var W=900,H=260,padL=46,padR=14,padT=22,padB=38;
  var cW=W-padL-padR, cH=H-padT-padB;
  var n=history.length;
  if(!n) return '';
  var maxVal = Math.max.apply(null, history.map(function(d){return d.total;}).concat([dailyTarget>0?dailyTarget*1.15:20, 20]));
  var toY = function(v){ return padT + cH - (v/maxVal)*cH; };
  var slot = cW/n;
  var barW = Math.max(4, slot*0.75);
  var showEvery = n>60?14 : n>30?7 : n>14?3 : 1;
  var parts = [];

  // Grid
  var yTicks = 4;
  for(var t=0; t<=yTicks; t++){
    var v = Math.round((maxVal/yTicks)*t);
    var y = toY(v).toFixed(1);
    parts.push('<line x1="'+padL+'" y1="'+y+'" x2="'+(W-padR)+'" y2="'+y+'" stroke="rgba(255,255,255,.05)" stroke-width="1"/>');
    parts.push('<text x="'+(padL-5)+'" y="'+(parseFloat(y)+4).toFixed(1)+'" text-anchor="end" fill="#555" font-size="10" font-family="DM Mono,monospace">'+v+'</text>');
  }
  parts.push('<line x1="'+padL+'" y1="'+(padT+cH).toFixed(1)+'" x2="'+(W-padR)+'" y2="'+(padT+cH).toFixed(1)+'" stroke="rgba(255,255,255,.09)" stroke-width="1"/>');

  // Bars
  history.forEach(function(d, i){
    var bx = (padL + i*slot + (slot-barW)/2).toFixed(1);
    var bottom = padT + cH;
    var cum = 0;
    if(d.isToday){
      parts.push('<rect x="'+bx+'" y="'+padT+'" width="'+barW.toFixed(1)+'" height="'+cH+'" fill="rgba(241,16,19,.05)" rx="2"/>');
    }
    V2_CHANNELS.forEach(function(ch){
      var val = d.channels[ch.id] || 0;
      if(!val) return;
      var h = (val/maxVal)*cH;
      var yp = (bottom - cum - h).toFixed(1);
      var col = V2_CHANNEL_COLORS[ch.id];
      var op = d.hasFill ? (d.isToday ? 1 : 0.82) : 0.12;
      parts.push('<rect x="'+bx+'" y="'+yp+'" width="'+barW.toFixed(1)+'" height="'+h.toFixed(1)+'" fill="'+col+'" opacity="'+op+'" rx="1"/>');
      cum += h;
    });
    if(d.hasFill && d.total > 0 && barW >= 6){
      var ly = (bottom - cum - 5).toFixed(1);
      parts.push('<text x="'+(parseFloat(bx)+barW/2).toFixed(1)+'" y="'+ly+'" text-anchor="middle" fill="'+(d.isToday?'#fff':'#999')+'" font-size="'+(barW>12?10:8)+'" font-family="DM Mono,monospace" font-weight="'+(d.isToday?'600':'400')+'">'+d.total+'</text>');
    }
    if(i % showEvery === 0 || i === n-1){
      var lx = (parseFloat(bx)+barW/2).toFixed(1);
      var label = String(d.day).padStart(2,'0')+'/'+String(d.month).padStart(2,'0');
      parts.push('<text x="'+lx+'" y="'+(padT+cH+14).toFixed(1)+'" text-anchor="middle" fill="'+(d.isToday?'var(--red,#F11013)':'#555')+'" font-size="9" font-family="DM Mono,monospace" font-weight="'+(d.isToday?'600':'400')+'">'+label+'</text>');
    }
  });

  // Target line
  if(dailyTarget > 0 && dailyTarget < maxVal){
    var ty = toY(dailyTarget).toFixed(1);
    parts.push('<line x1="'+padL+'" y1="'+ty+'" x2="'+(W-padR)+'" y2="'+ty+'" stroke="#FFD130" stroke-width="1.5" stroke-dasharray="6,3" opacity=".75"/>');
    parts.push('<text x="'+((W-padR)+3).toFixed(1)+'" y="'+(parseFloat(ty)+4).toFixed(1)+'" fill="#FFD130" font-size="9" font-family="DM Mono,monospace">meta</text>');
  }

  // Legend
  var legY = H-8;
  var visCh = V2_CHANNELS.filter(function(ch){ return history.some(function(d){ return d.channels[ch.id]>0; }); });
  var legSlot = Math.min(100, cW/Math.max(visCh.length, 1));
  visCh.forEach(function(ch, i){
    var lx = padL + i*legSlot;
    parts.push('<rect x="'+lx+'" y="'+(legY-8)+'" width="8" height="8" fill="'+V2_CHANNEL_COLORS[ch.id]+'" rx="1"/>');
    parts.push('<text x="'+(lx+10)+'" y="'+legY+'" fill="#666" font-size="9" font-family="DM Mono,monospace">'+ch.label+'</text>');
  });

  return '<svg viewBox="0 0 '+W+' '+H+'" xmlns="http://www.w3.org/2000/svg" style="width:100%;display:block;">'+parts.join('')+'</svg>';
}

function v2buildChartInsights(history, dailyTarget){
  var filled = history.filter(function(d){ return d.hasFill && d.total > 0; });
  if(!filled.length) return '<div style="text-align:center;padding:12px;color:#888;font-size:12px;opacity:.6;">Nenhum dado no período</div>';
  var scores = filled.map(function(d){ return d.total; });
  var best = Math.max.apply(null, scores);
  var bestDay = history.find(function(d){ return d.total === best; });
  var avg = Math.round(scores.reduce(function(a,b){return a+b;},0) / scores.length);
  var streak = 0;
  for(var i = history.length-1; i >= 0; i--){ if(history[i].hasFill) streak++; else break; }
  var totals = {};
  V2_CHANNELS.forEach(function(ch){ totals[ch.id] = 0; });
  filled.forEach(function(d){ V2_CHANNELS.forEach(function(ch){ totals[ch.id] += (d.channels[ch.id]||0); }); });
  var champEntry = Object.entries(totals).sort(function(a,b){ return b[1]-a[1]; })[0];
  var champId = champEntry[0];
  var champCh = V2_CHANNELS.find(function(c){ return c.id === champId; });
  var pctVsMeta = dailyTarget > 0 ? Math.round(avg/dailyTarget*100) : null;

  return '<div class="opsv2-insight-grid">'
    + '<div class="kpi-box"><div class="kpi-num" style="font-family:var(--font-mono,monospace);font-size:22px;font-weight:700;color:#FFD130;">'+best+'</div><div class="kpi-label" style="font-size:10px;color:#888;text-transform:uppercase;">Melhor dia</div><div style="font-size:11px;color:#888;margin-top:4px;">'+(bestDay?v2fmtDate(bestDay.date):'—')+'</div></div>'
    + '<div class="kpi-box"><div class="kpi-num" style="font-family:var(--font-mono,monospace);font-size:22px;font-weight:700;color:'+(pctVsMeta===null?'#888':pctVsMeta>=100?'#00C864':pctVsMeta>=60?'#FFD130':'#F11013')+';">'+avg+'</div><div class="kpi-label" style="font-size:10px;color:#888;text-transform:uppercase;">Média/dia</div><div style="font-size:11px;color:#888;margin-top:4px;">'+(pctVsMeta!==null?pctVsMeta+'% da meta':'Configure a meta')+'</div></div>'
    + '<div class="kpi-box"><div class="kpi-num" style="font-family:var(--font-mono,monospace);font-size:22px;font-weight:700;color:'+(streak>=7?'#00C864':streak>=3?'#FFD130':'#F11013')+';">'+streak+'</div><div class="kpi-label" style="font-size:10px;color:#888;text-transform:uppercase;">Sequência</div><div style="font-size:11px;color:#888;margin-top:4px;">'+(streak>=7?'🔥 Em chamas':streak>=3?'📈 Consistente':'Continue')+'</div></div>'
    + '<div class="kpi-box"><div class="kpi-num" style="font-family:var(--font-mono,monospace);font-size:20px;font-weight:700;color:'+V2_CHANNEL_COLORS[champId]+';">'+totals[champId]+'</div><div class="kpi-label" style="font-size:10px;color:#888;text-transform:uppercase;">Canal campeão</div><div style="font-size:11px;color:#888;margin-top:4px;">'+(champCh?champCh.icon+' '+champCh.label:'—')+'</div></div>'
    + '</div>';
}


// ═══════════════════════════════════════════════════════════════
// SECTION 4: RENDER — FILL FORM (v2 with 5 channels a/b)
// ═══════════════════════════════════════════════════════════════

async function v2renderFill(body, session){
  var u = session;
  var userId = u.userId || u.id;
  var userName = u.name;
  var userRole = u.role;
  var plan = u.plan || v2getUserPlan(u);
  var key = 'ops_fill_' + v2today() + '_' + userId;
  var ex = await v2get(key);
  if(ex) ex = v2normalizeFill(ex);
  var filled = !!ex;
  var users = await v2getUsers();
  var sales = await v2getMonthSales();
  var mySales = sales.filter(function(s){ return s.sellerId === userId || s.founderId === userId; });
  var setterOpts = users.filter(function(r){ return r.active && r.role === 'setter'; })
    .map(function(r){ return '<option value="'+r.id+'" data-name="'+v2esc(r.name)+'">'+v2esc(r.name)+'</option>'; }).join('');

  // Channel cards
  var chCards = V2_CHANNELS.map(function(ch){
    var v = ex && ex.channels && ex.channels[ch.id];
    var va = v ? (typeof v === 'object' ? v.a : v) : '';
    var vb = v ? (typeof v === 'object' ? v.b : '') : '';
    return '<div class="opsv2-ch-card"><div style="display:flex;align-items:center;gap:8px;margin-bottom:12px;"><span style="font-size:20px;">'+ch.icon+'</span><span style="font-weight:600;">'+ch.label+'</span></div>'
      + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">'
      + '<div><div style="font-size:11px;color:#888;margin-bottom:4px;">'+ch.fA+'</div><input type="number" min="0" id="v2ch_'+ch.id+'_a" placeholder="0" value="'+v2esc(va)+'" oninput="window._v2updateScore()"></div>'
      + '<div><div style="font-size:11px;color:#888;margin-bottom:4px;">'+ch.fB+'</div><input type="number" min="0" id="v2ch_'+ch.id+'_b" placeholder="0" value="'+v2esc(vb)+'"></div>'
      + '</div></div>';
  }).join('');

  // Recent sales
  var recentHTML = mySales.sort(function(a,b){return b.ts-a.ts;}).slice(0,3).map(function(s){
    return '<div class="opsv2-sale-row"><div style="flex:1;"><div style="font-weight:600;font-size:12px;">'+v2fmtDate(s.date)+'</div>'
      + '<div style="font-size:11px;color:#888;margin-top:4px;">Setup '+v2fmt$(s.setupValue||s.founderSetupComm||0)+' · Rec '+v2fmt$(s.recValue||s.founderMrrComm||0)
      + (s.setterName ? ' · Setter: <strong style="color:#9B7FE0;">'+v2esc(s.setterName)+'</strong>' : '')+'</div></div>'
      + '<div style="text-align:right;"><div style="font-family:var(--font-mono,monospace);font-weight:700;color:#00C864;font-size:12px;">'+v2fmt$((s.sellerSetupComm||s.founderSetupComm||0)+(s.sellerRecComm||s.founderMrrComm||0))+'</div></div></div>';
  }).join('') || '<div style="text-align:center;padding:12px;color:#888;font-size:12px;opacity:.6;">Sem vendas este mês</div>';

  // NI onboarding banner
  var hasNI = await v2get('ni_profile_' + userId);
  var niBanner = !hasNI ? '<div class="opsv2-ni-onboard" onclick="window._v2switchRepTab(\'identidade\')" role="button"><div style="display:flex;align-items:center;justify-content:space-between;"><div><div style="font-weight:600;font-size:14px;">🔥 Configure sua visão de 180 dias</div><div style="font-size:12px;color:#888;margin-top:4px;">Leva 2 minutos. Muda tudo.</div></div><span style="color:#F11013;font-weight:600;font-size:18px;">→</span></div></div>' : '';

  var periods = [7,15,30,60,90];
  var periodBtns = periods.map(function(p){
    return '<button class="opsv2-chart-period'+(v2State.chartPeriod===p?' active':'')+'" onclick="window._v2switchChartPeriod('+p+',\''+userId+'\')">'+p+'d</button>';
  }).join('');

  body.innerHTML = '<div class="opsv2-fade">'
    + niBanner
    + (filled ? '<div style="background:rgba(0,200,100,.08);border:1px solid rgba(0,200,100,.22);border-radius:10px;padding:13px 16px;margin-bottom:16px;font-size:13px;color:#00C864;">✅ Preenchido hoje às '+v2fmtTime(ex.ts)+' — score: <strong>'+v2calcScore(ex)+' pts</strong></div>' : '')
    + '<div class="opsv2-ch-grid">' + chCards + '</div>'
    + '<div style="margin-top:16px;"><div style="font-size:11px;color:#888;margin-bottom:4px;">Observação / Bloqueios (opcional)</div><textarea id="v2obs" placeholder="Ex: leads frios..." style="width:100%;background:var(--elevated,#191919);border:1px solid var(--border,rgba(255,255,255,.1));border-radius:10px;padding:10px 14px;color:var(--text-primary,#F5F5F5);font-family:var(--font-body,sans-serif);font-size:13px;outline:none;resize:none;min-height:60px;">'+v2esc(ex && ex.obs || '')+'</textarea></div>'
    + '<div style="margin-top:16px;display:flex;align-items:center;justify-content:space-between;">'
    + '<div style="display:flex;align-items:center;gap:8px;"><span style="color:#888;font-size:12px;">Score estimado:</span><span style="font-family:var(--font-mono,monospace);font-weight:700;color:#F11013;" id="v2score-prev">0 pts</span></div>'
    + '<button id="v2submit-btn" onclick="window._v2submitFill()" style="padding:10px 20px;background:#F11013;color:#fff;border:none;border-radius:10px;font-size:13px;font-weight:600;cursor:pointer;">'+(filled?'🔄 Atualizar':'✅ Enviar Atividades')+'</button>'
    + '</div>'
    // Activity chart
    + '<div class="opsv2-chart-wrap">'
    + '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;">'
    + '<div><div style="font-weight:600;font-size:15px;">📈 Progressão de Atividade</div><div style="font-size:11px;color:#888;margin-top:4px;">Histórico diário por canal</div></div>'
    + '<div style="display:flex;gap:4px;">'+periodBtns+'</div>'
    + '</div>'
    + '<div id="v2activity-chart"><div style="display:flex;align-items:center;justify-content:center;height:200px;color:#888;gap:10px;"><div style="width:16px;height:16px;border:2px solid rgba(255,255,255,.1);border-top-color:#F11013;border-radius:50%;animation:spin .6s linear infinite;"></div></div></div>'
    + '<div id="v2activity-insights"></div>'
    + '</div>'
    // Sale form
    + '<div style="height:1px;background:linear-gradient(90deg,transparent,rgba(255,255,255,.09),transparent);margin:18px 0;"></div>'
    + '<div class="opsv2-card" style="margin-top:8px;">'
    + '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;"><div><div style="font-weight:600;font-size:15px;">💰 Registrar Venda</div></div><button onclick="var f=document.getElementById(\'v2sale-form\');if(f)f.style.display=f.style.display===\'none\'?\'block\':\'none\';" style="padding:7px 14px;background:rgba(0,200,100,.08);border:1px solid rgba(0,200,100,.22);border-radius:10px;font-size:12px;color:#00C864;cursor:pointer;font-weight:700;">+ Nova Venda</button></div>'
    + '<div id="v2sale-form" style="display:none;background:var(--elevated,#191919);border:1px solid var(--border,rgba(255,255,255,.1));border-radius:14px;padding:18px;margin-bottom:14px;">'
    + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px;">'
    + '<div><div style="font-size:11px;color:#888;margin-bottom:4px;">Valor do Setup ($)</div><input type="number" id="v2sale-setup" placeholder="789" value="789" min="197" max="1497" oninput="window._v2updateSaleComm()"></div>'
    + '<div><div style="font-size:11px;color:#888;margin-bottom:4px;">Recorrência/mês ($)</div><input type="number" id="v2sale-rec" placeholder="297" value="297" min="97" max="497" oninput="window._v2updateSaleComm()"></div>'
    + '</div>'
    + '<div style="margin-bottom:12px;"><div style="font-size:11px;color:#888;margin-bottom:4px;">Setter que gerou o lead</div><select id="v2sale-setter" onchange="window._v2updateSaleComm()"><option value="">— Sem setter / Lead próprio</option>'+setterOpts+'</select></div>'
    + '<div class="opsv2-comm-preview"><div style="font-weight:600;font-size:12px;margin-bottom:8px;">Comissão calculada:</div>'
    + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">'
    + '<div><div style="font-size:11px;color:#888;margin-bottom:4px;">Sua comissão ('+v2esc((V2_PLANS[plan]||V2_PLANS.AUTONOMO).label)+')</div><div style="font-family:var(--font-mono,monospace);font-weight:700;color:#00C864;" id="v2cp-seller">—</div></div>'
    + '<div id="v2cp-setter-wrap" style="display:none;"><div style="font-size:11px;color:#888;margin-bottom:4px;">Comissão do Setter</div><div style="font-family:var(--font-mono,monospace);font-weight:700;color:#9B7FE0;" id="v2cp-setter">—</div></div>'
    + '</div></div>'
    + '<button id="v2sale-btn" onclick="window._v2submitSale()" style="width:100%;margin-top:12px;padding:10px;background:rgba(0,200,100,.1);border:1px solid rgba(0,200,100,.22);border-radius:10px;color:#00C864;font-weight:700;font-size:13px;cursor:pointer;">✅ Confirmar Venda</button>'
    + '</div>'
    + '<div style="font-size:11px;color:#888;font-weight:600;text-transform:uppercase;letter-spacing:.06em;margin-bottom:8px;">Vendas deste mês</div>'
    + recentHTML
    + '</div>'
    + '</div>';

  // Init score + commission
  window._v2updateScore();
  window._v2updateSaleComm();
  // Load chart after render
  setTimeout(function(){ v2loadActivityChart(userId, v2State.chartPeriod); }, 50);
}

// ── Score update ──
window._v2updateScore = v2debounce(function(){
  var t = 0;
  V2_CHANNELS.forEach(function(ch){
    t += parseInt(document.getElementById('v2ch_'+ch.id+'_a')?.value) || 0;
  });
  var el = document.getElementById('v2score-prev');
  if(el) el.textContent = t + ' pts';
}, 150);

// ── Commission update ──
window._v2updateSaleComm = v2debounce(function(){
  var session = typeof opsGetSession === 'function' ? opsGetSession() : null;
  var plan = session ? (session.plan || v2getUserPlan(session)) : 'AUTONOMO';
  var setup = parseFloat(document.getElementById('v2sale-setup')?.value) || 789;
  var rec = parseFloat(document.getElementById('v2sale-rec')?.value) || 297;
  var sc = v2calcComm(plan, setup, rec);
  var selEl = document.getElementById('v2cp-seller');
  if(selEl) selEl.textContent = v2fmt$(sc.total) + ' (' + v2fmt$(sc.setup) + ' setup + ' + v2fmt$(sc.rec) + '/mês)';
  var sid = document.getElementById('v2sale-setter')?.value;
  var wrap = document.getElementById('v2cp-setter-wrap');
  if(sid){
    var stc = v2calcComm('SETTER', setup, rec);
    if(wrap) wrap.style.display = 'block';
    var stEl = document.getElementById('v2cp-setter');
    if(stEl) stEl.textContent = v2fmt$(stc.total);
  } else { if(wrap) wrap.style.display = 'none'; }
}, 150);

// ── Submit fill ──
window._v2submitFill = async function(){
  var session = typeof opsGetSession === 'function' ? opsGetSession() : null;
  if(!session) return;
  var btn = document.getElementById('v2submit-btn');
  if(!btn || btn.disabled) return;
  btn.disabled = true; btn.textContent = 'Salvando...';
  var channels = {};
  V2_CHANNELS.forEach(function(ch){
    channels[ch.id] = {
      a: document.getElementById('v2ch_'+ch.id+'_a')?.value || '0',
      b: document.getElementById('v2ch_'+ch.id+'_b')?.value || '0'
    };
  });
  var obs = document.getElementById('v2obs')?.value || '';
  var score = 0;
  for(var k in channels){ score += parseInt(channels[k].a) || 0; }
  var userId = session.userId || session.id;
  await v2set('ops_fill_' + v2today() + '_' + userId, {
    userId: userId, userName: session.name, userRole: session.role,
    userPlan: session.plan || v2getUserPlan(session),
    channels: channels, obs: obs, score: score, ts: Date.now()
  });
  btn.textContent = '🎯 Salvo!'; btn.style.background = '#00C864'; btn.style.color = '#000';
  setTimeout(function(){
    btn.textContent = '🔄 Atualizar'; btn.style.background = '#F11013'; btn.style.color = '#fff'; btn.disabled = false;
  }, 1500);
};

// ── Submit sale ──
window._v2submitSale = async function(){
  var session = typeof opsGetSession === 'function' ? opsGetSession() : null;
  if(!session) return;
  var btn = document.getElementById('v2sale-btn');
  if(!btn || btn.disabled) return;
  btn.disabled = true; btn.textContent = 'Salvando...';
  var setup = parseFloat(document.getElementById('v2sale-setup')?.value) || 0;
  var rec = parseFloat(document.getElementById('v2sale-rec')?.value) || 0;
  if(!setup || !rec){ alert('Preencha Setup e Recorrência.'); btn.disabled=false; btn.textContent='✅ Confirmar Venda'; return; }
  var userId = session.userId || session.id;
  var plan = session.plan || v2getUserPlan(session);
  var sc = v2calcComm(plan, setup, rec);
  var setterSel = document.getElementById('v2sale-setter');
  var setterId = setterSel?.value || null;
  var setterName = setterId ? setterSel.options[setterSel.selectedIndex]?.getAttribute('data-name') || null : null;
  var stc = setterId ? v2calcComm('SETTER', setup, rec) : null;
  var saleKey = 'ops_sale_' + v2today() + '_' + userId + '_' + Date.now();
  await v2set(saleKey, {
    id:saleKey, date:v2today(),
    sellerId:userId, sellerName:session.name, sellerRole:session.role, sellerPlan:plan,
    founderId:userId, founderName:session.name, founderRole:session.role,
    setterId:setterId, setterName:setterName,
    setupValue:setup, recValue:rec,
    sellerSetupComm:sc.setup, sellerRecComm:sc.rec,
    founderSetupComm:sc.setup, founderMrrComm:sc.rec,
    setterSetupComm:stc?stc.setup:0, setterRecComm:stc?stc.rec:0,
    status:'pending_head', ts:Date.now()
  });
  btn.textContent = '✅ Salvo! Comissão: ' + v2fmt$(sc.total);
  btn.style.background = '#00C864'; btn.style.color = '#000';
  setTimeout(function(){ btn.textContent='✅ Confirmar Venda'; btn.style.background='rgba(0,200,100,.1)'; btn.style.color='#00C864'; btn.disabled=false; }, 2000);
};

// ── Chart loading ──
async function v2loadActivityChart(userId, period){
  var chartEl = document.getElementById('v2activity-chart');
  var insightEl = document.getElementById('v2activity-insights');
  if(!chartEl) return;
  var profile = await v2get('ni_profile_' + userId);
  var dailyTarget = profile && profile.metaCalls ? Math.round(profile.metaCalls / 22) : 0;
  var history = await v2getUserFillHistory(userId, period);
  chartEl.innerHTML = v2buildActivityChart(history, dailyTarget) || '<div style="text-align:center;padding:16px;color:#888;font-size:12px;opacity:.6;">Sem dados no período</div>';
  if(insightEl) insightEl.innerHTML = v2buildChartInsights(history, dailyTarget);
}

window._v2switchChartPeriod = function(p, userId){
  v2State.chartPeriod = p;
  document.querySelectorAll('.opsv2-chart-period').forEach(function(el){
    var m = el.getAttribute('onclick')?.match(/switchChartPeriod\((\d+)/);
    if(m) el.className = 'opsv2-chart-period' + (parseInt(m[1])===p ? ' active' : '');
  });
  v2loadActivityChart(userId, p);
};


// ═══════════════════════════════════════════════════════════════
// SECTION 5: PIPELINE TAB
// ═══════════════════════════════════════════════════════════════

async function v2renderPipeline(body){
  var ym = v2month();
  var opps = await v2getMonthOpps(ym);
  var sales = await v2getMonthSales(ym);
  var users = await v2getUsers();
  var setters = users.filter(function(u){ return u.active && u.role === 'setter'; });

  var declared = opps.reduce(function(s,o){ return s + o.countDeclared; }, 0);
  var confirmed = opps.filter(function(o){ return o.status !== 'pending'; }).reduce(function(s,o){ return s + (o.countFinal != null ? o.countFinal : (o.countConfirmed||0)); }, 0);
  var qualified = opps.filter(function(o){ return o.status !== 'pending'; }).reduce(function(s,o){ return s + (o.countFinal != null ? o.countFinal : (o.countQualified||0)); }, 0);
  var closing = opps.filter(function(o){ return o.status !== 'pending'; }).reduce(function(s,o){ return s + (o.countClosing||0); }, 0);
  var closed = sales.length;
  var lost = opps.filter(function(o){ return o.status !== 'pending'; }).reduce(function(s,o){ return s + (o.countLost||0); }, 0);

  var funnelMax = Math.max(declared, 1);
  var steps = [
    {lbl:'Geradas (Setters)', val:declared, color:'#9B7FE0'},
    {lbl:'Confirmadas',       val:confirmed, color:'#5B9AF5'},
    {lbl:'Qualificadas',      val:qualified, color:'#FFD130'},
    {lbl:'Em Fechamento',     val:closing,   color:'#C8A400'},
    {lbl:'Vendas Fechadas',   val:closed,    color:'#00C864'},
    {lbl:'Perdidas',          val:lost,      color:'#F11013'},
  ];

  var funnelHTML = steps.map(function(s, i){
    var w = Math.round(s.val / funnelMax * 100);
    var prev = i > 0 ? steps[i-1].val : null;
    var rate = prev && prev > 0 ? Math.round(s.val / prev * 100) : null;
    return '<div class="opsv2-funnel-bar"><div class="opsv2-funnel-label">'+s.lbl+'</div>'
      + '<div class="opsv2-funnel-track"><div class="opsv2-funnel-fill" style="width:'+w+'%;background:'+s.color+';"><span class="opsv2-funnel-val">'+s.val+'</span></div></div>'
      + '<div class="opsv2-funnel-pct">'+(rate !== null ? rate+'%' : '')+'</div></div>';
  }).join('');

  // Stale pending (>24h)
  var now = Date.now();
  var stale = opps.filter(function(o){ return o.status === 'pending' && (now - o.ts) > 86400000; });

  var staleHTML = stale.length ? stale.map(function(o){
    return '<div class="opsv2-opp-card discrepancy" style="margin-bottom:8px;">'
      + '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px;">'
      + '<div><span style="font-weight:600;font-size:12px;">'+v2esc(o.setterName)+'</span> → <span style="font-weight:600;font-size:12px;">'+v2esc(o.founderName||'sem atribuição')+'</span></div>'
      + '<span style="background:rgba(241,16,19,.08);color:#F11013;border:1px solid rgba(241,16,19,.22);padding:3px 10px;border-radius:20px;font-size:10px;font-weight:700;">+24h</span></div>'
      + '<div style="font-size:11px;color:#888;margin-bottom:8px;">'+o.countDeclared+' opps declaradas em '+v2fmtDate(o.date)+'</div>'
      + '<div style="display:flex;gap:8px;align-items:center;">'
      + '<input type="number" min="0" id="v2hr_'+o.id+'" placeholder="Nº final" style="width:120px;background:var(--elevated,#191919);border:1px solid var(--border,rgba(255,255,255,.1));border-radius:10px;padding:8px;color:var(--text-primary,#F5F5F5);font-family:var(--font-mono,monospace);text-align:center;" value="'+o.countDeclared+'">'
      + '<button onclick="v2headResolveOpp(\''+o.id+'\',document.getElementById(\'v2hr_'+o.id+'\').value).then(function(){v2renderPipeline(document.getElementById(\'ops-tab-body\')||document.getElementById(\'ops-head-body\'));})" style="padding:7px 14px;background:#F11013;color:#fff;border:none;border-radius:10px;font-size:12px;font-weight:700;cursor:pointer;">👑 Definir</button>'
      + '</div></div>';
  }).join('') : '<div style="font-size:12px;color:#888;opacity:.6;">Nenhuma pendência crítica</div>';

  // Setter bonus table
  var setterRows = setters.map(function(s){
    var bonus = v2calcSetterBonus(s.id, opps, sales);
    var myOpps = opps.filter(function(o){ return o.setterId === s.id; });
    var myDecl = myOpps.reduce(function(t,o){ return t + o.countDeclared; }, 0);
    var myQual = myOpps.filter(function(o){ return o.status !== 'pending'; }).reduce(function(t,o){ return t + (o.countFinal != null ? o.countFinal : (o.countQualified||0)); }, 0);
    return '<tr><td style="font-weight:600;">'+v2esc(s.name)+'</td>'
      + '<td style="font-family:var(--font-mono,monospace);">'+myDecl+'</td>'
      + '<td style="font-family:var(--font-mono,monospace);">'+myQual+'</td>'
      + '<td style="font-family:var(--font-mono,monospace);color:#9B7FE0;">'+bonus.blockedUnits+'× $100 bloq.</td>'
      + '<td style="font-family:var(--font-mono,monospace);color:#00C864;">'+bonus.releasedUnits+'× $100 lib.</td>'
      + '<td style="font-family:var(--font-mono,monospace);font-weight:700;">'+v2fmt$(bonus.bonusReleased)+(bonus.bonusBlocked>0?' <span style="font-size:11px;color:#888;">+ '+v2fmt$(bonus.bonusBlocked)+' bloq.</span>':'')+'</td></tr>';
  }).join('');

  body.innerHTML = '<div class="opsv2-fade">'
    // KPIs
    + '<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:16px;">'
    + '<div class="kpi-box"><div class="kpi-num" style="font-family:var(--font-mono,monospace);font-size:22px;font-weight:700;color:#9B7FE0;">'+declared+'</div><div class="kpi-label" style="font-size:10px;color:#888;text-transform:uppercase;">Geradas</div></div>'
    + '<div class="kpi-box"><div class="kpi-num" style="font-family:var(--font-mono,monospace);font-size:22px;font-weight:700;color:#FFD130;">'+qualified+'</div><div class="kpi-label" style="font-size:10px;color:#888;text-transform:uppercase;">Qualificadas</div></div>'
    + '<div class="kpi-box"><div class="kpi-num" style="font-family:var(--font-mono,monospace);font-size:22px;font-weight:700;color:#00C864;">'+closed+'</div><div class="kpi-label" style="font-size:10px;color:#888;text-transform:uppercase;">Vendas</div></div>'
    + '<div class="kpi-box"><div class="kpi-num" style="font-family:var(--font-mono,monospace);font-size:22px;font-weight:700;color:#F11013;">'+lost+'</div><div class="kpi-label" style="font-size:10px;color:#888;text-transform:uppercase;">Perdidas</div></div>'
    + '</div>'
    // Funnel
    + '<div class="opsv2-card" style="margin-bottom:16px;">'
    + '<div style="font-weight:600;font-size:15px;margin-bottom:14px;">📊 Funil do Time — '+new Date().toLocaleDateString('pt-BR',{month:'long',year:'numeric'})+'</div>'
    + funnelHTML
    + '<div style="font-size:11px;color:#888;margin-top:8px;opacity:.6;">% = conversão em relação à etapa anterior</div>'
    + '</div>'
    // Stale
    + '<div style="margin-bottom:16px;"><div style="font-weight:600;font-size:15px;margin-bottom:12px;">⚠️ Pendentes há mais de 24h</div>' + staleHTML + '</div>'
    // Setter table
    + (setterRows ? '<div class="opsv2-card"><div style="font-weight:600;font-size:15px;margin-bottom:12px;">🎯 Performance dos Setters — Bônus</div>'
    + '<div style="background:rgba(200,164,0,.08);border:1px solid rgba(200,164,0,.22);border-radius:10px;padding:13px 16px;margin-bottom:12px;font-size:13px;color:#FFD130;">Regra: 10 leads qualificados = $100 bloqueado · 1 venda fechada = $100 liberado</div>'
    + '<div style="overflow-x:auto;border-radius:14px;border:1px solid var(--border,rgba(255,255,255,.1));"><table style="width:100%;border-collapse:collapse;">'
    + '<thead><tr><th style="text-align:left;font-size:10px;text-transform:uppercase;letter-spacing:.08em;color:#888;padding:11px 14px;border-bottom:1px solid rgba(255,255,255,.05);background:var(--elevated,#191919);">SETTER</th><th style="padding:11px 14px;border-bottom:1px solid rgba(255,255,255,.05);background:var(--elevated,#191919);font-size:10px;color:#888;text-transform:uppercase;">DECL.</th><th style="padding:11px 14px;border-bottom:1px solid rgba(255,255,255,.05);background:var(--elevated,#191919);font-size:10px;color:#888;text-transform:uppercase;">QUALIF.</th><th style="padding:11px 14px;border-bottom:1px solid rgba(255,255,255,.05);background:var(--elevated,#191919);font-size:10px;color:#888;text-transform:uppercase;">BLOQ.</th><th style="padding:11px 14px;border-bottom:1px solid rgba(255,255,255,.05);background:var(--elevated,#191919);font-size:10px;color:#888;text-transform:uppercase;">LIB.</th><th style="padding:11px 14px;border-bottom:1px solid rgba(255,255,255,.05);background:var(--elevated,#191919);font-size:10px;color:#888;text-transform:uppercase;">TOTAL</th></tr></thead>'
    + '<tbody>'+setterRows+'</tbody></table></div></div>' : '')
    + '</div>';
}


// ══════════════���═════════════════════════��══════════════════════
// SECTION 6: ENHANCED IDENTITY / NI DASHBOARD
// ═══════��═══════════════════════════════════════════════════════

async function v2renderIdentity(body, session){
  var userId = session.userId || session.id;
  var profile = await v2get('ni_profile_' + userId);
  if(!profile){
    v2renderNISetup(body, session);
  } else {
    await v2renderNIDashboard(body, session, profile);
  }
}

function v2renderNISetup(body, session){
  var userId = session.userId || session.id;
  body.innerHTML = '<div class="opsv2-fade"><div style="max-width:640px;">'
    + '<div class="opsv2-quote" style="margin-bottom:16px;">"A maioria das pessoas subestima o que pode construir em 180 dias com execução diária."</div>'
    // Step 1
    + '<div style="margin-bottom:24px;"><div style="display:flex;align-items:center;gap:8px;margin-bottom:12px;font-family:var(--font-display,sans-serif);font-size:18px;letter-spacing:.04em;color:#F11013;"><span class="opsv2-setup-num">1</span> QUEM VOCÊ É</div>'
    + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">'
    + '<div><div style="font-size:10px;color:#888;text-transform:uppercase;letter-spacing:.1em;margin-bottom:6px;">Nacionalidade</div><select id="v2ni-nat" style="width:100%;background:var(--elevated,#191919);border:1px solid var(--border,rgba(255,255,255,.1));border-radius:10px;padding:10px 14px;color:var(--text-primary,#F5F5F5);"><option value="Brasileiro">🇧🇷 Brasileiro</option><option value="Venezuelano">🇻🇪 Venezuelano</option><option value="Argentino">🇦🇷 Argentino</option><option value="Colombiano">🇨��� Colombiano</option><option value="Outro">🌎 Outro</option></select></div>'
    + '<div><div style="font-size:10px;color:#888;text-transform:uppercase;letter-spacing:.1em;margin-bottom:6px;">Frase âncora</div><input type="text" id="v2ni-anchor" placeholder="Ex: Vim de longe demais para desistir." style="width:100%;background:var(--elevated,#191919);border:1px solid var(--border,rgba(255,255,255,.1));border-radius:10px;padding:10px 14px;color:var(--text-primary,#F5F5F5);"></div>'
    + '</div></div>'
    // Step 2
    + '<div style="margin-bottom:24px;"><div style="display:flex;align-items:center;gap:8px;margin-bottom:12px;font-family:var(--font-display,sans-serif);font-size:18px;letter-spacing:.04em;color:#F11013;"><span class="opsv2-setup-num">2</span> SUA META FINANCEIRA</div>'
    + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">'
    + '<div><div style="font-size:10px;color:#888;text-transform:uppercase;letter-spacing:.1em;margin-bottom:6px;">Meta mensal (USD)</div><input type="number" id="v2ni-meta-m" placeholder="5000" oninput="var el=document.getElementById(\'v2ni-meta-180\');if(el)el.value=this.value?this.value*6:\'\';" style="width:100%;background:var(--elevated,#191919);border:1px solid var(--border,rgba(255,255,255,.1));border-radius:10px;padding:10px 14px;color:var(--text-primary,#F5F5F5);font-family:var(--font-mono,monospace);text-align:center;"></div>'
    + '<div><div style="font-size:10px;color:#888;text-transform:uppercase;letter-spacing:.1em;margin-bottom:6px;">Meta 180 dias (auto)</div><input type="number" id="v2ni-meta-180" readonly style="width:100%;background:var(--elevated,#191919);border:1px solid var(--border,rgba(255,255,255,.1));border-radius:10px;padding:10px 14px;color:var(--text-primary,#F5F5F5);font-family:var(--font-mono,monospace);text-align:center;opacity:.6;"></div>'
    + '</div>'
    + '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;margin-top:8px;">'
    + '<div><div style="font-size:10px;color:#888;text-transform:uppercase;letter-spacing:.1em;margin-bottom:6px;">Meta calls/mês</div><input type="number" id="v2ni-calls" value="2000" style="width:100%;background:var(--elevated,#191919);border:1px solid var(--border,rgba(255,255,255,.1));border-radius:10px;padding:10px 14px;color:var(--text-primary,#F5F5F5);font-family:var(--font-mono,monospace);text-align:center;"></div>'
    + '<div><div style="font-size:10px;color:#888;text-transform:uppercase;letter-spacing:.1em;margin-bottom:6px;">Meta oportunidades</div><input type="number" id="v2ni-opps" value="40" style="width:100%;background:var(--elevated,#191919);border:1px solid var(--border,rgba(255,255,255,.1));border-radius:10px;padding:10px 14px;color:var(--text-primary,#F5F5F5);font-family:var(--font-mono,monospace);text-align:center;"></div>'
    + '<div><div style="font-size:10px;color:#888;text-transform:uppercase;letter-spacing:.1em;margin-bottom:6px;">Meta vendas/mês</div><input type="number" id="v2ni-sales" value="8" style="width:100%;background:var(--elevated,#191919);border:1px solid var(--border,rgba(255,255,255,.1));border-radius:10px;padding:10px 14px;color:var(--text-primary,#F5F5F5);font-family:var(--font-mono,monospace);text-align:center;"></div>'
    + '</div></div>'
    // Step 3
    + '<div style="margin-bottom:24px;"><div style="display:flex;align-items:center;gap:8px;margin-bottom:12px;font-family:var(--font-display,sans-serif);font-size:18px;letter-spacing:.04em;color:#F11013;"><span class="opsv2-setup-num">3</span> SUA VIDA EM 180 DIAS</div>'
    + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">'
    + '<div><div style="font-size:10px;color:#888;margin-bottom:6px;">Carro desejado</div><input type="text" id="v2ni-car" placeholder="Ex: Honda Civic 2023" style="width:100%;background:var(--elevated,#191919);border:1px solid var(--border,rgba(255,255,255,.1));border-radius:10px;padding:10px 14px;color:var(--text-primary,#F5F5F5);"></div>'
    + '<div><div style="font-size:10px;color:#888;margin-bottom:6px;">Moradia desejada</div><input type="text" id="v2ni-home" placeholder="Ex: Apto 2q em Miami" style="width:100%;background:var(--elevated,#191919);border:1px solid var(--border,rgba(255,255,255,.1));border-radius:10px;padding:10px 14px;color:var(--text-primary,#F5F5F5);"></div>'
    + '</div>'
    + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:8px;">'
    + '<div><div style="font-size:10px;color:#888;margin-bottom:6px;">Objetivo físico</div><input type="text" id="v2ni-body" placeholder="Ex: Perder 10kg" style="width:100%;background:var(--elevated,#191919);border:1px solid var(--border,rgba(255,255,255,.1));border-radius:10px;padding:10px 14px;color:var(--text-primary,#F5F5F5);"></div>'
    + '<div><div style="font-size:10px;color:#888;margin-bottom:6px;">Estilo de vida</div><input type="text" id="v2ni-style" placeholder="Ex: Academia diária" style="width:100%;background:var(--elevated,#191919);border:1px solid var(--border,rgba(255,255,255,.1));border-radius:10px;padding:10px 14px;color:var(--text-primary,#F5F5F5);"></div>'
    + '</div>'
    + '<div style="margin-top:8px;"><div style="font-size:10px;color:#888;margin-bottom:6px;">Quem você quer impactar</div><textarea id="v2ni-impact" placeholder="Ex: Minha mãe, minha filha..." style="width:100%;background:var(--elevated,#191919);border:1px solid var(--border,rgba(255,255,255,.1));border-radius:10px;padding:10px 14px;color:var(--text-primary,#F5F5F5);font-family:var(--font-body,sans-serif);resize:none;min-height:60px;"></textarea></div>'
    + '</div>'
    // CTA
    + '<button onclick="window._v2saveNIProfile(\''+userId+'\')" style="width:100%;padding:15px;background:#F11013;color:#fff;border:none;border-radius:10px;font-size:15px;font-weight:700;cursor:pointer;">🔥 ATIVAR MINHA NOVA IDENTIDADE</button>'
    + '<div style="text-align:center;font-size:11px;color:#888;margin-top:8px;">Você pode editar a qualquer momento</div>'
    + '</div></div>';
}

window._v2saveNIProfile = async function(userId){
  var g = function(id){ var el = document.getElementById(id); return el ? el.value.trim() : ''; };
  var metaM = parseFloat(g('v2ni-meta-m')) || 0;
  if(!metaM){ alert('Defina sua meta mensal.'); return; }
  var existing = await v2get('ni_profile_' + userId);
  var profile = {
    userId:userId, nat:g('v2ni-nat'), anchor:g('v2ni-anchor'),
    metaM:metaM, meta180:metaM*6,
    metaCalls:parseInt(g('v2ni-calls'))||2000, metaOpps:parseInt(g('v2ni-opps'))||40, metaSales:parseInt(g('v2ni-sales'))||8,
    car:g('v2ni-car'), home:g('v2ni-home'), body:g('v2ni-body'), style:g('v2ni-style'), impact:g('v2ni-impact'),
    startDate:(existing ? existing.startDate : null) || v2today(), ts:Date.now()
  };
  await v2set('ni_profile_' + userId, profile);
  var session = typeof opsGetSession === 'function' ? opsGetSession() : null;
  if(session){
    var body = document.getElementById('ops-tab-body');
    if(body) await v2renderIdentity(body, session);
  }
};

async function v2renderNIDashboard(body, session, p){
  var userId = session.userId || session.id;
  var sales = await v2getMonthSales();
  var monthFills = await v2getMonthFills(userId);
  var mySales = sales.filter(function(s){ return s.sellerId === userId || s.founderId === userId; });
  var revenue = mySales.reduce(function(s,x){ return s + (x.sellerSetupComm||x.founderSetupComm||0) + (x.sellerRecComm||x.founderMrrComm||0); }, 0);
  var monthlyCalls = monthFills.reduce(function(sum,f){ return sum + v2calcScore(f); }, 0);
  var fp = v2pct(revenue, p.metaM);
  var cp = v2pct(monthlyCalls, p.metaCalls);
  var sp = v2pct(mySales.length, p.metaSales);
  var dayData = v2calcDaysProgress(p.startDate);
  var motive = v2getMotiveMsg(fp, session.name);
  var imgs = {};
  V2_NI_FIELDS.forEach(function(f){ imgs[f.id] = V2IMG.get(f.id + '_' + userId); });
  var carBg = imgs.car ? "background-image:url('" + imgs.car + "');" : 'background:linear-gradient(135deg,#1a0000,#080808);';
  var anchor = p.anchor || 'Continue. Você está construindo sua nova vida, ' + v2esc(session.name) + '.';

  body.innerHTML = '<div class="opsv2-fade">'
    // Hero
    + '<div class="opsv2-ni-hero" style="margin-bottom:12px;">'
    + '<div class="opsv2-ni-hero-bg" style="' + carBg + '"></div>'
    + '<div class="opsv2-ni-hero-overlay"></div>'
    + '<div class="opsv2-ni-hero-content">'
    + '<div style="font-size:10px;color:rgba(255,255,255,.5);text-transform:uppercase;letter-spacing:.14em;margin-bottom:4px;">SUA NOVA IDENTIDADE EM CONSTRUÇÃO</div>'
    + '<div style="font-family:var(--font-display,sans-serif);font-size:clamp(24px,5vw,36px);letter-spacing:.04em;">' + v2esc(session.name) + '</div>'
    + (p.car ? '<div style="font-size:12px;margin-top:4px;color:rgba(255,255,255,.7);">' + v2esc(p.car) + '</div>' : '')
    + '<div style="display:flex;gap:8px;margin-top:12px;flex-wrap:wrap;">'
    + '<span style="background:rgba(200,164,0,.25);color:#FFD130;font-size:10px;padding:3px 10px;border-radius:20px;font-weight:700;">' + v2fmt$(p.metaM) + '/mês</span>'
    + '<span style="background:rgba(0,200,100,.15);color:#00C864;font-size:10px;padding:3px 10px;border-radius:20px;font-weight:700;">' + dayData.remaining + ' dias restantes</span>'
    + '</div></div></div>'
    // Anchor
    + '<div class="opsv2-quote" style="margin-bottom:16px;">"' + v2esc(anchor) + '"</div>'
    // Layout
    + '<div class="opsv2-ni-layout">'
    // Left: vision
    + '<div>'
    + '<div style="font-size:10px;color:#888;text-transform:uppercase;letter-spacing:.14em;margin-bottom:8px;">SUA VISÃO DE VIDA</div>'
    + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:12px;">'
    + V2_NI_FIELDS.map(function(f){
      var hasImg = !!imgs[f.id];
      return '<div>'
        + '<div class="opsv2-ni-upload' + (hasImg ? ' has-img' : '') + '" id="v2nizone_' + f.id + '" onclick="v2triggerUpload(\'' + f.id + '\',\'' + userId + '\',function(b64){var el=document.getElementById(\'v2nizone_' + f.id + '\');el.classList.add(\'has-img\');el.innerHTML=\'<img src=\\\'\'+b64+\'\\\' style=\\\"width:100%;height:100%;object-fit:cover;\\\">\';})">'
        + (hasImg ? '<img src="' + imgs[f.id] + '" style="width:100%;height:100%;object-fit:cover;">' : '<div style="font-size:24px;">' + f.emoji + '</div><div style="font-size:10px;color:#888;text-transform:uppercase;">' + f.label + '</div>')
        + '</div>'
        + '<div style="font-size:9px;color:#888;text-align:center;margin-top:4px;">' + f.label + '</div></div>';
    }).join('')
    + '</div>'
    // Life details
    + '<div class="opsv2-card"><div style="font-size:10px;color:#888;text-transform:uppercase;letter-spacing:.1em;margin-bottom:8px;">MINHA VIDA CONSTRUÍDA</div>'
    + '<div style="font-size:13px;line-height:1.9;">'
    + (p.car ? '<div style="display:flex;gap:8px;margin-bottom:4px;"><span style="color:#FFD130;">▸</span><span>' + v2esc(p.car) + '</span></div>' : '')
    + (p.home ? '<div style="display:flex;gap:8px;margin-bottom:4px;"><span style="color:#FFD130;">▸</span><span>' + v2esc(p.home) + '</span></div>' : '')
    + (p.body ? '<div style="display:flex;gap:8px;margin-bottom:4px;"><span style="color:#FFD130;">▸</span><span>' + v2esc(p.body) + '</span></div>' : '')
    + (p.style ? '<div style="display:flex;gap:8px;margin-bottom:4px;"><span style="color:#FFD130;">▸</span><span>' + v2esc(p.style) + '</span></div>' : '')
    + (p.impact ? '<div style="display:flex;gap:8px;margin-top:4px;"><span style="color:#F11013;">♥</span><span>' + v2esc(p.impact) + '</span></div>' : '')
    + '</div></div></div>'
    // Right: metrics
    + '<div>'
    + '<div style="font-size:10px;color:#888;text-transform:uppercase;letter-spacing:.14em;margin-bottom:8px;">SEU PROGRESSO ESTE MÊS</div>'
    // KPIs
    + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px;">'
    + '<div class="kpi-box"><div class="kpi-num" style="font-family:var(--font-mono,monospace);font-size:22px;font-weight:700;color:' + (fp>=80?'#00C864':fp>=40?'#FFD130':'#F11013') + ';">' + v2fmt$(revenue) + '</div><div class="kpi-label" style="font-size:10px;color:#888;text-transform:uppercase;">Receita Mês</div><div style="font-size:11px;color:#888;margin-top:4px;">Meta: ' + v2fmt$(p.metaM) + '</div></div>'
    + '<div class="kpi-box"><div class="kpi-num" style="font-family:var(--font-mono,monospace);font-size:22px;font-weight:700;color:#FFD130;">' + fp + '%</div><div class="kpi-label" style="font-size:10px;color:#888;text-transform:uppercase;">da Meta</div></div>'
    + '</div>'
    // Progress bars
    + '<div class="opsv2-card" style="margin-bottom:12px;"><div style="font-size:10px;color:#888;text-transform:uppercase;letter-spacing:.1em;margin-bottom:12px;">INDICADORES</div>'
    + [
      {lbl:'💰 Financeiro', p:fp, cl:fp>=80?'#00C864':fp>=40?'#FFD130':'#F11013'},
      {lbl:'📞 Atividade', p:cp, cl:cp>=70?'#00C864':'#FFD130'},
      {lbl:'✅ Vendas', p:sp, cl:sp>=100?'#00C864':sp>=50?'#FFD130':'#F11013'},
    ].map(function(item){
      return '<div style="margin-bottom:14px;"><div style="display:flex;justify-content:space-between;margin-bottom:4px;"><span style="font-size:12px;font-weight:600;">' + item.lbl + '</span><span style="font-family:var(--font-mono,monospace);font-size:12px;color:' + item.cl + ';">' + item.p + '%</span></div>'
        + '<div class="opsv2-prog tall"><div class="opsv2-prog-fill" style="width:' + item.p + '%;background:' + item.cl + ';"></div></div></div>';
    }).join('')
    + '</div>'
    // 180 days
    + '<div class="opsv2-card-gold" style="margin-bottom:12px;"><div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px;">'
    + '<div><div style="font-size:10px;color:#888;text-transform:uppercase;letter-spacing:.1em;margin-bottom:4px;">JORNADA DE 180 DIAS</div>'
    + '<div class="opsv2-day-segs"><div class="opsv2-day-seg"><div class="opsv2-day-seg-val">' + dayData.elapsed + '</div><div class="opsv2-day-seg-lbl">Executados</div></div>'
    + '<div class="opsv2-day-seg" style="background:rgba(241,16,19,.08);border-color:rgba(241,16,19,.22);"><div class="opsv2-day-seg-val" style="color:#F11013;">' + dayData.remaining + '</div><div class="opsv2-day-seg-lbl">Restam</div></div></div></div>'
    + '<div style="text-align:right;"><div style="font-family:var(--font-mono,monospace);font-size:18px;font-weight:700;color:#FFD130;">' + v2fmt$(revenue*6) + '</div><div style="font-size:11px;color:#888;">de ' + v2fmt$(p.meta180) + '</div></div></div>'
    + '<div class="opsv2-prog tall"><div class="opsv2-prog-fill" style="width:' + v2pct(revenue*6, p.meta180) + '%;background:linear-gradient(90deg,#C8A400,#FFD130);"></div></div></div>'
    // Motivation
    + '<div class="' + motive.cls + '" style="margin-bottom:12px;">"' + motive.msg + '"</div>'
    // Edit buttons
    + '<div style="display:flex;gap:8px;">'
    + '<button onclick="window._v2editNI(\'' + userId + '\')" style="flex:1;padding:9px;background:transparent;border:1px solid var(--border,rgba(255,255,255,.1));border-radius:10px;font-size:12px;color:#888;cursor:pointer;">✏️ Editar</button>'
    + '<button onclick="if(confirm(\'Resetar identidade?\'))v2set(\'ni_profile_' + userId + '\',null).then(function(){var s=typeof opsGetSession===\'function\'?opsGetSession():null;if(s){var b=document.getElementById(\'ops-tab-body\');if(b)v2renderIdentity(b,s);}});" style="padding:9px 14px;background:rgba(241,16,19,.08);border:1px solid rgba(241,16,19,.22);border-radius:10px;font-size:12px;color:#F11013;cursor:pointer;">🗑️</button>'
    + '</div>'
    + '</div></div></div>';
}

window._v2editNI = async function(userId){
  var existing = await v2get('ni_profile_' + userId);
  if(!existing) return;
  var session = typeof opsGetSession === 'function' ? opsGetSession() : null;
  if(!session) return;
  var body = document.getElementById('ops-tab-body');
  if(!body) return;
  v2renderNISetup(body, session);
  setTimeout(function(){
    var set = function(id,v){ var el=document.getElementById(id); if(el&&v) el.value=v; };
    set('v2ni-nat',existing.nat); set('v2ni-anchor',existing.anchor);
    set('v2ni-meta-m',existing.metaM); set('v2ni-meta-180',existing.meta180);
    set('v2ni-calls',existing.metaCalls); set('v2ni-opps',existing.metaOpps); set('v2ni-sales',existing.metaSales);
    set('v2ni-car',existing.car); set('v2ni-home',existing.home);
    set('v2ni-body',existing.body); set('v2ni-style',existing.style); set('v2ni-impact',existing.impact);
  }, 50);
};


// ═══════════════════════════════════════════════════════════════
// SECTION 7: HEAD NOTES + HEAD TODAY VIEW
// ═══════════════════════════════════════════════════════════════

async function v2renderHeadToday(body){
  var users = await v2getUsers();
  var active = users.filter(function(u){ return u.active && u.role !== 'head'; });
  var fills = await v2getTodayFills();
  var fm = {};
  fills.forEach(function(f){ fm[f.userId] = f; });
  var filled = active.filter(function(u){ return fm[u.id]; });
  var missing = active.filter(function(u){ return !fm[u.id]; });

  // Head note
  var note = await v2getHeadNote();
  var opps = await v2getMonthOpps();
  var stalePending = opps.filter(function(o){ return o.status === 'pending' && (Date.now() - o.ts) > 86400000; });

  var alertBanner = missing.length > 0
    ? '<div style="background:rgba(241,16,19,.08);border:1px solid rgba(241,16,19,.22);border-radius:10px;padding:13px 16px;margin-bottom:16px;font-size:13px;color:#F11013;display:flex;align-items:center;gap:10px;flex-wrap:wrap;">⚠️ <strong>' + missing.length + '</strong> não preencheu: ' + missing.map(function(u){ return '<span style="background:rgba(241,16,19,.08);color:#F11013;border:1px solid rgba(241,16,19,.22);padding:3px 10px;border-radius:20px;font-size:10px;font-weight:700;margin-left:4px;">' + v2esc(u.name) + '</span>'; }).join('') + '</div>'
    : '<div style="background:rgba(0,200,100,.08);border:1px solid rgba(0,200,100,.22);border-radius:10px;padding:13px 16px;margin-bottom:16px;font-size:13px;color:#00C864;">✅ Todos preencheram hoje!</div>';

  var oppAlert = stalePending.length
    ? '<div style="background:rgba(241,16,19,.08);border:1px solid rgba(241,16,19,.22);border-radius:10px;padding:13px 16px;margin-bottom:16px;font-size:13px;color:#F11013;">⚠️ <strong>' + stalePending.length + '</strong> oportunidade(s) sem confirmação há mais de 24h</div>'
    : '';

  var cards = active.map(function(u){
    var f = fm[u.id];
    var score = f ? v2calcScore(f) : 0;
    var plan = v2getUserPlan(u);
    var mini = f ? V2_CHANNELS.map(function(ch){
      var v = f.channels && f.channels[ch.id];
      var val = typeof v === 'object' ? (v.a||'0') : (v||'0');
      return '<div style="text-align:center;flex:1;"><div style="font-size:13px;">' + ch.icon + '</div><div style="font-family:var(--font-mono,monospace);font-size:11px;font-weight:600;">' + val + '</div></div>';
    }).join('') : '';

    return '<div style="background:var(--surface,#101010);border:1px solid ' + (f ? 'rgba(0,200,100,.22)' : 'rgba(241,16,19,.22)') + ';border-radius:14px;padding:16px;transition:all .2s;">'
      + '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;">'
      + '<div><div style="font-weight:600;font-size:12px;">' + v2esc(u.name) + '</div>'
      + '<div style="display:flex;gap:4px;margin-top:4px;">' + v2planBadge(plan) + '<span style="font-size:11px;color:#888;">' + v2esc(u.role) + '</span></div></div>'
      + (f ? '<span style="background:rgba(0,200,100,.08);color:#00C864;border:1px solid rgba(0,200,100,.22);padding:3px 10px;border-radius:20px;font-size:10px;font-weight:700;">✓ ' + v2fmtTime(f.ts) + '</span>' : '<span style="background:rgba(241,16,19,.08);color:#F11013;border:1px solid rgba(241,16,19,.22);padding:3px 10px;border-radius:20px;font-size:10px;font-weight:700;">Pendente</span>')
      + '</div>'
      + (f ? '<div style="display:flex;justify-content:space-between;margin-bottom:8px;">' + mini + '</div>'
        + '<div style="height:1px;background:var(--border,rgba(255,255,255,.1));margin:8px 0;"></div>'
        + '<div style="display:flex;justify-content:space-between;"><span style="font-size:11px;color:#888;">Score</span><span style="font-family:var(--font-mono,monospace);font-weight:700;color:#F11013;">' + score + ' pts</span></div>'
        + (f.obs ? '<div style="font-size:11px;color:#888;margin-top:8px;font-style:italic;">"' + v2esc(f.obs).slice(0,80) + '"</div>' : '')
        : '<div style="font-size:12px;color:#888;text-align:center;padding:8px;opacity:.5;">Sem registro hoje</div>')
      + '</div>';
  }).join('');

  body.innerHTML = '<div class="opsv2-fade">'
    + alertBanner + oppAlert
    + '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:12px;margin-bottom:24px;">' + cards + '</div>'
    // Head note
    + '<div class="opsv2-card">'
    + '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">'
    + '<div><div style="font-weight:600;font-size:15px;">📝 Nota do Head — ' + v2fmtDate(v2today()) + '</div>'
    + (note.ts ? '<span style="font-size:11px;color:#888;font-family:var(--font-mono,monospace);">salvo ' + v2fmtTime(note.ts) + '</span>' : '') + '</div></div>'
    + '<textarea id="v2head-note" placeholder="Feedback do dia, bloqueios, decisões..." style="width:100%;background:var(--elevated,#191919);border:1px solid var(--border,rgba(255,255,255,.1));border-radius:10px;padding:10px 14px;color:var(--text-primary,#F5F5F5);font-family:var(--font-body,sans-serif);font-size:13px;outline:none;resize:none;min-height:80px;">' + v2esc(note.text) + '</textarea>'
    + '<button id="v2note-btn" onclick="window._v2saveHeadNote()" style="margin-top:12px;padding:10px 20px;background:#F11013;color:#fff;border:none;border-radius:10px;font-size:13px;font-weight:600;cursor:pointer;">💾 Salvar Nota</button>'
    + '</div></div>';
}

window._v2saveHeadNote = async function(){
  var t = document.getElementById('v2head-note')?.value || '';
  if(!t.trim()) return;
  await v2saveHeadNote(t);
  var btn = document.getElementById('v2note-btn');
  if(btn){ btn.textContent = '✅ Salvo!'; setTimeout(function(){ btn.textContent = '💾 Salvar Nota'; }, 1500); }
};


// ═══════════════════════════════════════════════════════════════
// SECTION 8: INIT & WIRING — hooks into the portal
// ═══════════════════════════════════════════════════════════════

function v2init(){
  if(!hasPortal()){
    console.warn('[OPS v2] Portal ODB not found. V2 module not initialized.');
    return;
  }
  console.log('[OPS v2] Initializing...');

  // Load CSS if not already loaded
  if(!document.querySelector('link[href*="ops-diario-v2.css"]')){
    var link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'ops-diario-v2.css';
    document.head.appendChild(link);
  }

  // ── Extend OPS_TABS to include new v2 tabs ──
  if(typeof OPS_TABS !== 'undefined'){
    // Add pipeline tab for head/founder/partner
    var headTabs = OPS_TABS.head;
    if(headTabs && !headTabs.find(function(t){ return t.id === 'pipeline'; })){
      // Insert before 'config'
      var configIdx = headTabs.findIndex(function(t){ return t.id === 'config'; });
      if(configIdx === -1) configIdx = headTabs.length;
      headTabs.splice(configIdx, 0, {id:'awards', label:'🏆 Prêmios'});
      headTabs.splice(configIdx, 0, {id:'historico', label:'📅 Histórico'});
      headTabs.splice(configIdx, 0, {id:'extratos', label:'💰 Extratos'});
      headTabs.splice(configIdx, 0, {id:'ranking2', label:'🏆 Ranking'});
      headTabs.splice(configIdx, 0, {id:'pipeline', label:'🎯 Pipeline'});
      headTabs.splice(configIdx, 0, {id:'headnotes', label:'📝 Notas'});
    }
  }

  // ── Override opsRenderTabContent to intercept v2 tabs ──
  var _origTabContent = window.opsRenderTabContent;
  window.opsRenderTabContent = async function(id){
    var body = document.getElementById('ops-tab-body');
    if(!body) return;
    var session = typeof opsGetSession === 'function' ? opsGetSession() : null;
    if(!session) return;

    // v2 fill replaces old fill
    if(id === 'fill'){
      await v2renderFill(body, session);
      return;
    }
    // v2 identity replaces old identity
    if(id === 'identidade'){
      await v2renderIdentity(body, session);
      return;
    }
    // Fallback to original
    if(_origTabContent) await _origTabContent(id);
  };

  // ── Override opsRenderHeadTabContent for head v2 tabs ──
  var _origHeadContent = window.opsRenderHeadTabContent;
  window.opsRenderHeadTabContent = async function(id){
    var body = document.getElementById('ops-head-body');
    if(!body) return;

    if(id === 'pipeline'){      await v2renderPipeline(body); return; }
    if(id === 'headnotes' || id === 'hoje'){ await v2renderHeadToday(body); return; }
    if(id === 'ranking2'){    await v2renderRanking(body); return; }
    if(id === 'extratos'){    await v2renderExtratos(body); return; }
    if(id === 'historico'){   await v2renderHistorico(body); return; }
    if(id === 'awards'){      await v2renderAwards(body); return; }
    // Fallback to original
    if(_origHeadContent) await _origHeadContent(id);
  };

  // ── Expose globals for onclick handlers ──
  window.v2triggerUpload = v2triggerUpload;
  window.v2headResolveOpp = v2headResolveOpp;
  window.v2set = v2set;
  window.v2renderIdentity = v2renderIdentity;
  window.v2loadActivityChart = v2loadActivityChart;
  window.v2renderExtratos = v2renderExtratos;
  window.v2renderHistorico = v2renderHistorico;
  window.v2State = v2State;

  // ── Rep tab switching for identity ──
  window._v2switchRepTab = function(tab){
    var session = typeof opsGetSession === 'function' ? opsGetSession() : null;
    if(!session) return;
    // Find and click the identidade tab button
    var tabs = document.querySelectorAll('#ops-tabs .ops-tab');
    tabs.forEach(function(btn){
      if(btn.textContent.indexOf('Identidade') >= 0 || btn.getAttribute('onclick')?.indexOf('identidade') >= 0){
        btn.click();
      }
    });
  };

  console.log('[OPS v2] Ready. Fill, Identity, Pipeline, and Head Notes upgraded.');
}

// ── Auto-init: wait for portal to be ready ──
function v2waitForPortal(){
  if(hasPortal()){
    v2init();
  } else {
    // Retry up to 20 times (10 seconds)
    var attempts = 0;
    var interval = setInterval(function(){
      attempts++;
      if(hasPortal()){
        clearInterval(interval);
        v2init();
      } else if(attempts >= 20){
        clearInterval(interval);
        console.warn('[OPS v2] Portal not detected after 10s. Module not loaded.');
      }
    }, 500);
  }
}


// ═══════════════════════════════════════════════════════════════
// SECTION 9: AWARDS / PRIZES CONFIGURATION
// ═══════════════════════════════════════════════════════════════

var V2_PRIZE_FIELDS = [
  {id:'top_closer',    lbl:'🏆 Top Closer da Semana',         ph:'Ex: AirPods Pro'},
  {id:'top_setter',    lbl:'🎯 Top Setter da Semana',         ph:'Ex: $100 cash'},
  {id:'iron_streak',   lbl:'🔥 Sequência de Ferro (7d)',      ph:'Ex: Gift card $50'},
  {id:'first10',       lbl:'📱 First 10 Closes',              ph:'Ex: iPhone 17 Pro Max'},
  {id:'diamond',       lbl:'💎 Diamond Month ($10k comissão)', ph:'Ex: Viagem paga'},
  {id:'century',       lbl:'🚀 Century Club (100 leads)',      ph:'Ex: $500 cash'},
  {id:'setter_elite',  lbl:'👑 Setter Elite (30 leads)',       ph:'Ex: $300 cash'},
  {id:'consistency',   lbl:'🎖️ Consistência de Ouro (22d)',   ph:'Ex: $200 cash'},
  {id:'career_hustle', lbl:'⭐ SPARK → HUSTLE',               ph:'Ex: $250 cash'},
  {id:'career_bronze', lbl:'🥉 HUSTLE → BRONZE',              ph:'Ex: $500 + kit'},
  {id:'career_silver', lbl:'🥈 BRONZE → SILVER',              ph:'Ex: Car allowance $400/mês'},
  {id:'career_gold',   lbl:'🥇 SILVER → GOLD',                ph:'Ex: Car allowance $800/mês + viagem'},
  {id:'career_plat',   lbl:'💎 GOLD → PLATINUM',              ph:'Ex: BMW X5 + voo business'},
  {id:'career_diamond',lbl:'👑 PLATINUM → DIAMOND',            ph:'Ex: $4k/mês + anel + viagem'},
];

async function v2renderAwards(body){
  var cfg = (await v2get('ops_config')) || {};
  var aw = cfg.awards || {};
  var prizes = aw.prizes || {};

  var fieldsHTML = V2_PRIZE_FIELDS.map(function(f){
    return '<div style="margin-bottom:10px;">'
      + '<div style="font-size:11px;color:#888;margin-bottom:4px;">' + f.lbl + '</div>'
      + '<input type="text" id="v2prize_' + f.id + '" placeholder="' + f.ph + '" value="' + v2esc(prizes[f.id]||'') + '" style="width:100%;background:var(--elevated,#191919);border:1px solid var(--border,rgba(255,255,255,.1));border-radius:10px;padding:10px 14px;color:var(--text-primary,#F5F5F5);font-size:13px;outline:none;">'
      + '</div>';
  }).join('');

  // Commission table
  var commTable = Object.keys(V2_PLANS).map(function(k){
    var p = V2_PLANS[k];
    return '<div style="display:flex;align-items:center;justify-content:space-between;padding:10px 14px;background:var(--elevated,#191919);border-radius:10px;margin-bottom:8px;border:1px solid var(--border,rgba(255,255,255,.1));">'
      + v2planBadge(k)
      + '<span style="font-size:12px;color:#888;">Setup <strong>' + (p.setupPct*100).toFixed(0) + '%</strong> · Rec <strong>' + (p.recPct*100).toFixed(0) + '%</strong>/mês</span>'
      + '</div>';
  }).join('');

  body.innerHTML = '<div class="opsv2-fade">'
    + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:24px;align-items:start;">'
    // Left: commissions
    + '<div class="opsv2-card"><div style="font-weight:600;font-size:15px;margin-bottom:14px;">💰 Tabela de Comissões</div>' + commTable
    + '<div style="height:1px;background:var(--border,rgba(255,255,255,.1));margin:12px 0;"></div>'
    + '<div style="font-size:11px;color:#888;">Setter bônus: 10 leads qualificados = $100 bloqueado · 1 venda = $100 liberado</div>'
    + '</div>'
    // Right: PIN config
    + '<div class="opsv2-card"><div style="font-weight:600;font-size:15px;margin-bottom:14px;">🔐 PINs de Acesso</div>'
    + '<div style="margin-bottom:12px;"><div style="font-size:11px;color:#888;margin-bottom:4px;">PIN do Head</div><input type="text" id="v2cfg-hp" value="' + v2esc(cfg.headPin||'1111') + '" maxlength="6" style="width:100%;background:var(--elevated,#191919);border:1px solid var(--border,rgba(255,255,255,.1));border-radius:10px;padding:10px 14px;color:var(--text-primary,#F5F5F5);font-family:var(--font-mono,monospace);text-align:center;font-size:18px;letter-spacing:8px;"></div>'
    + '<button id="v2cfg-btn" onclick="window._v2saveConfig()" style="padding:10px 20px;background:#F11013;color:#fff;border:none;border-radius:10px;font-size:13px;font-weight:600;cursor:pointer;">💾 Salvar PIN</button>'
    + '</div>'
    + '</div>'
    // Prizes
    + '<div class="opsv2-card" style="margin-top:16px;">'
    + '<div style="font-weight:600;font-size:15px;margin-bottom:4px;">🏆 Configurar Premiações</div>'
    + '<div style="font-size:12px;color:#888;margin-bottom:16px;">Esses prêmios aparecem no Painel TV e no Ranking</div>'
    + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">' + fieldsHTML + '</div>'
    + '<button id="v2prize-btn" onclick="window._v2savePrizes()" style="margin-top:16px;padding:10px 20px;background:rgba(200,164,0,.08);border:1px solid rgba(200,164,0,.22);border-radius:10px;color:#FFD130;font-weight:700;font-size:13px;cursor:pointer;">🏆 Salvar Premiações</button>'
    + '</div>'
    + '</div>';
}

window._v2saveConfig = async function(){
  var hp = document.getElementById('v2cfg-hp')?.value?.trim();
  if(!hp || hp.length < 4){ alert('PIN deve ter pelo menos 4 dígitos'); return; }
  var cfg = (await v2get('ops_config')) || {};
  cfg.headPin = hp;
  await v2set('ops_config', cfg);
  var btn = document.getElementById('v2cfg-btn');
  if(btn){ btn.textContent = '✅ Salvo!'; setTimeout(function(){ btn.textContent = '💾 Salvar PIN'; }, 1500); }
};

window._v2savePrizes = async function(){
  var prizes = {};
  V2_PRIZE_FIELDS.forEach(function(f){
    var el = document.getElementById('v2prize_' + f.id);
    if(el && el.value.trim()) prizes[f.id] = el.value.trim();
  });
  var cfg = (await v2get('ops_config')) || {};
  cfg.awards = { prizes: prizes, updatedAt: Date.now() };
  await v2set('ops_config', cfg);
  var btn = document.getElementById('v2prize-btn');
  if(btn){ btn.textContent = '✅ Salvo!'; setTimeout(function(){ btn.textContent = '🏆 Salvar Premiações'; }, 1500); }
};


// ═══════════════════════════════════════════════════════════════
// SECTION 10: DUAL RANKING (activity vs revenue)
// ═══════════════════════════════════════════════════════════════

async function v2renderRanking(body){
  var fills = await v2getTodayFills();
  var todaySales = await v2getMonthSales();
  // Filter to today's sales only for the "today" ranking
  var todayStr = v2today();
  var todaySalesOnly = todaySales.filter(function(s){ return s.date === todayStr; });

  var actSorted = fills.slice().sort(function(a,b){ return v2calcScore(b) - v2calcScore(a); });

  // Revenue map
  var revMap = {};
  todaySalesOnly.forEach(function(s){
    var id = s.sellerId || s.founderId;
    if(!revMap[id]) revMap[id] = {name: s.sellerName || s.founderName, plan: s.sellerPlan || s.founderRole, comm: 0, cnt: 0};
    revMap[id].comm += (s.sellerSetupComm||s.founderSetupComm||0) + (s.sellerRecComm||s.founderMrrComm||0);
    revMap[id].cnt++;
  });
  var revSorted = Object.values(revMap).sort(function(a,b){ return b.comm - a.comm; });

  var medals = ['🥇','🥈','🥉'];

  var actRows = actSorted.slice(0,10).map(function(f, i){
    var chMini = V2_CHANNELS.map(function(ch){
      var v = f.channels && f.channels[ch.id];
      var val = typeof v === 'object' ? (v.a||'0') : (v||'0');
      return '<div style="text-align:center;min-width:30px;"><div style="font-size:12px;">' + ch.icon + '</div><div style="font-family:var(--font-mono,monospace);font-size:10px;">' + val + '</div></div>';
    }).join('');
    return '<div style="display:flex;align-items:center;gap:10px;padding:10px 14px;background:var(--surface,#101010);border:1px solid var(--border,rgba(255,255,255,.1));border-radius:10px;margin-bottom:6px;">'
      + '<span style="width:26px;font-size:' + (i<3?'18':'12') + 'px;text-align:center;color:' + (i===0?'gold':i===1?'silver':i===2?'#cd7f32':'#888') + ';">' + (medals[i]||'#'+(i+1)) + '</span>'
      + '<div style="flex:1;"><div style="font-weight:600;font-size:12px;">' + v2esc(f.userName) + '</div></div>'
      + '<div style="display:flex;gap:6px;">' + chMini + '</div>'
      + '<span style="font-family:var(--font-mono,monospace);font-weight:700;color:#F11013;font-size:12px;min-width:60px;text-align:right;">' + v2calcScore(f) + ' pts</span>'
      + '</div>';
  }).join('') || '<div style="text-align:center;padding:24px;color:#888;font-size:12px;">Sem preenchimentos hoje</div>';

  var revRows = revSorted.slice(0,10).map(function(r, i){
    return '<div class="opsv2-sale-row" style="margin-bottom:6px;">'
      + '<span style="width:26px;font-size:' + (i<3?'18':'12') + 'px;text-align:center;color:' + (i===0?'gold':i===1?'silver':i===2?'#cd7f32':'#888') + ';">' + (medals[i]||'#'+(i+1)) + '</span>'
      + '<div style="flex:1;"><div style="font-weight:600;font-size:12px;">' + v2esc(r.name) + '</div><div style="font-size:11px;color:#888;">' + r.cnt + ' venda(s)</div></div>'
      + '<span style="font-family:var(--font-mono,monospace);font-weight:700;color:#00C864;font-size:12px;">' + v2fmt$(r.comm) + '</span>'
      + '</div>';
  }).join('') || '<div style="text-align:center;padding:24px;color:#888;font-size:12px;">Sem vendas hoje</div>';

  body.innerHTML = '<div class="opsv2-fade">'
    + '<div style="display:flex;gap:8px;margin-bottom:16px;"><span style="background:rgba(241,16,19,.08);color:#F11013;border:1px solid rgba(241,16,19,.22);padding:3px 10px;border-radius:20px;font-size:10px;font-weight:700;">' + v2fmtDate(v2today()) + '</span><span style="font-size:12px;color:#888;">' + fills.length + ' colaboradores</span></div>'
    + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:24px;align-items:start;">'
    + '<div><div style="font-weight:600;font-size:15px;margin-bottom:12px;">📊 Atividade — Hoje</div><div style="font-size:11px;color:#888;margin-bottom:8px;">Volume de contatos por canal</div>' + actRows + '</div>'
    + '<div><div style="font-weight:600;font-size:15px;margin-bottom:12px;">💰 Resultado — Hoje</div><div style="font-size:11px;color:#888;margin-bottom:8px;">Comissão gerada</div>' + revRows + '</div>'
    + '</div></div>';
}


// ═══════════════════════════════════════════════════════════════
// SECTION 11: EXTRATOS (commission statements with filters)
// ═══════════════════════════════════════════════════════════════

async function v2renderExtratos(body){
  var users = await v2getUsers();
  var active = users.filter(function(u){ return u.active; });
  var uid = v2State.extratoUser || 'all';
  var ym = v2State.extratoMonth || v2month();
  var sales = await v2getMonthSales(ym);

  var userOpts = '<option value="all">Todos</option>' + active.map(function(u){
    return '<option value="' + u.id + '"' + (uid===u.id?' selected':'') + '>' + v2esc(u.name) + '</option>';
  }).join('');

  var monthOpts = '';
  for(var i = 0; i < 6; i++){
    var d = new Date(); d.setMonth(d.getMonth() - i);
    var val = d.toISOString().slice(0,7);
    monthOpts += '<option value="' + val + '"' + (val===ym?' selected':'') + '>' + d.toLocaleDateString('pt-BR',{month:'long',year:'numeric'}) + '</option>';
  }

  var filters = '<div style="display:flex;gap:8px;margin-bottom:16px;flex-wrap:wrap;">'
    + '<select onchange="v2State.extratoUser=this.value;v2renderExtratos(this.closest(\'[id]\').id===\'ops-head-body\'?document.getElementById(\'ops-head-body\'):document.getElementById(\'ops-tab-body\'));" style="width:auto;background:var(--elevated,#191919);border:1px solid var(--border,rgba(255,255,255,.1));border-radius:10px;padding:8px 12px;color:var(--text-primary,#F5F5F5);font-size:13px;">' + userOpts + '</select>'
    + '<select onchange="v2State.extratoMonth=this.value;v2renderExtratos(this.closest(\'[id]\').id===\'ops-head-body\'?document.getElementById(\'ops-head-body\'):document.getElementById(\'ops-tab-body\'));" style="width:auto;background:var(--elevated,#191919);border:1px solid var(--border,rgba(255,255,255,.1));border-radius:10px;padding:8px 12px;color:var(--text-primary,#F5F5F5);font-size:13px;">' + monthOpts + '</select>'
    + '</div>';

  if(uid === 'all'){
    var td = {};
    sales.forEach(function(s){
      var sid = s.sellerId || s.founderId;
      if(!td[sid]) td[sid] = {name:s.sellerName||s.founderName, plan:s.sellerPlan||s.founderRole, su:0, re:0, cnt:0};
      td[sid].su += s.sellerSetupComm || s.founderSetupComm || 0;
      td[sid].re += s.sellerRecComm || s.founderMrrComm || 0;
      td[sid].cnt++;
      if(s.setterId && s.setterId !== sid){
        if(!td[s.setterId]) td[s.setterId] = {name:s.setterName, plan:'SETTER', su:0, re:0, cnt:0};
        td[s.setterId].su += s.setterSetupComm || 0;
        td[s.setterId].re += s.setterRecComm || 0;
      }
    });
    var sorted = Object.values(td).sort(function(a,b){ return (b.su+b.re)-(a.su+a.re); });
    var grandTotal = sorted.reduce(function(t,r){ return t+r.su+r.re; }, 0);

    var rows = sorted.map(function(r){
      return '<tr><td style="font-weight:600;padding:11px 14px;border-bottom:1px solid rgba(255,255,255,.05);">' + v2esc(r.name) + '</td>'
        + '<td style="padding:11px 14px;border-bottom:1px solid rgba(255,255,255,.05);">' + v2planBadge(r.plan) + '</td>'
        + '<td style="font-family:var(--font-mono,monospace);padding:11px 14px;border-bottom:1px solid rgba(255,255,255,.05);">' + r.cnt + '</td>'
        + '<td style="font-family:var(--font-mono,monospace);padding:11px 14px;border-bottom:1px solid rgba(255,255,255,.05);">' + v2fmt$(r.su) + '</td>'
        + '<td style="font-family:var(--font-mono,monospace);padding:11px 14px;border-bottom:1px solid rgba(255,255,255,.05);">' + v2fmt$(r.re) + '</td>'
        + '<td style="font-family:var(--font-mono,monospace);font-weight:700;color:#F11013;padding:11px 14px;border-bottom:1px solid rgba(255,255,255,.05);">' + v2fmt$(r.su+r.re) + '</td></tr>';
    }).join('');

    body.innerHTML = '<div class="opsv2-fade">' + filters
      + '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;"><div style="font-family:var(--font-display,sans-serif);font-size:28px;color:#00C864;">' + v2fmt$(grandTotal) + '</div><div style="font-size:12px;color:#888;">' + sales.length + ' vendas no período</div></div>'
      + (rows ? '<div style="overflow-x:auto;border-radius:14px;border:1px solid var(--border,rgba(255,255,255,.1));"><table style="width:100%;border-collapse:collapse;">'
        + '<thead><tr><th style="text-align:left;font-size:10px;text-transform:uppercase;letter-spacing:.08em;color:#888;padding:11px 14px;border-bottom:1px solid rgba(255,255,255,.05);background:var(--elevated,#191919);">Membro</th><th style="padding:11px 14px;border-bottom:1px solid rgba(255,255,255,.05);background:var(--elevated,#191919);font-size:10px;color:#888;text-transform:uppercase;">Plano</th><th style="padding:11px 14px;border-bottom:1px solid rgba(255,255,255,.05);background:var(--elevated,#191919);font-size:10px;color:#888;text-transform:uppercase;">Vendas</th><th style="padding:11px 14px;border-bottom:1px solid rgba(255,255,255,.05);background:var(--elevated,#191919);font-size:10px;color:#888;text-transform:uppercase;">Setup</th><th style="padding:11px 14px;border-bottom:1px solid rgba(255,255,255,.05);background:var(--elevated,#191919);font-size:10px;color:#888;text-transform:uppercase;">Rec</th><th style="padding:11px 14px;border-bottom:1px solid rgba(255,255,255,.05);background:var(--elevated,#191919);font-size:10px;color:#888;text-transform:uppercase;">Total</th></tr></thead>'
        + '<tbody>' + rows + '</tbody></table></div>'
        : '<div style="text-align:center;padding:40px;color:#888;">Sem vendas no período</div>')
      + '</div>';
  } else {
    // Individual view
    var userSales = sales.filter(function(s){ return (s.sellerId||s.founderId) === uid; });
    var su = userSales.reduce(function(s,x){ return s+(x.sellerSetupComm||x.founderSetupComm||0); }, 0);
    var re = userSales.reduce(function(s,x){ return s+(x.sellerRecComm||x.founderMrrComm||0); }, 0);

    var indivRows = userSales.sort(function(a,b){return b.ts-a.ts;}).map(function(s){
      return '<tr><td style="font-family:var(--font-mono,monospace);font-size:12px;padding:11px 14px;border-bottom:1px solid rgba(255,255,255,.05);">' + v2fmtDate(s.date) + '</td>'
        + '<td style="font-family:var(--font-mono,monospace);padding:11px 14px;border-bottom:1px solid rgba(255,255,255,.05);">' + v2fmt$(s.setupValue||0) + '</td>'
        + '<td style="font-family:var(--font-mono,monospace);padding:11px 14px;border-bottom:1px solid rgba(255,255,255,.05);">' + v2fmt$(s.recValue||0) + '</td>'
        + '<td style="font-family:var(--font-mono,monospace);color:#00C864;padding:11px 14px;border-bottom:1px solid rgba(255,255,255,.05);">' + v2fmt$((s.sellerSetupComm||s.founderSetupComm||0)) + '</td>'
        + '<td style="padding:11px 14px;border-bottom:1px solid rgba(255,255,255,.05);">' + (s.setterName ? '<span style="font-size:12px;color:#9B7FE0;">' + v2esc(s.setterName) + '</span>' : '<span style="color:#888;">—</span>') + '</td></tr>';
    }).join('');

    body.innerHTML = '<div class="opsv2-fade">' + filters
      + '<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:16px;">'
      + '<div class="kpi-box"><div class="kpi-num" style="font-family:var(--font-mono,monospace);font-size:22px;font-weight:700;color:var(--red,#F11013);">' + userSales.length + '</div><div class="kpi-label" style="font-size:10px;color:#888;text-transform:uppercase;">Vendas</div></div>'
      + '<div class="kpi-box"><div class="kpi-num" style="font-family:var(--font-mono,monospace);font-size:22px;font-weight:700;color:var(--red,#F11013);">' + v2fmt$(su) + '</div><div class="kpi-label" style="font-size:10px;color:#888;text-transform:uppercase;">C.Setup</div></div>'
      + '<div class="kpi-box"><div class="kpi-num" style="font-family:var(--font-mono,monospace);font-size:22px;font-weight:700;color:var(--red,#F11013);">' + v2fmt$(re) + '</div><div class="kpi-label" style="font-size:10px;color:#888;text-transform:uppercase;">C.Rec</div></div>'
      + '<div class="kpi-box"><div class="kpi-num" style="font-family:var(--font-mono,monospace);font-size:22px;font-weight:700;color:#00C864;">' + v2fmt$(su+re) + '</div><div class="kpi-label" style="font-size:10px;color:#888;text-transform:uppercase;">Total</div></div>'
      + '</div>'
      + (indivRows ? '<div style="overflow-x:auto;border-radius:14px;border:1px solid var(--border,rgba(255,255,255,.1));"><table style="width:100%;border-collapse:collapse;">'
        + '<thead><tr><th style="text-align:left;font-size:10px;text-transform:uppercase;letter-spacing:.08em;color:#888;padding:11px 14px;border-bottom:1px solid rgba(255,255,255,.05);background:var(--elevated,#191919);">Data</th><th style="padding:11px 14px;border-bottom:1px solid rgba(255,255,255,.05);background:var(--elevated,#191919);font-size:10px;color:#888;text-transform:uppercase;">Setup</th><th style="padding:11px 14px;border-bottom:1px solid rgba(255,255,255,.05);background:var(--elevated,#191919);font-size:10px;color:#888;text-transform:uppercase;">Rec</th><th style="padding:11px 14px;border-bottom:1px solid rgba(255,255,255,.05);background:var(--elevated,#191919);font-size:10px;color:#888;text-transform:uppercase;">C.Setup</th><th style="padding:11px 14px;border-bottom:1px solid rgba(255,255,255,.05);background:var(--elevated,#191919);font-size:10px;color:#888;text-transform:uppercase;">Setter</th></tr></thead>'
        + '<tbody>' + indivRows + '</tbody></table></div>'
        : '<div style="text-align:center;padding:40px;color:#888;">Sem vendas no período</div>')
      + '</div>';
  }
}


// ═══════════════════════════════════════════════════════════════
// SECTION 12: FILL HISTORY (7/14/30 day view)
// ═══════════════════════════════════════════════════════════════

async function v2renderHistorico(body){
  var users = await v2getUsers();
  var active = users.filter(function(u){ return u.active; });
  var uid = v2State.histUser || 'all';
  var days = parseInt(v2State.histDays) || 7;

  var dates = [];
  for(var i = 0; i < days; i++){
    var d = new Date(); d.setDate(d.getDate() - i);
    dates.push(d.toISOString().split('T')[0]);
  }

  var allKeys = await v2list('ops_fill_');
  var relevant = allKeys.filter(function(k){ return dates.some(function(d){ return k.indexOf('ops_fill_' + d + '_') >= 0; }); });
  var fills = (await Promise.all(relevant.map(function(k){ return v2get(k); }))).filter(Boolean).map(v2normalizeFill);
  var filtered = uid === 'all' ? fills : fills.filter(function(f){ return f.userId === uid; });
  var sorted = filtered.sort(function(a,b){ return b.ts - a.ts; });

  var userOpts = '<option value="all">Todos</option>' + active.map(function(u){
    return '<option value="' + u.id + '"' + (uid===u.id?' selected':'') + '>' + v2esc(u.name) + '</option>';
  }).join('');

  var filtersHTML = '<div style="display:flex;gap:8px;margin-bottom:16px;flex-wrap:wrap;">'
    + '<select onchange="v2State.histUser=this.value;v2renderHistorico(this.closest(\'[id]\').id===\'ops-head-body\'?document.getElementById(\'ops-head-body\'):document.getElementById(\'ops-tab-body\'));" style="width:auto;background:var(--elevated,#191919);border:1px solid var(--border,rgba(255,255,255,.1));border-radius:10px;padding:8px 12px;color:var(--text-primary,#F5F5F5);font-size:13px;">' + userOpts + '</select>'
    + '<select onchange="v2State.histDays=this.value;v2renderHistorico(this.closest(\'[id]\').id===\'ops-head-body\'?document.getElementById(\'ops-head-body\'):document.getElementById(\'ops-tab-body\'));" style="width:auto;background:var(--elevated,#191919);border:1px solid var(--border,rgba(255,255,255,.1));border-radius:10px;padding:8px 12px;color:var(--text-primary,#F5F5F5);font-size:13px;">'
    + '<option value="7"' + (days===7?' selected':'') + '>7 dias</option>'
    + '<option value="14"' + (days===14?' selected':'') + '>14 dias</option>'
    + '<option value="30"' + (days===30?' selected':'') + '>30 dias</option>'
    + '</select>'
    + '<span style="background:var(--elevated,#191919);color:#888;border:1px solid var(--border,rgba(255,255,255,.1));padding:3px 10px;border-radius:20px;font-size:10px;font-weight:700;">' + sorted.length + ' registros</span>'
    + '</div>';

  if(!sorted.length){
    body.innerHTML = '<div class="opsv2-fade">' + filtersHTML + '<div style="text-align:center;padding:56px;color:#888;font-size:13px;">Sem registros</div></div>';
    return;
  }

  var chHeaders = V2_CHANNELS.map(function(ch){
    return '<th style="text-align:center;padding:11px 8px;border-bottom:1px solid rgba(255,255,255,.05);background:var(--elevated,#191919);font-size:12px;">' + ch.icon + '</th>';
  }).join('');

  var rows = sorted.map(function(f){
    var d = f.ts ? new Date(f.ts).toISOString().split('T')[0] : '';
    var chCells = V2_CHANNELS.map(function(ch){
      var v = f.channels && f.channels[ch.id];
      var val = typeof v === 'object' ? (v.a||'0') : (v||'0');
      return '<td style="font-family:var(--font-mono,monospace);text-align:center;padding:11px 8px;border-bottom:1px solid rgba(255,255,255,.05);">' + val + '</td>';
    }).join('');
    return '<tr><td style="font-family:var(--font-mono,monospace);font-size:12px;padding:11px 14px;border-bottom:1px solid rgba(255,255,255,.05);">' + v2fmtDate(d) + '</td>'
      + '<td style="padding:11px 14px;border-bottom:1px solid rgba(255,255,255,.05);"><div style="font-weight:600;font-size:12px;">' + v2esc(f.userName) + '</div></td>'
      + chCells
      + '<td style="font-family:var(--font-mono,monospace);font-weight:700;color:#F11013;padding:11px 14px;border-bottom:1px solid rgba(255,255,255,.05);">' + v2calcScore(f) + '</td></tr>';
  }).join('');

  body.innerHTML = '<div class="opsv2-fade">' + filtersHTML
    + '<div style="overflow-x:auto;border-radius:14px;border:1px solid var(--border,rgba(255,255,255,.1));"><table style="width:100%;border-collapse:collapse;">'
    + '<thead><tr><th style="text-align:left;font-size:10px;text-transform:uppercase;letter-spacing:.08em;color:#888;padding:11px 14px;border-bottom:1px solid rgba(255,255,255,.05);background:var(--elevated,#191919);">Data</th><th style="text-align:left;font-size:10px;text-transform:uppercase;letter-spacing:.08em;color:#888;padding:11px 14px;border-bottom:1px solid rgba(255,255,255,.05);background:var(--elevated,#191919);">Colaborador</th>' + chHeaders + '<th style="text-align:left;font-size:10px;text-transform:uppercase;letter-spacing:.08em;color:#888;padding:11px 14px;border-bottom:1px solid rgba(255,255,255,.05);background:var(--elevated,#191919);">Score</th></tr></thead>'
    + '<tbody>' + rows + '</tbody></table></div></div>';
}

// Start
if(document.readyState === 'loading'){
  document.addEventListener('DOMContentLoaded', v2waitForPortal);
} else {
  v2waitForPortal();
}

})(); // end IIFE
