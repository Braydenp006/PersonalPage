#!/bin/sh
# Copies the site to the server: only what's committed (so unused/, CONTEXT.md, HANDOFF.md, .git, .claude never go up),
# minus the dev-only files below. Shows what would change first; add "go" to really copy.
#   tools/deploy.sh user@server:/usr/local/www/site        (dry run)
#   tools/deploy.sh user@server:/usr/local/www/site go
# Commit first: uncommitted edits are not deployed.
set -eu
dest=${1:?usage: tools/deploy.sh user@host:/path [go]}
cd "$(dirname "$0")/.."
tmp=$(mktemp -d); trap 'rm -rf "$tmp"' EXIT

git archive HEAD | tar -x -C "$tmp"
rm -rf "$tmp/tools" "$tmp/README.md" "$tmp/.gitignore" \
       "$tmp/assets/map/make-style.py" "$tmp/assets/map/positron-original.json" "$tmp/assets/previews/"*.json
find "$tmp" -name 'temp-*' -delete   # placeholder photos I don't have the rights to (git-ignored, but just in case)

[ "${2:-}" = go ] && dry= || dry=--dry-run
rsync -rlptvz --delete --chmod=D755,F644 $dry "$tmp/" "$dest"
[ -n "$dry" ] && echo "(dry run: add \"go\" to copy for real)"
