import type { Result } from './storage';
import { localDate } from './daily';

export interface Achievement {
  id: string;
  name: string;
  desc: string;
  done: boolean;
}

export interface Stats {
  total: number;
  streak: number; // dias seguidos até hoje (ou até ontem, se hoje ainda não jogou)
  best: number;
  rank: { name: string; min: number; next: { name: string; min: number } | null };
  achievements: Achievement[];
}

export const RANKS = [
  { name: 'Novato', min: 0 },
  { name: 'Aprendiz', min: 3 },
  { name: 'Craque', min: 10 },
  { name: 'Especialista', min: 25 },
  { name: 'Mestre das Palavras', min: 50 },
];

const dayNumber = (date: string) => {
  const [y, m, d] = date.split('-').map(Number);
  return Math.round(Date.UTC(y, m - 1, d) / 86400000);
};

export function statsFrom(results: Result[], today = localDate()): Stats {
  const days = [...new Set(results.map((r) => localDate(new Date(r.date))))].map(dayNumber).sort((a, b) => a - b);

  let best = 0;
  let run = 0;
  days.forEach((d, i) => {
    run = i > 0 && d === days[i - 1] + 1 ? run + 1 : 1;
    best = Math.max(best, run);
  });

  const set = new Set(days);
  let cursor = dayNumber(today);
  if (!set.has(cursor)) cursor -= 1; // ainda dá tempo de manter a sequência hoje
  let streak = 0;
  while (set.has(cursor)) {
    streak++;
    cursor--;
  }

  const total = results.length;
  const idx = RANKS.reduce((acc, r, i) => (total >= r.min ? i : acc), 0);
  const tipos = new Set(results.map((r) => r.tipo));

  const achievements: Achievement[] = [
    { id: 'first', name: 'Primeiro passo', desc: 'Conclua seu primeiro jogo.', done: total >= 1 },
    { id: 'nohelp', name: 'Sem ajuda', desc: 'Conclua um jogo sem usar dicas.', done: results.some((r) => r.hints === 0) },
    { id: 'ten', name: 'Dez jogos', desc: 'Conclua 10 jogos.', done: total >= 10 },
    { id: 'all', name: 'Multijogador', desc: 'Conclua cada uma das 5 modalidades.', done: tipos.size >= 5 },
    { id: 'expert', name: 'Nível máximo', desc: 'Conclua um jogo Especialista.', done: results.some((r) => r.nivel === 5) },
    { id: 'fast', name: 'Rapidinho', desc: 'Conclua um jogo de nível 3+ em menos de 3 minutos.', done: results.some((r) => r.nivel >= 3 && r.time < 180) },
    { id: 'streak3', name: 'Três dias seguidos', desc: 'Jogue 3 dias seguidos.', done: best >= 3 },
    { id: 'streak7', name: 'Semana perfeita', desc: 'Jogue 7 dias seguidos.', done: best >= 7 },
  ];

  return { total, streak, best, rank: { ...RANKS[idx], next: RANKS[idx + 1] ?? null }, achievements };
}
