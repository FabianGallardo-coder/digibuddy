/* digibuddy docs — theme toggle + code copy buttons */
(function () {
  'use strict';

  /* ---- theme toggle (persisted, respects OS until user chooses) ---- */
  function currentTheme() {
    var explicit = document.documentElement.dataset.theme;
    if (explicit) return explicit;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  document.querySelectorAll('[data-theme-toggle]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var next = currentTheme() === 'dark' ? 'light' : 'dark';
      document.documentElement.dataset.theme = next;
      try { localStorage.setItem('theme', next); } catch (e) {}
      btn.setAttribute('aria-label', 'Switch to ' + (next === 'dark' ? 'light' : 'dark') + ' theme');
    });
  });

  /* ---- copy button on every code block ---- */
  function flash(btn) {
    btn.dataset.copied = 'true';
    btn.textContent = 'Copied!';
    setTimeout(function () {
      btn.dataset.copied = 'false';
      btn.textContent = 'Copy';
    }, 1600);
  }

  document.querySelectorAll('pre').forEach(function (pre) {
    var code = pre.querySelector('code');
    if (!code) return;

    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'copy-btn';
    btn.textContent = 'Copy';
    btn.setAttribute('aria-label', 'Copy code to clipboard');
    pre.appendChild(btn);

    btn.addEventListener('click', function () {
      var text = code.textContent;
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(function () { flash(btn); },
          function () { fallbackCopy(text, btn); });
      } else {
        fallbackCopy(text, btn);
      }
    });
  });

  function fallbackCopy(text, btn) {
    var ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.left = '-9999px';
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); flash(btn); } catch (e) {}
    document.body.removeChild(ta);
  }
})();
