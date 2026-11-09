#!/usr/bin/env bash
# Install portable skill instructions and the canonical Python TCP client.
set -euo pipefail

here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
target="${1:?usage: install.sh /path/to/other/project}"
client="$here/../../../crates/emu/cli/dust-cli"

if [[ ! -f "$client" ]]; then
    printf 'Canonical Dust client is missing: %s\n' "$client" >&2
    exit 1
fi

dest="$target/.claude/skills/dust-cli-bridge"
mkdir -p "$dest/bin"
cp "$here/SKILL.md" "$dest/SKILL.md"
cp "$client" "$dest/bin/aphrody-dust-cli"
chmod +x "$dest/bin/aphrody-dust-cli"

printf 'Installed dust-cli-bridge into %s\n' "$dest"
printf 'Supply a compatible dust-desktop with --dust-desktop-bin or DUST_DESKTOP_BIN.\n'
