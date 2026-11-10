/* ============ Motion: scroll reveals, scroll progress, count-up ============
   Everything is visible by default. Reveals are added only when the view changes, and only to blocks
   that are still below the fold, so a re-render (or a script that fails) never hides content.
   With "reduce motion" on, nothing moves: blocks are simply there. */
const Motion = {
  io: null, scroller: null, onScroll: null, raf: 0,
  reduced() { return matchMedia('(prefers-reduced-motion: reduce)').matches; },
  /** Called after every render. fresh = the page changed; false = the same page was redrawn. */
  after(fresh) {
    const app = $('#app'); if (!app) return;
    app.classList.toggle('still', !fresh);
    this.bindScroll();
    if (this.io) { this.io.disconnect(); this.io = null; }
    if (!fresh || this.reduced() || !('IntersectionObserver' in window)) return;
    const root = $('#main') || null; const vh = root ? root.clientHeight : innerHeight; const top0 = root ? root.getBoundingClientRect().top : 0;
    this.io = new IntersectionObserver(entries => {
      for (const e of entries) if (e.isIntersecting) { e.target.classList.add('rv-in'); this.io.unobserve(e.target); }
    }, { root, rootMargin: '0px 0px -6% 0px', threshold: 0.04 });
    let i = 0;
    for (const el of this.targets()) {
      if (el.getBoundingClientRect().top - top0 < vh * 0.94) continue;      // already on screen: leave it alone
      el.classList.add('rv'); el.style.setProperty('--rv-d', (i++ % 3) * 60 + 'ms'); this.io.observe(el);
    }
    this.countUp();
  },
  /** The blocks that reveal: cards and list rows, not the layout wrappers around them. */
  targets() {
    const c = $('#content'); if (!c) return [];
    const out = [];
    const walk = (el, depth) => { if (depth < 3 && el.matches('.grid, .stack, .kanban, form.stack') && !el.matches('.card')) [...el.children].forEach(ch => walk(ch, depth + 1)); else out.push(el); };
    [...c.children].forEach(ch => walk(ch, 0));
    return out.filter(el => !el.matches('.banner, script, style'));
  },
  bindScroll() {
    const target = $('#main') || window;
    if (this.scroller && this.onScroll) this.scroller.removeEventListener('scroll', this.onScroll);
    this.scroller = target;
    this.onScroll = () => { if (this.raf) return; this.raf = requestAnimationFrame(() => { this.raf = 0; this.paint(); }); };
    target.addEventListener('scroll', this.onScroll, { passive: true });
    this.paint();
  },
  /** Scroll-linked state: reading progress under the header, header shadow, back-to-top, and the sign-in page's pipeline. */
  paint() {
    const m = $('#main');
    if (m) {
      const max = m.scrollHeight - m.clientHeight, y = m.scrollTop;
      const bar = $('#scroll-prog'); if (bar) bar.style.transform = `scaleX(${max > 80 ? Math.min(1, y / max) : 0})`;
      const top = $('#top'); if (top) top.classList.toggle('scrolled', y > 6);
      const up = $('#to-top'); if (up) up.hidden = y < 700;
    }
    const pipe = $('#pipe'); if (!pipe) return;
    const doc = document.documentElement; const atEnd = scrollY + innerHeight >= doc.scrollHeight - 4;
    const mark = innerHeight * 0.66; const steps = $$('.pipe-step', pipe);
    const on = steps.map(li => this.reduced() || atEnd || li.getBoundingClientRect().top + 16 < mark);
    steps.forEach((li, i) => { li.classList.toggle('on', on[i]); li.classList.toggle('through', !!on[i + 1]); });
  },
  countUp() {
    $$('[data-count]').forEach(el => {
      const n = +el.dataset.count; if (!(n > 0)) return; const t0 = performance.now();
      const tick = t => { const k = Math.min(1, (t - t0) / 600); el.textContent = Math.round(n * (1 - Math.pow(1 - k, 3))); if (k < 1 && el.isConnected) requestAnimationFrame(tick); };
      requestAnimationFrame(tick);
    });
  },
};
addEventListener('resize', () => Motion.paint(), { passive: true });
