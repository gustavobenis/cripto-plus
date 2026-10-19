import type { WordEntry } from './crossword';

export type Vec = [number, number]; // [dr, dc]

export interface WSWord {
  answer: string;
  clue: string;
  hint: string;
  row: number;
  col: number;
  dr: number;
  dc: number;
}

export interface WordSearch {
  size: number;
  grid: string[][];
  words: WSWord[];
}

export const DIRS_BY_LEVEL: Record<number, Vec[]> = {
  1: [[0, 1], [1, 0]],
  2: [[0, 1], [1, 0]],
  3: [[0, 1], [1, 0], [1, 1]],
  4: [[0, 1], [1, 0], [1, 1], [0, -1], [-1, 0]],
  5: [[0, 1], [1, 0], [1, 1], [0, -1], [-1, 0], [-1, -1], [1, -1], [-1, 1]],
};

export function generateWordSearch(
  pool: WordEntry[],
  size: number,
  dirs: Vec[],
  rnd: () => number,
  count: number,
): WordSearch | null {
  const grid: (string | null)[][] = Array.from({ length: size }, () => Array<string | null>(size).fill(null));
  const words: WSWord[] = [];
  const order = pool
    .filter((w) => w.answer.length <= size)
    .map((w) => ({ w, k: w.answer.length + rnd() * 2 }))
    .sort((a, b) => b.k - a.k)
    .map((x) => x.w);

  for (const w of order) {
    if (words.length >= count) break;
    const a = w.answer;
    for (let t = 0; t < 300; t++) {
      const [dr, dc] = dirs[Math.floor(rnd() * dirs.length)];
      const r0 = dr === 0 ? Math.floor(rnd() * size) : dr > 0 ? Math.floor(rnd() * (size - a.length + 1)) : a.length - 1 + Math.floor(rnd() * (size - a.length + 1));
      const c0 = dc === 0 ? Math.floor(rnd() * size) : dc > 0 ? Math.floor(rnd() * (size - a.length + 1)) : a.length - 1 + Math.floor(rnd() * (size - a.length + 1));
      let ok = true;
      let overlaps = 0;
      for (let i = 0; i < a.length && ok; i++) {
        const cell = grid[r0 + dr * i]?.[c0 + dc * i];
        if (cell === undefined) ok = false;
        else if (cell !== null) {
          if (cell === a[i]) overlaps++;
          else ok = false;
        }
      }
      if (!ok || overlaps === a.length) continue;
      for (let i = 0; i < a.length; i++) grid[r0 + dr * i][c0 + dc * i] = a[i];
      words.push({ answer: a, clue: w.clue, hint: w.hint, row: r0, col: c0, dr, dc });
      break;
    }
  }
  if (!words.length) return null;
  const A = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const filled = grid.map((row) => row.map((ch) => ch ?? A[Math.floor(rnd() * 26)]));
  return { size, grid: filled, words };
}

export function validateWordSearch(ws: WordSearch): string[] {
  const errors: string[] = [];
  if (ws.grid.length !== ws.size || ws.grid.some((r) => r.length !== ws.size)) errors.push('dimensões');
  const seen = new Set<string>();
  for (const w of ws.words) {
    if (seen.has(w.answer)) errors.push(`duplicada ${w.answer}`);
    seen.add(w.answer);
    for (let i = 0; i < w.answer.length; i++) {
      if (ws.grid[w.row + w.dr * i]?.[w.col + w.dc * i] !== w.answer[i]) errors.push(`${w.answer} não confere na posição ${i}`);
    }
  }
  for (const row of ws.grid) for (const ch of row) if (!/^[A-Z]$/.test(ch)) errors.push('célula inválida');
  return errors;
}

/** Células de um segmento reto de (r1,c1) a (r2,c2); null se não for horizontal/vertical/diagonal. */
export function segment(r1: number, c1: number, r2: number, c2: number): [number, number][] | null {
  const dr = Math.sign(r2 - r1);
  const dc = Math.sign(c2 - c1);
  const n = Math.max(Math.abs(r2 - r1), Math.abs(c2 - c1));
  if (n === 0) return null;
  if (r2 - r1 !== 0 && c2 - c1 !== 0 && Math.abs(r2 - r1) !== Math.abs(c2 - c1)) return null;
  return Array.from({ length: n + 1 }, (_, i): [number, number] => [r1 + dr * i, c1 + dc * i]);
}
