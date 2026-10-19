import { describe, expect, it } from 'vitest';
import { GIVENS_BY_LEVEL, candidateList, countSolutions, generateSudoku, validateSudoku } from './sudoku';

describe('sudoku', () => {
  it('gera puzzles válidos, com solução única e a quantidade de pistas do nível', () => {
    for (const nivel of [1, 2, 3, 4, 5])
      for (const seed of [1, 2, 3]) {
        const s = generateSudoku(nivel, seed);
        expect(validateSudoku(s), `${nivel}/${seed}`).toEqual([]);
        const givens = s.puzzle.filter(Boolean).length;
        expect(givens).toBeGreaterThanOrEqual(GIVENS_BY_LEVEL[nivel - 1]);
        expect(givens).toBeLessThanOrEqual(GIVENS_BY_LEVEL[nivel - 1] + 4);
      }
  });
  it('é determinístico por semente', () => {
    expect(generateSudoku(3, 99)).toEqual(generateSudoku(3, 99));
    expect(generateSudoku(3, 99).solution).not.toEqual(generateSudoku(3, 100).solution);
  });
  it('detecta solução inválida e puzzle com mais de uma solução', () => {
    const s = generateSudoku(2, 7);
    const broken = { ...s, solution: s.solution.slice() };
    [broken.solution[0], broken.solution[1]] = [broken.solution[1], broken.solution[0]];
    expect(validateSudoku(broken).length).toBeGreaterThan(0);
    expect(countSolutions(new Array(81).fill(0), 2)).toBe(2);
  });
  it('lista candidatos coerentes com a solução', () => {
    const s = generateSudoku(1, 5);
    const i = s.puzzle.indexOf(0);
    expect(candidateList(s.puzzle, i)).toContain(s.solution[i]);
  });
});
