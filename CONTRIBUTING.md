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

## Palavras sugeridas por IA

O workflow **Sugerir palavras com IA** abre Pull Requests com o rótulo `conteudo-ia`. A IA só **propõe**; quem decide é uma pessoa:

1. Abra o PR e confira **cada fato** em fonte confiável. Reescreva ou apague o que for duvidoso ou parecido com pistas de terceiros.
2. Em `content/words.json`, troque `source` (`ia-sugerido: conferir fato`) pela fonte real e atualize `verifiedAt`.
3. Rode `npm run validate:content`: o validador estrito recusa itens ainda marcados como `ia-sugerido`, então o deploy não publica conteúdo não revisado.

Configuração (uma vez): guarde a chave da API como secret do repositório, sem colar em chats ou arquivos:

```bash
gh secret set ANTHROPIC_API_KEY --repo gustavobenis/cripto-plus
```

Para rodar: Actions → *Sugerir palavras com IA* → *Run workflow* (escolha tema e quantidade). Opcionalmente defina a variável `ANTHROPIC_MODEL` no ambiente do workflow para trocar de modelo.
