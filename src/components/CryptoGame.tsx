import { useEffect, useMemo, useRef, useState } from 'react';
import { buildCryptogram } from '../lib/builders';
import { addResult, getPrefs, load, remove, save, setPrefs } from '../lib/storage';
import { levelName } from '../data/catalog';
import Icon from './Icon';
import Keyboard from './Keyboard';
import Modal from './Modal';
import { DoneCard, HelpMenu, fmt, useTimer } from './shared';

interface Props {
  nivel: number;
  seed: number;
  onNew: () => void;
  onHome: () => void;
}

interface Saved {
  g: Record<number, string>;
  rv: number[];
  el: number;
  h: number;
  d: boolean;
}

const VOWELS = new Set(['A', 'E', 'I', 'O', 'U']);

export default function CryptoGame(props: Props) {
  const [run, setRun] = useState(0);
  return <Board key={`${props.nivel}-${props.seed}-${run}`} {...props} onReset={() => setRun((n) => n + 1)} />;
}

function Board({ nivel, seed, onNew, onHome, onReset }: Props & { onReset: () => void }) {
  const crypto = useMemo(() => buildCryptogram(nivel, seed), [nivel, seed]);
  const gameId = `${nivel}:${seed}`;
  const storeKey = `cripto:cr:${gameId}`;
  const saved = useMemo(() => load<Saved>(storeKey), [storeKey]);

  const cells = useMemo(
    () => crypto.words.flatMap((w, wi) => [...w].map((ch) => ({ ch, num: crypto.code[ch], wi }))),
    [crypto],
  );
  const given = useMemo(() => new Set(crypto.givens), [crypto]);

  const initial = useMemo(() => {
    const g: Record<number, string> = {};
    for (const ch of new Set(crypto.phrase.replace(/ /g, ''))) if (given.has(crypto.code[ch])) g[crypto.code[ch]] = ch;
    return g;
  }, [crypto, given]);

  const [guesses, setGuesses] = useState<Record<number, string>>(saved?.g ?? initial);
  const [revealed, setRevealed] = useState<number[]>(saved?.rv ?? []);
  const [hints, setHints] = useState(saved?.h ?? 0);
  const [done, setDone] = useState(saved?.d ?? false);
  const [wrong, setWrong] = useState<number[]>([]);
  const [idx, setIdx] = useState(() => Math.max(0, cells.findIndex((c) => !given.has(c.num))));
  const idxRef = useRef(idx);
  const go = (i: number) => {
    idxRef.current = i;
    setIdx(i);
  };
  const guessesRef = useRef(guesses);
  const putGuesses = (fn: (p: Record<number, string>) => Record<number, string>) => {
    guessesRef.current = fn(guessesRef.current);
    setGuesses(guessesRef.current);
  };
  const [paused, setPaused] = useState(false);
  const [dialog, setDialog] = useState<null | 'reset' | 'solution'>(null);
  const [hintText, setHintText] = useState<string | null>(null);
  const [status, setStatus] = useState('');
  const [timerOn, setTimerOn] = useState(getPrefs().timer);
  const elapsed = useTimer(saved?.el ?? 0, !done && !paused);

  const locked = useMemo(() => new Set([...given, ...revealed]), [given, revealed]);
  const letterOf = useMemo(() => {
    const m = new Map<number, string>();
    for (const c of cells) m.set(c.num, c.ch);
    return m;
  }, [cells]);
  const cur = cells[idx];

  useEffect(() => {
    save(storeKey, { g: guesses, rv: revealed, el: elapsed, h: hints, d: done } satisfies Saved);
  }, [storeKey, guesses, revealed, hints, done, elapsed]);
  useEffect(() => {
    if (!done) save('cripto:last', { tipo: 'cripto', tema: 'ditados', nivel, seed });
    else remove('cripto:last');
  }, [done, nivel, seed]);

  useEffect(() => {
    if (done) return;
    for (const [num, ch] of letterOf) if (guesses[num] !== ch) return;
    setDone(true);
    addResult({ id: `cr:${gameId}`, tipo: 'cripto', tema: 'ditados', nivel, time: elapsed, hints, date: new Date().toISOString() });
  }, [guesses]);

  const advance = (from: number) => {
    for (let step = 1; step <= cells.length; step++) {
      const i = (from + step) % cells.length;
      if (!guessesRef.current[cells[i].num]) return go(i);
    }
    go(Math.min(from + 1, cells.length - 1));
  };

  const type = (ch: string) => {
    const i = idxRef.current;
    const c = cells[i];
    if (done || paused || !c) return;
    if (!locked.has(c.num)) {
      putGuesses((p) => {
        const n: Record<number, string> = {};
        for (const [num, v] of Object.entries(p)) if (v !== ch || locked.has(Number(num))) n[Number(num)] = v;
        n[c.num] = ch;
        return n;
      });
      setWrong([]);
    }
    advance(i);
  };

  const back = () => {
    const i = idxRef.current;
    const c = cells[i];
    if (done || paused || !c) return;
    if (guessesRef.current[c.num] && !locked.has(c.num)) {
      putGuesses((p) => {
        const n = { ...p };
        delete n[c.num];
        return n;
      });
      setWrong([]);
    } else go(Math.max(0, i - 1));
  };

  const handlers = useRef({ type, back });
  handlers.current = { type, back };
  useEffect(() => {
    if (dialog) return;
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t.closest('summary, details.help, input, textarea')) return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (/^[a-zA-ZÀ-ÿ]$/.test(e.key)) {
        const base = e.key.normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase();
        if (/^[A-Z]$/.test(base)) {
          e.preventDefault();
          handlers.current.type(base);
        }
      } else if (e.key === 'Backspace') {
        e.preventDefault();
        handlers.current.back();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        go(Math.min(cells.length - 1, idxRef.current + 1));
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        go(Math.max(0, idxRef.current - 1));
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [dialog, cells.length]);

  const closeHelp = () => document.querySelector<HTMLDetailsElement>('details.help')?.removeAttribute('open');
  const revealNums = (nums: number[]) => {
    putGuesses((p) => {
      const n = { ...p };
      for (const num of nums) n[num] = letterOf.get(num)!;
      return n;
    });
    setRevealed((p) => [...new Set([...p, ...nums])]);
    setWrong([]);
    setHints((h) => h + 1);
  };
  const helpContext = () => {
    if (!cur) return;
    setHintText(
      `A letra do nº ${cur.num} é ${VOWELS.has(cur.ch) ? 'uma vogal' : 'uma consoante'} e aparece ${cells.filter((c) => c.num === cur.num).length}× na frase.`,
    );
    setHints((h) => h + 1);
    closeHelp();
  };
  const helpLetter = () => {
    if (!cur) return;
    const wordNums = cells.filter((c) => c.wi === cur.wi).map((c) => c.num);
    const target = [cur.num, ...wordNums].find((n) => guesses[n] !== letterOf.get(n));
    if (target !== undefined) revealNums([target]);
    else setStatus('Esta palavra já está correta.');
    closeHelp();
  };
  const helpWord = () => {
    if (!cur) return;
    revealNums([...new Set(cells.filter((c) => c.wi === cur.wi).map((c) => c.num))]);
    closeHelp();
  };

  const check = () => {
    const bad = [...new Set(cells.map((c) => c.num))].filter((n) => guesses[n] && guesses[n] !== letterOf.get(n));
    setWrong(bad);
    setStatus(bad.length ? `${bad.length} número(s) com letra incorreta, marcados com listras.` : 'Tudo certo até aqui!');
  };

  const used = new Set(Object.values(guesses));
  const nums = new Set(cells.map((c) => c.num));
  const filled = [...nums].filter((n) => guesses[n]).length;
  const wrongSet = new Set(wrong);
  const shareText = `Cripto+ · Criptograma · ${levelName(nivel)} · ${fmt(elapsed)} · ${hints} dica(s)`;

  let cursor = 0;
  return (
    <div className="container game">
      <div className="game-head">
        <div>
          <h1 className="game-title">Criptograma</h1>
          <p className="muted">
            Ditados populares · <span className="badge">{levelName(nivel)}</span>
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

      <div className="progress" role="progressbar" aria-valuemin={0} aria-valuemax={nums.size} aria-valuenow={filled} aria-label="Progresso">
        <span style={{ width: `${(filled / nums.size) * 100}%` }} />
      </div>

      {done ? (
        <DoneCard title="Mensagem decifrada!" time={elapsed} hints={hints} shareText={shareText} onAgain={onNew} onHome={onHome} />
      ) : (
        <div className="crypto-layout">
          <p className="muted">
            Cada número esconde sempre a mesma letra. Decifre o ditado popular.
          </p>
          <div className={paused ? 'crypto-board paused' : 'crypto-board'} role="group" aria-label="Frase codificada">
            {crypto.words.map((w, wi) => (
              <div className="cr-word" key={wi}>
                {[...w].map((ch) => {
                  const i = cursor++;
                  const num = crypto.code[ch];
                  const cls = ['cr-cell'];
                  if (i === idx) cls.push('sel');
                  else if (cur && cells[i].num === cur.num) cls.push('same');
                  if (locked.has(num)) cls.push('rev');
                  if (wrongSet.has(num)) cls.push('wrong');
                  return (
                    <button
                      key={i}
                      type="button"
                      className={cls.join(' ')}
                      tabIndex={i === idx ? 0 : -1}
                      onClick={() => go(i)}
                      aria-label={`Palavra ${wi + 1}, número ${num}, ${guesses[num] ? `letra ${guesses[num]}` : 'vazio'}${locked.has(num) ? ', revelada' : ''}${wrongSet.has(num) ? ', incorreta' : ''}`}
                    >
                      <span className="cr-letter">{guesses[num] ?? ''}</span>
                      <span className="cr-num">{num}</span>
                    </button>
                  );
                })}
              </div>
            ))}
          </div>

          {hintText && <p className="hint-box">💡 {hintText}</p>}

          <div className="used" aria-label="Letras já usadas">
            {[...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'].map((l) => (
              <span key={l} className={used.has(l) ? 'used-l on' : 'used-l'}>
                {l}
              </span>
            ))}
          </div>

          <Keyboard onKey={type} onBackspace={back} />

          <div className="actions">
            <HelpMenu
              disabled={paused}
              letterLabel="Revelar uma letra"
              onContext={helpContext}
              onLetter={helpLetter}
              onWord={helpWord}
              onSolution={() => {
                closeHelp();
                setDialog('solution');
              }}
            />
            <button type="button" className="btn btn-ghost" onClick={check}>
              <Icon name="check" /> Verificar
            </button>
            <button type="button" className="btn btn-secondary" onClick={() => setDialog('reset')}>
              <Icon name="refresh" /> Reiniciar
            </button>
          </div>
          <p className="sr-status" role="status">{status}</p>
          <p className="muted small">Dicas usadas: {hints}</p>
        </div>
      )}

      {dialog === 'reset' && (
        <Modal title="Reiniciar o jogo?" onClose={() => setDialog(null)}>
          <p>As letras que você preencheu serão apagadas.</p>
          <div className="modal-actions">
            <button type="button" className="btn btn-ghost" onClick={() => setDialog(null)}>Cancelar</button>
            <button type="button" className="btn btn-danger" onClick={() => { remove(storeKey); onReset(); }}>Reiniciar</button>
          </div>
        </Modal>
      )}
      {dialog === 'solution' && (
        <Modal title="Ver a solução completa?" onClose={() => setDialog(null)}>
          <p>A frase inteira será revelada e contada como ajuda.</p>
          <div className="modal-actions">
            <button type="button" className="btn btn-ghost" onClick={() => setDialog(null)}>Voltar ao jogo</button>
            <button type="button" className="btn btn-primary" onClick={() => { revealNums([...nums]); setDialog(null); }}>Mostrar solução</button>
          </div>
        </Modal>
      )}
    </div>
  );
}
