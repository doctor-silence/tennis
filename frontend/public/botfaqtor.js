window._ab_id_ = 172346;

(function () {
  var src = 'https://cdn.botfaqtor.ru/one.js';
  for (var j = 0; j < document.scripts.length; j++) {
    if (document.scripts[j].src === src) return;
  }
  var s = document.createElement('script');
  s.src = src;
  s.async = true;
  (document.head || document.documentElement).appendChild(s);
})();
