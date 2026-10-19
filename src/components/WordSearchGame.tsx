import { useEffect, useMemo, useState } from 'react';
import { buildWordSearch } from '../lib/builders';
import { segment, type WSWord } from '../lib/wordsearch';
import { addResult, getPrefs, load, remove, save, setPrefs } from '../lib/storage';
import { levelName, themeName } from '../data/catalog';
import Icon from './Icon';
import Modal from './Modal';
import { DoneCard, HelpMenu, fmt, useTimer } from './shared';

interface Props {
  tema: string;
  nivel: number;
  seed: number;
  onNew: () => void;
  onHome: () => void;
  prebuilt?: ReturnType<typeof buildWordSearch>;
}

interface Saved {
  f: string[]; // palavras encontradas
  as: string[]; // encontradas com ajuda
  el: number;
  h: number;
  d: boolean;
}

const k = (r: number, c: number) => `${r},${c}`;
const cellsOfWord = (w: WSWord): [number, number][] =>
  Array.from({ length: w.answer.length }, (_, i): [number, number] => [w.row + w.dr * i, w.col + w.dc * i]);

export default function WordSearchGame(props: Props) {
  const [run, setRun] = useState(0);
  const ws = useMemo(() => {
    try {
      return props.prebuilt ?? buildWordSearch(props.tema, props.nivel, props.seed);
    } catch {
      return null;
    }
  }, [props.tema, props.nivel, props.seed, props.prebuilt]);
  if (!ws)
    return (
      <div className="container notice">
        <h2>Não foi possível montar este caça-palavras</h2>
        <button className="btn btn-primary" onClick={props.onNew}>Gerar outro</button>
      </div>
    );
  return <Board key={`${props.tema}-${props.nivel}-${props.seed}-${run}`} ws={ws} onReset={() => setRun((n) => n + 1)} {...props} />;
}

