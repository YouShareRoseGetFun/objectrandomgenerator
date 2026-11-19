(function () {
  'use strict';

  var $ = function (s) { return document.querySelector(s); };
  var $$ = function (s) { return Array.prototype.slice.call(document.querySelectorAll(s)); };

  var inputN = $('#count');
  var goBtn = $('#generate');
  var uniq = $('#unique');
  var out = $('#results');
  var status = $('#status');
  var shareBtn = $('#share');

  var DATA = null;
  var used = [];

  function picked(name) {
    return $$('input[name="' + name + '"]:checked').map(function (i) { return i.value; });
  }

  function buildPool() {
    var cats = picked('cat');
    var diffs = picked('diff');
    if (!DATA || !cats.length || !diffs.length) return [];
    var list = [];
    cats.forEach(function (c) {
      var groups = DATA[c] || {};
      diffs.forEach(function (d) {
        (groups[d] || []).forEach(function (w) { list.push(w); });
      });
    });
    return list;
  }

  function shuffle(a) {
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  function render(words) {
    out.innerHTML = '';
    words.forEach(function (w) {
      var li = document.createElement('li');
      li.textContent = w;
      out.appendChild(li);
    });
  }

  function currentN() {
    var n = parseInt(inputN.value, 10);
    if (isNaN(n)) n = 1;
    return Math.max(1, Math.min(50, n));
  }

  function syncUrl(n) {
    var u = new URL(window.location.href);
    u.searchParams.set('n', n);
    u.searchParams.set('cat', picked('cat').join(','));
    u.searchParams.set('diff', picked('diff').join(','));
    if (uniq.checked) u.searchParams.set('unique', '1'); else u.searchParams.delete('unique');
    history.replaceState(null, '', u.toString());
  }

  function generate() {
    var n = currentN();
    var all = buildPool();
    if (!all.length) {
      status.textContent = 'Pick at least one category and one difficulty first.';
      return;
    }
    var list = all;
    if (uniq.checked) {
      list = all.filter(function (w) { return used.indexOf(w) === -1; });
      if (!list.length) {
        status.textContent = 'You have drawn every object in this selection. Untick Unique or widen the filters.';
        return;
      }
    }
    var take = shuffle(list.slice()).slice(0, Math.min(n, list.length));
    if (uniq.checked) used = used.concat(take);
    render(take);
    status.textContent = take.length + ' random object' + (take.length === 1 ? '' : 's') +
      (take.length < n ? ' — only ' + take.length + ' left in this selection.' : '');
    syncUrl(n);
  }

  function copyShare() {
    var n = currentN();
    syncUrl(n);
    var text = window.location.href;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () {
        status.textContent = 'Link copied — it opens with exactly these filters.';
      }, function () { status.textContent = text; });
    } else {
      status.textContent = text;
    }
  }

  function readUrl() {
    var p = new URLSearchParams(window.location.search);
    if (!p.has('n')) return false;
    inputN.value = p.get('n');
    var cats = (p.get('cat') || '').split(',').filter(Boolean);
    var diffs = (p.get('diff') || '').split(',').filter(Boolean);
    if (cats.length) {
      $$('input[name="cat"]').forEach(function (i) { i.checked = cats.indexOf(i.value) > -1; });
    }
    if (diffs.length) {
      $$('input[name="diff"]').forEach(function (i) { i.checked = diffs.indexOf(i.value) > -1; });
    }
    if (p.get('unique') === '1') uniq.checked = true;
    return true;
  }

  goBtn.addEventListener('click', generate);
  shareBtn.addEventListener('click', copyShare);
  inputN.addEventListener('keydown', function (e) { if (e.key === 'Enter') generate(); });
  $$('input[name="cat"], input[name="diff"]').forEach(function (i) {
    i.addEventListener('change', function () {
      used = [];
      out.innerHTML = '';
      status.textContent = '';
    });
  });

  fetch('/data/objects.json')
    .then(function (r) { return r.json(); })
    .then(function (d) {
      DATA = d;
      if (readUrl()) generate();
    })
    .catch(function () {
      status.textContent = 'Could not load the object list. Please refresh the page.';
    });
})();
