(function () {
  var root = document.documentElement;
  var KEY = root.getAttribute('data-lang-key') || 'lang', DEF = root.getAttribute('data-default') || 'af';
  function setLang(l) {
    root.setAttribute('data-lang', l); root.setAttribute('lang', l);
    document.querySelectorAll('.lang button').forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.lang === l)); });
    try { localStorage.setItem(KEY, l); } catch (e) {}
  }
  var saved = DEF; try { saved = localStorage.getItem(KEY) || DEF; } catch (e) {}
  setLang(saved === 'af' ? 'af' : 'en');
  document.querySelectorAll('.lang button').forEach(function (b) { b.addEventListener('click', function () { setLang(b.dataset.lang); }); });
  var ba = document.querySelector('.ba'), rg = ba && ba.querySelector('input');
  if (rg) rg.addEventListener('input', function () { ba.style.setProperty('--pos', rg.value + '%'); });
})();
