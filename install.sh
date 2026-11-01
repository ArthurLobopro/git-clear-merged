#!/usr/bin/env sh
# Instalador do git-clean-merged (Linux).
#
# Instalar a partir de um release do GitHub:
#   curl -fsSL https://raw.githubusercontent.com/ArthurLobopro/git-clear-merged/main/install.sh | sh
#
# Instalar a partir do código-fonte (dentro do repositório, requer bun):
#   ./install.sh
#
# Variáveis:
#   GCM_REPO         owner/repo no GitHub (padrão: ArthurLobopro/git-clear-merged)
#   GCM_VERSION      tag do release (padrão: latest)
#   GCM_INSTALL_DIR  destino (padrão: ~/.local/bin; use /usr/local/bin com sudo)
#
# Desinstalar: ./install.sh --uninstall
set -eu

NAME="git-clean-merged"
REPO="${GCM_REPO:-ArthurLobopro/git-clear-merged}"
VERSION="${GCM_VERSION:-latest}"
DEST_DIR="${GCM_INSTALL_DIR:-$HOME/.local/bin}"
DEST="$DEST_DIR/$NAME"

say() { printf '%s\n' "$*"; }
die() { printf '✖ %s\n' "$*" >&2; exit 1; }

if [ "${1:-}" = "--uninstall" ]; then
  [ -e "$DEST" ] || die "Nada instalado em $DEST"
  rm -f "$DEST"
  say "✔ Removido $DEST"
  exit 0
fi

[ "$(uname -s)" = "Linux" ] || die "Este instalador suporta apenas Linux."

case "$(uname -m)" in
  x86_64|amd64)  ARCH="x64" ;;
  aarch64|arm64) ARCH="arm64" ;;
  *) die "Arquitetura não suportada: $(uname -m)" ;;
esac

command -v git >/dev/null 2>&1 || say "⚠ 'git' não encontrado no PATH (necessário para usar o $NAME)."

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
mkdir -p "$DEST_DIR"

# Modo local só quando executado como arquivo (./install.sh), não via "curl | sh"
SCRIPT_DIR=""
if [ -f "$0" ]; then SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"; fi

if [ -n "$SCRIPT_DIR" ] && [ -f "$SCRIPT_DIR/src/index.ts" ] && [ -z "${GCM_REPO:-}" ]; then
  # Modo local: compila a partir do código-fonte
  command -v bun >/dev/null 2>&1 || die "'bun' é necessário para instalar a partir do código-fonte (https://bun.sh)."
  say "→ Compilando a partir de $SCRIPT_DIR"
  (cd "$SCRIPT_DIR" && bun install --silent && bun build --compile src/index.ts --outfile "$TMP/$NAME" >/dev/null)
else
  # Modo release: baixa o binário pré-compilado
  ASSET="$NAME-linux-$ARCH"
  if [ "$VERSION" = "latest" ]; then
    URL="https://github.com/$REPO/releases/latest/download/$ASSET"
  else
    URL="https://github.com/$REPO/releases/download/$VERSION/$ASSET"
  fi
  SUMS_URL="${URL%/*}/SHA256SUMS"
  fetch() {
    if command -v curl >/dev/null 2>&1; then
      curl -fsSL "$1" -o "$2" || die "Falha ao baixar $1"
    elif command -v wget >/dev/null 2>&1; then
      wget -q "$1" -O "$2" || die "Falha ao baixar $1"
    else
      die "Precisa de 'curl' ou 'wget'."
    fi
  }
  say "→ Baixando $URL"
  fetch "$URL" "$TMP/$ASSET"
  fetch "$SUMS_URL" "$TMP/SHA256SUMS"

  say "→ Verificando integridade (SHA-256)"
  command -v sha256sum >/dev/null 2>&1 || die "'sha256sum' é necessário para verificar o download."
  EXPECTED="$(awk -v f="$ASSET" '$2 == f || $2 == "*" f { print $1 }' "$TMP/SHA256SUMS")"
  [ -n "$EXPECTED" ] || die "$ASSET não consta em SHA256SUMS."
  ACTUAL="$(sha256sum "$TMP/$ASSET" | awk '{ print $1 }')"
  [ "$EXPECTED" = "$ACTUAL" ] || die "Checksum não confere (esperado $EXPECTED, obtido $ACTUAL). Instalação abortada."
  mv "$TMP/$ASSET" "$TMP/$NAME"
fi

chmod +x "$TMP/$NAME"
mv "$TMP/$NAME" "$DEST"
say "✔ Instalado em $DEST"

case ":$PATH:" in
  *":$DEST_DIR:"*) ;;
  *) say "⚠ $DEST_DIR não está no PATH. Adicione ao seu shell:  export PATH=\"$DEST_DIR:\$PATH\"" ;;
esac
