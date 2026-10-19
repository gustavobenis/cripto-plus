import { mulberry32 } from './rng';

export type Dir = 'A' | 'D'; // A = horizontal (across), D = vertical (down)

export interface WordEntry {
  answer: string; // A–Z, sem acentos
  clue: string;
  hint: string;
  tier: 1 | 2 | 3;
}

export interface Entry {
  id: string;
  number: number;
  dir: Dir;
  row: number;
  col: number;
  length: number;
  answer: string;
  clue: string;
  hint: string;
}

export interface Puzzle {
  rows: number;
  cols: number;
  grid: (string | null)[][];
  entries: Entry[];
}

export interface GenOptions {
  maxSize: number;
  target: number;
  minWords: number;
  seed: number;
  attempts?: number;
}

export type GenResult = { ok: true; puzzle: Puzzle } | { ok: false; reason: string };

const key = (r: number, c: number) => `${r},${c}`;

interface Cell {
  r: number;
  c: number;
  ch: string;
  dirs: Set<Dir>;
}
interface Placement {
  word: WordEntry;
  r: number;
  c: number;
  dir: Dir;
}

const delta = (dir: Dir) => (dir === 'A' ? { dr: 0, dc: 1 } : { dr: 1, dc: 0 });

class Board {
  cells = new Map<string, Cell>();
  placed: Placement[] = [];
  minR = 0;
  maxR = 0;
  minC = 0;
  maxC = 0;

  /** Retorna o número de cruzamentos (>=1) se a palavra cabe, ou -1. */
  fit(word: string, r: number, c: number, dir: Dir, maxSize: number): number {
    const { dr, dc } = delta(dir);
    const len = word.length;
    const endR = r + dr * (len - 1);
    const endC = c + dc * (len - 1);
    const first = this.placed.length === 0;
    const nMinR = first ? r : Math.min(this.minR, r);
    const nMaxR = first ? endR : Math.max(this.maxR, endR);
    const nMinC = first ? c : Math.min(this.minC, c);
    const nMaxC = first ? endC : Math.max(this.maxC, endC);
    if (nMaxR - nMinR + 1 > maxSize || nMaxC - nMinC + 1 > maxSize) return -1;

    if (this.cells.has(key(r - dr, c - dc))) return -1;
    if (this.cells.has(key(endR + dr, endC + dc))) return -1;

    let crossings = 0;
    for (let i = 0; i < len; i++) {
      const rr = r + dr * i;
      const cc = c + dc * i;
      const ex = this.cells.get(key(rr, cc));
      if (ex) {
        if (ex.ch !== word[i] || ex.dirs.has(dir)) return -1;
        crossings++;
      } else if (this.cells.has(key(rr + dc, cc + dr)) || this.cells.has(key(rr - dc, cc - dr))) {
        return -1;
      }
    }
    return crossings;
  }

  put(p: Placement) {
    const { dr, dc } = delta(p.dir);
    const len = p.word.answer.length;
    for (let i = 0; i < len; i++) {
      const rr = p.r + dr * i;
      const cc = p.c + dc * i;
      const ex = this.cells.get(key(rr, cc));
      if (ex) ex.dirs.add(p.dir);
      else this.cells.set(key(rr, cc), { r: rr, c: cc, ch: p.word.answer[i], dirs: new Set([p.dir]) });
    }
    const endR = p.r + dr * (len - 1);
    const endC = p.c + dc * (len - 1);
    if (this.placed.length === 0) {
      this.minR = p.r;
      this.maxR = endR;
      this.minC = p.c;
      this.maxC = endC;
    } else {
      this.minR = Math.min(this.minR, p.r);
      this.maxR = Math.max(this.maxR, endR);
      this.minC = Math.min(this.minC, p.c);
      this.maxC = Math.max(this.maxC, endC);
    }
    this.placed.push(p);
  }

  area() {
    return (this.maxR - this.minR + 1) * (this.maxC - this.minC + 1);
  }
}

