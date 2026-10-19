import { useEffect, useState } from 'react';
import Icon from './Icon';

export const fmt = (s: number) => {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const mm = String(m).padStart(2, '0');
  const ss = String(sec).padStart(2, '0');
  return h ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
};

export function useTimer(initial: number, running: boolean) {
  const [elapsed, setElapsed] = useState(initial);
  useEffect(() => {
    if (!running) return;
    let id = 0;
    const start = () => {
      id = window.setInterval(() => setElapsed((e) => e + 1), 1000);
    };
    const onVis = () => {
      window.clearInterval(id);
      if (!document.hidden) start();
    };
    if (!document.hidden) start();
    document.addEventListener('visibilitychange', onVis);
    return () => {
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [running]);
  return elapsed;
}

interface HelpProps {
  disabled?: boolean;
  onContext: () => void;
  onLetter: () => void;
  onWord: () => void;
  onSolution: () => void;
  letterLabel?: string;
  wordLabel?: string;
  wordDesc?: string;
}

export function HelpMenu({ disabled, onContext, onLetter, onWord, onSolution, letterLabel = 'Revelar uma letra', wordLabel = 'Revelar a palavra', wordDesc = 'Preenche a resposta da pista selecionada.' }: HelpProps) {
  return (
    <details className="help">
      <summary className="btn btn-ghost">
        <Icon name="bulb" /> Precisa de ajuda?
      </summary>
      <div className="help-menu">
        <p className="muted">Escolha quanto quer descobrir.</p>
        <button type="button" disabled={disabled} onClick={onContext}>
          <strong>Dica contextual</strong>
          <span>Uma informação extra, sem revelar a resposta.</span>
        </button>
        <button type="button" disabled={disabled} onClick={onLetter}>
          <strong>{letterLabel}</strong>
          <span>Preenche apenas a próxima letra correta.</span>
        </button>
        <button type="button" disabled={disabled} onClick={onWord}>
          <strong>{wordLabel}</strong>
          <span>{wordDesc}</span>
        </button>
        <button type="button" disabled={disabled} onClick={onSolution}>
          <strong>Ver solução completa</strong>
          <span>Mostra todas as respostas (pede confirmação).</span>
        </button>
      </div>
    </details>
  );
}

interface DoneProps {
  title: string;
  time: number;
  hints: number;
  shareText: string;
  onAgain: () => void;
  onHome: () => void;
}

export function DoneCard({ title, time, hints, shareText, onAgain, onHome }: DoneProps) {
  const [copied, setCopied] = useState(false);
  const share = async () => {
    try {
      await navigator.clipboard.writeText(shareText);
      setCopied(true);
    } catch {
      window.prompt('Copie o resultado:', shareText);
    }
  };
  return (
    <section className="done" aria-live="polite">
      <div className="done-trophy" aria-hidden="true">🏆</div>
      <h2>{title}</h2>
      <dl className="done-stats">
        <div>
          <dt>Tempo</dt>
          <dd>{fmt(time)}</dd>
        </div>
        <div>
          <dt>Dicas usadas</dt>
          <dd>{hints}</dd>
        </div>
      </dl>
      <div className="done-actions">
        <button type="button" className="btn btn-accent" onClick={onAgain}>
          Novo desafio <Icon name="arrow" />
        </button>
        <button type="button" className="btn btn-ghost" onClick={share}>
          <Icon name="share" /> {copied ? 'Copiado!' : 'Compartilhar resultado'}
        </button>
        <button type="button" className="btn btn-ghost" onClick={onHome}>
          Início
        </button>
      </div>
    </section>
  );
}
