/*
 * ZeussTV addon for TizenTube Cobalt (personal use).
 *
 * TizenTube downloads its userscript from jsDelivr at every start. In the patched TizenTube app that address points here instead.
 * This loader:
 *   1. runs the real TizenTube userscript (ad blocker, SponsorBlock ...) right away, before YouTube loads its first page: from a copy
 *      kept in the page's storage when there is one, else downloaded synchronously. A fresh copy is fetched in the background for the
 *      next start. (Loading it later let the first page of YouTube through with ads.)
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

  // 1. The real TizenTube script, at once.
  var how = 'none';
  try {
    var cached = null;
    try { cached = localStorage.getItem(CACHE); } catch (e) {}
    if (cached && cached.length > 10000) {
      run(cached); how = 'cache';
    } else {
      var x = new XMLHttpRequest();
      x.open('GET', ORIGINAL + '?v=' + Math.floor(Date.now() / 3600000), false); // synchronous on purpose
      x.send();
      if (x.status === 200 && x.responseText.length > 10000) { run(x.responseText); store(x.responseText); how = 'download'; }
      else how = 'HTTP ' + x.status;
    }
  } catch (e) { how = 'failed: ' + e; }
  post('/hello', { tizentube: how, policy: !!policy });

  // Fresh copy for the next start.
  setTimeout(function () {
    fetch(ORIGINAL + '?v=' + Math.floor(Date.now() / 3600000)).then(function (r) { return r.ok ? r.text() : null; }).then(store).catch(function () {});
  }, 20000);

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
