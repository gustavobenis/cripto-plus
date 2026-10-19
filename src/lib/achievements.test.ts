import { describe, expect, it } from 'vitest';
import { statsFrom } from './achievements';
import type { Result } from './storage';

const r = (date: string, over: Partial<Result> = {}): Result => ({
  id: date + Math.random(),
  tipo: 'cruzadas',
  tema: 'historia',
  nivel: 3,
  time: 400,
  hints: 1,
  date: `${date}T15:00:00`,
  ...over,
});

describe('estatísticas e conquistas', () => {
  it('calcula sequência atual e melhor sequência', () => {
    const s = statsFrom([r('2026-10-15'), r('2026-10-16'), r('2026-10-17'), r('2026-10-19'), r('2026-10-18')], '2026-10-19');
    expect(s.streak).toBe(5);
    expect(s.best).toBe(5);
  });
  it('mantém a sequência se ainda não jogou hoje, mas zera após um dia perdido', () => {
    expect(statsFrom([r('2026-10-17'), r('2026-10-18')], '2026-10-19').streak).toBe(2);
    expect(statsFrom([r('2026-10-16'), r('2026-10-17')], '2026-10-19').streak).toBe(0);
  });
  it('várias partidas no mesmo dia contam uma vez', () => {
    expect(statsFrom([r('2026-10-19'), r('2026-10-19')], '2026-10-19').streak).toBe(1);
  });
  it('patente e conquistas', () => {
    const many = Array.from({ length: 10 }, (_, i) => r(`2026-10-${String(1 + i).padStart(2, '0')}`, { hints: 0 }));
    const s = statsFrom(many, '2026-10-10');
    expect(s.rank.name).toBe('Craque');
    expect(s.rank.next?.name).toBe('Especialista');
    const done = Object.fromEntries(s.achievements.map((a) => [a.id, a.done]));
    expect(done).toMatchObject({ first: true, nohelp: true, ten: true, streak3: true, streak7: true, all: false, expert: false });
  });
  it('sem resultados', () => {
    const s = statsFrom([], '2026-10-19');
    expect(s).toMatchObject({ total: 0, streak: 0, best: 0 });
    expect(s.rank.name).toBe('Novato');
  });
});