function bestSpot(board: Board, word: WordEntry, maxSize: number, rnd: () => number): Placement | null {
  const w = word.answer;
  let best: Placement | null = null;
  let bestScore = -Infinity;
  for (const dir of ['A', 'D'] as Dir[]) {
    const { dr, dc } = delta(dir);
    for (const cell of board.cells.values()) {
      if (cell.dirs.has(dir)) continue;
      for (let i = 0; i < w.length; i++) {
        if (w[i] !== cell.ch) continue;
        const r = cell.r - dr * i;
        const c = cell.c - dc * i;
        const crossings = board.fit(w, r, c, dir, maxSize);
        if (crossings < 1) continue;
        const score = crossings * 10 + rnd();
        if (score > bestScore) {
          bestScore = score;
          best = { word, r, c, dir };
        }
      }
    }
  }
  return best;
}

function attempt(pool: WordEntry[], opts: GenOptions, rnd: () => number): Board {
  const order = pool
    .map((w) => ({ w, k: w.answer.length + rnd() * 3 }))
    .sort((a, b) => b.k - a.k)
    .map((x) => x.w);
  const board = new Board();
  board.put({ word: order[0], r: 0, c: 0, dir: 'A' });
  let remaining = order.slice(1);
  let progress = true;
  while (progress && board.placed.length < opts.target) {
    progress = false;
    const next: WordEntry[] = [];
    for (const w of remaining) {
      if (board.placed.length >= opts.target) {
        next.push(w);
        continue;
      }
      const spot = bestSpot(board, w, opts.maxSize, rnd);
      if (spot) {
        board.put(spot);
        progress = true;
      } else next.push(w);
    }
    remaining = next;
  }
  return board;
}

function finalize(board: Board): Puzzle {
  const rows = board.maxR - board.minR + 1;
  const cols = board.maxC - board.minC + 1;
  const grid: (string | null)[][] = Array.from({ length: rows }, () => Array<string | null>(cols).fill(null));
  for (const cell of board.cells.values()) grid[cell.r - board.minR][cell.c - board.minC] = cell.ch;

  const raw = board.placed.map((p) => ({
    dir: p.dir,
    row: p.r - board.minR,
    col: p.c - board.minC,
    word: p.word,
  }));
  const startKeys = new Set(raw.map((e) => key(e.row, e.col)));
  const numbers = new Map<string, number>();
  let n = 0;
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++) if (startKeys.has(key(r, c))) numbers.set(key(r, c), ++n);

  const entries: Entry[] = raw
    .map((e) => ({
      id: `${numbers.get(key(e.row, e.col))}${e.dir}`,
      number: numbers.get(key(e.row, e.col))!,
      dir: e.dir,
      row: e.row,
      col: e.col,
      length: e.word.answer.length,
      answer: e.word.answer,
      clue: e.word.clue,
      hint: e.word.hint,
    }))
    .sort((a, b) => a.number - b.number || a.dir.localeCompare(b.dir));
  return { rows, cols, grid, entries };
}

