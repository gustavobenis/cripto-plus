import { Suspense, lazy, useEffect, useRef, useState } from 'react';
import Icon from './components/Icon';
import { Home, ModeSelect, Progress, Setup, gameUrl, go, newSeed } from './pages/Pages';
import { Archive, Daily, DailyLoader } from './pages/Daily';
import { dailyParams, type DailyPack } from './lib/daily';
import ReportLink from './components/ReportLink';
import { TIPO_NAME, themeName, levelName } from './data/catalog';
import type { Tipo } from './data/catalog';

const CrosswordGame = lazy(() => import('./components/CrosswordGame'));
const CryptoGame = lazy(() => import('./components/CryptoGame'));
const WordSearchGame = lazy(() => import('./components/WordSearchGame'));
const AnagramGame = lazy(() => import('./components/AnagramGame'));

const TIPOS: string[] = ['cruzadas', 'cripto', 'caca', 'anagrama'];

function useRoute() {
  const [hash, setHash] = useState(() => window.location.hash || '#/');
  useEffect(() => {
    const on = () => {
      setHash(window.location.hash || '#/');
      window.scrollTo(0, 0);
    };
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  const [path, qs = ''] = hash.slice(1).split('?');
  return { path: path || '/', params: new URLSearchParams(qs) };
}

const NAV: { to: string; label: string; icon: string }[] = [
  { to: '/', label: 'Início', icon: 'home' },
  { to: '/jogar', label: 'Jogar', icon: 'gamepad' },
  { to: '/diario', label: 'Desafio diário', icon: 'calendar' },
  { to: '/arquivo', label: 'Arquivo', icon: 'star' },
  { to: '/progresso', label: 'Progresso', icon: 'chart' },
];

function Header({ path }: { path: string }) {
  const [open, setOpen] = useState(false);
  useEffect(() => setOpen(false), [path]);
  return (
    <header className="site-header">
      <div className="container header-inner">
        <a className="logo" href="#/" aria-label="Cripto+ — início">
          Cripto<span>+</span>
        </a>
        <button className="btn btn-ghost icon-btn menu-btn" aria-expanded={open} aria-controls="nav" aria-label={open ? 'Fechar menu' : 'Abrir menu'} onClick={() => setOpen((o) => !o)}>
          <Icon name={open ? 'close' : 'menu'} />
        </button>
        <nav id="nav" className={open ? 'nav open' : 'nav'} aria-label="Principal">
          {NAV.map((n) => (
            <a key={n.to} href={`#${n.to}`} aria-current={path === n.to ? 'page' : undefined}>
              <Icon name={n.icon} size={18} /> {n.label}
            </a>
          ))}
        </nav>
      </div>
    </header>
  );
}

export default function App() {
  const { path, params } = useRoute();
  const mainRef = useRef<HTMLElement>(null);

  let page: React.ReactNode;
  const parts = path.split('/').filter(Boolean);
  if (parts[0] === 'jogar') page = <ModeSelect />;
  else if (parts[0] === 'novo' && TIPOS.includes(parts[1])) page = <Setup tipo={parts[1] as Tipo} />;
  else if (parts[0] === 'diario') page = <Daily />;
  else if (parts[0] === 'arquivo') page = <Archive />;
  else if (parts[0] === 'progresso') page = <Progress />;
  else if (parts[0] === 'jogo' && TIPOS.includes(parts[1])) {
    const tipo = parts[1] as Tipo;
    const dailyDate = /^\d{4}-\d{2}-\d{2}$/.test(params.get('daily') ?? '') ? params.get('daily')! : null;
    const dp = dailyDate ? dailyParams(dailyDate) : null;
    const tema = dp ? (tipo === 'cripto' ? 'ditados' : dp.tema) : (params.get('tema') ?? 'variado');
    const nivel = dp ? dp.nivel : Math.min(5, Math.max(1, Number(params.get('nivel')) || 3));
    const seed = dp ? dp.seed : Number(params.get('seed')) || 1;
    const again = () => go(gameUrl(tipo, tema, nivel, newSeed()));
    const common = { tema, nivel, seed, onNew: again, onHome: () => go('/') };
    const render = (pack: DailyPack | null) => {
      if (tipo === 'cruzadas') return <CrosswordGame {...common} prebuilt={pack?.games.cruzadas} />;
      if (tipo === 'caca') return <WordSearchGame {...common} prebuilt={pack?.games.caca} />;
      if (tipo === 'anagrama') return <AnagramGame {...common} prebuilt={pack?.games.anagrama} />;
      return <CryptoGame {...common} prebuilt={pack?.games.cripto} />;
    };
    page = (
      <>
        {dailyDate ? <DailyLoader date={dailyDate}>{render}</DailyLoader> : render(null)}
        <div className="container">
          <ReportLink titulo={`${TIPO_NAME[tipo]} · ${tipo === 'cripto' ? 'ditados' : themeName(tema)} · ${levelName(nivel)}${dailyDate ? ` · ${dailyDate}` : ''}`} />
        </div>
      </>
    );
  } else page = <Home />;

  return (
    <>
      <a
        className="skip"
        href="#main"
        onClick={(e) => {
          e.preventDefault();
          mainRef.current?.focus();
        }}
      >
        Pular para o conteúdo
      </a>
      <Header path={'/' + (parts[0] ?? '')} />
      <main id="main" tabIndex={-1} ref={mainRef}>
        <Suspense fallback={<div className="container section muted">Carregando…</div>}>{page}</Suspense>
      </main>
      <footer className="site-footer">
        <div className="container">
          <span>Cripto+ · passatempos para todos os dias</span>
          <span className="muted small">Conteúdo e pistas originais. Progresso salvo apenas neste dispositivo.</span>
        </div>
      </footer>
    </>
  );
}
