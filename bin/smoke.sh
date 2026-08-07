#!/usr/bin/env bash
# Asserts the custom homepage survived whatever just changed (usually a theme bump).
# Expects ./public to already be built. Run via `make check` or bin/update-theme.sh.
set -uo pipefail
cd "$(dirname "$0")/.."

fail=0
index="public/index.html"

need() { # need <file> <extended-regex> <description>
  # `--` so patterns starting with a dash (CSS custom properties) aren't read as flags.
  if grep -Eq -- "$2" "$1" 2>/dev/null; then
    printf '  ok    %s\n' "$3"
  else
    printf '  FAIL  %s\n' "$3"
    fail=1
  fi
}

if [ ! -f "$index" ]; then
  echo "smoke: $index missing — run 'hugo --gc --minify' first" >&2
  exit 1
fi

echo "smoke: homepage"
# No hero check: params.hero.enable is false by choice, so #hero never renders.
# Attribute quotes disappear under --minify, so match both forms.
need "$index" 'id=("?)searchInput'              'search input rendered'
need "$index" 'id=("?)searchClear'              'search clear button rendered'
need "$index" 'class=("?)h-year-section'        'year-grouped archive rendered'
need "$index" 'class=("?)h-entry'               'archive entries rendered'
need "$index" 'class=("?)entry-link'            'stretched row links rendered'
need "$index" 'home-search\.min\.[0-9a-f]+\.js' 'search script linked + fingerprinted'

echo "smoke: theme integration"
css=$(ls public/assets/css/stylesheet.*.css 2>/dev/null | head -1)
if [ -n "$css" ]; then
  need "$css" 'h-year-header'  'extended CSS bundled into theme stylesheet'
  need "$css" '--primary'      'theme CSS variables still present'
else
  echo "  FAIL  theme stylesheet not emitted"
  fail=1
fi

# Exclude paginator pages (public/posts/page/N/) — those are list pages, not posts.
post_pages=$(find public/posts -mindepth 2 -name index.html -not -path '*/page/*' 2>/dev/null)
post=$(printf '%s\n' "$post_pages" | head -1)
if [ -n "$post" ]; then
  need "$post" 'class=("?)post-content'  'post pages still render (theme single.html)'
else
  echo "  FAIL  no post pages built"
  fail=1
fi

# The homepage must list every published post; a broken mainSections or a theme
# change to page collections would silently empty this.
# Match the class attribute exactly so h-entry-title is not double-counted.
entries=$(grep -o 'class="\?h-entry[">]' "$index" | wc -l | tr -d ' ')
posts=$(printf '%s\n' "$post_pages" | grep -c . || true)
if [ "$entries" = "$posts" ] && [ "$entries" != "0" ]; then
  printf '  ok    archive lists all %s posts\n' "$entries"
else
  printf '  FAIL  archive lists %s entries but %s posts were built\n' "$entries" "$posts"
  fail=1
fi

if [ "$fail" -eq 0 ]; then
  echo "smoke: PASS"
else
  echo "smoke: FAILED — the theme update likely changed something the homepage depends on" >&2
fi
exit "$fail"
