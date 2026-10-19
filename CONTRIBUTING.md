# Como contribuir com conteúdo

O "painel editorial" do Cripto+ é o próprio GitHub:

- **Sugerir palavra:** abra uma [issue "Sugerir palavra e pista"](../../issues/new/choose).
- **Reportar erro:** use o botão "Reportar erro" dentro do jogo (o link do jogo já vai preenchido).
- **Editar direto:** altere `content/words.json` (ou `content/phrases.json`) e abra um Pull Request. O CI roda `npm run validate:content`, que rejeita respostas duplicadas, fora de A–Z, pistas que revelam a resposta e itens sem `source`/`verifiedAt`.

## Regras de conteúdo

- Pistas e dicas **originais**. Não copie de revistas (Coquetel/Cripto etc.), dicionários ou outros sites.
- Todo fato precisa ser verificável; registre a fonte em `source` e a data em `verifiedAt` (AAAA-MM-DD).
- Pacotes diários em `public/daily/` são **imutáveis**: correções valem a partir do próximo dia publicado. Para corrigir um dia já publicado, edite o arquivo daquele dia em um PR e explique o motivo.

## Rodando localmente

```bash
npm install
npm run dev
npm run validate:content && npm run typecheck && npm test
```
