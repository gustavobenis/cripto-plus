import Icon from './Icon';

export const REPO = 'gustavobenis/cripto-plus';

/** Abre uma issue do GitHub já preenchida com o jogo atual (o "painel editorial" é o GitHub). */
export default function ReportLink({ titulo }: { titulo: string }) {
  const href =
    `https://github.com/${REPO}/issues/new?template=reportar-erro.yml` +
    `&title=${encodeURIComponent(`[Erro] ${titulo}`)}&jogo=${encodeURIComponent(window.location.href)}`;
  return (
    <p className="report">
      <a href={href} target="_blank" rel="noopener noreferrer">
        <Icon name="help" size={16} /> Reportar erro neste jogo
      </a>
      <span className="muted small"> (abre o GitHub; precisa de conta gratuita)</span>
    </p>
  );
}
