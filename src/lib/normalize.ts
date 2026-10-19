/**
 * Política de normalização: a comparação de respostas ignora acentos, cedilha,
 * espaços e hífens (A–Z apenas). Os dados do banco de palavras já são
 * armazenados nessa forma; a grafia correta é exibida nas pistas/dicas.
 */
export function normalize(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toUpperCase()
    .replace(/[^A-Z]/g, '');
}
