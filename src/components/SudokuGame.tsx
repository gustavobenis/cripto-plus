import { useEffect, useMemo, useRef, useState } from 'react';
import { boxOf, candidateList, colOf, generateSudoku, peersOf, rowOf, type Sudoku } from '../lib/sudoku';
import { addResult, getPrefs, load, remove, save, setPrefs } from '../lib/storage';
import { levelName } from '../data/catalog';
import Icon from './Icon';
import Modal from './Modal';
import { DoneCard, HelpMenu, fmt, useTimer } from './shared';

interface Props {
  nivel: number;
  seed: number;
  tema?: string;
  onNew: () => void;
  onHome: () => void;
  prebuilt?: Sudoku;
}

interface Saved {
  v: number[]; // valores digitados (0 = vazio)
  rv: number[]; // células reveladas por ajuda
  el: number;
  h: number;
  d: boolean;
}

export default function SudokuGame(props: Props) {
  const [run, setRun] = useState(0);
  const sd = useMemo(() => props.prebuilt ?? generateSudoku(props.nivel, props.seed), [props.nivel, props.seed, props.prebuilt]);
  return <Board key={`${props.nivel}-${props.seed}-${run}`} sd={sd} onReset={() => setRun((n) => n + 1)} {...props} />;
}

function Board({ sd, nivel, seed, onNew, onHome, onReset }: Props & { sd: Sudoku; onReset: () => void }) {
  const gameId = `${nivel}:${seed}`;
  const storeKey = `cripto:sd:${gameId}`;
  const saved = useMemo(() => load<Saved>(storeKey), [storeKey]);
  const given = useMemo(() => sd.puzzle.map((v) => v !== 0), [sd]);

  const [values, setValues] = useState<number[]>(saved?.v ?? sd.puzzle.slice());
  const [revealed, setRevealed] = useState<number[]>(saved?.rv ?? []);
  const [hints, setHints] = useState(saved?.h ?? 0);
  const [done, setDone] = useState(saved?.d ?? false);
  const [wrong, setWrong] = useState<number[]>([]);
  const [sel, setSel] = useState(() => Math.max(0, sd.puzzle.indexOf(0)));
  const [paused, setPaused] = useState(false);
  const [dialog, setDialog] = useState<null | 'reset' | 'solution'>(null);
  const [hintText, setHintText] = useState<string | null>(null);
  const [status, setStatus] = useState('');
  const [timerOn, setTimerOn] = useState(getPrefs().timer);
  const elapsed = useTimer(saved?.el ?? 0, !done && !paused);

  const selRef = useRef(sel);
  const move = (i: number) => {
    selRef.current = i;
    setSel(i);
    setHintText(null);
  };
  const valuesRef = useRef(values);
  const put = (fn: (p: number[]) => number[]) => {
    valuesRef.current = fn(valuesRef.current);
    setValues(valuesRef.current);
  };
  const revealedSet = useMemo(() => new Set(revealed), [revealed]);
  const locked = (i: number) => given[i] || revealedSet.has(i);

  useEffect(() => {
    save(storeKey, { v: values, rv: revealed, el: elapsed, h: hints, d: done } satisfies Saved);
  }, [storeKey, values, revealed, hints, done, elapsed]);
  useEffect(() => {
    if (!done) save('cripto:last', { tipo: 'sudoku', tema: 'logica', nivel, seed });
    else remove('cripto:last');
  }, [done, nivel, seed]);
  useEffect(() => {
    if (done) return;
    if (values.some((v, i) => v !== sd.solution[i])) return;
    setDone(true);
    addResult({ id: `sd:${gameId}`, tipo: 'sudoku', tema: 'logica', nivel, time: elapsed, hints, date: new Date().toISOString() });
  }, [values]);

  // conflitos: mesmo dígito repetido em linha, coluna ou bloco
  const conflicts = useMemo(() => {
    const c = new Set<number>();
    values.forEach((v, i) => {
      if (v && peersOf(i).some((p) => values[p] === v)) c.add(i);
    });
    return c;
  }, [values]);

  const enter = (d: number) => {
    const i = selRef.current;
    if (done || paused || locked(i)) return;
    put((p) => p.map((v, k) => (k === i ? d : v)));
    setWrong([]);
  };

  const arrow = (dr: number, dc: number) => {
    const i = selRef.current;
    const r = Math.min(8, Math.max(0, rowOf(i) + dr));
    const c = Math.min(8, Math.max(0, colOf(i) + dc));
    move(r * 9 + c);
  };

  const handlers = useRef({ enter, arrow });
  handlers.current = { enter, arrow };
  useEffect(() => {
    if (dialog) return;
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t.closest('summary, details.help, input, textarea')) return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (/^[1-9]$/.test(e.key)) {
        e.preventDefault();
        handlers.current.enter(Number(e.key));
      } else if (e.key === 'Backspace' || e.key === 'Delete' || e.key === '0') {
        e.preventDefault();
        handlers.current.enter(0);
      } else {
        const d: Record<string, [number, number]> = { ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1] };
        if (d[e.key]) {
          e.preventDefault();
          handlers.current.arrow(...d[e.key]);
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [dialog]);

  const closeHelp = () => document.querySelector<HTMLDetailsElement>('details.help')?.removeAttribute('open');
  const revealCells = (cells: number[]) => {
    put((p) => p.map((v, k) => (cells.includes(k) ? sd.solution[k] : v)));
    setRevealed((r) => [...new Set([...r, ...cells])]);
    setWrong([]);
    setHints((h) => h + 1);
  };
  const helpContext = () => {
    const i = selRef.current;
    if (locked(i)) setHintText('Esta célula já está preenchida. Escolha uma vazia.');
    else {
      const cleared = values.map((v, k) => (k === i ? 0 : v));
      const c = candidateList(cleared, i);
      setHintText(`Na linha ${rowOf(i) + 1}, coluna ${colOf(i) + 1}, só cabem: ${c.join(', ')}.`);
    }
    setHints((h) => h + 1);
    closeHelp();
  };
  const helpCell = () => {
    const i = selRef.current;
    const target = !locked(i) && values[i] !== sd.solution[i] ? i : values.findIndex((v, k) => v !== sd.solution[k]);
    if (target >= 0) revealCells([target]);
    closeHelp();
  };
  const helpBox = () => {
    const b = boxOf(selRef.current);
    const cells = values.map((_, k) => k).filter((k) => boxOf(k) === b && values[k] !== sd.solution[k]);
    if (cells.length) revealCells(cells);
    else setStatus('Este bloco já está correto.');
    closeHelp();
  };
  const check = () => {
    const bad = values.map((v, i) => (v && v !== sd.solution[i] ? i : -1)).filter((i) => i >= 0);
    setWrong(bad);
    setStatus(bad.length ? `${bad.length} célula(s) incorreta(s), marcadas com listras.` : 'Tudo certo até aqui!');
  };

  const filled = values.filter(Boolean).length;
  const shareText = `Cripto+ · Sudoku · ${levelName(nivel)} · ${fmt(elapsed)} · ${hints} dica(s)`;
  const wrongSet = new Set(wrong);
  const selPeers = new Set(peersOf(sel));
  const counts = useMemo(() => {
    const c = Array<number>(10).fill(0);
    for (const v of values) c[v]++;
    return c;
  }, [values]);

  return (
    <div className="container game">
      <div className="game-head">
        <div>
          <h1 className="game-title">Sudoku</h1>
          <p className="muted">Lógica · <span className="badge">{levelName(nivel)}</span></p>
        </div>
        <div className="game-tools">
          {timerOn && <span className="timer"><Icon name="clock" /> {fmt(elapsed)}</span>}
          <button type="button" className="btn btn-ghost icon-btn" onClick={() => setPaused((p) => !p)} aria-label={paused ? 'Retomar' : 'Pausar'} disabled={done}>
            <Icon name={paused ? 'play' : 'pause'} />
          </button>
          <button type="button" className="btn btn-ghost" onClick={() => { const v = !timerOn; setTimerOn(v); setPrefs({ ...getPrefs(), timer: v }); }}>
            {timerOn ? 'Ocultar' : 'Mostrar'} cronômetro
          </button>
        </div>
      </div>
      <div className="progress" role="progressbar" aria-valuemin={0} aria-valuemax={81} aria-valuenow={filled} aria-label="Progresso">
        <span style={{ width: `${(filled / 81) * 100}%` }} />
      </div>

      {done ? (
        <DoneCard title="Sudoku resolvido!" time={elapsed} hints={hints} shareText={shareText} onAgain={onNew} onHome={onHome} />
      ) : (
        <div className="sd-layout">
          <div className={paused ? 'board sd-board paused' : 'board sd-board'}>
            <div className="sd-grid" role="group" aria-label="Grade de Sudoku">
              {values.map((v, i) => {
                const cls = ['sd-cell'];
                if (i === sel) cls.push('sel');
                else if (selPeers.has(i)) cls.push('peer');
                if (given[i]) cls.push('given');
                if (revealedSet.has(i)) cls.push('rev');
                if (conflicts.has(i) || wrongSet.has(i)) cls.push('wrong');
                if (colOf(i) % 3 === 2 && colOf(i) !== 8) cls.push('br');
                if (rowOf(i) % 3 === 2 && rowOf(i) !== 8) cls.push('bb');
                return (
                  <button
                    key={i}
                    type="button"
                    className={cls.join(' ')}
                    tabIndex={i === sel ? 0 : -1}
                    onClick={() => move(i)}
                    aria-label={`Linha ${rowOf(i) + 1}, coluna ${colOf(i) + 1}, ${v ? `número ${v}` : 'vazia'}${given[i] ? ', pista fixa' : ''}${revealedSet.has(i) ? ', revelada' : ''}${conflicts.has(i) || wrongSet.has(i) ? ', conflito' : ''}`}
                  >
                    <span className="ch">{v || ''}</span>
                  </button>
                );
              })}
            </div>
            {paused && (
              <div className="paused-cover">
                <button type="button" className="btn btn-primary" onClick={() => setPaused(false)}><Icon name="play" /> Retomar</button>
              </div>
            )}
          </div>

          <div className="sd-side">
            {hintText && <p className="hint-box">💡 {hintText}</p>}
            <div className="numpad" role="group" aria-label="Teclado numérico">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((d) => (
                <button key={d} type="button" className="vkey" disabled={counts[d] >= 9} onClick={() => enter(d)} aria-label={`Número ${d}`}>
                  {d}
                </button>
              ))}
              <button type="button" className="vkey numpad-erase" onClick={() => enter(0)} aria-label="Apagar">
                <Icon name="backspace" />
              </button>
            </div>
            <div className="actions">
              <HelpMenu
                disabled={paused}
                letterLabel="Revelar esta célula"
                wordLabel="Revelar o bloco 3×3"
                wordDesc="Preenche as células do bloco da célula selecionada."
                onContext={helpContext}
                onLetter={helpCell}
                onWord={helpBox}
                onSolution={() => { closeHelp(); setDialog('solution'); }}
              />
              <button type="button" className="btn btn-ghost" onClick={check}><Icon name="check" /> Verificar</button>
              <button type="button" className="btn btn-secondary" onClick={() => setDialog('reset')}><Icon name="refresh" /> Reiniciar</button>
            </div>
            <p className="sr-status" role="status">{status}</p>
            <p className="muted small">Cada linha, coluna e bloco 3×3 deve ter os números de 1 a 9. Dicas usadas: {hints}</p>
          </div>
        </div>
      )}

      {dialog === 'reset' && (
        <Modal title="Reiniciar o jogo?" onClose={() => setDialog(null)}>
          <p>Os números que você digitou serão apagados.</p>
          <div className="modal-actions">
            <button type="button" className="btn btn-ghost" onClick={() => setDialog(null)}>Cancelar</button>
            <button type="button" className="btn btn-danger" onClick={() => { remove(storeKey); onReset(); }}>Reiniciar</button>
          </div>
        </Modal>
      )}
      {dialog === 'solution' && (
        <Modal title="Ver a solução completa?" onClose={() => setDialog(null)}>
          <p>Todas as células serão reveladas e contadas como ajuda.</p>
          <div className="modal-actions">
            <button type="button" className="btn btn-ghost" onClick={() => setDialog(null)}>Voltar ao jogo</button>
            <button type="button" className="btn btn-primary" onClick={() => { revealCells(values.map((_, k) => k).filter((k) => values[k] !== sd.solution[k])); setDialog(null); }}>
              Mostrar solução
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
