# Cripto+ — hub de passatempos (front-end)

Projeto independente (não depende do site da ZD Sistemas). React 19 + TypeScript + Vite, CSS próprio com tokens e tipografia fluida (`clamp()`, `min()`, container queries). Sem backend: tudo roda no navegador e o progresso fica no `localStorage`.

## Executar

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # motor de grades, validador, criptograma
npm run build      # typecheck + build em dist/
```

## O que existe

- **Palavras cruzadas** jogáveis: toque, teclado físico e virtual, setas/Tab/Espaço, 5 níveis, 6 temas + "Variado", pausa, cronômetro opcional, salvamento e retomada automáticos, conferência (letras erradas marcadas com listras, não só cor).
- **Caça-palavras** (8×8 a 16×16; diagonais e sentido inverso nos níveis altos; nos níveis 4–5 a lista mostra pistas, não as palavras) e **Palavras embaralhadas** (anagramas em sequência, toque ou teclado).
- **Criptogramas** com ditados populares: mesmo número = mesma letra, letras "de graça" conforme o nível.
- **Ajuda progressiva** (dica contextual → uma letra → palavra → solução completa com confirmação). Letras reveladas ficam marcadas; as dicas são contadas.
- **Desafio do dia** (semente + tema derivados da data local), progresso e histórico, tela de conclusão com resultado compartilhável sem spoilers.
- Layout mobile-first sem overflow horizontal verificado de 320 px a 1920 px; largura de conteúdo limitada em telas ultrawide/4K; respeita `prefers-reduced-motion`.

## Arquitetura

- `src/lib/crossword.ts` — gerador determinístico (por semente) + **validador independente** (cruzamentos, palavras acidentais, conectividade, numeração). Nenhuma grade é aceita sem passar no validador.
- `src/lib/builders.ts` — escolhe palavras por tema/nível e gera a grade; `buildCryptogram` para criptogramas.
- `src/data/words.ts` — banco de palavras/pistas **originais** (~190 entradas em 7 temas). Respostas em A–Z sem acentos (política em `src/lib/normalize.ts`).
- As grades são geradas no cliente a partir da semente, portanto **a solução está no JavaScript do navegador**. Ok para um MVP sem contas; um backend precisaria servir grades e validar respostas no servidor.

## Fora do escopo desta entrega

Backend (NestJS/Postgres), painel editorial, pipeline de conteúdo com IA, contas/sincronização, PWA/service worker. O banco ainda é pequeno para uso diário prolongado: o vocabulário se repete entre grades até crescer.

## Marca

"Cripto" é família de revistas da Coquetel. O nome "Cripto+" veio do design de referência; antes de publicar, vale confirmar disponibilidade de marca/domínio. Todo o conteúdo e o código aqui são originais.
