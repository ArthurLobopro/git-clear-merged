#!/usr/bin/env sh
# Instalador do git-clean-merged (Linux).
#
# Instalar a partir de um release do GitHub:
#   curl -fsSL https://raw.githubusercontent.com/OWNER/REPO/main/install.sh | GCM_REPO=OWNER/REPO sh
#
# Instalar a partir do código-fonte (dentro do repositório, requer bun):
#   ./install.sh
#
# Variáveis:
#   GCM_REPO         owner/repo no GitHub (modo release)
#   GCM_VERSION      tag do release (padrão: latest)
#   GCM_INSTALL_DIR  destino (padrão: ~/.local/bin; use /usr/local/bin com sudo)
#
# Desinstalar: ./install.sh --uninstall
set -eu

NAME="git-clean-merged"
REPO="${GCM_REPO:-}"
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

SCRIPT_DIR="$(cd "$(dirname "$0")" 2>/dev/null && pwd || true)"

if [ -n "$SCRIPT_DIR" ] && [ -f "$SCRIPT_DIR/src/index.ts" ] && [ -z "$REPO" ]; then
  # Modo local: compila a partir do código-fonte
  command -v bun >/dev/null 2>&1 || die "'bun' é necessário para instalar a partir do código-fonte (https://bun.sh)."
  say "→ Compilando a partir de $SCRIPT_DIR"
  (cd "$SCRIPT_DIR" && bun install --silent && bun build --compile src/index.ts --outfile "$TMP/$NAME" >/dev/null)
else
  # Modo release: baixa o binário pré-compilado
  [ -n "$REPO" ] || die "Defina GCM_REPO=owner/repo (ou rode ./install.sh dentro do repositório)."
  ASSET="$NAME-linux-$ARCH"
  if [ "$VERSION" = "latest" ]; then
    URL="https://github.com/$REPO/releases/latest/download/$ASSET"
  else
    URL="https://github.com/$REPO/releases/download/$VERSION/$ASSET"
  fi
  say "→ Baixando $URL"
  if command -v curl >/dev/null 2>&1; then
    curl -fsSL "$URL" -o "$TMP/$NAME" || die "Falha ao baixar $URL"
  elif command -v wget >/dev/null 2>&1; then
    wget -q "$URL" -O "$TMP/$NAME" || die "Falha ao baixar $URL"
  else
    die "Precisa de 'curl' ou 'wget'."
  fi
fi

chmod +x "$TMP/$NAME"
mv "$TMP/$NAME" "$DEST"
say "✔ Instalado em $DEST"

case ":$PATH:" in
  *":$DEST_DIR:"*) ;;
  *) say "⚠ $DEST_DIR não está no PATH. Adicione ao seu shell:  export PATH=\"$DEST_DIR:\$PATH\"" ;;
esac
