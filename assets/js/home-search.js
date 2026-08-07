// Instant client-side filtering of the homepage archive list.
// Works over the markup already in the DOM, so there is no search index to fetch.
(function () {
  var input = document.getElementById('searchInput');
  if (!input) return;

  var clearBtn = document.getElementById('searchClear');
  var empty = document.getElementById('searchEmpty');
  var hero = document.getElementById('hero');

  var DEBOUNCE_MS = 80;

  var entries = [];
  var sections = [];
  var debounceTimer = null;
  var frame = null;
  var heroTransition = null;

  function reducedMotion() {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  function touchLike() {
    return window.matchMedia('(hover: none) and (pointer: coarse)').matches;
  }

  // Edit-distance budget grows with term length so short terms stay strict.
  // Calibrated so "tolerence"->"tolerance" and "distirbuted"->"distributed"
  // match, while "shortcuts"->"shortcodes" (3 edits) does not.
  function budget(len) {
    if (len <= 3) return 0;
    if (len <= 7) return 1;
    if (len <= 11) return 2;
    return 3;
  }

  // Numbers get no fuzzy budget at all, otherwise "2014" matches "2019".
  var NUMERIC = /^\d+$/;

  function tokenize(text) {
    return text
      .toLowerCase()
      .replace(/[^\p{L}\p{N}]+/gu, ' ')
      .trim()
      .split(/\s+/)
      .filter(Boolean);
  }

  // Damerau-Levenshtein (optimal string alignment): an adjacent transposition
  // counts as one edit, which is by far the most common real typo. Three rolling
  // rows, with an early bail once every cell in a row exceeds the budget.
  function withinDistance(a, b, max) {
    if (a === b) return true;
    var aLen = a.length;
    var bLen = b.length;
    if (Math.abs(aLen - bLen) > max) return false;

    var prev2 = new Array(bLen + 1);
    var prev = new Array(bLen + 1);
    var curr = new Array(bLen + 1);
    for (var j = 0; j <= bLen; j++) prev[j] = j;

    for (var i = 1; i <= aLen; i++) {
      curr[0] = i;
      var rowMin = curr[0];
      var aCode = a.charCodeAt(i - 1);
      for (var k = 1; k <= bLen; k++) {
        var cost = aCode === b.charCodeAt(k - 1) ? 0 : 1;
        var val = Math.min(prev[k] + 1, curr[k - 1] + 1, prev[k - 1] + cost);
        if (
          i > 1 && k > 1 &&
          aCode === b.charCodeAt(k - 2) &&
          a.charCodeAt(i - 2) === b.charCodeAt(k - 1)
        ) {
          val = Math.min(val, prev2[k - 2] + 1);
        }
        curr[k] = val;
        if (val < rowMin) rowMin = val;
      }
      if (rowMin > max) return false;
      var rotate = prev2;
      prev2 = prev;
      prev = curr;
      curr = rotate;
    }
    return prev[bLen] <= max;
  }

  function tokenMatches(term, token) {
    if (token.includes(term)) return true;
    if (NUMERIC.test(term)) return false;
    var max = budget(term.length);
    if (max === 0) return false;
    if (Math.abs(term.length - token.length) > max) return false;
    return withinDistance(term, token, max);
  }

  // Every term must hit, either as a substring of the whole haystack or
  // fuzzily against some token. Terms of 1-2 chars skip the fuzzy path.
  function matches(entry, query) {
    if (!query) return true;
    var terms = tokenize(query);
    if (!terms.length) return true;
    return terms.every(function (term) {
      if (entry.haystack.includes(term)) return true;
      if (NUMERIC.test(term) || budget(term.length) === 0) return false;
      return entry.tokens.some(function (token) {
        return tokenMatches(term, token);
      });
    });
  }

  function syncSections() {
    var anyVisible = false;
    sections.forEach(function (group) {
      var hidden = group.entries.length > 0 && group.entries.every(function (el) {
        return el.style.display === 'none';
      });
      group.section.style.display = hidden ? 'none' : '';
      if (!hidden) anyVisible = true;
    });
    if (empty) empty.hidden = anyVisible;
  }

  function collapseHero() {
    if (!hero || hero.classList.contains('minimized')) return;
    if (heroTransition) {
      hero.removeEventListener('transitionend', heroTransition);
      heroTransition = null;
    }
    if (reducedMotion()) {
      hero.classList.add('minimized');
      hero.style.maxHeight = '0';
      return;
    }
    hero.style.maxHeight = hero.scrollHeight + 'px';
    void hero.offsetHeight; // force reflow so the transition has a start value
    hero.classList.add('minimized');
    hero.style.maxHeight = '0';
  }

  function expandHero() {
    if (!hero || !hero.classList.contains('minimized')) return;
    if (reducedMotion()) {
      hero.classList.remove('minimized');
      hero.style.maxHeight = '';
      return;
    }
    if (heroTransition) {
      hero.removeEventListener('transitionend', heroTransition);
      heroTransition = null;
    }
    hero.style.maxHeight = '0';
    void hero.offsetHeight;
    hero.style.maxHeight = hero.scrollHeight + 'px';
    hero.classList.remove('minimized');
    heroTransition = function (event) {
      if (event.propertyName !== 'max-height') return;
      // Drop the fixed height so the hero can reflow freely again.
      if (!hero.classList.contains('minimized')) hero.style.maxHeight = '';
      hero.removeEventListener('transitionend', heroTransition);
      heroTransition = null;
    };
    hero.addEventListener('transitionend', heroTransition);
  }

  function apply() {
    var query = input.value.trim().toLowerCase();
    var focused = query || document.activeElement === input;

    entries.forEach(function (entry) {
      entry.el.style.display = matches(entry, query) ? '' : 'none';
    });

    syncSections();
    if (focused) collapseHero(); else expandHero();
    if (clearBtn) clearBtn.classList.toggle('is-hidden', !query);
  }

  function schedule() {
    if (debounceTimer) {
      clearTimeout(debounceTimer);
      debounceTimer = null;
    }
    if (frame) cancelAnimationFrame(frame);
    frame = requestAnimationFrame(function () {
      frame = null;
      apply();
    });
  }

  function debounced() {
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(function () {
      debounceTimer = null;
      schedule();
    }, DEBOUNCE_MS);
  }

  input.addEventListener('input', debounced);
  input.addEventListener('focus', schedule);
  input.addEventListener('blur', schedule);
  input.addEventListener('keydown', function (event) {
    // On touch keyboards, Enter should dismiss rather than submit.
    if (event.key === 'Enter' && touchLike()) {
      schedule();
      input.blur();
    }
  });

  if (clearBtn) {
    clearBtn.hidden = false;
    clearBtn.classList.add('is-hidden');
    clearBtn.addEventListener('click', function () {
      input.value = '';
      schedule();
      input.blur();
    });
  }

  function index() {
    entries = Array.prototype.map.call(document.querySelectorAll('.h-entry'), function (el) {
      var title = (el.querySelector('.h-entry-title') || {}).textContent || '';
      var meta = (el.querySelector('.archive-meta') || {}).textContent || '';
      var desc = (el.querySelector('.description') || {}).textContent || '';
      var blob = title + ' ' + meta + ' ' + desc;
      return { el: el, haystack: blob.toLowerCase(), tokens: tokenize(blob) };
    });

    sections = Array.prototype.map.call(document.querySelectorAll('.h-year-section'), function (el) {
      return {
        section: el,
        entries: Array.prototype.slice.call(el.querySelectorAll('.h-entry')),
      };
    });

    apply();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', index);
  } else {
    index();
  }
})();
