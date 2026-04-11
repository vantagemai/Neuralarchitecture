import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import type { LessonUpdate } from '../lib/supabase';
import type { Fase, VantagemTutorials, WarRoomItem, FlatLesson, Track } from './types';
import { parseYouTubeId, downloadJson } from './utils';

// ─── Auth ────────────────────────────────────────────────────────────────────
function LoginScreen({ onLogin }: { onLogin: () => void }) {
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      setError('Email ou senha incorretos.');
    } else {
      onLogin();
    }
  }

  return (
    <div className="min-h-screen bg-[#080808] flex items-center justify-center">
      <form onSubmit={handleSubmit} className="bg-[#101010] border border-[#222] rounded-2xl p-10 w-80 flex flex-col gap-4">
        <div>
          <h1 className="text-white text-xl font-semibold tracking-tight">Vantagem.ai Admin</h1>
          <p className="text-[#555] text-sm mt-1">Entre com seu e-mail e senha</p>
        </div>
        <input
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder="E-mail"
          required
          autoFocus
          className="bg-[#191919] border border-[#333] rounded-lg px-4 py-2.5 text-white text-sm outline-none focus:border-[#F11013] transition-colors"
        />
        <input
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          placeholder="Senha"
          required
          className="bg-[#191919] border border-[#333] rounded-lg px-4 py-2.5 text-white text-sm outline-none focus:border-[#F11013] transition-colors"
        />
        {error && <p className="text-[#F11013] text-xs">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="bg-[#F11013] hover:bg-[#C90D10] disabled:opacity-50 text-white font-semibold rounded-lg py-2.5 text-sm transition-colors"
        >
          {loading ? 'Entrando...' : 'Entrar'}
        </button>
      </form>
    </div>
  );
}

// ─── Save indicator ──────────────────────────────────────────────────────────
type SaveState = 'idle' | 'saving' | 'saved' | 'error';

function SaveBadge({ state }: { state: SaveState }) {
  if (state === 'idle') return null;
  const map: Record<SaveState, [string, string]> = {
    idle:   ['', ''],
    saving: ['text-[#FFCC00]', 'Salvando...'],
    saved:  ['text-[#00C864]', '✓ Salvo'],
    error:  ['text-[#F11013]', '✗ Erro ao salvar'],
  };
  const [cls, label] = map[state];
  return <span className={`text-xs font-mono ${cls} transition-all`}>{label}</span>;
}

