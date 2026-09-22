(function () {
  var root = document.documentElement;
  function setLang(l) {
    root.setAttribute('data-lang', l); root.setAttribute('lang', l);
    document.querySelectorAll('.lang button').forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.lang === l)); });
    try { localStorage.setItem('lang', l); } catch (e) {}
  }
  var saved = 'af'; try { saved = localStorage.getItem('lang') || 'af'; } catch (e) {}
  setLang(saved === 'en' ? 'en' : 'af');
  document.querySelectorAll('.lang button').forEach(function (b) { b.addEventListener('click', function () { setLang(b.dataset.lang); }); });
  var ba = document.querySelector('.ba'), rg = ba && ba.querySelector('input');
  if (rg) rg.addEventListener('input', function () { ba.style.setProperty('--pos', rg.value + '%'); });
})();
