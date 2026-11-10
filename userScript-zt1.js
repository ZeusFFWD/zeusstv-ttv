/*
 * ZeussTV addon for TizenTube Cobalt (personal use).
 *
 * TizenTube downloads its userscript from jsDelivr at every start. In the patched TizenTube app that address points here instead.
 * This loader:
 *   1. loads the real TizenTube userscript (ad blocker, SponsorBlock ...), unchanged, from its usual place;
 *   2. loads the ZeussTV part from ZeussTV Pro on the same TV (127.0.0.1), which reports what is playing for Continue Watching.
 *      That part lives in the ZeussTV app, so it can change with app updates without touching this file.
 * YouTube's page enforces Trusted Types, so scripts are passed through a policy.
 */
(function () {
  var ORIGINAL = 'https://cdn.jsdelivr.net/npm/@foxreis/tizentube/dist/userScript.js';
  var ZEUSS = 'http://127.0.0.1:8723/tizentube';

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
  function run(code) {
    var c = policy ? policy.createScript(code) : code;
    (0, eval)(c);
  }

  // 1. The real TizenTube script, as text, run in the page.
  fetch(ORIGINAL + '?v=' + Math.floor(Date.now() / 3600000))
    .then(function (r) { return r.text(); })
    .then(function (t) { run(t); post('/hello', { tizentube: 'loaded', policy: !!policy }); })
    .catch(function (e) { post('/hello', { tizentube: 'failed: ' + e, policy: !!policy }); });

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