function Board({ ws, tema, nivel, seed, onNew, onHome, onReset }: Props & { ws: ReturnType<typeof buildWordSearch>; onReset: () => void }) {
  const gameId = `${tema}:${nivel}:${seed}`;
  const storeKey = `cripto:ca:${gameId}`;
  const saved = useMemo(() => load<Saved>(storeKey), [storeKey]);
  const showClues = nivel >= 4; // níveis altos: a lista mostra pistas em vez das palavras

  const [found, setFound] = useState<string[]>(saved?.f ?? []);
  const [assisted, setAssisted] = useState<string[]>(saved?.as ?? []);
  const [hints, setHints] = useState(saved?.h ?? 0);
  const [done, setDone] = useState(saved?.d ?? false);
  const [start, setStart] = useState<[number, number] | null>(null);
  const [focus, setFocus] = useState<[number, number]>([0, 0]);
  const [flash, setFlash] = useState<[number, number][] | null>(null);
  const [mark, setMark] = useState<string | null>(null); // célula inicial destacada pela ajuda
  const [paused, setPaused] = useState(false);
  const [dialog, setDialog] = useState<null | 'reset' | 'solution'>(null);
  const [hintText, setHintText] = useState<string | null>(null);
  const [status, setStatus] = useState('');
  const [timerOn, setTimerOn] = useState(getPrefs().timer);
  const elapsed = useTimer(saved?.el ?? 0, !done && !paused);

  const foundSet = useMemo(() => new Set(found), [found]);
  const cellWord = useMemo(() => {
    const m = new Map<string, number>();
    ws.words.forEach((w, i) => {
      if (foundSet.has(w.answer)) for (const [r, c] of cellsOfWord(w)) m.set(k(r, c), i);
    });
    return m;
  }, [ws, foundSet]);

  useEffect(() => {
    save(storeKey, { f: found, as: assisted, el: elapsed, h: hints, d: done } satisfies Saved);
  }, [storeKey, found, assisted, hints, done, elapsed]);
  useEffect(() => {
    if (!done) save('cripto:last', { tipo: 'caca', tema, nivel, seed });
    else remove('cripto:last');
  }, [done, tema, nivel, seed]);
  useEffect(() => {
    if (done || found.length < ws.words.length) return;
    setDone(true);
    addResult({ id: `ca:${gameId}`, tipo: 'caca', tema, nivel, time: elapsed, hints, date: new Date().toISOString() });
  }, [found]);

  const letterAt = (r: number, c: number) => ws.grid[r][c];

  const tap = (r: number, c: number) => {
    if (done || paused) return;
    setFocus([r, c]);
    setMark(null);
    if (!start) {
      setStart([r, c]);
      return;
    }
    if (start[0] === r && start[1] === c) {
      setStart(null);
      return;
    }
    const seg = segment(start[0], start[1], r, c);
    if (!seg) {
      setStart([r, c]); // não é linha reta: recomeça a seleção daqui
      return;
    }
    const text = seg.map(([rr, cc]) => letterAt(rr, cc)).join('');
    const rev = [...text].reverse().join('');
    const hit = ws.words.find((w) => !foundSet.has(w.answer) && (w.answer === text || w.answer === rev));
    setStart(null);
    if (hit) {
      setFound((p) => [...p, hit.answer]);
      setHintText(null);
      setStatus(`Encontrou ${hit.answer}!`);
    } else {
      setFlash(seg);
      setStatus('Essa sequência não é uma das palavras.');
      window.setTimeout(() => setFlash(null), 450);
    }
  };

  const onGridKey = (e: React.KeyboardEvent) => {
    const d: Record<string, [number, number]> = { ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1] };
    const v = d[e.key];
    if (!v) return;
    e.preventDefault();
    const r = Math.min(ws.size - 1, Math.max(0, focus[0] + v[0]));
    const c = Math.min(ws.size - 1, Math.max(0, focus[1] + v[1]));
    setFocus([r, c]);
    document.getElementById(`ws-${r}-${c}`)?.focus();
  };

  const remaining = ws.words.filter((w) => !foundSet.has(w.answer));
  const closeHelp = () => document.querySelector<HTMLDetailsElement>('details.help')?.removeAttribute('open');
  const helpContext = () => {
    const w = remaining[0];
    if (!w) return;
    const dirName = w.dr === 0 ? 'na horizontal' : w.dc === 0 ? 'na vertical' : 'na diagonal';
    setHintText(`${showClues ? 'Uma das palavras' : w.answer} está ${dirName}${w.dc < 0 || w.dr < 0 ? ' (de trás para frente)' : ''}.`);
    setHints((h) => h + 1);
    closeHelp();
  };
  const helpLetter = () => {
    const w = remaining[0];
    if (!w) return;
    setMark(k(w.row, w.col));
    setFocus([w.row, w.col]);
    setHints((h) => h + 1);
    setStatus(`A primeira letra de uma palavra restante foi destacada na linha ${w.row + 1}, coluna ${w.col + 1}.`);
    closeHelp();
  };
  const reveal = (list: WSWord[]) => {
    setFound((p) => [...new Set([...p, ...list.map((w) => w.answer)])]);
    setAssisted((p) => [...new Set([...p, ...list.map((w) => w.answer)])]);
    setHints((h) => h + 1);
  };
  const helpWord = () => {
    if (remaining[0]) reveal([remaining[0]]);
    closeHelp();
  };

  const shareText = `Cripto+ · Caça-Palavras · ${themeName(tema)} · ${levelName(nivel)} · ${fmt(elapsed)} · ${hints} dica(s)`;
  const sel = start ? k(start[0], start[1]) : null;
  const flashSet = new Set((flash ?? []).map(([r, c]) => k(r, c)));

  return (
    <div className="container game">
      <div className="game-head">
        <div>
          <h1 className="game-title">Caça-Palavras</h1>
          <p className="muted">Tema: {themeName(tema)} · <span className="badge">{levelName(nivel)}</span></p>
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
      <div className="progress" role="progressbar" aria-valuemin={0} aria-valuemax={ws.words.length} aria-valuenow={found.length} aria-label="Palavras encontradas">
        <span style={{ width: `${(found.length / ws.words.length) * 100}%` }} />
      </div>

      {done ? (
        <DoneCard title="Todas as palavras encontradas!" time={elapsed} hints={hints} shareText={shareText} onAgain={onNew} onHome={onHome} />
      ) : (
        <div className="game-layout">
          <div className="board-col">
            <div className={paused ? 'board ws-board paused' : 'board ws-board'}>
              <div
                className="grid ws-grid"
                role="group"
                aria-label="Grade de letras"
                onKeyDown={onGridKey}
                style={{ gridTemplateColumns: `repeat(${ws.size}, 1fr)`, minWidth: `${ws.size * 28}px` }}
              >
                {ws.grid.flatMap((row, r) =>
                  row.map((ch, c) => {
                    const key = k(r, c);
                    const wi = cellWord.get(key);
                    const cls = ['cell', 'ws-cell'];
                    if (wi !== undefined) cls.push('found', `w${wi % 6}`);
                    if (sel === key) cls.push('sel');
                    if (mark === key) cls.push('mark');
                    if (flashSet.has(key)) cls.push('wrong');
                    return (
                      <button
                        key={key}
                        id={`ws-${r}-${c}`}
                        type="button"
                        className={cls.join(' ')}
                        tabIndex={focus[0] === r && focus[1] === c ? 0 : -1}
                        onClick={() => tap(r, c)}
                        aria-label={`Linha ${r + 1}, coluna ${c + 1}, letra ${ch}${wi !== undefined ? ', parte de palavra encontrada' : ''}${sel === key ? ', início da seleção' : ''}`}
                        aria-pressed={sel === key}
                      >
                        <span className="ch">{ch}</span>
                      </button>
                    );
                  }),
                )}
              </div>
              {paused && (
                <div className="paused-cover">
                  <button type="button" className="btn btn-primary" onClick={() => setPaused(false)}><Icon name="play" /> Retomar</button>
                </div>
              )}
            </div>
            <p className="muted small">Toque na primeira e na última letra de uma palavra (horizontal, vertical ou diagonal).</p>
            {hintText && <p className="hint-box">💡 {hintText}</p>}
            <div className="actions">
              <HelpMenu
                disabled={paused}
                letterLabel="Mostrar a primeira letra"
                onContext={helpContext}
                onLetter={helpLetter}
                onWord={helpWord}
                onSolution={() => { closeHelp(); setDialog('solution'); }}
              />
              <button type="button" className="btn btn-secondary" onClick={() => setDialog('reset')}><Icon name="refresh" /> Reiniciar</button>
            </div>
            <p className="sr-status" role="status">{status}</p>
          </div>

          <aside className="clues-col" aria-label="Palavras a encontrar">
            <h3>{showClues ? 'Pistas' : 'Palavras'} ({found.length}/{ws.words.length})</h3>
            <ul className="ws-list">
              {ws.words.map((w, i) => {
                const ok = foundSet.has(w.answer);
                return (
                  <li key={w.answer} className={ok ? `ws-word ok w${i % 6}` : 'ws-word'}>
                    {ok ? <Icon name="check" size={16} /> : null}
                    <span>{ok || !showClues ? w.answer : w.clue}</span>
                    {ok && assisted.includes(w.answer) && <span className="badge">ajuda</span>}
                    {ok && showClues && <span className="muted small"> — {w.clue}</span>}
                  </li>
                );
              })}
            </ul>
            <p className="muted small">Dicas usadas: {hints}</p>
          </aside>
        </div>
      )}

      {dialog === 'reset' && (
        <Modal title="Reiniciar o jogo?" onClose={() => setDialog(null)}>
          <p>As palavras encontradas serão desmarcadas.</p>
          <div className="modal-actions">
            <button type="button" className="btn btn-ghost" onClick={() => setDialog(null)}>Cancelar</button>
            <button type="button" className="btn btn-danger" onClick={() => { remove(storeKey); onReset(); }}>Reiniciar</button>
          </div>
        </Modal>
      )}
      {dialog === 'solution' && (
        <Modal title="Ver a solução completa?" onClose={() => setDialog(null)}>
          <p>Todas as palavras serão reveladas e contadas como ajuda.</p>
          <div className="modal-actions">
            <button type="button" className="btn btn-ghost" onClick={() => setDialog(null)}>Voltar ao jogo</button>
            <button type="button" className="btn btn-primary" onClick={() => { reveal(remaining); setDialog(null); }}>Mostrar solução</button>
          </div>
        </Modal>
      )}
    </div>
  );
}
