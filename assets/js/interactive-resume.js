/**
 * INTERACTIVE RESUME
 * A vertical journey with a side-scroller skin: a rail is drawn down the page
 * and a pixel player rides it as you scroll.
 *
 * Design constraints this file honours:
 *  - No libraries, no images. The rail is a generated SVG path.
 *  - All résumé content already exists as plain text in the DOM. Nothing here
 *    creates content, so the page is fully readable with JS disabled.
 *  - prefers-reduced-motion: no player, no parallax, rail drawn instantly,
 *    counters show their final value (which is also their markup default).
 */
(function () {
  'use strict';

  const ir = document.getElementById('ir');
  if (!ir) return;

  const spine     = document.getElementById('irSpine');
  const pathBg    = document.getElementById('irSpineBg');
  const pathFg    = document.getElementById('irSpineFg');
  const player    = document.getElementById('irPlayer');
  const levels    = Array.from(ir.querySelectorAll('.ir-level'));
  const railLinks = Array.from(ir.querySelectorAll('.ir-rail a'));
  const levelNum  = document.getElementById('irLevelNum');
  const levelName = document.getElementById('irLevelName');
  const coinsEl   = document.getElementById('irCoins');
  const coinsTotalEl = document.getElementById('irCoinsTotal');
  const announce  = document.getElementById('irAnnounce');

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  let pathLength = 0;
  let collected = 0;
  let currentLevel = 0;
  let ticking = false;

  const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

  /* ---------------------------------------------------------------------
   * Build the rail: a sine wave in *pixel* coordinates so the viewBox maps
   * 1:1 to the container. That keeps getPointAtLength() uniform (no skew
   * from preserveAspectRatio) and lets us place the player with plain
   * translate3d instead of matrix maths.
   * ------------------------------------------------------------------- */
  function buildPath() {
    const w = ir.clientWidth;
    const h = ir.offsetHeight;
    if (!w || !h) return;

    const amp  = Math.min(150, w * 0.16);
    const wave = 820;                    // px per full oscillation
    const step = 12;

    let d = '';
    for (let y = 0; y <= h; y += step) {
      const x = w / 2 + amp * Math.sin((2 * Math.PI * y) / wave);
      d += (y === 0 ? 'M' : 'L') + x.toFixed(1) + ' ' + y.toFixed(1) + ' ';
    }
    const endX = w / 2 + amp * Math.sin((2 * Math.PI * h) / wave);
    d += 'L' + endX.toFixed(1) + ' ' + h.toFixed(1);

    spine.setAttribute('viewBox', `0 0 ${w} ${h}`);
    spine.setAttribute('width', w);
    spine.setAttribute('height', h);
    pathBg.setAttribute('d', d);
    pathFg.setAttribute('d', d);

    pathLength = pathFg.getTotalLength();
    pathFg.style.strokeDasharray = pathLength;
    pathFg.style.strokeDashoffset = reduceMotion.matches ? 0 : pathLength;
  }

  /* --------------------------------------------------------------------- */
  function scrollProgress() {
    const top = ir.offsetTop;
    const h = ir.offsetHeight;
    const focus = window.scrollY + window.innerHeight * 0.5;
    return clamp((focus - top) / h, 0, 1);
  }

  function updateRail(p) {
    if (!pathLength) return;
    pathFg.style.strokeDashoffset = pathLength * (1 - p);

    if (reduceMotion.matches || !player) return;

    const at = clamp(p * pathLength, 0, pathLength);
    const pt = pathFg.getPointAtLength(at);
    const ahead = pathFg.getPointAtLength(clamp(at + 6, 0, pathLength));

    player.style.transform = `translate3d(${pt.x}px, ${pt.y}px, 0)`;
    player.classList.toggle('is-flipped', ahead.x < pt.x);
  }

  function updateLevels() {
    const irTop = ir.offsetTop;
    const irH = ir.offsetHeight;

    // `lv.offsetTop` is measured from `.ir` (its offset parent), so it must be
    // rebased before comparing with document-space scroll coordinates.
    //
    // The focus line is also clamped into the container: at the bottom of the
    // page it otherwise lands in the footer, past every level, and the HUD
    // would freeze on whichever level was last matched.
    const focus = clamp(window.scrollY + window.innerHeight * 0.5, irTop, irTop + irH - 1);

    let active = levels[0];

    levels.forEach((lv) => {
      const top = irTop + lv.offsetTop;
      const h = lv.offsetHeight;
      // 0 -> 1 as the level travels through the viewport focus line
      const p = clamp((focus - top) / h, 0, 1);
      if (!reduceMotion.matches) lv.style.setProperty('--lvl-p', p.toFixed(3));
      if (focus >= top) active = lv;      // last level we've reached wins
    });

    const n = Number(active.dataset.level);
    if (n === currentLevel) return;

    currentLevel = n;
    if (levelNum) levelNum.textContent = n;
    if (levelName) levelName.textContent = active.dataset.name;
    railLinks.forEach((a) => {
      if (Number(a.dataset.jump) === n) a.setAttribute('aria-current', 'true');
      else a.removeAttribute('aria-current');
    });
    if (announce) announce.textContent = `Level ${n} of ${levels.length}: ${active.dataset.name}`;
  }

  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      const p = scrollProgress();
      updateRail(p);
      updateLevels();
      ticking = false;
    });
  }

  /* ---------------------------------------------------------------------
   * Coins: skills pop as their group scrolls into view, and the HUD counts.
   * ------------------------------------------------------------------- */
  function initCoins() {
    const coins = Array.from(ir.querySelectorAll('.ir-coin'));
    if (coinsTotalEl) coinsTotalEl.textContent = coins.length;
    if (!coins.length) return;

    const collect = (coin, delay) => {
      if (coin.dataset.done) return;
      coin.dataset.done = '1';
      const apply = () => {
        coin.classList.add('is-collected');
        collected += 1;
        if (coinsEl) coinsEl.textContent = collected;
      };
      if (reduceMotion.matches) apply();
      else setTimeout(apply, delay);
    };

    if (!('IntersectionObserver' in window)) {
      coins.forEach((c) => collect(c, 0));
      return;
    }

    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const group = entry.target;
        Array.from(group.querySelectorAll('.ir-coin')).forEach((c, i) => collect(c, i * 55));
        io.unobserve(group);
      });
    }, { threshold: 0.25 });

    ir.querySelectorAll('.ir-coins').forEach((g) => io.observe(g));
  }

  /* ---------------------------------------------------------------------
   * Score counters. Markup already contains the final value, so if anything
   * here fails the numbers are still correct.
   * ------------------------------------------------------------------- */
  function initScores() {
    const nums = Array.from(ir.querySelectorAll('.ir-num'));
    if (!nums.length || reduceMotion.matches || !('IntersectionObserver' in window)) return;

    const run = (el) => {
      const target = parseFloat(el.dataset.count);
      const decimals = Number(el.dataset.decimals || 0);
      const suffix = el.dataset.suffix || '';
      const dur = 1100;

      const finalise = () => { el.textContent = target.toFixed(decimals) + suffix; };

      // requestAnimationFrame is paused in background tabs. If the counter is
      // triggered while hidden, a half-finished number would be left on screen
      // (e.g. "1.1%" instead of "99.9%"), so just show the real value.
      if (document.hidden) { finalise(); return; }

      // Belt and braces: whatever happens to the rAF loop, land on the truth.
      const safety = setTimeout(finalise, dur + 600);
      const t0 = performance.now();

      const tick = (now) => {
        const t = clamp((now - t0) / dur, 0, 1);
        const eased = 1 - Math.pow(1 - t, 3);
        el.textContent = (target * eased).toFixed(decimals) + suffix;
        if (t < 1) { requestAnimationFrame(tick); return; }
        clearTimeout(safety);
        finalise();
      };
      requestAnimationFrame(tick);
    };

    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        run(entry.target);
        io.unobserve(entry.target);
      });
    }, { threshold: 0.6 });

    nums.forEach((n) => io.observe(n));
  }

  /* --------------------------------------------------------------------- */
  let resizeTimer;
  function onResize() {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      buildPath();
      onScroll();
    }, 150);
  }

  function init() {
    buildPath();
    ir.classList.add('ir--ready');
    initCoins();
    initScores();
    onScroll();

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onResize);

    // Fonts/images settling can change offsetHeight; re-measure once.
    window.addEventListener('load', () => { buildPath(); onScroll(); });

    // Honour a live change of the OS motion preference.
    const onMotionChange = () => { buildPath(); onScroll(); };
    if (reduceMotion.addEventListener) reduceMotion.addEventListener('change', onMotionChange);
    else if (reduceMotion.addListener) reduceMotion.addListener(onMotionChange);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
