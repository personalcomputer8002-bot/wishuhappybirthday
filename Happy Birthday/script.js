/* script.js
   Implements countdown (fixed target Oct 1), phases, audio flow, cake popups, lrc sync, finale sparkles.
   Assets are loaded from /all-assets/
*/

(function () {
  // Elements
  const phaseCountdown = document.getElementById('phase-countdown');
  const phaseReveal = document.getElementById('phase-reveal');
  const phaseCake = document.getElementById('phase-cake');
  const phaseLyrics = document.getElementById('phase-lyrics');
  const phaseFinale = document.getElementById('phase-finale');

  const controls = document.getElementById('controls');
  const cakeBtn = document.getElementById('cakeBtn');
  const songBtn = document.getElementById('songBtn');

  const bgMusic = document.getElementById('bgMusic');
  const perfectAudio = document.getElementById('perfectAudio');

  const cakeVideo = document.getElementById('cakeVideo');
  const cakePopup = document.getElementById('cakePopup');
  const cakePopupText = document.getElementById('cakePopupText');
  const closeCakePopup = document.getElementById('closeCakePopup');
  const confettiGif = document.getElementById('confettiGif');
  const cakeMessage = document.getElementById('cakeMessage');

  const lyricsContainer = document.getElementById('lyricsContainer');
  const lyricsPopup = document.getElementById('lyricsPopup');
  const closeLyricsPopup = document.getElementById('closeLyricsPopup');

  const touchOverlay = document.getElementById('touchOverlay');
  const startBtn = document.getElementById('startBtn');

  const sparklesContainer = document.getElementById('sparkles');

  // Timer elements
  const dEl = document.getElementById('days');
  const hEl = document.getElementById('hours');
  const mEl = document.getElementById('minutes');
  const sEl = document.getElementById('seconds');

  // Fixed target date: October 1 (this is the only place to change)
  // Year: current year or next if date already passed this year.
  (function computeTarget(){
    const now = new Date();
    const year = now.getFullYear();
    let candidate = new Date(`October 1, ${year} 00:00:00`);
    if (candidate - now <= 0) {
      candidate = new Date(`October 1, ${year + 1} 00:00:00`);
    }
    window.TARGET_DATE = candidate.getTime();
  })();

  // State
  let timerInterval = null;
  let lrcLines = []; // {time, text}
  let currentLyricIndex = -1;
  let lyricsTimerBound = false;

  // Utility: show/hide phase
  function showPhase(elem) {
    // hide all phases
    document.querySelectorAll('.phase').forEach(p => {
      p.classList.add('hidden');
      p.classList.remove('visible');
      p.setAttribute('aria-hidden', 'true');
    });
    // show requested
    elem.classList.remove('hidden');
    elem.classList.add('visible');
    elem.setAttribute('aria-hidden', 'false');
  }

  // Autoplay handling: try to play bgMusic, if blocked show overlay
  async function tryStartBackgroundMusic() {
    if (!bgMusic.src) return false;
    try {
      await bgMusic.play();
      return true;
    } catch (e) {
      // show touch overlay to ask user to tap
      touchOverlay.classList.remove('hidden');
      touchOverlay.classList.add('visible');
      touchOverlay.setAttribute('aria-hidden', 'false');
      return false;
    }
  }

  // Start overlay tap
  startBtn && startBtn.addEventListener('click', async () => {
    touchOverlay.classList.add('hidden');
    touchOverlay.classList.remove('visible');
    touchOverlay.setAttribute('aria-hidden', 'true');
    try { await bgMusic.play(); } catch(e){ console.warn(e); }
  });

  // Countdown logic
  function updateCountdown() {
    const now = Date.now();
    const diff = Math.max(0, window.TARGET_DATE - now);
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);

    dEl.textContent = String(days).padStart(2, '0');
    hEl.textContent = String(hours).padStart(2, '0');
    mEl.textContent = String(minutes).padStart(2, '0');
    sEl.textContent = String(seconds).padStart(2, '0');

    if (diff <= 0) {
      clearInterval(timerInterval);
      // transition to reveal
      phaseCountdown.classList.remove('visible');
      phaseCountdown.classList.add('hidden');
      // Attempt to start bg music; if blocked user must tap overlay
      tryStartBackgroundMusic().finally(() => {
        // show reveal & controls
        showPhase(phaseReveal);
        setTimeout(() => { controls.classList.remove('hidden'); controls.classList.add('visible'); controls.setAttribute('aria-hidden','false'); }, 900);
      });
    }
  }

  // Start timer
  timerInterval = setInterval(updateCountdown, 1000);
  updateCountdown();

  /* ---------------------
     Cake Ceremony Behavior
     --------------------- */
  // Ensure cake button only works after reveal
  cakeBtn.addEventListener('click', async () => {
    // show cake phase
    showPhase(phaseCake);
    // play video (birthday music should keep playing in background)
    cakePopup.classList.add('hidden');
    closeCakePopup.setAttribute('disabled', 'false');
    confettiGif.classList.add('hidden');
    cakeMessage.classList.add('hidden');
    try { await cakeVideo.play(); } catch (e) { console.warn('Video play blocked or unavailable', e); }

    // Bind time-based popups
    // we'll track whether each popup shown to avoid repeats in same play.
    let shown1 = false, shown2 = false;

    function onTimeUpdate() {
      const t = cakeVideo.currentTime;
      if (!shown1 && t >= 2 && t < 3.2) {
        shown1 = true;
        showCakePopup("Wait, let me light up the candles for you.");
        cakeVideo.pause();
      } else if (!shown2 && t >= 5 && t < 6.5) {
        shown2 = true;
        showCakePopup("Ready to blow candles in 4...");
        cakeVideo.pause();
      }
    }

    // End handler
    function onEnded() {
      // show confetti + message
      confettiGif.classList.remove('hidden');
      cakeMessage.classList.remove('hidden');
      // after a short display, keep confetti visible until user navigates away
    }

    cakeVideo.addEventListener('timeupdate', onTimeUpdate);
    cakeVideo.addEventListener('ended', onEnded, { once: true });

    // Close popup handler resumes video
    closeCakePopup.onclick = () => {
      hideCakePopup();
      try { cakeVideo.play(); } catch (e) { console.warn(e); }
    };

    // ESC to close
    window.addEventListener('keydown', function escClose(e) {
      if (e.key === 'Escape' && !cakePopup.classList.contains('hidden')) {
        hideCakePopup();
        try { cakeVideo.play(); } catch (e) { console.warn(e); }
      }
    }, { once: true });

    // Remove listeners when leaving phase
    phaseCake.addEventListener('transitionstart', function cleanup() {
      cakeVideo.removeEventListener('timeupdate', onTimeUpdate);
      phaseCake.removeEventListener('transitionstart', cleanup);
    });
  });

  function showCakePopup(text) {
    cakePopupText.textContent = text;
    cakePopup.classList.remove('hidden');
    cakePopup.classList.add('visible');
    cakePopup.setAttribute('aria-hidden', 'false');
  }
  function hideCakePopup() {
    cakePopup.classList.add('hidden');
    cakePopup.classList.remove('visible');
    cakePopup.setAttribute('aria-hidden', 'true');
  }

  /* ---------------------
     Song / Lyrics Behavior
     --------------------- */
  songBtn.addEventListener('click', async () => {
    // Show lyrics phase
    showPhase(phaseLyrics);

    // Pause background music, disable cake button
    try { fadeOutAudio(bgMusic, 700); } catch (_) {}
    cakeBtn.disabled = true;
    cakeBtn.setAttribute('aria-disabled', 'true');

    // Load and parse .lrc file
    try {
      const lrcText = await fetch('all-assets/perfect.lrc').then(r => r.text());
      lrcLines = parseLRC(lrcText);
      renderLyrics(lrcLines);
    } catch (err) {
      lyricsContainer.innerHTML = '<p class="script">Lyrics file not found or failed to load.</p>';
      console.warn('LRC load error:', err);
    }

    // Play perfect audio
    try {
      perfectAudio.currentTime = 0;
      await perfectAudio.play();
    } catch (e) {
      // Playback blocked: prompt overlay to start
      touchOverlay.classList.remove('hidden'); touchOverlay.classList.add('visible');
      touchOverlay.setAttribute('aria-hidden','false');
      startBtn.onclick = async () => {
        touchOverlay.classList.add('hidden'); touchOverlay.classList.remove('visible');
        touchOverlay.setAttribute('aria-hidden','true');
        try { await perfectAudio.play(); } catch (err) { console.warn(err); }
      };
    }

    // Sync lyrics
    if (!lyricsTimerBound) {
      perfectAudio.addEventListener('timeupdate', onPerfectTimeUpdate);
      lyricsTimerBound = true;
    }

    // Show small popup (optional)
    lyricsPopup.classList.remove('hidden');
    lyricsPopup.classList.add('visible');
    lyricsPopup.setAttribute('aria-hidden','false');

    closeLyricsPopup.onclick = () => {
      lyricsPopup.classList.add('hidden');
      lyricsPopup.classList.remove('visible');
      lyricsPopup.setAttribute('aria-hidden','true');
    };

    perfectAudio.onended = () => {
      // clear highlight
      highlightLyric(-1);
      // resume bg music
      fadeInAudio(bgMusic, 700);
      cakeBtn.disabled = false;
      cakeBtn.setAttribute('aria-disabled', 'false');
      // transition to finale after small delay
      setTimeout(() => {
        showPhase(phaseFinale);
        startSparkles();
      }, 700);
    };
  });

  // Parse basic LRC: supports multiple timestamps per line
  function parseLRC(text) {
    const lines = text.split(/\r?\n/);
    const out = [];
    const timeRe = /\[(\d+):(\d+(?:\.\d+)?)\]/g;
    for (const line of lines) {
      let match;
      const texts = line.replace(timeRe, '').trim();
      timeRe.lastIndex = 0;
      while ((match = timeRe.exec(line)) !== null) {
        const min = parseInt(match[1], 10);
        const sec = parseFloat(match[2]);
        const time = min * 60 + sec;
        out.push({ time, text: texts || '' });
      }
    }
    out.sort((a, b) => a.time - b.time);
    return out;
  }

  function renderLyrics(lines) {
    lyricsContainer.innerHTML = '';
    lines.forEach((l, i) => {
      const div = document.createElement('div');
      div.className = 'line';
      div.dataset.idx = i;
      div.textContent = l.text;
      lyricsContainer.appendChild(div);
    });
  }

  function onPerfectTimeUpdate() {
    const t = perfectAudio.currentTime;
    // find current index
    for (let i = 0; i < lrcLines.length; i++) {
      const start = lrcLines[i].time;
      const end = (i + 1 < lrcLines.length) ? lrcLines[i + 1].time : Number.POSITIVE_INFINITY;
      if (t >= start && t < end) {
        if (i !== currentLyricIndex) {
          highlightLyric(i);
        }
        break;
      }
    }
  }

  function highlightLyric(idx) {
    const all = document.querySelectorAll('#lyricsContainer .line');
    all.forEach(el => el.classList.remove('active', 'fade-out'));
    if (idx >= 0 && all[idx]) {
      // fade previous out slightly
      if (currentLyricIndex >= 0 && all[currentLyricIndex]) {
        all[currentLyricIndex].classList.add('fade-out');
      }
      all[idx].classList.add('active');
      // scroll into view (center)
      all[idx].scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    currentLyricIndex = idx;
  }

  /* ---------------------
     Audio fade helpers
     --------------------- */
  function fadeOutAudio(el, dur = 600) {
    if (!el) return;
    const start = el.volume || 1;
    const steps = 20;
    const step = dur / steps;
    let i = 0;
    const iv = setInterval(() => {
      i++;
      const v = Math.max(0, start * (1 - i / steps));
      el.volume = v;
      if (i >= steps) {
        clearInterval(iv);
        try { el.pause(); } catch (_) {}
        el.volume = start;
      }
    }, step);
  }
  function fadeInAudio(el, dur = 800) {
    if (!el) return;
    const target = 0.85;
    el.volume = 0;
    try { el.play().catch(() => {}); } catch (_) {}
    const steps = 20;
    const step = dur / steps;
    let i = 0;
    const iv = setInterval(() => {
      i++;
      const v = Math.min(target, target * (i / steps));
      el.volume = v;
      if (i >= steps) {
        clearInterval(iv);
        el.volume = target;
      }
    }, step);
  }

  /* ---------------------
     Finale sparkles (particles)
     --------------------- */
  function startSparkles() {
    // spawn periodic particles with CSS animations
    const count = 28;
    for (let i = 0; i < count; i++) {
      createSparkle();
      // stagger
      setTimeout(createSparkle, i * 120);
    }
    // keep spawning small bursts
    const interval = setInterval(() => {
      if (!document.body.contains(sparklesContainer)) { clearInterval(interval); return; }
      for (let i = 0; i < 4; i++) createSparkle();
    }, 1500);
  }

  function createSparkle() {
    const s = document.createElement('div');
    s.className = 'sparkle';
    const left = Math.random() * 100;
    s.style.left = left + '%';
    s.style.bottom = '-10px';
    s.style.width = (6 + Math.random() * 8) + 'px';
    s.style.height = s.style.width;
    s.style.background = Math.random() > 0.5 ? '#C0C0FF' : '#B19CD9';
    s.style.boxShadow = `0 0 ${10 + Math.random() * 10}px ${Math.random() > 0.5 ? '#A855F7' : '#D8BFD8'}`;
    s.style.position = 'absolute';
    s.style.borderRadius = '50%';
    s.style.opacity = '1';
    s.style.zIndex = '60';
    s.style.transition = `transform 4s linear, opacity 4s linear, bottom 4s linear`;
    sparklesContainer.appendChild(s);
    // animate
    const rise = - (400 + Math.random() * 600);
    setTimeout(() => {
      s.style.transform = `translateY(${rise}px) rotate(${Math.random() * 360}deg)`;
      s.style.opacity = '0';
    }, 20);
    setTimeout(() => s.remove(), 4200);
  }

  /* ---------------------
     General accessibility & fallback behaviors
     --------------------- */
  // ESC closes popups
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      // close cake popup if open
      if (!cakePopup.classList.contains('hidden')) {
        hideCakePopup();
        try { cakeVideo.play(); } catch (e) { console.warn(e); }
      }
      // close lyrics popup
      if (!lyricsPopup.classList.contains('hidden')) {
        lyricsPopup.classList.add('hidden');
        lyricsPopup.classList.remove('visible');
        lyricsPopup.setAttribute('aria-hidden', 'true');
      }
      // hide overlay if visible
      if (!touchOverlay.classList.contains('hidden')) {
        touchOverlay.classList.add('hidden');
        touchOverlay.classList.remove('visible');
        touchOverlay.setAttribute('aria-hidden', 'true');
      }
    }
  });

  function hideCakePopup() {
    cakePopup.classList.add('hidden');
    cakePopup.classList.remove('visible');
    cakePopup.setAttribute('aria-hidden', 'true');
  }

  /* ---------------------
     Initial setup: ensure assets exist (fail gracefully)
     --------------------- */
  function checkAssets() {
    // video/audio tags will gracefully show fallback text if missing
    // but we show console warnings
    // (Netlify will serve from /all-assets/)
    // Check simple fetch for critical files
    const assets = [
      'all-assets/background.jpeg',
      'all-assets/birthday_music.mp3',
      'all-assets/perfect.mp3',
      'all-assets/cake_video.mp4',
      'all-assets/monkey.gif',
      'all-assets/confetti.gif',
      'all-assets/perfect.lrc'
    ];
    assets.forEach(path => {
      fetch(path, { method: 'HEAD' }).catch(() => console.warn('Asset missing or not accessible:', path));
    });
  }

  checkAssets();

  // When page loads, try autoplay background music (most browsers will block until interaction)
  tryStartBackgroundMusic();

})();
