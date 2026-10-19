import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { BANK } from '../data/words';
import { PHRASE_RECORDS } from '../data/phrases';
import { THEMES } from '../data/catalog';
import { checkContent } from './contentCheck';
import { buildDaily, dailyParams, validateDaily, type DailyPack } from './daily';

describe('conteúdo (content/*.json)', () => {
  it('passa na validação editorial', () => {
    expect(checkContent(BANK, PHRASE_RECORDS, THEMES.map((t) => t.id))).toEqual([]);
  });
  it('rejeita pista que revela a resposta, duplicata e formato inválido', () => {
    const rec = { clue: 'Pista ok aqui', hint: 'Dica ok aqui', tier: 1, source: 'original', verifiedAt: '2026-01-01' };
    const errors = checkContent(
      {
        historia: [
          { ...rec, answer: 'CASTELO', clue: 'O castelo medieval' },
          { ...rec, answer: 'ROMA' },
          { ...rec, answer: 'ROMA' },
          { ...rec, answer: 'Ação' },
          { ...rec, answer: 'NILO', source: '' },
        ],
      },
      [{ text: 'tem acento' }],
      ['historia'],
    );
    const text = errors.join('\n');
    expect(text).toContain('revela a resposta');
    expect(text).toContain('duplicada');
    expect(text).toContain('A–Z');
    expect(text).toContain('falta source');
    expect(text).toContain('frase inválida');
  });
});

describe('desafio diário', () => {
  it('gera pacotes válidos e determinísticos para 28 dias seguidos', () => {
    for (let i = 0; i < 28; i++) {
      const date = new Date(Date.UTC(2026, 10, 1 + i)).toISOString().slice(0, 10);
      const pack = buildDaily(date);
      expect(validateDaily(pack), date).toEqual([]);
      expect(JSON.stringify(buildDaily(date))).toBe(JSON.stringify(pack));
    }
  });
  it('dificuldade sobe ao longo da semana', () => {
    expect(dailyParams('2026-10-19').nivel).toBe(1); // segunda
    expect(dailyParams('2026-10-24').nivel).toBe(5); // sábado
  });
  it('pacotes publicados em public/daily continuam válidos', () => {
    const files = readdirSync('public/daily').filter((f) => /^\d{4}-\d{2}-\d{2}\.json$/.test(f));
    expect(files.length).toBeGreaterThan(0);
    for (const f of files) {
      const pack = JSON.parse(readFileSync(`public/daily/${f}`, 'utf8')) as DailyPack;
      expect(pack.date).toBe(f.slice(0, 10));
      expect(validateDaily(pack), f).toEqual([]);
    }
  });
});
