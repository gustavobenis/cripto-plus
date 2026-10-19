import { describe, expect, it } from 'vitest';
import { BANK, ALL_WORDS } from '../data/words';
import { PHRASES } from '../data/phrases';
import { LEVELS, THEMES } from '../data/catalog';
import { buildCrossword, buildCryptogram } from './builders';
import { validatePuzzle, type Puzzle } from './crossword';
import { normalize } from './normalize';

describe('banco de palavras', () => {
  it('respostas estão normalizadas e sem duplicatas', () => {
    const seen = new Set<string>();
    for (const w of ALL_WORDS) {
      expect(w.answer).toBe(normalize(w.answer));
      expect(w.clue.length).toBeGreaterThan(5);
      expect(w.hint.length).toBeGreaterThan(5);
      expect(seen.has(w.answer), w.answer).toBe(false);
      seen.add(w.answer);
    }
    expect(Object.keys(BANK).length).toBeGreaterThanOrEqual(6);
  });
  it('normalize remove acentos e cedilha', () => {
    expect(normalize('Ação-Não ç')).toBe('ACAONAOC');
  });
});

describe('gerador de palavras cruzadas', () => {
  it('gera grades válidas para todo tema × nível × várias sementes', () => {
    for (const t of THEMES)
      for (const l of LEVELS)
        for (const seed of [1, 2, 3, 20260101]) {
          const p = buildCrossword(t.id, l.id, seed);
          expect(validatePuzzle(p), `${t.id}/${l.id}/${seed}`).toEqual([]);
          expect(p.rows).toBeLessThanOrEqual(l.size);
          expect(p.cols).toBeLessThanOrEqual(l.size);
          expect(p.entries.length).toBeGreaterThanOrEqual(4);
        }
  });
  it('é determinístico para a mesma semente', () => {
    expect(buildCrossword('variado', 3, 77)).toEqual(buildCrossword('variado', 3, 77));
  });
  it('sementes diferentes variam a grade', () => {
    const a = JSON.stringify(buildCrossword('variado', 3, 1).grid);
    const b = JSON.stringify(buildCrossword('variado', 3, 2).grid);
    expect(a).not.toBe(b);
  });
});

describe('validador', () => {
  const good = buildCrossword('natureza', 2, 5);
  it('detecta letra trocada em cruzamento', () => {
    const bad: Puzzle = JSON.parse(JSON.stringify(good));
    const e = bad.entries[0];
    bad.grid[e.row][e.col] = e.answer[0] === 'Z' ? 'Y' : 'Z';
    expect(validatePuzzle(bad).length).toBeGreaterThan(0);
  });
  it('detecta palavra acidental', () => {
    const bad: Puzzle = JSON.parse(JSON.stringify(good));
    // adiciona letra encostada em uma palavra existente
    outer: for (let r = 0; r < bad.rows; r++)
      for (let c = 0; c < bad.cols; c++)
        if (bad.grid[r][c] === null && (bad.grid[r][c - 1] ?? null) !== null) {
          bad.grid[r][c] = 'X';
          break outer;
        }
    expect(validatePuzzle(bad).length).toBeGreaterThan(0);
  });
  it('detecta grade desconectada', () => {
    const bad: Puzzle = { rows: 1, cols: 6, grid: [['A', 'B', null, null, 'C', 'D']], entries: [
      { id: '1A', number: 1, dir: 'A', row: 0, col: 0, length: 2, answer: 'AB', clue: 'x', hint: 'y' },
      { id: '2A', number: 2, dir: 'A', row: 0, col: 4, length: 2, answer: 'CD', clue: 'x', hint: 'y' },
    ] };
    expect(validatePuzzle(bad)).toContain('grade desconectada');
  });
});

describe('criptograma', () => {
  it('mapeia letras para números únicos e frases em A–Z', () => {
    for (const p of PHRASES) expect(p).toBe(p.toUpperCase().replace(/[^A-Z ]/g, ''));
    for (const l of LEVELS) {
      const c = buildCryptogram(l.id, 9);
      expect(new Set(Object.values(c.code)).size).toBe(26);
      expect(c.givens.length).toBeLessThanOrEqual(l.givens);
      expect(c.words.join(' ')).toBe(c.phrase);
    }
  });
});

import { buildAnagrams, buildWordSearch } from './builders';
import { segment, validateWordSearch } from './wordsearch';

describe('caça-palavras', () => {
  it('gera grades válidas para todo tema × nível', () => {
    for (const t of THEMES)
      for (const l of LEVELS)
        for (const seed of [1, 2, 3]) {
          const ws = buildWordSearch(t.id, l.id, seed);
          expect(validateWordSearch(ws), `${t.id}/${l.id}/${seed}`).toEqual([]);
          expect(ws.words.length).toBeGreaterThanOrEqual(3);
        }
  });
  it('segment valida linhas retas', () => {
    expect(segment(0, 0, 0, 3)?.length).toBe(4);
    expect(segment(0, 0, 2, 2)?.length).toBe(3);
    expect(segment(0, 0, 1, 2)).toBeNull();
    expect(segment(1, 1, 1, 1)).toBeNull();
  });
});

describe('anagramas', () => {
  it('embaralha sem repetir a resposta e preserva as letras', () => {
    for (const t of THEMES)
      for (const l of LEVELS) {
        const items = buildAnagrams(t.id, l.id, 4);
        expect(items.length).toBeGreaterThanOrEqual(3);
        for (const it of items) {
          expect(it.letters.join('')).not.toBe(it.answer);
          expect([...it.letters].sort().join('')).toBe([...it.answer].sort().join(''));
        }
      }
  });
});
