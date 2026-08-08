/* Background music player for Miles' Workshop.
   - Plays a looping track quietly in the background.
   - Resumes position + on/off state across page navigations (via sessionStorage)
     so audio is near-seamless when moving between pages.
   - Autoplay-with-sound is blocked by browsers until the user interacts, so if the
     initial play() is rejected we start on the first user gesture. The toggle
     button also lets the visitor start/stop the music. */
(function () {
  var audio = document.getElementById('bg-music');
  var btn = document.getElementById('music-toggle');
  if (!audio || !btn) return;

  var KEY_TIME = 'mw-audio-time';
  var KEY_ON = 'mw-audio-on';

  audio.loop = true;
  audio.volume = 0.15; // quiet background level

  var savedTime = parseFloat(sessionStorage.getItem(KEY_TIME));
  var onFlag = sessionStorage.getItem(KEY_ON);
  var wantOn = (onFlag === null) ? true : (onFlag === '1'); // default: music on

  // Restore the saved playback position exactly once, when the track is seekable.
  var restored = false;
  function restoreTime() {
    if (restored || isNaN(savedTime) || audio.readyState < 1) return;
    restored = true;
    try { audio.currentTime = savedTime; } catch (e) {}
  }
  audio.addEventListener('loadedmetadata', restoreTime);
  if (audio.readyState >= 1) restoreTime();

  function tryPlay() {
    restoreTime();
    var p = audio.play();
    if (p && typeof p.catch === 'function') p.catch(function () {}); // ignore autoplay block
  }

  function refreshButton() {
    var playing = !audio.paused;
    btn.textContent = playing ? '🔊' : '🔇'; // 🔊 / 🔇
    btn.setAttribute('title', playing ? 'Music on — click to mute' : 'Music off — click to play');
    btn.setAttribute('aria-pressed', String(playing));
  }
  audio.addEventListener('play', refreshButton);
  audio.addEventListener('pause', refreshButton);

  // Try to start on load; fall back to the first user gesture if the browser blocks it.
  if (wantOn) {
    tryPlay();
    audio.addEventListener('canplay', function () { if (wantOn && audio.paused) tryPlay(); }, { once: true });

    var events = ['pointerdown', 'keydown', 'touchstart'];
    var kick = function (e) {
      if (btn.contains(e.target)) return; // the button handles its own clicks
      if (wantOn && audio.paused) tryPlay();
      events.forEach(function (ev) { document.removeEventListener(ev, kick, true); });
    };
    events.forEach(function (ev) { document.addEventListener(ev, kick, true); });
  }

  btn.addEventListener('click', function () {
    if (audio.paused) { wantOn = true; tryPlay(); }
    else { wantOn = false; audio.pause(); }
    save();
    refreshButton();
  });

  // Persist state so the next page can pick up where this one left off.
  function save() {
    try {
      sessionStorage.setItem(KEY_TIME, String(audio.currentTime || 0));
      sessionStorage.setItem(KEY_ON, wantOn ? '1' : '0');
    } catch (e) {}
  }
  var lastSave = 0;
  audio.addEventListener('timeupdate', function () {
    var now = Date.now();
    if (now - lastSave > 1500) { lastSave = now; save(); }
  });
  window.addEventListener('pagehide', save);
  window.addEventListener('beforeunload', save);

  refreshButton();
})();
