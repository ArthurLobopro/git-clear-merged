# git-clean-merged

Apaga branches locais já mergeados em um branch base (padrão: `main`/`master`).

## Instalação (Linux)

Via release do GitHub:

```bash
curl -fsSL https://raw.githubusercontent.com/ArthurLobopro/git-clear-merged/main/install.sh | sh
```

A partir do código-fonte (requer [Bun](https://bun.sh)):

```bash
./install.sh
```

Instala em `~/.local/bin` por padrão. Variáveis: `GCM_INSTALL_DIR` (ex.: `/usr/local/bin` com `sudo`), `GCM_VERSION` (tag do release), `GCM_REPO` (outro fork).
Para desinstalar: `./install.sh --uninstall`.

## Idioma

A interface está em inglês por padrão e também suporta português (Brasil). O idioma é escolhido por:

1. `GIT_CLEAN_MERGED_LANG=pt` (ou `en`);
2. variáveis de locale do sistema (`LC_ALL`, `LC_MESSAGES`, `LANG`), ex.: `LANG=pt_BR.UTF-8` ativa o português.

Para adicionar um idioma, crie uma classe em `src/i18n/` que estenda `English` e sobrescreva só o que traduzir (o resto cai no inglês), e registre-a em `src/i18n/index.ts`.

## Desenvolvimento

```bash
bun install
bun test
bun run build           # dist/git-clean-merged
bun run build:release   # binários linux-x64 e linux-arm64 para anexar ao release
```

Os binários de `build:release` devem ser publicados no release com os nomes
`git-clean-merged-linux-x64` e `git-clean-merged-linux-arm64`.
