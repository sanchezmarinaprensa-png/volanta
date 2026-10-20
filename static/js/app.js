// Volanta · interacciones del sitio
(function () {
  const root = document.documentElement;

  // Modo claro / oscuro
  const temaBtn = document.getElementById('tema');
  if (temaBtn) temaBtn.addEventListener('click', () => {
    const oscuro = root.dataset.theme
      ? root.dataset.theme === 'dark'
      : matchMedia('(prefers-color-scheme: dark)').matches;
    root.dataset.theme = oscuro ? 'light' : 'dark';
    try { localStorage.setItem('tema', root.dataset.theme); } catch (e) {}
  });

  // Barra de progreso de lectura (solo en notas)
  const nota = document.querySelector('.nota .cuerpo');
  const barra = document.querySelector('.progreso');
  if (nota && barra) {
    const sec = document.querySelector('.nota[data-sec]');
    if (sec) barra.dataset.sec = sec.dataset.sec;
    const actualizar = () => {
      const r = nota.getBoundingClientRect();
      const total = r.height - innerHeight * 0.6;
      const p = Math.min(1, Math.max(0, -r.top / Math.max(total, 1)));
      barra.style.width = (p * 100).toFixed(1) + '%';
    };
    addEventListener('scroll', actualizar, { passive: true });
    actualizar();
  }

  // Compartir
  const url = () => (document.querySelector('link[rel=canonical]')?.href.startsWith('http') && !location.hostname.includes('claude')
    ? document.querySelector('link[rel=canonical]').href : location.href);
  const titulo = document.querySelector('h1')?.textContent.trim() || document.title;
  document.querySelectorAll('[data-share]').forEach((el) => {
    const tipo = el.dataset.share;
    const u = encodeURIComponent(url()), t = encodeURIComponent(titulo);
    const destinos = {
      wa: `https://wa.me/?text=${t}%20${u}`,
      x: `https://x.com/intent/post?text=${t}&url=${u}`,
      fb: `https://www.facebook.com/sharer/sharer.php?u=${u}`,
    };
    if (destinos[tipo]) { el.href = destinos[tipo]; el.target = '_blank'; el.rel = 'noopener'; }
    if (tipo === 'copiar') el.addEventListener('click', async () => {
      try { await navigator.clipboard.writeText(url()); } catch (e) { return; }
      el.classList.add('ok'); el.setAttribute('aria-label', 'Enlace copiado');
      setTimeout(() => { el.classList.remove('ok'); el.setAttribute('aria-label', 'Copiar enlace'); }, 1800);
    });
  });

  // Buscador
  const q = document.getElementById('q');
  if (q) {
    const res = document.getElementById('q-res');
    const estado = document.getElementById('q-estado');
    let notas = [], filtro = '';
    const norm = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
    const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    const fecha = (iso) => new Date(iso).toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: 'numeric' });

    const pintar = () => {
      const term = norm(q.value.trim());
      const lista = notas.filter((n) => (!filtro || n.s === filtro) && (!term || norm(n.t + ' ' + n.b + ' ' + n.sn).includes(term)));
      estado.textContent = !term && !filtro
        ? `${notas.length} notas publicadas`
        : `${lista.length} ${lista.length === 1 ? 'resultado' : 'resultados'}`;
      res.innerHTML = lista.map((n) => `<article class="card"><div class="card-body">
        <span class="meta"><span class="chip" data-sec="${n.s}">${esc(n.sn)}</span><time>${fecha(n.f)}</time><span>${n.m} min</span></span>
        <h3><a href="${n.u}">${esc(n.t)}</a></h3><p>${esc(n.b)}</p></div></article>`).join('');
    };
    fetch('noticias.json').then((r) => r.json()).then((d) => { notas = d; pintar(); })
      .catch(() => { estado.textContent = 'No pudimos cargar las notas. Probá recargar la página.'; });
    q.addEventListener('input', pintar);
    document.querySelectorAll('.filtros button').forEach((b) => b.addEventListener('click', () => {
      filtro = b.dataset.f;
      document.querySelectorAll('.filtros button').forEach((o) => o.setAttribute('aria-pressed', o === b));
      pintar();
    }));
  }
})();
