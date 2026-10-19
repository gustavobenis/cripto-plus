import { describe, expect, it } from 'vitest';
import { PENDING_SOURCE, buildPrompt, buildReport, filterSuggestions, parseSuggestions } from './aiWords';
import { checkContent } from './contentCheck';

const THEMES = ['historia', 'natureza'];
const bank = { historia: [{ answer: 'ROMA' }], natureza: [{ answer: 'ONCA' }] };

describe('sugestões de IA', () => {
  it('o prompt cita regras e as respostas existentes', () => {
    const p = buildPrompt('História', ['ROMA', 'ONCA'], 12);
    expect(p).toContain('12 palavras NOVAS');
    expect(p).toContain('ROMA, ONCA');
    expect(p).toContain('NUNCA copie');
  });

  it('extrai o array JSON mesmo com cerca de código e normaliza a resposta', () => {
    const out = parseSuggestions('Claro!\n```json\n[{"answer":"Ação","clue":" Pista aqui ","hint":"Dica aqui","tier":"2"}]\n```');
    expect(out).toEqual([{ answer: 'ACAO', clue: 'Pista aqui', hint: 'Dica aqui', tier: 2 }]);
  });

  it('rejeita resposta sem JSON', () => {
    expect(() => parseSuggestions('desculpe, não consigo')).toThrow();
  });

  it('aceita as boas e descarta duplicata, vazamento, formato e excesso', () => {
    const good = (answer: string, extra = {}) => ({ answer, clue: 'Uma pista original e longa o bastante', hint: 'Uma dica curta aqui', tier: 1, ...extra });
    const res = filterSuggestions(
      bank,
      'natureza',
      [
        good('GIRAFA'),
        good('ROMA'), // já existe em outro tema
        good('GIRAFA'), // repetida no lote
        good('CAMELO', { clue: 'Animal que se chama camelo no deserto' }), // vaza a resposta
        good('AB'), // curta demais
        good('TUCANO', { tier: 9 }), // tier inválido
        good('LEOPARDO'),
        good('PANTERA'), // acima do limite
      ],
      '2026-10-19',
      THEMES,
      2,
    );
    expect(res.accepted.map((a) => a.answer)).toEqual(['GIRAFA', 'LEOPARDO']);
    expect(res.accepted[0].source).toBe(PENDING_SOURCE);
    expect(res.rejected.map((r) => r.answer).sort()).toEqual(['AB', 'CAMELO', 'GIRAFA', 'PANTERA', 'ROMA', 'TUCANO'].sort());
  });

  it('o validador estrito bloqueia item não revisado; o modo permissivo (usado pelo robô) aceita', () => {
    const rec = { answer: 'GIRAFA', clue: 'Animal de pescoço muito comprido', hint: 'Come folhas de árvores altas', tier: 1, source: PENDING_SOURCE, verifiedAt: '2026-10-19' };
    expect(checkContent({ natureza: [rec] }, [], THEMES).join()).toContain('não revisada');
    expect(checkContent({ natureza: [rec] }, [], THEMES, { allowPending: true })).toEqual([]);
    expect(checkContent({ natureza: [{ ...rec, source: 'Enciclopédia Britannica' }] }, [], THEMES)).toEqual([]);
  });

  it('o relatório traz a tabela e o checklist de revisão', () => {
    const r = buildReport('natureza', { accepted: [{ answer: 'GIRAFA', clue: 'c', hint: 'h', tier: 1, source: PENDING_SOURCE, verifiedAt: '2026-10-19' }], rejected: [{ answer: 'ROMA', reason: 'dup' }] }, 'modelo-x');
    expect(r).toContain('| GIRAFA |');
    expect(r).toContain('Conferi **cada fato**');
    expect(r).toContain('ROMA');
  });
});
