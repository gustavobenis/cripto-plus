import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Dir, Entry, Puzzle } from '../lib/crossword';
import { buildCrossword } from '../lib/builders';
import { addResult, getPrefs, load, remove, save, setPrefs } from '../lib/storage';
import { levelName, themeName } from '../data/catalog';
import Icon from './Icon';
import Keyboard from './Keyboard';
import Modal from './Modal';
import { DoneCard, HelpMenu, fmt, useTimer } from './shared';

interface Props {
  tema: string;
  nivel: number;
  seed: number;
  onNew: () => void;
  onHome: () => void;
}

interface Saved {
  a: Record<string, string>;
  rv: string[];
  el: number;
  h: number;
  d: boolean;
}

const k = (r: number, c: number) => `${r},${c}`;
const other = (d: Dir): Dir => (d === 'A' ? 'D' : 'A');

export default function CrosswordGame(props: Props) {
  const [run, setRun] = useState(0);
  const puzzle = useMemo(() => {
    try {
      return buildCrossword(props.tema, props.nivel, props.seed);
    } catch {
      return null;
    }
  }, [props.tema, props.nivel, props.seed]);

  if (!puzzle)
    return (
      <div className="container notice">
        <h2>Não foi possível montar esta grade</h2>
        <p>Tente outro tema ou nível.</p>
        <button className="btn btn-primary" onClick={props.onNew}>
          Gerar outra
        </button>
      </div>
    );
  return (
    <Board key={`${props.tema}-${props.nivel}-${props.seed}-${run}`} puzzle={puzzle} onReset={() => setRun((n) => n + 1)} {...props} />
  );
}

