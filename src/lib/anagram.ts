import { shuffle } from './rng';
import type { WordEntry } from './crossword';

export interface AnagramItem {
  answer: string;
  letters: string[]; // embaralhadas
  clue: string;
  hint: string;
}

export function scramble(answer: string, rnd: () => number): string[] {
  const chars = [...answer];
  if (new Set(chars).size < 2) return chars;
  for (let i = 0; i < 20; i++) {
    const s = shuffle(chars, rnd);
    if (s.join('') !== answer) return s;
  }
  return chars.slice().reverse(); // palíndromos curtos: reverso difere do original
}

export function makeAnagrams(pool: WordEntry[], rnd: () => number): AnagramItem[] {
  return pool.map((w) => ({ answer: w.answer, letters: scramble(w.answer, rnd), clue: w.clue, hint: w.hint }));
}
