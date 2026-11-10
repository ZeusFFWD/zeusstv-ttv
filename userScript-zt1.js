/*
 * ZeussTV addon for TizenTube Cobalt (personal use).
 *
 * TizenTube downloads its userscript from jsDelivr at every start. In the patched TizenTube app that address points here instead.
 * This script:
 *   1. loads the real TizenTube userscript (ad blocker, SponsorBlock ...), unchanged, from its usual place;
 *   2. tells ZeussTV Pro on the same TV what is playing (video id, position, length), so ZeussTV can put it in Continue Watching.
 * Nothing leaves the TV except the normal TizenTube download: the reports go to 127.0.0.1 (ZeussTV on the TV itself).
 */
(function () {
  var ORIGINAL = 'https://cdn.jsdelivr.net/npm/@foxreis/tizentube/dist/userScript.js';
  var ZEUSS = 'http://127.0.0.1:8723/tizentube';

  function log(m) { try { console.log('[ZeussTV] ' + m); } catch (e) {} }

  // Tell ZeussTV how the script itself got on (for the first test).
  function hello(how) {
    try { fetch(ZEUSS + '/hello', { method: 'POST', headers: { 'Content-Type': 'text/plain' }, body: JSON.stringify({ how: how, ua: navigator.userAgent }) }).catch(function () {}); } catch (e) {}
  }

  // 1. The real TizenTube script. First as a script tag; if the page does not allow that, as text that is run.
  function loadOriginal() {
    var done = false;
    try {
      var s = document.createElement('script');
      s.src = ORIGINAL + '?v=' + Math.floor(Date.now() / 3600000);
      s.onload = function () { done = true; log('TizenTube loaded (script tag)'); hello('tag'); };
      s.onerror = function () { if (!done) viaFetch(); };
      (document.head || document.documentElement).appendChild(s);
    } catch (e) { viaFetch(); }
    function viaFetch() {
      fetch(ORIGINAL).then(function (r) { return r.text(); }).then(function (t) {
        (0, eval)(t); done = true; log('TizenTube loaded (fetch)'); hello('fetch');
      }).catch(function (e) { log('TizenTube not loaded: ' + e); hello('failed: ' + e); });
    }
  }
  loadOriginal();

  // 2. What is playing. YouTube TV keeps the video id in the address (#/watch?v=...).
  function videoId() {
    var m = /[?&]v=([A-Za-z0-9_-]{11})/.exec(location.hash || '') || /[?&]v=([A-Za-z0-9_-]{11})/.exec(location.search || '');
    return m ? m[1] : null;
  }
  var lastSent = 0, lastId = null;
  function report(force) {
    var v = document.querySelector('video');
    var id = videoId();
    if (!v || !id || !(v.duration > 0) || !isFinite(v.duration)) return;
    if (v.duration < 60) return; // shorts and clips: not worth a Continue Watching card
    var now = Date.now();
    if (!force && now - lastSent < 20000 && id === lastId) return;
    lastSent = now; lastId = id;
    var body = { id: id, pos: Math.floor(v.currentTime), dur: Math.floor(v.duration), paused: v.paused, title: (document.title || '') };
    try {
      fetch(ZEUSS + '/progress', { method: 'POST', headers: { 'Content-Type': 'text/plain' }, body: JSON.stringify(body) }).catch(function () {});
    } catch (e) {}
  }
  setInterval(function () { report(false); }, 5000);
  document.addEventListener('pause', function () { report(true); }, true);
  document.addEventListener('ended', function () { report(true); }, true);
  window.addEventListener('hashchange', function () { report(true); });
})();
