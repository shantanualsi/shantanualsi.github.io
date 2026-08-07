# shantanualshi.com

My personal blog.

## Maintaining

`hugo server` to write. `bin/update-theme.sh` to bump PaperMod — it rebuilds and runs
`bin/smoke.sh` plus `tests/home-search.test.js`, which is also what CI runs on a PR.

No theme file is edited, so a bump only moves the submodule pointer. It can still break a
customization silently, which is what the smoke test catches. Custom CSS sticks to
PaperMod's variables (`--primary`, `--theme`, `--border`, …) so upstream changes carry
through.
