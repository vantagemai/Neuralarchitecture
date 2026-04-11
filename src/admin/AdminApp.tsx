import { useState, useEffect, useMemo } from 'react';
import type { Fase, VantagemTutorials, WarRoomItem, FlatLesson, Track } from './types';
import { parseYouTubeId, downloadJson } from './utils';

const ADMIN_PASSWORD = 'vantagem2026';
const PASS_KEY = 'vantagem-admin-auth';

// ─── Password Gate ──────────────────────────────────────────────────────────
function PasswordGate({ onAuth }: { onAuth: () => void }) {
  const [val, setVal] = useState('');
  const [err, setErr] = useState(false);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (val === ADMIN_PASSWORD) {
      localStorage.setItem(PASS_KEY, '1');
      onAuth();
    } else {
      setErr(true);
      setVal('');
    }
  }

  return (
    <div className="min-h-screen bg-[#080808] flex items-center justify-center">
      <form onSubmit={submit} className="bg-[#101010] border border-[#222] rounded-2xl p-10 w-80 flex flex-col gap-4">
        <h1 className="text-white text-xl font-semibold tracking-tight">Vantagem.ai Admin</h1>
        <p className="text-[#666] text-sm">Digite a senha de acesso</p>
        <input
          type="password"
          value={val}
          onChange={e => { setVal(e.target.value); setErr(false); }}
          placeholder="Senha"
          autoFocus
          className="bg-[#191919] border border-[#333] rounded-lg px-4 py-2.5 text-white text-sm outline-none focus:border-[#F11013] transition-colors"
        />
        {err && <p className="text-[#F11013] text-xs">Senha incorreta</p>}
        <button
          type="submit"
          className="bg-[#F11013] hover:bg-[#C90D10] text-white font-semibold rounded-lg py-2.5 text-sm transition-colors"
        >
          Entrar
        </button>
      </form>
    </div>
  );
}

// ─── Main Admin ─────────────────────────────────────────────────────────────
type DataState = {
  setter: Fase[];
  partner: Fase[];
  builder: Fase[];
  vantagemsys: VantagemTutorials;
  warroom: WarRoomItem[];
};

const TRACK_LABELS: Record<Track, string> = {
  setter: 'Setter',
  partner: 'Partner',
  builder: "Builder's AI",
  vantagemsys: 'Vantagem.sys',
  warroom: 'War Room',
};

function flattenFases(fases: Fase[], track: Track): FlatLesson[] {
  const out: FlatLesson[] = [];
  for (const f of fases) {
    for (const b of f.blocos ?? []) {
      for (const a of b.aulas ?? []) {
        out.push({
          track,
          faseNum: f.num,
          faseNome: f.nome,
          blocoNum: b.num,
          blocoNome: b.nome,
          id: a.id,
          titulo: a.titulo,
          videoId: a.videoId ?? '',
          dur: a.dur,
          material: a.material ?? [],
        });
      }
    }
  }
  return out;
}

function flattenVantagemsys(tuts: VantagemTutorials): FlatLesson[] {
  const out: FlatLesson[] = [];
  for (const [tab, arr] of Object.entries(tuts)) {
    for (const t of arr ?? []) {
      out.push({
        track: 'vantagemsys',
        faseNum: 0,
        faseNome: t.tabLabel ?? tab,
        blocoNum: 0,
        blocoNome: t.tabLabel ?? tab,
        id: t.id,
        titulo: t.titulo,
        videoId: t.videoId ?? '',
        dur: t.dur,
        material: t.material ?? [],
      });
    }
  }
  return out;
}

