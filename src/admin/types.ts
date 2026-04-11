export interface Aula {
  id: string;
  titulo: string;
  descCurta: string;
  descLonga: string;
  obj: string;
  res: string;
  videoId: string;
  dur: number;
  material: string[];
  // injected at build time
  _fase?: number;
  _faseTipo?: string;
  _bloco?: number;
  _blocoNome?: string;
}

export interface Bloco {
  num: number;
  nome: string;
  aulas: Aula[];
}

export interface Fase {
  num: number;
  nome: string;
  obj: string;
  tipo: string;
  blocos: Bloco[];
}

export interface Tutorial {
  id: string;
  tab: string;
  tabLabel: string;
  titulo: string;
  descCurta: string;
  descLonga: string;
  videoId: string;
  imagem: string;
  dur: number;
  material: string[];
}

export type VantagemTutorials = Record<string, Tutorial[]>;

export interface WarRoomItem {
  id: string;
  format: string;
  tema: string;
  title: string;
  desc: string;
  dur: string;
  featured: boolean;
  recent: number;
}

export type Track = 'setter' | 'partner' | 'builder' | 'vantagemsys' | 'warroom';

export interface FlatLesson {
  track: Track;
  faseNum: number;
  faseNome: string;
  blocoNum: number;
  blocoNome: string;
  id: string;
  titulo: string;
  videoId: string;
  dur: number | string;
  material: string[];
}
