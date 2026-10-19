# Cripto+ — hub de passatempos

Projeto independente. React 19 + TypeScript + Vite, CSS próprio com tokens e tipografia fluida. Publicado no GitHub Pages: https://gustavobenis.github.io/cripto-plus/

## Executar

```bash
npm install
npm run dev                # http://localhost:5173
npm test                   # motores, validadores, conteúdo e pacotes diários
npm run validate:content   # valida content/*.json
npm run build              # typecheck + build em dist/
```

## O que existe

- **Palavras cruzadas**, **criptogramas** (ditados populares), **caça-palavras** e **palavras embaralhadas**, com 5 níveis, 7 temas, pausa, cronômetro opcional e salvamento automático.
- **Ajuda progressiva** (dica contextual → uma letra → palavra → solução completa com confirmação); letras reveladas ficam marcadas e as dicas são contadas.
- **Desafio do dia** (4 modalidades) e **arquivo** de dias anteriores; dificuldade sobe de segunda a sábado.
- Progresso, histórico, **backup exportável/importável**, resultado compartilhável sem spoilers.
- PWA instalável e com uso offline após a primeira visita.
- Layout mobile-first sem overflow horizontal verificado de 320 px a 1920 px.

## Tudo dentro do GitHub

Sem servidor próprio: o GitHub é repositório, CMS, banco de conteúdo, agendador e hospedagem.

| Peça | Como funciona |
|---|---|
| Hospedagem | GitHub Pages (`pages.yml`): cada push em `main` roda testes, build e deploy. |
| Conteúdo | `content/words.json` e `content/phrases.json`, com `source` e `verifiedAt`. Editável por Pull Request. |
| Validação editorial | `npm run validate:content` no CI: respostas únicas e A–Z, pista que não revela a resposta, fonte e data obrigatórias. |
| Desafio diário | `daily.yml` roda todo dia (06:00 UTC), gera 14 dias à frente em `public/daily/AAAA-MM-DD.json`, valida, commita e republica. Dias já publicados **nunca** são sobrescritos. |
| Arquivo | Página `#/arquivo` lê `public/daily/index.json`. |
| Reportar erro / sugerir palavra | Issue Forms em `.github/ISSUE_TEMPLATE`; o botão "Reportar erro" do jogo abre a issue já preenchida. |
| Offline / instalável | `manifest.webmanifest` + `sw.js` (daily: rede primeiro; resto: cache). |
| Progresso | `localStorage` + backup em `#/progresso`. |

Fluxo editorial em [CONTRIBUTING.md](CONTRIBUTING.md).

## Arquitetura do código

- `src/lib/crossword.ts` — gerador determinístico + **validador independente**; nenhuma grade é aceita sem passar nele.
- `src/lib/wordsearch.ts`, `anagram.ts`, `builders.ts` — demais modalidades; `daily.ts` monta e valida o pacote do dia.
- `scripts/` — `publish-daily.ts`, `validate-content.ts`, `make-icons.ts`.
- As soluções ficam no JavaScript/JSON público (sem servidor não há como escondê-las). Serve para passatempo; não para competição com ranking.

## Fora do escopo (exigiria backend)

Contas e sincronização automática entre aparelhos (o backup manual cobre o básico), ranking, pipeline de conteúdo com IA, painel editorial próprio, testes de acessibilidade com leitor de tela e e2e em navegadores reais.

## Marca

"Cripto" é família de revistas da Coquetel. O nome "Cripto+" veio do design de referência; antes de divulgar, vale confirmar disponibilidade de marca/domínio. Todo o conteúdo e o código aqui são originais.
