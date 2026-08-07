// Drives assets/js/home-search.js against a stubbed DOM built from the real posts.
const fs = require('fs');
const vm = require('vm');

const POSTS = [
  { title: 'Success Through Impact, Not Just Code', meta: 'August 4, 2026 · #career, #engineering-leadership, #staff-engineer', desc: "What actually changes when a senior engineer's biggest lever stops being the code they write." },
  { title: 'Rich Content', meta: 'March 10, 2019 · #shortcodes, #privacy', desc: 'A brief description of Hugo Shortcodes' },
  { title: 'Fault Tolerance in Distributed Systems: Distributed Consensus', meta: 'November 20, 2014 · #distributed systems, #concepts', desc: 'Welcome the most sought after and esoteric topics in distributed systems' },
  { title: 'Fault Tolerance in Distributed Systems: Timing Models', meta: 'October 29, 2014 · #distributed systems, #concepts', desc: 'a timing model is simply the way a distributed model behaves with respect to time' },
  { title: 'Fault Tolerance in Distributed Systems: Introduction', meta: 'October 28, 2014 · #distributed systems, #concepts', desc: 'Fault tolerance is a core motivation for distributed systems' },
];

function makeEl(cls, text) {
  return { className: cls, textContent: text, style: {}, classList: { _s: new Set(), add(c) { this._s.add(c); }, remove(c) { this._s.delete(c); }, contains(c) { return this._s.has(c); }, toggle(c, on) { on ? this._s.add(c) : this._s.delete(c); } } };
}

const entryEls = POSTS.map((p) => {
  const kids = { '.h-entry-title': makeEl('h-entry-title', p.title), '.archive-meta': makeEl('archive-meta', p.meta), '.description': makeEl('description', p.desc) };
  const el = makeEl('h-entry', '');
  el.querySelector = (sel) => kids[sel] || null;
  el._post = p;
  return el;
});

const yearSection = makeEl('h-year-section', '');
yearSection.querySelectorAll = () => entryEls;

const input = makeEl('input', '');
input.value = '';
input._h = {};
input.addEventListener = (ev, fn) => { (input._h[ev] = input._h[ev] || []).push(fn); };
input.blur = () => {};

const clearBtn = makeEl('button', '');
clearBtn._h = {};
clearBtn.addEventListener = (ev, fn) => { (clearBtn._h[ev] = clearBtn._h[ev] || []).push(fn); };

const byId = { searchInput: input, searchClear: clearBtn, searchEmpty: { hidden: true }, hero: null };

const sandbox = {
  document: {
    readyState: 'complete',
    activeElement: null,
    getElementById: (id) => byId[id] ?? null,
    querySelectorAll: (sel) => (sel === '.h-entry' ? entryEls : sel === '.h-year-section' ? [yearSection] : []),
    addEventListener: () => {},
  },
  window: { matchMedia: () => ({ matches: false }) },
  requestAnimationFrame: (fn) => { fn(); return 1; },
  cancelAnimationFrame: () => {},
  setTimeout: (fn) => { fn(); return 1; },
  clearTimeout: () => {},
  console,
};
sandbox.window.document = sandbox.document;

vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(process.argv[2], 'utf8'), sandbox);

function search(q) {
  input.value = q;
  input._h.input.forEach((fn) => fn());
  return entryEls.filter((e) => e.style.display !== 'none').map((e) => e._post.title);
}

let failures = 0;
function check(query, expectTitlesContaining, note) {
  const got = search(query);
  const ok = expectTitlesContaining(got);
  if (!ok) failures++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  "${query}" -> ${got.length} result(s)  ${note || ''}`);
  if (!ok) got.forEach((t) => console.log(`        ${t}`));
}

check('', (r) => r.length === 5, '(empty shows all)');
check('fault', (r) => r.length === 3, '(title substring)');
check('consensus', (r) => r.length === 1 && r[0].includes('Consensus'), '(single hit)');
check('distributed systems', (r) => r.length === 3, '(multi-term, all must hit)');
check('#privacy', (r) => r.length === 1 && r[0] === 'Rich Content', '(tag from meta)');
check('2014', (r) => r.length === 3, '(year from meta)');
check('shortcuts', (r) => r.length === 0, '(no false positive)');
check('tolerence', (r) => r.length === 3, '(fuzzy: tolerence~tolerance, dist 1)');
check('distirbuted', (r) => r.length >= 3, '(fuzzy: transposition)');
check('senior engineer', (r) => r.length === 1, '(from description)');
check('zzzz', (r) => r.length === 0, '(no match)');
check('ab', (r) => r.length >= 0, '(short term skips fuzzy, no crash)');
check('fualt', (r) => r.length === 3, '(damerau: transposition, len 5)');
check('systmes', (r) => r.length === 3, '(damerau: transposition, len 7)');
check('conensus', (r) => r.length === 1, '(damerau: len 8)');
check('engineer', (r) => r.length === 1, '(prefix substring)');
check('2019', (r) => r.length === 1 && r[0] === 'Rich Content', '(year exact, no 2014 bleed)');
check('  fault   tolerance  ', (r) => r.length === 3, '(whitespace normalised)');

console.log(`\nsearchEmpty hidden after "zzzz": ${(search('zzzz'), byId.searchEmpty.hidden)} (expect false)`);
if (byId.searchEmpty.hidden !== false) failures++;
console.log(`year section hidden on no-match: ${yearSection.style.display === 'none'} (expect true)`);
if (yearSection.style.display !== 'none') failures++;
search('');
console.log(`year section restored on clear: ${yearSection.style.display === ''} (expect true)`);
if (yearSection.style.display !== '') failures++;

console.log(failures === 0 ? '\nALL PASS' : `\n${failures} FAILURE(S)`);
process.exit(failures ? 1 : 0);
