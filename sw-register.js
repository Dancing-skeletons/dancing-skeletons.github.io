// Registers the service worker and injects the "MAJ" button.
// Clicking MAJ = the app equivalent of `git pull`: it fetches the newly
// deployed site from GitHub Pages into the offline cache, then reloads.
(function () {
  "use strict";
  if (!('serviceWorker' in navigator)) return;
  if (window.self !== window.top) return; // don't run inside the editor preview iframe

  var applyingUpdate = false;

  var btn = document.createElement('button');
  btn.id = 'sw-update-btn';
  btn.type = 'button';
  btn.textContent = 'MAJ';
  btn.title = 'Mettre à jour le site depuis la dernière version en ligne (fonctionne hors-ligne ensuite)';
  var st = btn.style;
  st.position = 'fixed'; st.left = '10px'; st.bottom = '10px'; st.zIndex = '10000';
  st.padding = '.35rem .7rem'; st.borderRadius = '7px'; st.border = '1px solid #cdd7e5';
  st.background = 'rgba(238,242,247,.92)'; st.color = '#2c4a6e';
  st.font = '700 .8rem system-ui, sans-serif'; st.cursor = 'pointer';

  function setReady(v) {
    btn.textContent = v ? 'MAJ dispo' : 'MAJ';
    st.background = v ? '#def7e6' : 'rgba(238,242,247,.92)';
    st.borderColor = v ? '#0a7d33' : '#cdd7e5';
    st.color = v ? '#0a7d33' : '#2c4a6e';
  }

  function mount() { document.body.appendChild(btn); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount);
  else mount();

  var reg = null;

  navigator.serviceWorker.addEventListener('controllerchange', function () {
    // only reload when we asked for the update ourselves (avoids loops)
    if (applyingUpdate) window.location.reload();
  });

  function activate(sw) {
    applyingUpdate = true;
    sw.postMessage({ type: 'SKIP_WAITING' });
  }

  navigator.serviceWorker.register('/sw.js').then(function (r) {
    reg = r;
    if (r.waiting && navigator.serviceWorker.controller) setReady(true);
    r.addEventListener('updatefound', function () {
      var sw = r.installing;
      if (!sw) return;
      sw.addEventListener('statechange', function () {
        if (sw.state === 'installed' && navigator.serviceWorker.controller) activate(sw);
      });
    });
  }).catch(function () {
    // service workers need HTTPS (or localhost); ignore otherwise
  });

  btn.addEventListener('click', function () {
    if (!reg) return;
    if (reg.waiting && navigator.serviceWorker.controller) { activate(reg.waiting); return; }
    btn.textContent = '…';
    reg.update().then(function () {
      setTimeout(function () {
        if (reg.waiting && navigator.serviceWorker.controller) { activate(reg.waiting); return; }
        btn.textContent = 'à jour';
        setTimeout(function () { setReady(false); }, 2000);
      }, 600);
    });
  });
})();