function Board({ puzzle, tema, nivel, seed, onNew, onHome, onReset }: Props & { puzzle: Puzzle; onReset: () => void }) {
  const gameId = `${tema}:${nivel}:${seed}`;
  const storeKey = `cripto:cw:${gameId}`;
  const saved = useMemo(() => load<Saved>(storeKey), [storeKey]);

  const cellMap = useMemo(() => {
    const m = new Map<string, { A?: Entry; D?: Entry }>();
    for (const e of puzzle.entries)
      for (let i = 0; i < e.length; i++) {
        const key = e.dir === 'A' ? k(e.row, e.col + i) : k(e.row + i, e.col);
        m.set(key, { ...m.get(key), [e.dir]: e });
      }
    return m;
  }, [puzzle]);
  const numbers = useMemo(() => new Map(puzzle.entries.map((e) => [k(e.row, e.col), e.number])), [puzzle]);
  const total = cellMap.size;

  const cellsOf = useCallback((e: Entry): [number, number][] => {
    return Array.from({ length: e.length }, (_, i): [number, number] =>
      e.dir === 'A' ? [e.row, e.col + i] : [e.row + i, e.col],
    );
  }, []);

  const [letters, setLetters] = useState<Record<string, string>>(saved?.a ?? {});
  const [revealed, setRevealed] = useState<string[]>(saved?.rv ?? []);
  const [hints, setHints] = useState(saved?.h ?? 0);
  const [done, setDone] = useState(saved?.d ?? false);
  const [wrong, setWrong] = useState<string[]>([]);
  const [paused, setPaused] = useState(false);
  const [dialog, setDialog] = useState<null | 'reset' | 'solution'>(null);
  const [hintText, setHintText] = useState<string | null>(null);
  const [status, setStatus] = useState('');
  const [timerOn, setTimerOn] = useState(getPrefs().timer);

  const firstEntry = puzzle.entries[0];
  // cursor espelhado em ref: digitação rápida lê sempre a posição mais recente
  const [cursor, setCursor] = useState({ r: firstEntry.row, c: firstEntry.col, dir: firstEntry.dir as Dir });
  const cursorRef = useRef(cursor);
  const move = (r: number, c: number, d: Dir) => {
    cursorRef.current = { r, c, dir: d };
    setCursor(cursorRef.current);
  };
  const sel = cursor;
  const dir = cursor.dir;
  const lettersRef = useRef(letters);
  const putLetters = (fn: (p: Record<string, string>) => Record<string, string>) => {
    lettersRef.current = fn(lettersRef.current);
    setLetters(lettersRef.current);
  };

  const elapsed = useTimer(saved?.el ?? 0, !done && !paused);
  const revealedSet = useMemo(() => new Set(revealed), [revealed]);

  const at = cellMap.get(k(sel.r, sel.c));
  const active = at?.[dir] ?? at?.[other(dir)];
  const activeDir = active?.dir ?? dir;

  const solution = (r: number, c: number) => puzzle.grid[r][c] as string;
  const filled = useMemo(() => Object.values(letters).filter(Boolean).length, [letters]);

  // salvamento automático
  useEffect(() => {
    save(storeKey, { a: letters, rv: revealed, el: elapsed, h: hints, d: done } satisfies Saved);
  }, [storeKey, letters, revealed, hints, done, elapsed]);
  useEffect(() => {
    if (!done) save('cripto:last', { tipo: 'cruzadas', tema, nivel, seed });
    else remove('cripto:last');
  }, [done, tema, nivel, seed]);

  // conclusão
  useEffect(() => {
    if (done) return;
    for (const key of cellMap.keys()) {
      const [r, c] = key.split(',').map(Number);
      if (letters[key] !== solution(r, c)) return;
    }
    setDone(true);
    addResult({ id: `cw:${gameId}`, tipo: 'cruzadas', tema, nivel, time: elapsed, hints, date: new Date().toISOString() });
  }, [letters]);

  const activeAt = (r: number, c: number, d: Dir) => {
    const cell = cellMap.get(k(r, c));
    return cell?.[d] ?? cell?.[other(d)];
  };

  const select = (r: number, c: number) => {
    const cell = cellMap.get(k(r, c));
    if (!cell) return;
    const cur = cursorRef.current;
    let d = cur.dir;
    if (cur.r === r && cur.c === c) {
      if (cell.A && cell.D) d = other(d);
    } else if (!cell[d]) d = other(d);
    move(r, c, d);
    setHintText(null);
  };

  const type = (ch: string) => {
    const cur = cursorRef.current;
    const act = activeAt(cur.r, cur.c, cur.dir);
    if (done || paused || !act) return;
    const key = k(cur.r, cur.c);
    if (!revealedSet.has(key)) {
      putLetters((p) => ({ ...p, [key]: ch }));
      setWrong([]);
    }
    const cells = cellsOf(act);
    const i = cells.findIndex(([r, c]) => r === cur.r && c === cur.c);
    const next = cells[i + 1];
    if (next) move(next[0], next[1], act.dir);
  };

  const back = () => {
    const cur = cursorRef.current;
    const act = activeAt(cur.r, cur.c, cur.dir);
    if (done || paused || !act) return;
    const key = k(cur.r, cur.c);
    if (lettersRef.current[key] && !revealedSet.has(key)) {
      putLetters((p) => ({ ...p, [key]: '' }));
      setWrong([]);
      return;
    }
    const cells = cellsOf(act);
    const i = cells.findIndex(([r, c]) => r === cur.r && c === cur.c);
    const prev = cells[i - 1];
    if (prev) {
      const pk = k(prev[0], prev[1]);
      if (!revealedSet.has(pk)) putLetters((p) => ({ ...p, [pk]: '' }));
      move(prev[0], prev[1], act.dir);
    }
  };

  const arrow = (dr: number, dc: number) => {
    const cur = cursorRef.current;
    let r = cur.r + dr;
    let c = cur.c + dc;
    while (r >= 0 && c >= 0 && r < puzzle.rows && c < puzzle.cols) {
      const cell = cellMap.get(k(r, c));
      if (cell) {
        const want: Dir = dr === 0 ? 'A' : 'D';
        move(r, c, cell[want] ? want : other(want));
        return;
      }
      r += dr;
      c += dc;
    }
  };

  const jump = (delta: number) => {
    const cur = cursorRef.current;
    const act = activeAt(cur.r, cur.c, cur.dir);
    const list = puzzle.entries;
    const idx = Math.max(0, list.findIndex((e) => e.id === act?.id));
    const e = list[(idx + delta + list.length) % list.length];
    const cells = cellsOf(e);
    const target = cells.find(([r, c]) => !lettersRef.current[k(r, c)]) ?? cells[0];
    move(target[0], target[1], e.dir);
  };

  // teclado físico
  const handlers = useRef({ type, back, arrow, jump, select });
  handlers.current = { type, back, arrow, jump, select };
  useEffect(() => {
    if (dialog) return;
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t.closest('summary, details.help, input, textarea')) return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const h = handlers.current;
      if (/^[a-zA-ZÀ-ÿ]$/.test(e.key)) {
        const base = e.key.normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase();
        if (/^[A-Z]$/.test(base)) {
          e.preventDefault();
          h.type(base);
        }
        return;
      }
      switch (e.key) {
        case 'Backspace':
          e.preventDefault();
          h.back();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          h.arrow(0, -1);
          break;
        case 'ArrowRight':
          e.preventDefault();
          h.arrow(0, 1);
          break;
        case 'ArrowUp':
          e.preventDefault();
          h.arrow(-1, 0);
          break;
        case 'ArrowDown':
          e.preventDefault();
          h.arrow(1, 0);
          break;
        case 'Tab':
          e.preventDefault();
          h.jump(e.shiftKey ? -1 : 1);
          break;
        case ' ':
        case 'Enter':
          if (t.tagName === 'BUTTON' && !t.classList.contains('cell')) return;
          e.preventDefault();
          h.select(cursorRef.current.r, cursorRef.current.c);
          break;
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [dialog]);

  // ajuda
  const reveal = (cells: [number, number][]) => {
    putLetters((p) => {
      const n = { ...p };
      for (const [r, c] of cells) n[k(r, c)] = solution(r, c);
      return n;
    });
    setRevealed((p) => [...new Set([...p, ...cells.map(([r, c]) => k(r, c))])]);
    setWrong([]);
    setHints((h) => h + 1);
  };
  const closeHelp = () => document.querySelector<HTMLDetailsElement>('details.help')?.removeAttribute('open');
  const helpContext = () => {
    if (!active) return;
    setHintText(active.hint);
    setHints((h) => h + 1);
    closeHelp();
  };
  const helpLetter = () => {
    if (!active) return;
    const cell = cellsOf(active).find(([r, c]) => letters[k(r, c)] !== solution(r, c));
    if (cell) reveal([cell]);
    else setStatus('Esta palavra já está correta.');
    closeHelp();
  };
  const helpWord = () => {
    if (!active) return;
    reveal(cellsOf(active));
    closeHelp();
  };
  const fullSolution = () => {
    reveal([...cellMap.keys()].map((key) => key.split(',').map(Number) as [number, number]));
    setDialog(null);
  };

  const check = () => {
    const bad = [...cellMap.keys()].filter((key) => {
      const [r, c] = key.split(',').map(Number);
      return letters[key] && letters[key] !== solution(r, c);
    });
    setWrong(bad);
    setStatus(bad.length ? `${bad.length} letra(s) incorreta(s), marcadas com listras.` : 'Tudo certo até aqui!');
  };

  const reset = () => {
    remove(storeKey);
    onReset();
  };

  const wrongSet = new Set(wrong);
  const activeKeys = new Set(active ? cellsOf(active).map(([r, c]) => k(r, c)) : []);
  const across = puzzle.entries.filter((e) => e.dir === 'A');
  const down = puzzle.entries.filter((e) => e.dir === 'D');
  const [tab, setTab] = useState<Dir>('A');

  const shareText = `Cripto+ · Palavras Cruzadas · ${themeName(tema)} · ${levelName(nivel)} · ${fmt(elapsed)} · ${hints} dica(s)`;

  const clueList = (list: Entry[]) => (
    <ol className="clues">
      {list.map((e) => (
        <li key={e.id}>
          <button
            type="button"
            className={e.id === active?.id ? 'clue current' : 'clue'}
            onClick={() => {
              const target = cellsOf(e).find(([r, c]) => !letters[k(r, c)]) ?? cellsOf(e)[0];
              move(target[0], target[1], e.dir);
              setHintText(null);
            }}
          >
            <b>{e.number}.</b> {e.clue} <span className="muted">({e.length})</span>
          </button>
        </li>
      ))}
    </ol>
  );

  return (
    <div className="container game">
      <div className="game-head">
        <div>
          <h1 className="game-title">Palavras Cruzadas</h1>
          <p className="muted">
            Tema: {themeName(tema)} · <span className="badge">{levelName(nivel)}</span>
          </p>
        </div>
        <div className="game-tools">
          {timerOn && (
            <span className="timer" aria-label={`Tempo ${fmt(elapsed)}`}>
              <Icon name="clock" /> {fmt(elapsed)}
            </span>
          )}
          <button type="button" className="btn btn-ghost icon-btn" onClick={() => setPaused((p) => !p)} aria-label={paused ? 'Retomar' : 'Pausar'} disabled={done}>
            <Icon name={paused ? 'play' : 'pause'} />
          </button>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => {
              const v = !timerOn;
              setTimerOn(v);
              setPrefs({ ...getPrefs(), timer: v });
            }}
          >
            {timerOn ? 'Ocultar' : 'Mostrar'} cronômetro
          </button>
        </div>
      </div>

      <div className="progress" role="progressbar" aria-valuemin={0} aria-valuemax={total} aria-valuenow={filled} aria-label="Progresso">
        <span style={{ width: `${Math.min(100, (filled / total) * 100)}%` }} />
      </div>

      {done ? (
        <DoneCard title="Desafio concluído!" time={elapsed} hints={hints} shareText={shareText} onAgain={onNew} onHome={onHome} />
      ) : (
        <div className="game-layout">
          <div className="board-col">
            <div className={paused ? 'board paused' : 'board'}>
              <div
                className="grid"
                role="group"
                aria-label="Grade de palavras cruzadas"
                style={{ gridTemplateColumns: `repeat(${puzzle.cols}, 1fr)`, aspectRatio: `${puzzle.cols} / ${puzzle.rows}`, ['--n' as string]: Math.max(puzzle.cols, 1) }}
              >
                {puzzle.grid.flatMap((row, r) =>
                  row.map((cell, c) => {
                    const key = k(r, c);
                    if (cell === null) return <div className="cell block" key={key} aria-hidden="true" />;
                    const isSel = sel.r === r && sel.c === c;
                    const cls = ['cell'];
                    if (isSel) cls.push('sel');
                    else if (activeKeys.has(key)) cls.push('act');
                    if (wrongSet.has(key)) cls.push('wrong');
                    if (revealedSet.has(key)) cls.push('rev');
                    const num = numbers.get(key);
                    return (
                      <button
                        type="button"
                        key={key}
                        className={cls.join(' ')}
                        tabIndex={isSel ? 0 : -1}
                        onClick={() => select(r, c)}
                        aria-label={`Linha ${r + 1}, coluna ${c + 1}${num ? `, pista ${num}` : ''}, ${letters[key] ? `letra ${letters[key]}` : 'vazia'}${revealedSet.has(key) ? ', revelada' : ''}${wrongSet.has(key) ? ', incorreta' : ''}`}
                      >
                        {num && <span className="num">{num}</span>}
                        <span className="ch">{letters[key] ?? ''}</span>
                      </button>
                    );
                  }),
                )}
              </div>
              {paused && (
                <div className="paused-cover">
                  <button type="button" className="btn btn-primary" onClick={() => setPaused(false)}>
                    <Icon name="play" /> Retomar
                  </button>
                </div>
              )}
            </div>

            <div className="current-clue" aria-live="polite">
              {active ? (
                <>
                  <b>
                    {active.number}
                    {activeDir === 'A' ? ' Horizontal' : ' Vertical'}
                  </b>{' '}
                  {active.clue} <span className="muted">({active.length})</span>
                  {hintText && <p className="hint-box">💡 {hintText}</p>}
                </>
              ) : null}
            </div>

            <Keyboard onKey={type} onBackspace={back} />

            <div className="actions">
              <HelpMenu disabled={paused} onContext={helpContext} onLetter={helpLetter} onWord={helpWord} onSolution={() => { closeHelp(); setDialog('solution'); }} />
              <button type="button" className="btn btn-ghost" onClick={check}>
                <Icon name="check" /> Verificar
              </button>
              <button type="button" className="btn btn-secondary" onClick={() => setDialog('reset')}>
                <Icon name="refresh" /> Reiniciar
              </button>
            </div>
            <p className="sr-status" role="status">{status}</p>
          </div>

          <aside className="clues-col" aria-label="Pistas">
            <div className="tabs" role="tablist">
              <button type="button" role="tab" aria-selected={tab === 'A'} onClick={() => setTab('A')}>Horizontais</button>
              <button type="button" role="tab" aria-selected={tab === 'D'} onClick={() => setTab('D')}>Verticais</button>
            </div>
            <div className="clues-wrap">
              <div className={tab === 'A' ? 'clues-pane show' : 'clues-pane'}>
                <h3>Horizontais</h3>
                {clueList(across)}
              </div>
              <div className={tab === 'D' ? 'clues-pane show' : 'clues-pane'}>
                <h3>Verticais</h3>
                {clueList(down)}
              </div>
            </div>
            <p className="muted small">Dicas usadas: {hints}</p>
          </aside>
        </div>
      )}

      {dialog === 'reset' && (
        <Modal title="Reiniciar o jogo?" onClose={() => setDialog(null)}>
          <p>Todas as letras preenchidas serão apagadas.</p>
          <div className="modal-actions">
            <button type="button" className="btn btn-ghost" onClick={() => setDialog(null)}>Cancelar</button>
            <button type="button" className="btn btn-danger" onClick={reset}>Reiniciar</button>
          </div>
        </Modal>
      )}
      {dialog === 'solution' && (
        <Modal title="Ver a solução completa?" onClose={() => setDialog(null)}>
          <p>Todas as respostas serão reveladas e contadas como ajuda.</p>
          <div className="modal-actions">
            <button type="button" className="btn btn-ghost" onClick={() => setDialog(null)}>Voltar ao jogo</button>
            <button type="button" className="btn btn-primary" onClick={fullSolution}>Mostrar solução</button>
          </div>
        </Modal>
      )}
    </div>
  );
}
