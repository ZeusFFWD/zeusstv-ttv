/*
 * ZeussTV addon for TizenTube Cobalt (personal use).
 *
 * TizenTube downloads its userscript from jsDelivr at every start. In the patched TizenTube app that address points here instead.
 * This loader:
 *   1. runs the real TizenTube userscript (ad blocker, SponsorBlock ...): from a copy kept in the page's storage when there is one,
 *      so it is in place before YouTube loads its first page, else downloaded first. A fresh copy is kept for the next start.
 *   2. loads the ZeussTV part from ZeussTV Pro on the same TV (127.0.0.1), which reports what is playing for Continue Watching.
 * YouTube's page enforces Trusted Types, so scripts are passed through a policy.
 */
(function () {
  var ORIGINAL = 'https://cdn.jsdelivr.net/npm/@foxreis/tizentube/dist/userScript.js';
  var ZEUSS = 'http://127.0.0.1:8723/tizentube';
  var CACHE = 'zeusstv-tt-userscript';

  var policy = null;
  try {
    if (window.trustedTypes && trustedTypes.createPolicy) {
      policy = trustedTypes.createPolicy('zeusstv-loader', {
        createScript: function (s) { return s; },
        createScriptURL: function (s) { return s; },
      });
    }
  } catch (e) { policy = null; }

  function post(path, obj) {
    try { fetch(ZEUSS + path, { method: 'POST', headers: { 'Content-Type': 'text/plain' }, body: JSON.stringify(obj) }).catch(function () {}); } catch (e) {}
  }
  function run(code) { (0, eval)(policy ? policy.createScript(code) : code); }
  function store(t) { try { if (t && t.length > 10000) localStorage.setItem(CACHE, t); } catch (e) {} }

  // 1. The real TizenTube script: at once from the copy kept on the TV when there is one (so it is in place before YouTube loads
  //    its first page), else downloaded (the way that is known to work on Cobalt) and kept for the next start.
  //    Never both: a copy that ran is only refreshed in the background.
  var ran = false;
  try {
    var cached = null;
    try { cached = localStorage.getItem(CACHE); } catch (e) {}
    if (cached && cached.length > 10000) { run(cached); ran = true; post('/hello', { tizentube: 'cache', policy: !!policy }); }
  } catch (e) { ran = false; post('/hello', { tizentube: 'cache failed: ' + e, policy: !!policy }); }
  fetch(ORIGINAL + '?v=' + Math.floor(Date.now() / 3600000))
    .then(function (r) { return r.ok ? r.text() : Promise.reject('HTTP ' + r.status); })
    .then(function (t) {
      store(t);
      if (!ran) { run(t); ran = true; post('/hello', { tizentube: 'download', policy: !!policy }); }
    })
    .catch(function (e) { if (!ran) post('/hello', { tizentube: 'failed: ' + e, policy: !!policy }); });

  // 2. The ZeussTV part from the ZeussTV app (retried: ZeussTV may start later than TizenTube).
  var tries = 0;
  function loadZeuss() {
    fetch(ZEUSS + '/addon.js')
      .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.text(); })
      .then(function (t) { run(t); post('/hello', { zeuss: 'loaded' }); })
      .catch(function () { if (++tries < 20) setTimeout(loadZeuss, 30000); });
  }
  loadZeuss();
})();
