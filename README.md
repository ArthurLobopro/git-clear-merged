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

## Desenvolvimento

```bash
bun install
bun test
bun run build           # dist/git-clean-merged
bun run build:release   # binários linux-x64 e linux-arm64 para anexar ao release
```

Os binários de `build:release` devem ser publicados no release com os nomes
`git-clean-merged-linux-x64` e `git-clean-merged-linux-arm64`.
