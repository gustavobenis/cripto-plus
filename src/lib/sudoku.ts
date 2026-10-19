import { mulberry32, shuffle } from './rng';

export interface Sudoku {
  puzzle: number[]; // 81 células, 0 = vazia
  solution: number[];
}

// Pistas (células preenchidas) por nível: quanto menos, mais difícil.
export const GIVENS_BY_LEVEL = [46, 40, 34, 30, 26];

export const rowOf = (i: number) => Math.floor(i / 9);
export const colOf = (i: number) => i % 9;
export const boxOf = (i: number) => Math.floor(rowOf(i) / 3) * 3 + Math.floor(colOf(i) / 3);

const PEERS: number[][] = Array.from({ length: 81 }, (_, i) => {
  const set = new Set<number>();
  for (let j = 0; j < 81; j++)
    if (j !== i && (rowOf(j) === rowOf(i) || colOf(j) === colOf(i) || boxOf(j) === boxOf(i))) set.add(j);
  return [...set];
});
export const peersOf = (i: number) => PEERS[i];

/** Máscara de dígitos possíveis (bit d = dígito d). */
export function candidates(b: readonly number[], i: number): number {
  let used = 0;
  for (const p of PEERS[i]) used |= 1 << b[p];
  return ~used & 0x3fe;
}
const pop = (m: number) => {
  let n = 0;
  for (; m; m &= m - 1) n++;
  return n;
};
export const candidateList = (b: readonly number[], i: number): number[] =>
  [1, 2, 3, 4, 5, 6, 7, 8, 9].filter((d) => candidates(b, i) & (1 << d));

/** Conta soluções (até `limit`), escolhendo sempre a célula com menos opções. */
export function countSolutions(b: number[], limit = 2): number {
  let best = -1;
  let bestMask = 0;
  let bestN = 10;
  for (let i = 0; i < 81; i++) {
    if (b[i] !== 0) continue;
    const m = candidates(b, i);
    const n = pop(m);
    if (n === 0) return 0;
    if (n < bestN) {
      best = i;
      bestMask = m;
      bestN = n;
      if (n === 1) break;
    }
  }
  if (best === -1) return 1;
  let total = 0;
  for (let d = 1; d <= 9; d++) {
    if (!(bestMask & (1 << d))) continue;
    b[best] = d;
    total += countSolutions(b, limit - total);
    b[best] = 0;
    if (total >= limit) break;
  }
  return total;
}

function fill(b: number[], rnd: () => number): boolean {
  let best = -1;
  let bestMask = 0;
  let bestN = 10;
  for (let i = 0; i < 81; i++) {
    if (b[i] !== 0) continue;
    const m = candidates(b, i);
    const n = pop(m);
    if (n === 0) return false;
    if (n < bestN) {
      best = i;
      bestMask = m;
      bestN = n;
    }
  }
  if (best === -1) return true;
  for (const d of shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9], rnd)) {
    if (!(bestMask & (1 << d))) continue;
    b[best] = d;
    if (fill(b, rnd)) return true;
    b[best] = 0;
  }
  return false;
}

export function generateSudoku(nivel: number, seed: number): Sudoku {
  const rnd = mulberry32(seed);
  const solution = new Array<number>(81).fill(0);
  fill(solution, rnd);
  const puzzle = solution.slice();
  const target = GIVENS_BY_LEVEL[Math.min(5, Math.max(1, nivel)) - 1];
  let givens = 81;
  for (const i of shuffle(Array.from({ length: 81 }, (_, k) => k), rnd)) {
    if (givens <= target) break;
    const keep = puzzle[i];
    puzzle[i] = 0;
    if (countSolutions(puzzle.slice(), 2) !== 1) puzzle[i] = keep;
    else givens--;
  }
  return { puzzle, solution };
}

/** Validador independente: solução válida, pistas coerentes e solução única. */
export function validateSudoku(s: Sudoku): string[] {
  const errors: string[] = [];
  if (s.puzzle.length !== 81 || s.solution.length !== 81) return ['tamanho inválido'];
  for (let i = 0; i < 81; i++) {
    const v = s.solution[i];
    if (!(v >= 1 && v <= 9)) errors.push(`solução inválida na célula ${i}`);
    else {
      for (const p of PEERS[i]) if (s.solution[p] === v) errors.push(`dígito repetido ${i}/${p}`);
    }
    if (s.puzzle[i] !== 0 && s.puzzle[i] !== v) errors.push(`pista incoerente na célula ${i}`);
  }
  if (!errors.length && countSolutions(s.puzzle.slice(), 2) !== 1) errors.push('o puzzle não tem solução única');
  return errors;
}
