/* Background music mini-player for Miles' Workshop.
   Features: song title, play/pause, seek bar with time, mute, volume.
   - Plays a looping track quietly; volume is adjustable and remembered.
   - Autoplay-with-sound is blocked by browsers until the user interacts, so if the
     initial play() is rejected we start on the first user gesture.
   - Persists position, on/off, volume and mute in sessionStorage and resumes on the
     next page, so audio is near-seamless when moving between pages. */
(function () {
  var audio = document.getElementById('bg-music');
  if (!audio) return;

  var player = document.getElementById('audio-player');
  var playBtn = document.getElementById('ap-play');
  var seek = document.getElementById('ap-seek');
  var timeEl = document.getElementById('ap-time');
  var muteBtn = document.getElementById('ap-mute');
  var vol = document.getElementById('ap-vol');

  var K = { time: 'mw-audio-time', on: 'mw-audio-on', vol: 'mw-audio-vol', muted: 'mw-audio-muted' };
  var DEFAULT_VOL = 0.05; // quiet background level

  audio.loop = true;

  // ----- restore persisted state -----
  var savedTime = parseFloat(sessionStorage.getItem(K.time));
  var savedOn = sessionStorage.getItem(K.on);
  var savedVol = parseFloat(sessionStorage.getItem(K.vol));
  var savedMuted = sessionStorage.getItem(K.muted);

  var wantOn = (savedOn === null) ? true : (savedOn === '1');
  audio.volume = isNaN(savedVol) ? DEFAULT_VOL : savedVol;
  audio.muted = (savedMuted === '1');
  if (vol) vol.value = audio.volume;

  var seeking = false;
  var restored = false;
  function restoreTime() {
    if (restored || isNaN(savedTime) || audio.readyState < 1) return;
    restored = true;
    try { audio.currentTime = savedTime; } catch (e) {}
  }

  // ----- helpers / display -----
  function fmt(s) {
    if (!isFinite(s) || s < 0) return '0:00';
    s = Math.floor(s);
    var m = Math.floor(s / 60), sec = s % 60;
    return m + ':' + (sec < 10 ? '0' : '') + sec;
  }
  function updateTime() {
    if (timeEl) timeEl.textContent = fmt(audio.currentTime) + ' / ' + fmt(audio.duration);
    if (seek && !seeking && audio.duration) seek.value = audio.currentTime;
  }
  function updatePlayBtn() {
    if (!playBtn) return;
    playBtn.textContent = audio.paused ? '▶' : '⏸'; // ▶ / ⏸
    playBtn.setAttribute('aria-pressed', String(!audio.paused));
  }
  function updateMuteBtn() {
    if (!muteBtn) return;
    var off = audio.muted || audio.volume === 0;
    muteBtn.textContent = off ? '🔇' : '🔊'; // 🔇 / 🔊
  }

  function tryPlay() {
    restoreTime();
    var p = audio.play();
    if (p && typeof p.catch === 'function') p.catch(function () {}); // ignore autoplay block
  }

  // ----- metadata: set seek range + restore position -----
  function onMeta() {
    if (seek) seek.max = audio.duration || 0;
    restoreTime();
    updateTime();
  }
  audio.addEventListener('loadedmetadata', onMeta);
  if (audio.readyState >= 1) onMeta();

  audio.addEventListener('timeupdate', updateTime);
  audio.addEventListener('play', updatePlayBtn);
  audio.addEventListener('pause', updatePlayBtn);
  audio.addEventListener('volumechange', updateMuteBtn);

  // ----- controls -----
  if (playBtn) playBtn.addEventListener('click', function () {
    if (audio.paused) { wantOn = true; tryPlay(); } else { wantOn = false; audio.pause(); }
    save();
  });
  if (seek) {
    seek.addEventListener('input', function () {
      seeking = true;
      audio.currentTime = parseFloat(seek.value) || 0;
      updateTime();
    });
    seek.addEventListener('change', function () { seeking = false; save(); });
  }
  if (muteBtn) muteBtn.addEventListener('click', function () {
    audio.muted = !audio.muted;
    if (!audio.muted && audio.volume === 0) {
      audio.volume = DEFAULT_VOL;
      if (vol) vol.value = DEFAULT_VOL;
    }
    save();
  });
  if (vol) vol.addEventListener('input', function () {
    audio.volume = parseFloat(vol.value);
    if (audio.volume > 0) audio.muted = false;
    save();
  });

  // ----- start on load, with a first-gesture fallback -----
  if (wantOn) {
    tryPlay();
    audio.addEventListener('canplay', function () { if (wantOn && audio.paused) tryPlay(); }, { once: true });
    var evs = ['pointerdown', 'keydown', 'touchstart'];
    var kick = function (e) {
      if (player && player.contains(e.target)) return; // the player handles its own controls
      if (wantOn && audio.paused) tryPlay();
      evs.forEach(function (ev) { document.removeEventListener(ev, kick, true); });
    };
    evs.forEach(function (ev) { document.addEventListener(ev, kick, true); });
  }

  // ----- persist for near-seamless playback across pages -----
  function save() {
    try {
      sessionStorage.setItem(K.time, String(audio.currentTime || 0));
      sessionStorage.setItem(K.on, wantOn ? '1' : '0');
      sessionStorage.setItem(K.vol, String(audio.volume));
      sessionStorage.setItem(K.muted, audio.muted ? '1' : '0');
    } catch (e) {}
  }
  var lastSave = 0;
  audio.addEventListener('timeupdate', function () {
    var now = Date.now();
    if (now - lastSave > 1500) { lastSave = now; save(); }
  });
  window.addEventListener('pagehide', save);
  window.addEventListener('beforeunload', save);

  updatePlayBtn();
  updateMuteBtn();
  updateTime();
})();