// ─── Lesson Row ──────────────────────────────────────────────────────────────
function LessonRow({
  lesson,
  onSave,
}: {
  lesson: FlatLesson;
  onSave: (id: string, track: Track, videoId: string, material: string[]) => Promise<void>;
}) {
  const [videoId, setVideoId]   = useState(lesson.videoId);
  const [matStr, setMatStr]     = useState(lesson.material.join('\n'));
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const hasVideo = videoId.trim().length > 0;

  async function save(vid: string, mat: string[]) {
    setSaveState('saving');
    try {
      await onSave(lesson.id, lesson.track, vid, mat);
      setSaveState('saved');
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setSaveState('idle'), 3000);
    } catch {
      setSaveState('error');
    }
  }

  function handleVideoBlur(e: React.FocusEvent<HTMLInputElement>) {
    const parsed = parseYouTubeId(e.target.value);
    setVideoId(parsed);
    const mats = matStr.split('\n').map(s => s.trim()).filter(Boolean);
    save(parsed, mats);
  }

  function handleMatBlur() {
    const mats = matStr.split('\n').map(s => s.trim()).filter(Boolean);
    save(videoId, mats);
  }

  return (
    <tr className="border-b border-[#1a1a1a] hover:bg-[#111] transition-colors">
      <td className="px-3 py-2 text-[#555] text-xs whitespace-nowrap">{lesson.faseNum}.{lesson.blocoNum}</td>
      <td className="px-3 py-2 text-[#888] text-xs font-mono">{lesson.id}</td>
      <td className="px-3 py-2 text-white text-sm max-w-xs">
        <span className="line-clamp-2">{lesson.titulo}</span>
        <span className="block text-[#555] text-xs">{lesson.blocoNome}</span>
      </td>
      <td className="px-3 py-2 w-64">
        <div className="flex items-center gap-2">
          <input
            value={videoId}
            onChange={e => setVideoId(e.target.value)}
            onBlur={handleVideoBlur}
            placeholder="URL ou ID do YouTube"
            className={`flex-1 bg-[#191919] border rounded px-2 py-1.5 text-xs text-white outline-none focus:border-[#F11013] transition-colors placeholder-[#444] font-mono
              ${hasVideo ? 'border-[#00C864]/40' : 'border-[#333]'}`}
          />
          <SaveBadge state={saveState} />
        </div>
        {hasVideo && (
          <a
            href={`https://www.youtube.com/watch?v=${videoId}`}
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
  updates,
  onSave,
  onExport,
}: {
  lessons: FlatLesson[];
  updates: Map<string, LessonUpdate>;
  onSave: (id: string, track: Track, videoId: string, material: string[]) => Promise<void>;
  onExport: () => void;
}) {
  const [search, setSearch]       = useState('');
  const [filterEmpty, setFilterEmpty] = useState(false);

  // Merge static lessons with live Supabase updates
  const mergedLessons = useMemo(() =>
    lessons.map(l => {
      const up = updates.get(l.id);
      return up ? { ...l, videoId: up.video_id, material: up.material } : l;
    }),
  [lessons, updates]);

  const filtered = useMemo(() => {
    let list = mergedLessons;
    if (filterEmpty) list = list.filter(l => !l.videoId.trim());
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(l =>
        l.titulo.toLowerCase().includes(q) ||
        l.id.toLowerCase().includes(q) ||
        l.blocoNome.toLowerCase().includes(q)
      );
    }
    return list;
  }, [mergedLessons, search, filterEmpty]);

  const total      = mergedLessons.length;
  const withVideo  = mergedLessons.filter(l => l.videoId.trim()).length;
  const pct        = total > 0 ? Math.round((withVideo / total) * 100) : 0;

  return (
    <div className="flex flex-col gap-4">
      {/* Progress + Export */}
      <div className="flex items-center gap-4">
        <div className="flex-1 bg-[#191919] rounded-full h-2">
          <div className="bg-[#00C864] h-2 rounded-full transition-all" style={{ width: `${pct}%` }} />
        </div>
        <span className="text-sm text-[#888] shrink-0">{withVideo}/{total} vídeos ({pct}%)</span>
        <button
          onClick={onExport}
          className="text-xs text-[#555] hover:text-white border border-[#333] hover:border-[#555] px-3 py-1.5 rounded-lg transition-colors shrink-0"
        >
          ↓ JSON
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
        <label className="flex items-center gap-2 text-sm text-[#888] cursor-pointer select-none">
          <input
            type="checkbox"
            checked={filterEmpty}
            onChange={e => setFilterEmpty(e.target.checked)}
            className="accent-[#F11013]"
          />
          Sem vídeo
        </label>
        <span className="text-[#555] text-xs shrink-0">{filtered.length} aulas</span>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-[#1a1a1a]">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#222] text-[#555] text-xs uppercase tracking-wider">
              <th className="px-3 py-2.5 text-left">Fase.Bloco</th>
              <th className="px-3 py-2.5 text-left">ID</th>
              <th className="px-3 py-2.5 text-left">Aula</th>
              <th className="px-3 py-2.5 text-left">YouTube</th>
              <th className="px-3 py-2.5 text-left">Dur</th>
              <th className="px-3 py-2.5 text-left">Materiais</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(l => (
              <LessonRow key={l.id} lesson={l} onSave={onSave} />
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

// ─── Helpers to flatten data ─────────────────────────────────────────────────
function flattenFases(fases: Fase[], track: Track): FlatLesson[] {
  const out: FlatLesson[] = [];
  for (const f of fases) {
    for (const b of f.blocos ?? []) {
      for (const a of b.aulas ?? []) {
        out.push({
          track, faseNum: f.num, faseNome: f.nome,
          blocoNum: b.num, blocoNome: b.nome,
          id: a.id, titulo: a.titulo,
          videoId: a.videoId ?? '', dur: a.dur,
          material: a.material ?? [],
        });
      }
    }
  }
  return out;
}

function flattenVantagemsys(tuts: VantagemTutorials): FlatLesson[] {
  return Object.values(tuts).flat().map(t => ({
    track: 'vantagemsys' as Track,
    faseNum: 0, faseNome: t.tabLabel ?? t.tab,
    blocoNum: 0, blocoNome: t.tabLabel ?? t.tab,
    id: t.id, titulo: t.titulo,
    videoId: t.videoId ?? '', dur: t.dur,
    material: t.material ?? [],
  }));
}

// ─── Root ─────────────────────────────────────────────────────────────────────
const TRACK_LABELS: Record<Track, string> = {
  setter: 'Setter', partner: 'Partner',
  builder: "Builder's AI", vantagemsys: 'Vantagem.sys', warroom: 'War Room',
};

type DataState = {
  setter: Fase[]; partner: Fase[]; builder: Fase[];
  vantagemsys: VantagemTutorials; warroom: WarRoomItem[];
};

export default function AdminApp() {
  const [user, setUser]     = useState<null | object>(null);
  const [checking, setChecking] = useState(true);

  const [data, setData]       = useState<DataState | null>(null);
  const [updates, setUpdates] = useState<Map<string, LessonUpdate>>(new Map());
  const [loadingData, setLoadingData] = useState(false);
  const [activeTrack, setActiveTrack] = useState<Track>('setter');

  // ── Auth check on mount
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
      setChecking(false);
    });
  }, []);

  // ── Load JSON + Supabase updates when logged in
  useEffect(() => {
    if (!user) return;
    setLoadingData(true);
    Promise.all([
      fetch('/data/setter.json').then(r => r.json()),
      fetch('/data/partner.json').then(r => r.json()),
      fetch('/data/builder.json').then(r => r.json()),
      fetch('/data/vantagemsys.json').then(r => r.json()),
      fetch('/data/warroom.json').then(r => r.json()),
      supabase.from('lesson_updates').select('*'),
    ]).then(([setter, partner, builder, vantagemsys, warroom, { data: rows }]) => {
      setData({ setter, partner, builder, vantagemsys, warroom });
      const map = new Map<string, LessonUpdate>();
      (rows ?? []).forEach((r: LessonUpdate) => map.set(r.id, r));
      setUpdates(map);
      setLoadingData(false);
    }).catch(err => {
      console.error(err);
      setLoadingData(false);
    });
  }, [user]);

  // ── Save lesson to Supabase (upsert)
  const handleSave = useCallback(async (
    id: string, track: Track, videoId: string, material: string[]
  ) => {
    const row = { id, track, video_id: videoId, material };
    const { data: saved, error } = await supabase
      .from('lesson_updates')
      .upsert(row, { onConflict: 'id' })
      .select()
      .single();
    if (error) throw error;
    setUpdates(prev => new Map(prev).set(id, saved as LessonUpdate));
  }, []);

  // ── Export JSON for a track (includes Supabase data)
  function exportTrack(track: Track) {
    if (!data) return;
    const mergeAulas = (fases: Fase[]) =>
      fases.map(f => ({
        ...f,
        blocos: (f.blocos ?? []).map(b => ({
          ...b,
          aulas: (b.aulas ?? []).map(a => {
            const up = updates.get(a.id);
            return up ? { ...a, videoId: up.video_id, material: up.material } : a;
          }),
        })),
      }));

    switch (track) {
      case 'setter':   return downloadJson('setter.json',   mergeAulas(data.setter));
      case 'partner':  return downloadJson('partner.json',  mergeAulas(data.partner));
      case 'builder':  return downloadJson('builder.json',  mergeAulas(data.builder));
      case 'warroom':  return downloadJson('warroom.json',  data.warroom);
      case 'vantagemsys': {
        const merged: VantagemTutorials = {};
        for (const [tab, arr] of Object.entries(data.vantagemsys)) {
          merged[tab] = (arr ?? []).map(t => {
            const up = updates.get(t.id);
            return up ? { ...t, videoId: up.video_id, material: up.material } : t;
          });
        }
        return downloadJson('vantagemsys.json', merged);
      }
    }
  }

  // ── Render states
  if (checking) {
    return (
      <div className="min-h-screen bg-[#080808] flex items-center justify-center">
        <p className="text-[#555] text-sm">Verificando sessão...</p>
      </div>
    );
  }

  if (!user) return <LoginScreen onLogin={() => supabase.auth.getUser().then(({ data }) => setUser(data.user))} />;

  if (loadingData || !data) {
    return (
      <div className="min-h-screen bg-[#080808] flex items-center justify-center">
        <p className="text-[#555] text-sm">Carregando conteúdo...</p>
      </div>
    );
  }

  const flatLessons: Record<string, FlatLesson[]> = {
    setter:       flattenFases(data.setter,  'setter'),
    partner:      flattenFases(data.partner, 'partner'),
    builder:      flattenFases(data.builder, 'builder'),
    vantagemsys:  flattenVantagemsys(data.vantagemsys),
  };

  const tracks: Track[] = ['setter', 'partner', 'builder', 'vantagemsys'];

  return (
    <div className="min-h-screen bg-[#080808] text-white">
      {/* Header */}
      <header className="bg-[#101010] border-b border-[#1a1a1a] sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-[#F11013] font-bold tracking-tight text-lg">VA</span>
            <span className="text-white font-semibold">Admin</span>
            <span className="text-[#333] text-xs hidden sm:inline">— mudanças salvas direto no banco, sem precisar fazer push</span>
          </div>
          <div className="flex items-center gap-4">
            <a href="/vantagem-portal.html" target="_blank" className="text-xs text-[#555] hover:text-white transition-colors">
              Ver Portal →
            </a>
            <button
              onClick={() => supabase.auth.signOut().then(() => setUser(null))}
              className="text-xs text-[#555] hover:text-[#F11013] transition-colors"
            >
              Sair
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-6">
        {/* Info banner */}
        <div className="bg-[#101010] border border-[#00C864]/20 rounded-xl px-5 py-3 mb-6 flex items-start gap-3">
          <span className="text-[#00C864] text-lg shrink-0">✓</span>
          <p className="text-[#888] text-sm">
            Cole a URL do YouTube em qualquer aula — ela é salva instantaneamente no banco.
            O portal exibe o vídeo na próxima vez que o aluno abrir a aula.
            O botão <strong className="text-white">↓ JSON</strong> exporta o arquivo para você atualizar o repositório se quiser.
          </p>
        </div>

        {/* Track tabs */}
        <div className="flex gap-1 mb-6 bg-[#101010] p-1 rounded-xl border border-[#1a1a1a] w-fit flex-wrap">
          {tracks.map(t => (
            <button
              key={t}
              onClick={() => setActiveTrack(t)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTrack === t ? 'bg-[#F11013] text-white' : 'text-[#666] hover:text-white'
              }`}
            >
              {TRACK_LABELS[t]}
              {activeTrack !== t && (() => {
                const ls = flatLessons[t] ?? [];
                const done = ls.filter(l => updates.get(l.id)?.video_id?.trim()).length;
                return ls.length > 0 ? (
                  <span className={`ml-1.5 text-[10px] ${done === ls.length ? 'text-[#00C864]' : 'text-[#555]'}`}>
                    {done}/{ls.length}
                  </span>
                ) : null;
              })()}
            </button>
          ))}
        </div>

        <TrackPanel
          key={activeTrack}
          lessons={flatLessons[activeTrack] ?? []}
          updates={updates}
          onSave={handleSave}
          onExport={() => exportTrack(activeTrack)}
        />
      </div>
    </div>
  );
}
