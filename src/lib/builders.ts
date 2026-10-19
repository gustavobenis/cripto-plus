import { ALL_WORDS, BANK } from '../data/words';
import { LEVELS } from '../data/catalog';
import { PHRASES } from '../data/phrases';
import { generateCrossword, type Puzzle, type WordEntry } from './crossword';
import { mulberry32, shuffle } from './rng';
import { DIRS_BY_LEVEL, generateWordSearch, validateWordSearch, type WordSearch } from './wordsearch';
import { makeAnagrams, type AnagramItem } from './anagram';

export function buildCrossword(tema: string, nivel: number, seed: number): Puzzle {
  const level = LEVELS.find((l) => l.id === nivel) ?? LEVELS[2];
  const base = tema === 'variado' ? ALL_WORDS : (BANK[tema] ?? ALL_WORDS);
  for (let round = 0; round < 6; round++) {
    const s = seed + round * 104729;
    const rnd = mulberry32(s);
    const pool: WordEntry[] = base
      .filter((w) => w.answer.length <= level.size)
      .map((w) => ({ w, k: Math.abs(w.tier - level.tier) + rnd() * 1.2 }))
      .sort((a, b) => a.k - b.k)
      .slice(0, level.words * 2 + 4)
      .map((x) => x.w);
    const res = generateCrossword(pool, {
      maxSize: level.size,
      target: level.words,
      minWords: Math.max(4, level.words - 3),
      seed: s,
    });
    if (res.ok) return res.puzzle;
  }
  throw new Error('Não foi possível gerar a grade');
}

export interface Cryptogram {
  phrase: string;
  words: string[];
  code: Record<string, number>; // letra -> número
  givens: number[]; // números já revelados
}

export function buildCryptogram(nivel: number, seed: number): Cryptogram {
  const level = LEVELS.find((l) => l.id === nivel) ?? LEVELS[2];
  const rnd = mulberry32(seed);
  const targetLen = [18, 24, 28, 36, 42][level.id - 1];
  const sorted = PHRASES.map((p) => ({ p, d: Math.abs(p.replace(/ /g, '').length - targetLen) + rnd() * 6 }))
    .sort((a, b) => a.d - b.d)
    .map((x) => x.p);
  const phrase = sorted[0];
  const nums = shuffle(Array.from({ length: 26 }, (_, i) => i + 1), rnd);
  const code: Record<string, number> = {};
  for (let i = 0; i < 26; i++) code[String.fromCharCode(65 + i)] = nums[i];

  const freq = new Map<string, number>();
  for (const ch of phrase) if (ch !== ' ') freq.set(ch, (freq.get(ch) ?? 0) + 1);
  const givens = [...freq.entries()]
    .sort((a, b) => b[1] - a[1] || rnd() - 0.5)
    .slice(0, level.givens)
    .map(([ch]) => code[ch]);
  return { phrase, words: phrase.split(' '), code, givens };
}

function pickWords(tema: string, nivel: number, rnd: () => number, count: number, minLen: number, maxLen: number): WordEntry[] {
  const level = LEVELS.find((l) => l.id === nivel) ?? LEVELS[2];
  const base = tema === 'variado' ? ALL_WORDS : (BANK[tema] ?? ALL_WORDS);
  return base
    .filter((w) => w.answer.length >= minLen && w.answer.length <= maxLen)
    .map((w) => ({ w, k: Math.abs(w.tier - level.tier) + rnd() * 1.2 }))
    .sort((a, b) => a.k - b.k)
    .slice(0, count)
    .map((x) => x.w);
}

const WS_SIZE = [8, 10, 12, 14, 16];
const WS_WORDS = [5, 7, 9, 11, 13];

export function buildWordSearch(tema: string, nivel: number, seed: number): WordSearch {
  const idx = Math.min(5, Math.max(1, nivel)) - 1;
  for (let round = 0; round < 6; round++) {
    const rnd = mulberry32(seed + round * 104729);
    const pool = pickWords(tema, nivel, rnd, WS_WORDS[idx] + 6, 3, WS_SIZE[idx]);
    const ws = generateWordSearch(pool, WS_SIZE[idx], DIRS_BY_LEVEL[idx + 1], rnd, WS_WORDS[idx]);
    if (ws && ws.words.length >= Math.max(3, WS_WORDS[idx] - 2) && validateWordSearch(ws).length === 0) return ws;
  }
  throw new Error('Não foi possível gerar o caça-palavras');
}

const AN_COUNT = [4, 5, 6, 7, 8];
const AN_MAXLEN = [6, 8, 10, 12, 14];

export function buildAnagrams(tema: string, nivel: number, seed: number): AnagramItem[] {
  const idx = Math.min(5, Math.max(1, nivel)) - 1;
  const rnd = mulberry32(seed);
  const pool = shuffle(pickWords(tema, nivel, rnd, AN_COUNT[idx] * 2, 4, AN_MAXLEN[idx]), rnd).slice(0, AN_COUNT[idx]);
  return makeAnagrams(pool, rnd);
}
