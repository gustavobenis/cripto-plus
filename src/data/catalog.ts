export interface Theme {
  id: string;
  name: string;
  icon: string;
}

export const THEMES: Theme[] = [
  { id: 'historia', name: 'História', icon: '🏛️' },
  { id: 'geografia', name: 'Geografia', icon: '🌍' },
  { id: 'ciencias', name: 'Ciências', icon: '🔬' },
  { id: 'natureza', name: 'Natureza', icon: '🐘' },
  { id: 'tecnologia', name: 'Tecnologia', icon: '💻' },
  { id: 'esportes', name: 'Esportes', icon: '⚽' },
  { id: 'cultura', name: 'Cultura', icon: '🎭' },
  { id: 'variado', name: 'Variado', icon: '🎲' },
];

export interface Level {
  id: number;
  name: string;
  desc: string;
  size: number; // lado máximo da grade
  words: number; // palavras desejadas
  tier: number; // familiaridade-alvo do vocabulário
  givens: number; // letras já reveladas no criptograma
}

export const LEVELS: Level[] = [
  { id: 1, name: 'Iniciante', desc: 'Palavras comuns e grades pequenas.', size: 9, words: 5, tier: 1, givens: 5 },
  { id: 2, name: 'Fácil', desc: 'Vocabulário cotidiano e pistas diretas.', size: 11, words: 7, tier: 1.5, givens: 4 },
  { id: 3, name: 'Intermediário', desc: 'Pistas menos literais e mais cruzamentos.', size: 13, words: 9, tier: 2, givens: 3 },
  { id: 4, name: 'Difícil', desc: 'Vocabulário amplo e grades maiores.', size: 15, words: 11, tier: 2.5, givens: 1 },
  { id: 5, name: 'Especialista', desc: 'Repertório exigente, sem letras de graça.', size: 15, words: 13, tier: 3, givens: 0 },
];

export const themeName = (id: string) => THEMES.find((t) => t.id === id)?.name ?? id;
export const levelName = (n: number) => LEVELS.find((l) => l.id === n)?.name ?? String(n);

export type Tipo = 'cruzadas' | 'cripto' | 'caca' | 'anagrama';
export const TIPO_NAME: Record<Tipo, string> = {
  cruzadas: 'Palavras Cruzadas',
  cripto: 'Criptograma',
  caca: 'Caça-Palavras',
  anagrama: 'Palavras Embaralhadas',
};
export interface GameType {
  id: string;
  name: string;
  desc: string;
  tipo?: Tipo;
  icon: string;
}
export const GAME_TYPES: GameType[] = [
  { id: 'cruzadas', tipo: 'cruzadas', name: 'Palavras Cruzadas', desc: 'Clássicas e temáticas', icon: 'grid' },
  { id: 'cripto', tipo: 'cripto', name: 'Criptogramas', desc: 'Decifre mensagens', icon: 'lock' },
  { id: 'caca', tipo: 'caca', name: 'Caça-Palavras', desc: 'Encontre as palavras escondidas', icon: 'search' },
  { id: 'embaralhadas', tipo: 'anagrama', name: 'Palavras Embaralhadas', desc: 'Organize as letras', icon: 'type' },
];
