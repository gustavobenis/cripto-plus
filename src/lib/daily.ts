import { THEMES } from '../data/catalog';
import { PHRASES } from '../data/phrases';
import { buildAnagrams, buildCrossword, buildCryptogram, buildWordSearch, type Cryptogram } from './builders';
import { validatePuzzle, type Puzzle } from './crossword';
import type { AnagramItem } from './anagram';
import { validateWordSearch, type WordSearch } from './wordsearch';
import { generateSudoku, validateSudoku, type Sudoku } from './sudoku';

export interface DailyPack {
  date: string; // AAAA-MM-DD
  version: 1;
  seed: number;
  tema: string;
  nivel: number;
  games: {
    cruzadas: Puzzle;
    cripto: Cryptogram;
    caca: WordSearch;
    anagrama: AnagramItem[];
    sudoku?: Sudoku; // pacotes anteriores a 2026-10-19 não têm
  };
}

// Dificuldade por dia da semana (domingo = 0): começa fácil e sobe até o sábado.
export const LEVEL_BY_WEEKDAY = [3, 1, 2, 3, 4, 4, 5];

export const localDate = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export function dailyParams(date: string) {
  const [y, m, d] = date.split('-').map(Number);
  const utc = Date.UTC(y, m - 1, d);
  const themes = THEMES.filter((t) => t.id !== 'variado');
  return {
    seed: y * 10000 + m * 100 + d,
    tema: themes[Math.floor(utc / 86400000) % themes.length].id,
    nivel: LEVEL_BY_WEEKDAY[new Date(utc).getUTCDay()],
  };
}

export function buildDaily(date: string): DailyPack {
  const { seed, tema, nivel } = dailyParams(date);
  return {
    date,
    version: 1,
    seed,
    tema,
    nivel,
    games: {
      cruzadas: buildCrossword(tema, nivel, seed),
      cripto: buildCryptogram(nivel, seed),
      caca: buildWordSearch(tema, nivel, seed),
      anagrama: buildAnagrams(tema, nivel, seed),
      sudoku: generateSudoku(nivel, seed),
    },
  };
}

/** Validação do pacote publicado: nada vai ao ar se algum jogo estiver inconsistente. */
export function validateDaily(p: DailyPack): string[] {
  const errors: string[] = [];
  if (!/^\d{4}-\d{2}-\d{2}$/.test(p.date)) errors.push('data inválida');
  errors.push(...validatePuzzle(p.games.cruzadas).map((e) => `cruzadas: ${e}`));
  errors.push(...validateWordSearch(p.games.caca).map((e) => `caça-palavras: ${e}`));
  const c = p.games.cripto;
  if (!PHRASES.includes(c.phrase)) errors.push('criptograma: frase fora do banco');
  if (new Set(Object.values(c.code)).size !== 26) errors.push('criptograma: códigos repetidos');
  if (p.games.anagrama.length < 3) errors.push('anagramas: poucas palavras');
  for (const a of p.games.anagrama) {
    if (a.letters.join('') === a.answer) errors.push(`anagramas: ${a.answer} não foi embaralhada`);
    if ([...a.letters].sort().join('') !== [...a.answer].sort().join('')) errors.push(`anagramas: letras de ${a.answer} não conferem`);
  }
  if (p.games.sudoku) errors.push(...validateSudoku(p.games.sudoku).map((e) => `sudoku: ${e}`));
  return errors;
}
