document.querySelectorAll('.thumbs button').forEach(function (b) {
  b.addEventListener('click', function () {
    document.getElementById('main').src = b.dataset.src;
    document.querySelectorAll('.thumbs button').forEach(function (x) { x.removeAttribute('aria-current'); });
    b.setAttribute('aria-current', 'true');
  });
});