/** Validador independente do gerador: retorna a lista de erros (vazia = grade válida). */
export function validatePuzzle(p: Puzzle): string[] {
  const errors: string[] = [];
  if (p.grid.length !== p.rows || p.grid.some((row) => row.length !== p.cols)) {
    errors.push('dimensões inconsistentes');
    return errors;
  }
  const answers = new Set<string>();
  const covered = new Set<string>();
  for (const e of p.entries) {
    if (answers.has(e.answer)) errors.push(`resposta duplicada: ${e.answer}`);
    answers.add(e.answer);
    if (e.answer.length < 2) errors.push(`resposta curta: ${e.answer}`);
    if (!/^[A-Z]+$/.test(e.answer)) errors.push(`resposta fora de A–Z: ${e.answer}`);
    if (!e.clue.trim()) errors.push(`pista vazia: ${e.answer}`);
    const { dr, dc } = delta(e.dir);
    for (let i = 0; i < e.answer.length; i++) {
      const r = e.row + dr * i;
      const c = e.col + dc * i;
      if (p.grid[r]?.[c] !== e.answer[i]) errors.push(`cruzamento inválido em ${e.id} (${r},${c})`);
      covered.add(key(r, c));
    }
  }
  // Toda sequência de 2+ letras deve ser uma entrada declarada (sem palavras acidentais).
  const declared = new Set(p.entries.map((e) => `${e.dir}:${e.row},${e.col},${e.length}`));
  let runs = 0;
  for (let r = 0; r < p.rows; r++) {
    let c = 0;
    while (c < p.cols) {
      if (p.grid[r][c] === null) {
        c++;
        continue;
      }
      const start = c;
      while (c < p.cols && p.grid[r][c] !== null) c++;
      if (c - start >= 2) {
        runs++;
        if (!declared.has(`A:${r},${start},${c - start}`)) errors.push(`palavra horizontal acidental em (${r},${start})`);
      }
    }
  }
  for (let c = 0; c < p.cols; c++) {
    let r = 0;
    while (r < p.rows) {
      if (p.grid[r][c] === null) {
        r++;
        continue;
      }
      const start = r;
      while (r < p.rows && p.grid[r][c] !== null) r++;
      if (r - start >= 2) {
        runs++;
        if (!declared.has(`D:${start},${c},${r - start}`)) errors.push(`palavra vertical acidental em (${start},${c})`);
      }
    }
  }
  if (runs !== p.entries.length) errors.push(`${runs} sequências para ${p.entries.length} entradas`);

  let letters = 0;
  let first: [number, number] | null = null;
  for (let r = 0; r < p.rows; r++)
    for (let c = 0; c < p.cols; c++)
      if (p.grid[r][c] !== null) {
        letters++;
        first ??= [r, c];
        if (!covered.has(key(r, c))) errors.push(`letra solta em (${r},${c})`);
      }
  if (first) {
    const seen = new Set<string>([key(first[0], first[1])]);
    const stack: [number, number][] = [first];
    while (stack.length) {
      const [r, c] = stack.pop()!;
      for (const [nr, nc] of [[r + 1, c], [r - 1, c], [r, c + 1], [r, c - 1]] as const) {
        if (p.grid[nr]?.[nc] != null && !seen.has(key(nr, nc))) {
          seen.add(key(nr, nc));
          stack.push([nr, nc]);
        }
      }
    }
    if (seen.size !== letters) errors.push('grade desconectada');
  }
  // numeração: sequencial, sem repetição entre cruzamentos diferentes
  const numberAt = new Map<string, number>();
  for (const e of p.entries) {
    const k = key(e.row, e.col);
    if (numberAt.has(k) && numberAt.get(k) !== e.number) errors.push(`numeração inconsistente em ${k}`);
    numberAt.set(k, e.number);
  }
  return errors;
}

export function generateCrossword(pool: WordEntry[], opts: GenOptions): GenResult {
  const usable = pool.filter((w) => w.answer.length <= opts.maxSize);
  if (usable.length < opts.minWords) return { ok: false, reason: 'palavras insuficientes para o tamanho pedido' };
  const attempts = opts.attempts ?? 40;
  let best: Puzzle | null = null;
  for (let i = 0; i < attempts; i++) {
    const rnd = mulberry32(opts.seed + i * 7919);
    const board = attempt(usable, opts, rnd);
    if (board.placed.length < opts.minWords) continue;
    const puzzle = finalize(board);
    if (validatePuzzle(puzzle).length > 0) continue;
    if (!best || puzzle.entries.length > best.entries.length) best = puzzle;
    if (best.entries.length >= opts.target) break;
  }
  return best ? { ok: true, puzzle: best } : { ok: false, reason: 'nenhuma grade válida encontrada nas tentativas' };
}
