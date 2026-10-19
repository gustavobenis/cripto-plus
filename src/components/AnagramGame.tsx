import { useEffect, useMemo, useRef, useState } from 'react';
import { buildAnagrams } from '../lib/builders';
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
  prebuilt?: ReturnType<typeof buildAnagrams>;
}

interface Saved {
  s: string[]; // respostas já resolvidas
  as: string[]; // resolvidas com ajuda
  el: number;
  h: number;
  d: boolean;
}

export default function AnagramGame(props: Props) {
  const [run, setRun] = useState(0);
  const items = useMemo(() => props.prebuilt ?? buildAnagrams(props.tema, props.nivel, props.seed), [props.tema, props.nivel, props.seed, props.prebuilt]);
  return <Board key={`${props.tema}-${props.nivel}-${props.seed}-${run}`} items={items} onReset={() => setRun((n) => n + 1)} {...props} />;
}

function Board({ items, tema, nivel, seed, onNew, onHome, onReset }: Props & { items: ReturnType<typeof buildAnagrams>; onReset: () => void }) {
  const gameId = `${tema}:${nivel}:${seed}`;
  const storeKey = `cripto:an:${gameId}`;
  const saved = useMemo(() => load<Saved>(storeKey), [storeKey]);
  const showClue = nivel <= 3; // níveis altos: a pista só aparece pela ajuda

  const [solved, setSolved] = useState<string[]>(saved?.s ?? []);
  const [assisted, setAssisted] = useState<string[]>(saved?.as ?? []);
  const [hints, setHints] = useState(saved?.h ?? 0);
  const [done, setDone] = useState(saved?.d ?? false);
  const [answer, setAnswer] = useState('');
  const [bad, setBad] = useState(false);
  const [paused, setPaused] = useState(false);
  const [dialog, setDialog] = useState<null | 'reset' | 'solution'>(null);
  const [hintText, setHintText] = useState<string | null>(null);
  const [status, setStatus] = useState('');
  const [timerOn, setTimerOn] = useState(getPrefs().timer);
  const elapsed = useTimer(saved?.el ?? 0, !done && !paused);

  const solvedSet = useMemo(() => new Set(solved), [solved]);
  const idx = items.findIndex((i) => !solvedSet.has(i.answer));
  const cur = idx === -1 ? null : items[idx];

  // Sempre que a palavra muda, zera a resposta em andamento e a dica
  useEffect(() => {
    setAnswer('');
    setBad(false);
    setHintText(null);
  }, [cur?.answer]);

  useEffect(() => {
    save(storeKey, { s: solved, as: assisted, el: elapsed, h: hints, d: done } satisfies Saved);
  }, [storeKey, solved, assisted, hints, done, elapsed]);
  useEffect(() => {
    if (!done) save('cripto:last', { tipo: 'anagrama', tema, nivel, seed });
    else remove('cripto:last');
  }, [done, tema, nivel, seed]);
  useEffect(() => {
    if (done || solved.length < items.length) return;
    setDone(true);
    addResult({ id: `an:${gameId}`, tipo: 'anagrama', tema, nivel, time: elapsed, hints, date: new Date().toISOString() });
  }, [solved]);

  // tiles usados: cada letra digitada consome a primeira peça livre com essa letra
  const used = useMemo(() => {
    const u: boolean[] = cur ? cur.letters.map(() => false) : [];
    if (!cur) return u;
    for (const ch of answer) {
      const i = cur.letters.findIndex((l, j) => l === ch && !u[j]);
      if (i >= 0) u[i] = true;
    }
    return u;
  }, [cur, answer]);

  const answerRef = useRef(answer);
  answerRef.current = answer;

  const finish = (word: string, help: boolean) => {
    setSolved((p) => (p.includes(word) ? p : [...p, word]));
    if (help) setAssisted((p) => [...new Set([...p, word])]);
  };

  const push = (ch: string) => {
    if (!cur || done || paused) return;
    const a = answerRef.current;
    if (a.length >= cur.answer.length) return;
    const free = cur.letters.some((l, j) => l === ch && !used[j]);
    if (!free) return;
    const next = a + ch;
    answerRef.current = next;
    setAnswer(next);
    setBad(false);
    if (next.length === cur.answer.length) {
      if (next === cur.answer) {
        finish(cur.answer, false);
        setStatus('Correto!');
      } else {
        setBad(true);
        setStatus('Ainda não é essa palavra. Apague e tente de novo.');
      }
    }
  };
  const pop = () => {
    if (done || paused) return;
    const next = answerRef.current.slice(0, -1);
    answerRef.current = next;
    setAnswer(next);
    setBad(false);
  };

  const handlers = useRef({ push, pop });
  handlers.current = { push, pop };
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
          handlers.current.push(base);
        }
      } else if (e.key === 'Backspace') {
        e.preventDefault();
        handlers.current.pop();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [dialog]);

  const closeHelp = () => document.querySelector<HTMLDetailsElement>('details.help')?.removeAttribute('open');
  const helpContext = () => {
    if (!cur) return;
    setHintText(showClue ? cur.hint : cur.clue);
    setHints((h) => h + 1);
    closeHelp();
  };
  const helpLetter = () => {
    if (!cur) return;
    // preenche a próxima letra correta; se a tentativa atual divergir, recomeça do prefixo correto
    let ok = 0;
    while (ok < answer.length && answer[ok] === cur.answer[ok]) ok++;
    const next = cur.answer.slice(0, ok + 1);
    answerRef.current = next;
    setAnswer(next);
    setBad(false);
    setHints((h) => h + 1);
    if (next === cur.answer) finish(cur.answer, true);
    closeHelp();
  };
  const helpWord = () => {
    if (!cur) return;
    setHints((h) => h + 1);
    finish(cur.answer, true);
    closeHelp();
  };

  const shareText = `Cripto+ · Palavras Embaralhadas · ${themeName(tema)} · ${levelName(nivel)} · ${fmt(elapsed)} · ${hints} dica(s)`;

  return (
    <div className="container game">
      <div className="game-head">
        <div>
          <h1 className="game-title">Palavras Embaralhadas</h1>
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
      <div className="progress" role="progressbar" aria-valuemin={0} aria-valuemax={items.length} aria-valuenow={solved.length} aria-label="Palavras resolvidas">
        <span style={{ width: `${(solved.length / items.length) * 100}%` }} />
      </div>

      {done || !cur ? (
        <DoneCard title="Todas as palavras organizadas!" time={elapsed} hints={hints} shareText={shareText} onAgain={onNew} onHome={onHome} />
      ) : (
        <div className={paused ? 'an-layout paused' : 'an-layout'}>
          <p className="an-count">Palavra {idx + 1} de {items.length}</p>
          <div className="current-clue" aria-live="polite">
            {showClue ? <>{cur.clue} <span className="muted">({cur.answer.length} letras)</span></> : <span className="muted">Sem pista: {cur.answer.length} letras. Use a ajuda se precisar.</span>}
            {hintText && <p className="hint-box">💡 {hintText}</p>}
          </div>

          <div className={bad ? 'an-slots bad' : 'an-slots'} aria-label="Sua resposta">
            {[...cur.answer].map((_, i) => (
              <span key={i} className={answer[i] ? 'an-slot filled' : 'an-slot'}>{answer[i] ?? ''}</span>
            ))}
          </div>

          <div className="an-tiles" role="group" aria-label="Letras disponíveis">
            {cur.letters.map((l, i) => (
              <button key={i} type="button" className="an-tile" disabled={used[i]} onClick={() => push(l)} aria-label={`Letra ${l}`}>
                {l}
              </button>
            ))}
          </div>

          <div className="actions">
            <button type="button" className="btn btn-ghost" onClick={pop} disabled={!answer}><Icon name="backspace" /> Apagar</button>
            <HelpMenu
              disabled={paused}
              letterLabel="Revelar uma letra"
              onContext={helpContext}
              onLetter={helpLetter}
              onWord={helpWord}
              onSolution={() => { closeHelp(); setDialog('solution'); }}
            />
            <button type="button" className="btn btn-secondary" onClick={() => setDialog('reset')}><Icon name="refresh" /> Reiniciar</button>
          </div>
          {assisted.length > 0 && <p className="muted small">Resolvidas com ajuda: {assisted.length}</p>}
          <p className="sr-status" role="status">{status}</p>
          <p className="muted small">Dicas usadas: {hints}</p>
        </div>
      )}

      {dialog === 'reset' && (
        <Modal title="Reiniciar o jogo?" onClose={() => setDialog(null)}>
          <p>O progresso desta partida será apagado.</p>
          <div className="modal-actions">
            <button type="button" className="btn btn-ghost" onClick={() => setDialog(null)}>Cancelar</button>
            <button type="button" className="btn btn-danger" onClick={() => { remove(storeKey); onReset(); }}>Reiniciar</button>
          </div>
        </Modal>
      )}
      {dialog === 'solution' && (
        <Modal title="Ver a solução completa?" onClose={() => setDialog(null)}>
          <p>Todas as palavras restantes serão reveladas e contadas como ajuda.</p>
          <div className="modal-actions">
            <button type="button" className="btn btn-ghost" onClick={() => setDialog(null)}>Voltar ao jogo</button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => {
                const rest = items.filter((i) => !solvedSet.has(i.answer)).map((i) => i.answer);
                setSolved((p) => [...p, ...rest]);
                setAssisted((p) => [...new Set([...p, ...rest])]);
                setHints((h) => h + 1);
                setDialog(null);
              }}
            >
              Mostrar solução
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