// ─── Lesson Row ─────────────────────────────────────────────────────────────
function LessonRow({
  lesson,
  onChange,
}: {
  lesson: FlatLesson;
  onChange: (id: string, field: 'videoId' | 'material', value: string | string[]) => void;
}) {
  const [matStr, setMatStr] = useState(lesson.material.join('\n'));

  const hasVideo = lesson.videoId.trim().length > 0;

  function handleVideoBlur(e: React.FocusEvent<HTMLInputElement>) {
    const parsed = parseYouTubeId(e.target.value);
    onChange(lesson.id, 'videoId', parsed);
  }

  function handleMatBlur() {
    const mats = matStr.split('\n').map(s => s.trim()).filter(Boolean);
    onChange(lesson.id, 'material', mats);
  }

  return (
    <tr className="border-b border-[#1a1a1a] hover:bg-[#111] transition-colors">
      <td className="px-3 py-2 text-[#555] text-xs whitespace-nowrap">{lesson.faseNum}.{lesson.blocoNum}</td>
      <td className="px-3 py-2 text-[#888] text-xs font-mono">{lesson.id}</td>
      <td className="px-3 py-2 text-white text-sm max-w-xs">
        <span title={lesson.titulo} className="line-clamp-2">{lesson.titulo}</span>
        <span className="block text-[#555] text-xs">{lesson.blocoNome}</span>
      </td>
      <td className="px-3 py-2 w-56">
        <input
          defaultValue={lesson.videoId}
          onBlur={handleVideoBlur}
          placeholder="URL ou ID do YouTube"
          className={`w-full bg-[#191919] border rounded px-2 py-1.5 text-xs text-white outline-none focus:border-[#F11013] transition-colors placeholder-[#444] font-mono
            ${hasVideo ? 'border-[#00C864]/40' : 'border-[#333]'}`}
        />
        {hasVideo && (
          <a
            href={`https://www.youtube.com/watch?v=${lesson.videoId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[10px] text-[#00C864] hover:underline mt-0.5 inline-block"
          >
            ▶ ver vídeo
          </a>
        )}
      </td>
      <td className="px-3 py-2 text-[#666] text-xs">
        {typeof lesson.dur === 'number' ? `${lesson.dur}m` : lesson.dur ?? '—'}
      </td>
      <td className="px-3 py-2 w-48">
        <textarea
          value={matStr}
          onChange={e => setMatStr(e.target.value)}
          onBlur={handleMatBlur}
          placeholder="Links (um por linha)"
          rows={2}
          className="w-full bg-[#191919] border border-[#333] rounded px-2 py-1 text-xs text-white outline-none focus:border-[#FFCC00] transition-colors placeholder-[#444] resize-none font-mono"
        />
      </td>
    </tr>
  );
}

// ─── Track Panel ─────────────────────────────────────────────────────────────
function TrackPanel({
  lessons,
  onSave,
  onChange,
}: {
  track: Track;
  lessons: FlatLesson[];
  onSave: () => void;
  onChange: (id: string, field: 'videoId' | 'material', value: string | string[]) => void;
}) {
  const [search, setSearch] = useState('');
  const [filterEmpty, setFilterEmpty] = useState(false);

  const filtered = useMemo(() => {
    let list = lessons;
    if (filterEmpty) list = list.filter(l => !l.videoId.trim());
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(l =>
        l.titulo.toLowerCase().includes(q) ||
        l.id.toLowerCase().includes(q) ||
        l.blocoNome.toLowerCase().includes(q) ||
        l.faseNome.toLowerCase().includes(q)
      );
    }
    return list;
  }, [lessons, search, filterEmpty]);

  const total = lessons.length;
  const withVideo = lessons.filter(l => l.videoId.trim()).length;
  const pct = total > 0 ? Math.round((withVideo / total) * 100) : 0;

  return (
    <div className="flex flex-col gap-4">
      {/* Progress bar */}
      <div className="flex items-center gap-4">
        <div className="flex-1 bg-[#191919] rounded-full h-2">
          <div
            className="bg-[#00C864] h-2 rounded-full transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
        <span className="text-sm text-[#888] shrink-0">
          {withVideo}/{total} vídeos ({pct}%)
        </span>
        <button
          onClick={onSave}
          className="bg-[#F11013] hover:bg-[#C90D10] text-white text-sm font-semibold px-4 py-1.5 rounded-lg transition-colors shrink-0"
        >
          ↓ Exportar JSON
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-3 items-center">
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Buscar aula..."
          className="flex-1 bg-[#191919] border border-[#333] rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-[#F11013] transition-colors placeholder-[#555]"
        />
        <label className="flex items-center gap-2 text-sm text-[#888] cursor-pointer">
          <input
            type="checkbox"
            checked={filterEmpty}
            onChange={e => setFilterEmpty(e.target.checked)}
            className="accent-[#F11013]"
          />
          Sem vídeo
        </label>
        <span className="text-[#555] text-xs">{filtered.length} aulas</span>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-[#1a1a1a]">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#222] text-[#555] text-xs uppercase tracking-wider">
              <th className="px-3 py-2.5 text-left">Fase.Bloco</th>
              <th className="px-3 py-2.5 text-left">ID</th>
              <th className="px-3 py-2.5 text-left">Aula</th>
              <th className="px-3 py-2.5 text-left">YouTube ID</th>
              <th className="px-3 py-2.5 text-left">Dur</th>
              <th className="px-3 py-2.5 text-left">Materiais</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(l => (
              <LessonRow key={l.id} lesson={l} onChange={onChange} />
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="px-3 py-8 text-center text-[#555] text-sm">
                  Nenhuma aula encontrada
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── War Room Panel (different structure) ────────────────────────────────────
function WarRoomPanel({
  items,
  onSave,
  onChange,
}: {
  items: WarRoomItem[];
  onSave: () => void;
  onChange: (id: string, field: keyof WarRoomItem, value: unknown) => void;
}) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <button
          onClick={onSave}
          className="bg-[#F11013] hover:bg-[#C90D10] text-white text-sm font-semibold px-4 py-1.5 rounded-lg transition-colors"
        >
          ↓ Exportar JSON
        </button>
      </div>
      <div className="overflow-x-auto rounded-xl border border-[#1a1a1a]">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#222] text-[#555] text-xs uppercase tracking-wider">
              <th className="px-3 py-2.5 text-left">ID</th>
              <th className="px-3 py-2.5 text-left">Título</th>
              <th className="px-3 py-2.5 text-left">Formato</th>
              <th className="px-3 py-2.5 text-left">Tema</th>
              <th className="px-3 py-2.5 text-left">Duração</th>
              <th className="px-3 py-2.5 text-left">Destaque</th>
            </tr>
          </thead>
          <tbody>
            {items.map(item => (
              <tr key={item.id} className="border-b border-[#1a1a1a] hover:bg-[#111] transition-colors">
                <td className="px-3 py-2 text-[#888] text-xs font-mono">{item.id}</td>
                <td className="px-3 py-2">
                  <input
                    defaultValue={item.title}
                    onBlur={e => onChange(item.id, 'title', e.target.value)}
                    className="w-full bg-[#191919] border border-[#333] rounded px-2 py-1 text-sm text-white outline-none focus:border-[#FFCC00] transition-colors"
                  />
                </td>
                <td className="px-3 py-2 text-[#888] text-xs">{item.format}</td>
                <td className="px-3 py-2 text-[#888] text-xs">{item.tema}</td>
                <td className="px-3 py-2">
                  <input
                    defaultValue={item.dur}
                    onBlur={e => onChange(item.id, 'dur', e.target.value)}
                    className="w-48 bg-[#191919] border border-[#333] rounded px-2 py-1 text-xs text-white outline-none focus:border-[#FFCC00] transition-colors font-mono"
                  />
                </td>
                <td className="px-3 py-2 text-center">
                  <input
                    type="checkbox"
                    defaultChecked={item.featured}
                    onChange={e => onChange(item.id, 'featured', e.target.checked)}
                    className="accent-[#FFCC00]"
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Root Component ──────────────────────────────────────────────────────────
export default function AdminApp() {
  const [authed, setAuthed] = useState(() => localStorage.getItem(PASS_KEY) === '1');
  const [data, setData] = useState<DataState | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTrack, setActiveTrack] = useState<Track>('setter');

  // Flat lesson maps keyed by lesson id (for fast updates)
  const [lessonOverrides, setLessonOverrides] = useState<
    Record<string, { videoId?: string; material?: string[] }>
  >({});
  const [warroomOverrides, setWarroomOverrides] = useState<
    Record<string, Partial<WarRoomItem>>
  >({});

  useEffect(() => {
    if (!authed) { setLoading(false); return; }
    Promise.all([
      fetch('/data/setter.json').then(r => r.json()),
      fetch('/data/partner.json').then(r => r.json()),
      fetch('/data/builder.json').then(r => r.json()),
      fetch('/data/vantagemsys.json').then(r => r.json()),
      fetch('/data/warroom.json').then(r => r.json()),
    ]).then(([setter, partner, builder, vantagemsys, warroom]) => {
      setData({ setter, partner, builder, vantagemsys, warroom });
      setLoading(false);
    }).catch(err => {
      console.error('Failed to load data', err);
      setLoading(false);
    });
  }, [authed]);

  if (!authed) return <PasswordGate onAuth={() => setAuthed(true)} />;

  if (loading) {
    return (
      <div className="min-h-screen bg-[#080808] flex items-center justify-center">
        <p className="text-[#555] text-sm">Carregando dados...</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-[#080808] flex items-center justify-center">
        <p className="text-[#F11013] text-sm">Erro ao carregar os arquivos JSON. Verifique que os arquivos em /data/ existem.</p>
      </div>
    );
  }

  // Merge base data with overrides to produce working lesson lists
  function mergedFases(track: 'setter' | 'partner' | 'builder') {
    const fases: Fase[] = JSON.parse(JSON.stringify(data![track]));
    for (const f of fases) {
      for (const b of f.blocos ?? []) {
        for (const a of b.aulas ?? []) {
          const ov = lessonOverrides[a.id];
          if (ov?.videoId !== undefined) a.videoId = ov.videoId;
          if (ov?.material !== undefined) a.material = ov.material;
        }
      }
    }
    return fases;
  }

  function mergedVantagemsys() {
    const tuts: VantagemTutorials = JSON.parse(JSON.stringify(data!.vantagemsys));
    for (const arr of Object.values(tuts)) {
      for (const t of arr ?? []) {
        const ov = lessonOverrides[t.id];
        if (ov?.videoId !== undefined) t.videoId = ov.videoId;
        if (ov?.material !== undefined) t.material = ov.material;
      }
    }
    return tuts;
  }

  function mergedWarroom() {
    return data!.warroom.map(item => ({
      ...item,
      ...(warroomOverrides[item.id] ?? {}),
    }));
  }

  function handleLessonChange(id: string, field: 'videoId' | 'material', value: string | string[]) {
    setLessonOverrides(prev => ({
      ...prev,
      [id]: { ...prev[id], [field]: value },
    }));
  }

  function handleWarroomChange(id: string, field: keyof WarRoomItem, value: unknown) {
    setWarroomOverrides(prev => ({
      ...prev,
      [id]: { ...prev[id], [field]: value },
    }));
  }

  function exportTrack(track: Track) {
    switch (track) {
      case 'setter':   downloadJson('setter.json', mergedFases('setter')); break;
      case 'partner':  downloadJson('partner.json', mergedFases('partner')); break;
      case 'builder':  downloadJson('builder.json', mergedFases('builder')); break;
      case 'vantagemsys': downloadJson('vantagemsys.json', mergedVantagemsys()); break;
      case 'warroom':  downloadJson('warroom.json', mergedWarroom()); break;
    }
  }

  // Build flat lesson lists with overrides applied
  const flatLessons: Record<'setter' | 'partner' | 'builder' | 'vantagemsys', FlatLesson[]> = {
    setter: flattenFases(mergedFases('setter'), 'setter'),
    partner: flattenFases(mergedFases('partner'), 'partner'),
    builder: flattenFases(mergedFases('builder'), 'builder'),
    vantagemsys: flattenVantagemsys(mergedVantagemsys()),
  };

  const tracks: Track[] = ['setter', 'partner', 'builder', 'vantagemsys', 'warroom'];

  return (
    <div className="min-h-screen bg-[#080808] text-white">
      {/* Top bar */}
      <header className="bg-[#101010] border-b border-[#1a1a1a] sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-[#F11013] font-bold tracking-tight text-lg">VA</span>
            <span className="text-white font-semibold">Vantagem.ai Admin</span>
            <span className="text-[#444] text-xs">— Gerenciar Conteúdo</span>
          </div>
          <div className="flex items-center gap-4">
            <a href="/vantagem-portal.html" target="_blank" className="text-xs text-[#555] hover:text-white transition-colors">
              Ver Portal →
            </a>
            <button
              onClick={() => { localStorage.removeItem(PASS_KEY); setAuthed(false); }}
              className="text-xs text-[#555] hover:text-[#F11013] transition-colors"
            >
              Sair
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-6">
        {/* Instructions */}
        <div className="bg-[#101010] border border-[#FFCC00]/20 rounded-xl px-5 py-4 mb-6 text-sm text-[#aaa]">
          <p className="text-[#FFCC00] font-semibold mb-1">Como usar</p>
          <ol className="list-decimal list-inside space-y-1 text-xs">
            <li>Cole a URL do YouTube (ou o ID de 11 caracteres) no campo de cada aula</li>
            <li>Clique em <strong className="text-white">Exportar JSON</strong> para baixar o arquivo atualizado</li>
            <li>Substitua o arquivo em <code className="bg-[#191919] px-1 rounded">public/data/</code> e faça push para o repositório</li>
            <li>O portal lerá os novos dados automaticamente</li>
          </ol>
        </div>

        {/* Track tabs */}
        <div className="flex gap-1 mb-6 bg-[#101010] p-1 rounded-xl border border-[#1a1a1a] w-fit">
          {tracks.map(t => (
            <button
              key={t}
              onClick={() => setActiveTrack(t)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTrack === t
                  ? 'bg-[#F11013] text-white'
                  : 'text-[#666] hover:text-white'
              }`}
            >
              {TRACK_LABELS[t]}
            </button>
          ))}
        </div>

        {/* Active panel */}
        {activeTrack === 'warroom' ? (
          <WarRoomPanel
            items={mergedWarroom()}
            onSave={() => exportTrack('warroom')}
            onChange={handleWarroomChange}
          />
        ) : (
          <TrackPanel
            key={activeTrack}
            track={activeTrack}
            lessons={flatLessons[activeTrack as keyof typeof flatLessons]}
            onSave={() => exportTrack(activeTrack)}
            onChange={handleLessonChange}
          />
        )}
      </div>
    </div>
  );
}
