// Scene picker of the comparison section and the InterBench browser are built from static/js/data.js.
(function () {
  const el = (tag, cls, text) => {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text) e.textContent = text;
    return e;
  };

  // ---- comparison: one scene at a time, all models side by side
  const picker = document.getElementById('compare-picker');
  const grid = document.getElementById('compare-grid');
  if (picker && grid && window.COMPARE_SCENES) {
    const show = (scene, play) => {
      picker.querySelectorAll('button').forEach((b) => b.setAttribute('aria-selected', b.dataset.scene === scene.scene));
      const prompt = document.getElementById('compare-prompt');
      prompt.textContent = '';
      prompt.append(el('b', '', 'Prompt: '), '“' + scene.prompt + '”');
      grid.textContent = '';
      window.COMPARE_MODELS.forEach((m) => {
        const fig = el('figure', 'panel');
        const head = el('div', 'panel-head');
        head.append(el('span', 'tag ' + m.kind, m.name));
        fig.append(head);
        if (scene.missing.includes(m.id)) {
          fig.append(el('div', 'missing', 'No video produced'));
        } else {
          const v = el('video', 'clip');
          v.muted = true;
          v.playsInline = true;
          v.preload = 'none';
          v.poster = 'static/images/bench/thumb/' + scene.image + '.jpg';
          v.src = 'static/videos/compare/' + scene.scene + '/' + m.id + '.mp4';
          fig.append(v);
        }
        grid.append(fig);
      });
      if (play) grid.dispatchEvent(new CustomEvent('clips-changed'));
    };
    window.COMPARE_SCENES.forEach((scene) => {
      const b = el('button');
      b.type = 'button';
      b.dataset.scene = scene.scene;
      b.setAttribute('role', 'tab');
      b.title = scene.prompt;
      const img = el('img');
      img.src = 'static/images/bench/thumb/' + scene.image + '.jpg';
      img.alt = scene.prompt;
      b.append(img);
      b.addEventListener('click', () => show(scene, true));
      picker.append(b);
    });
    show(window.COMPARE_SCENES[0], false);
  }

  // ---- InterBench: click an image to see its prompts
  const benchGrid = document.getElementById('bench-grid');
  if (benchGrid && window.INTERBENCH) {
    const select = (item) => {
      benchGrid.querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', b.dataset.id === item.id));
      const img = document.getElementById('bench-image');
      img.src = 'static/images/bench/full/' + item.id + '.jpg';
      img.alt = 'InterBench input image: ' + item.id.replace(/_/g, ' ');
      document.getElementById('bench-category').textContent = item.category;
      document.getElementById('bench-count').textContent =
        item.prompts.length + (item.prompts.length > 1 ? ' prompts for this image' : ' prompt for this image');
      const list = document.getElementById('bench-prompts');
      list.textContent = '';
      item.prompts.forEach((p) => list.append(el('li', '', p.prompt)));
    };
    window.INTERBENCH.forEach((item) => {
      const b = el('button');
      b.type = 'button';
      b.dataset.id = item.id;
      b.title = item.id.replace(/_/g, ' ');
      const img = el('img');
      img.src = 'static/images/bench/thumb/' + item.id + '.jpg';
      img.alt = b.title;
      img.loading = 'lazy';
      b.append(img);
      if (item.prompts.length > 1) b.append(el('span', 'count', String(item.prompts.length)));
      b.addEventListener('click', () => select(item));
      benchGrid.append(b);
    });
    select(window.INTERBENCH[0]);
  }
})();

// Clips play only while they are on screen. Clips inside one [data-sync]
// container restart together, so side-by-side comparisons stay aligned.
(function () {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const groups = new Set();
  document.querySelectorAll('video.clip').forEach((v) => groups.add(v.closest('[data-sync]') || v));

  const clipsOf = (g) => (g.matches('video') ? [g] : Array.from(g.querySelectorAll('video.clip')));
  const restart = (videos) => videos.forEach((v) => { v.currentTime = 0; v.play().catch(() => {}); });

  const prepare = (g) => {
    clipsOf(g).forEach((v) => {
      if (v.dataset.ready) return;
      v.dataset.ready = '1';
      v.muted = true;
      v.playsInline = true;
      v.loop = false;
      if (reduced) v.controls = true;
      v.addEventListener('ended', () => {
        const videos = clipsOf(g);
        if (videos.every((o) => o.ended)) restart(videos);
      });
    });
  };

  const play = (g) => {
    if (reduced) return;
    const videos = clipsOf(g);
    if (videos.every((v) => v.ended)) restart(videos);
    else videos.forEach((v) => { if (!v.ended) v.play().catch(() => {}); });
  };

  groups.forEach((g) => {
    prepare(g);
    // the comparison grid replaces its clips when another scene is picked
    g.addEventListener('clips-changed', () => {
      prepare(g);
      const r = g.getBoundingClientRect();
      if (r.bottom > 0 && r.top < window.innerHeight) play(g);
    });
  });

  if (!reduced && 'IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          play(e.target);
        } else {
          clipsOf(e.target).forEach((v) => v.pause());
        }
      });
    }, { rootMargin: '100px 0px', threshold: 0.15 });
    groups.forEach((g) => io.observe(g));
  }

  // subtitle toggle on the overview video
  const cc = document.querySelector('.player .cc');
  const main = document.querySelector('.main-video');
  if (cc && main && main.textTracks.length) {
    const track = main.textTracks[0];
    const sync = () => cc.setAttribute('aria-pressed', track.mode === 'showing');
    cc.addEventListener('click', () => { track.mode = track.mode === 'showing' ? 'hidden' : 'showing'; sync(); });
    main.textTracks.addEventListener('change', sync);
  }

  const copy = document.querySelector('.copy');
  if (copy) {
    copy.addEventListener('click', () => {
      navigator.clipboard.writeText(document.querySelector('.bibtex pre').innerText).then(() => {
        copy.textContent = 'Copied';
        setTimeout(() => { copy.textContent = 'Copy'; }, 1500);
      });
    });
  }
})();
