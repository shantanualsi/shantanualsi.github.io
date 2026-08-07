#!/usr/bin/env bash
# Pull the latest PaperMod, rebuild, and verify the customizations still hold.
# Nothing here edits themes/PaperMod, so this can never produce a merge conflict —
# it only moves the submodule pointer. If smoke.sh fails, roll back with:
#   git submodule update --init themes/PaperMod
set -euo pipefail
cd "$(dirname "$0")/.."

sub="themes/PaperMod"
before=$(git -C "$sub" rev-parse HEAD)

echo "==> fetching upstream PaperMod"
git submodule update --remote --merge "$sub"

after=$(git -C "$sub" rev-parse HEAD)

if [ "$before" = "$after" ]; then
  echo "==> already up to date (${before:0:8})"
else
  echo "==> PaperMod ${before:0:8} -> ${after:0:8}"
  git -C "$sub" log --oneline "$before..$after" | head -40
  echo
  echo "==> template/asset changes in this bump (what could affect your overrides):"
  git -C "$sub" diff --stat "$before..$after" -- layouts assets | tail -30
fi

echo
echo "==> rebuilding"
rm -rf public resources
hugo --gc --minify

echo
bin/smoke.sh
node tests/home-search.test.js assets/js/home-search.js >/dev/null && echo "search: PASS"

if [ "$before" != "$after" ]; then
  echo
  echo "==> looks good. commit the bump with:"
  echo "    git add $sub && git commit -m 'Update PaperMod to ${after:0:8}'"
fi
