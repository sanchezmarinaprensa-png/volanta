// Genera el sitio estático en /dist a partir de /content.
// Se ejecuta solo en Cloudflare Pages cada vez que publicás desde el panel.
import fs from 'node:fs';
import path from 'node:path';
import { marked } from 'marked';

const ROOT = path.dirname(new URL(import.meta.url).pathname);
const OUT = path.join(ROOT, 'dist');
const sitio = JSON.parse(fs.readFileSync(path.join(ROOT, 'content/sitio.json'), 'utf8'));
const BASE = (sitio.url || '').replace(/\/$/, '');

export const SECCIONES = [
  { slug: 'ciudad', nombre: 'Ciudad' },
  { slug: 'politica', nombre: 'Política' },
  { slug: 'economia', nombre: 'Economía' },
  { slug: 'cultura', nombre: 'Cultura' },
  { slug: 'norte', nombre: 'Norte' },
  { slug: 'deportes', nombre: 'Deportes' },
];
const seccion = (slug) => SECCIONES.find((s) => s.slug === slug) || { slug: 'ciudad', nombre: 'Ciudad' };

// ---------- utilidades ----------
const esc = (s = '') => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const slugify = (s) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 80);
const fmtFecha = (d) => new Intl.DateTimeFormat('es-AR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'America/Argentina/Salta' }).format(d);
const fmtHora = (d) => new Intl.DateTimeFormat('es-AR', { hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZone: 'America/Argentina/Salta' }).format(d);
function hace(d) {
  const min = Math.round((Date.now() - d) / 60000);
  if (min < 60) return `hace ${Math.max(min, 1)} min`;
  if (min < 60 * 24) return `hace ${Math.round(min / 60)} h`;
  return new Intl.DateTimeFormat('es-AR', { day: 'numeric', month: 'short', timeZone: 'America/Argentina/Salta' }).format(d);
}
// hora si es de hoy; si no, "ayer" o la fecha corta
const dia = (d) => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Argentina/Salta' }).format(d);
function cuando(d) {
  const hoy = new Date();
  if (dia(d) === dia(hoy)) return fmtHora(d);
  if (dia(d) === dia(new Date(hoy - 864e5))) return 'Ayer';
  return new Intl.DateTimeFormat('es-AR', { day: 'numeric', month: 'short', timeZone: 'America/Argentina/Salta' }).format(d);
}
// rutas relativas, para que el sitio funcione en cualquier hosting
const rel = (prefix, p) => (p.startsWith('http') ? p : prefix + p.replace(/^\//, ''));
const abs = (p) => (p.startsWith('http') ? p : `${BASE}/${p.replace(/^\//, '')}`);

function write(file, content) {
  const f = path.join(OUT, file);
  fs.mkdirSync(path.dirname(f), { recursive: true });
  fs.writeFileSync(f, content);
}
function copyDir(src, dst) {
  if (!fs.existsSync(src)) return;
  fs.mkdirSync(dst, { recursive: true });
  for (const e of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, e.name), d = path.join(dst, e.name);
    e.isDirectory() ? copyDir(s, d) : fs.copyFileSync(s, d);
  }
}

// ---------- notas ----------
const dir = path.join(ROOT, 'content/noticias');
const notas = (fs.existsSync(dir) ? fs.readdirSync(dir) : []).filter((f) => f.endsWith('.json')).map((f) => {
  const n = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
  const texto = (n.cuerpo || '').replace(/[#>*_\-\[\]()`]/g, ' ');
  return {
    ...n,
    slug: slugify(path.basename(f, '.json')),
    fecha: new Date(n.fecha || Date.now()),
    sec: seccion(n.seccion),
    minutos: Math.max(1, Math.round(texto.split(/\s+/).filter(Boolean).length / 200)),
    html: marked.parse(n.cuerpo || ''),
  };
}).filter((n) => !n.borrador && n.titulo).sort((a, b) => b.fecha - a.fecha);

// ---------- piezas ----------
const LOGO = `<svg class="logo-mark" viewBox="0 0 40 40" aria-hidden="true"><rect width="40" height="40" rx="11" fill="currentColor"/><rect x="9" y="10.5" width="13" height="5" rx="2.5" fill="var(--logo-ink)" transform="rotate(-12 15.5 13)"/><rect x="9" y="20" width="22" height="9.5" rx="3" fill="var(--logo-ink)"/></svg>`;

function portada(n, prefix, size = 'md') {
  if (n.imagen) return `<img src="${esc(rel(prefix, n.imagen))}" alt="${esc(n.epigrafe || n.titulo)}" loading="lazy">`;
  // portada generativa cuando la nota no tiene foto
  const seed = [...n.slug].reduce((a, c) => a + c.charCodeAt(0), 0);
  const rot = (seed % 5) * 3 - 9, x = 50 + (seed % 20);
  return `<div class="gen" data-sec="${n.sec.slug}" aria-hidden="true">
    <svg viewBox="0 0 100 62" preserveAspectRatio="xMidYMid meet"><g transform="translate(${x - 8} ${18 + (seed % 7)}) rotate(${rot})"><rect x="0" y="0" width="${16 + (seed % 10)}" height="5" rx="2.5"/><rect x="0" y="10" width="${34 + (seed % 14)}" height="11" rx="3.5"/><rect x="0" y="25" width="${22 + (seed % 12)}" height="11" rx="3.5"/></g><circle cx="${14 + (seed % 20)}" cy="${12 + (seed % 9)}" r="7"/></svg>
    <span>${esc(n.sec.nombre)}</span></div>`;
}

const meta = (n, prefix) => `<span class="meta"><a class="chip" data-sec="${n.sec.slug}" href="${prefix}seccion/${n.sec.slug}.html">${esc(n.sec.nombre)}</a><time datetime="${n.fecha.toISOString()}">${hace(n.fecha)}</time><span>${n.minutos} min</span></span>`;

const card = (n, prefix, cls = '') => `<article class="card ${cls}">
  <a class="card-img" href="${prefix}nota/${n.slug}.html" tabindex="-1">${portada(n, prefix)}</a>
  <div class="card-body">${meta(n, prefix)}
    <h3><a href="${prefix}nota/${n.slug}.html">${n.volanta ? `<span class="volanta">${esc(n.volanta)}.</span> ` : ''}${esc(n.titulo)}</a></h3>
    ${cls.includes('con-bajada') ? `<p>${esc(n.bajada)}</p>` : ''}
  </div></article>`;

function aviso(prefix, i = 0) {
  const a = (sitio.avisos || [])[i % Math.max(1, (sitio.avisos || []).length)];
  if (a && a.imagen) return `<aside class="aviso"><small>Publicidad</small><a href="${esc(a.link || '#')}" target="_blank" rel="sponsored noopener"><img src="${esc(rel(prefix, a.imagen))}" alt="${esc(a.nombre || 'Publicidad')}" loading="lazy"></a></aside>`;
  return `<aside class="aviso aviso-vacio"><small>Publicidad</small><a href="${prefix}nosotros.html#anuncia-en-${slugify(sitio.nombre)}"><strong>Tu marca, frente a lectores de Salta.</strong><span>Anunciá en ${esc(sitio.nombre)} →</span></a></aside>`;
}

const redes = () => [['instagram', 'Instagram', 'https://instagram.com/'], ['facebook', 'Facebook', 'https://facebook.com/'], ['x', 'X', 'https://x.com/'], ['tiktok', 'TikTok', 'https://tiktok.com/@'], ['whatsapp_canal', 'Canal de WhatsApp', '']]
  .filter(([k]) => sitio[k]).map(([k, label, url]) => `<a href="${esc(sitio[k].startsWith('http') ? sitio[k] : url + sitio[k])}" target="_blank" rel="noopener">${label}</a>`).join('');

function layout({ prefix, title, desc, body, canon, image, type = 'website', active = '', extraHead = '' }) {
  const fullTitle = title ? `${title} · ${sitio.nombre}` : `${sitio.nombre} · ${sitio.lema}`;
  const ogImg = image ? abs(image) : abs('img/og.png');
  const cafe = sitio.cafecito ? `https://cafecito.app/${sitio.cafecito}` : `${prefix}nosotros.html#apoya-el-periodismo-local`;
  return `<!doctype html>
<html lang="es-AR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(fullTitle)}</title>
<meta name="description" content="${esc(desc || sitio.descripcion)}">
<link rel="canonical" href="${esc(abs(canon))}">
<meta property="og:site_name" content="${esc(sitio.nombre)}">
<meta property="og:type" content="${type}">
<meta property="og:title" content="${esc(title || sitio.nombre)}">
<meta property="og:description" content="${esc(desc || sitio.descripcion)}">
<meta property="og:url" content="${esc(abs(canon))}">
<meta property="og:image" content="${esc(ogImg)}">
<meta name="twitter:card" content="summary_large_image">
<meta name="theme-color" content="#1d1b4b">
<link rel="icon" href="${prefix}img/favicon.svg" type="image/svg+xml">
<link rel="alternate" type="application/rss+xml" title="${esc(sitio.nombre)}" href="${prefix}rss.xml">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,400..800&family=Newsreader:ital,opsz,wght@0,6..72,400..600;1,6..72,400&display=swap">
<link rel="stylesheet" href="${prefix}css/style.css">
<script>try{var t=localStorage.getItem('tema');if(t)document.documentElement.dataset.theme=t}catch(e){}</script>
${sitio.adsense_cliente ? `<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${esc(sitio.adsense_cliente)}" crossorigin="anonymous"></script>` : ''}
${extraHead}
</head>
<body>
<div class="progreso" aria-hidden="true"></div>
<header class="top">
  <div class="top-in">
    <a class="logo" href="${prefix}index.html" aria-label="${esc(sitio.nombre)}, inicio">${LOGO}<span>${esc(sitio.nombre.toLowerCase())}</span></a>
    <nav class="secciones" aria-label="Secciones">
      ${SECCIONES.map((s) => `<a data-sec="${s.slug}" href="${prefix}seccion/${s.slug}.html"${active === s.slug ? ' aria-current="page"' : ''}>${s.nombre}</a>`).join('')}
    </nav>
    <div class="acciones">
      <a class="icono" href="${prefix}buscar.html" aria-label="Buscar"><svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="6.5"/><path d="m16 16 4.5 4.5"/></svg></a>
      <button class="icono" id="tema" type="button" aria-label="Cambiar entre modo claro y oscuro"><svg viewBox="0 0 24 24"><path d="M12 3a9 9 0 1 0 9 9 7 7 0 0 1-9-9z"/></svg></button>
      <a class="apoya" href="${esc(cafe)}"${sitio.cafecito ? ' target="_blank" rel="noopener"' : ''}>Apoyá</a>
    </div>
  </div>
</header>
<main id="contenido">
${body}
</main>
<footer class="pie">
  <div class="pie-in">
    <div class="pie-marca">
      <a class="logo" href="${prefix}index.html">${LOGO}<span>${esc(sitio.nombre.toLowerCase())}</span></a>
      <p>${esc(sitio.descripcion)}</p>
    </div>
    <nav aria-label="Secciones">${SECCIONES.map((s) => `<a href="${prefix}seccion/${s.slug}.html">${s.nombre}</a>`).join('')}</nav>
    <nav aria-label="Institucional"><a href="${prefix}nosotros.html">Quiénes somos</a><a href="${prefix}nosotros.html#anuncia-en-${slugify(sitio.nombre)}">Anunciá</a><a href="${prefix}rss.xml">RSS</a>${redes()}</nav>
  </div>
  <p class="legal">© ${new Date().getFullYear()} ${esc(sitio.nombre)} · ${esc(sitio.lema)}</p>
</footer>
<script src="${prefix}js/app.js" defer></script>
</body>
</html>`;
}

// ---------- páginas ----------
fs.rmSync(OUT, { recursive: true, force: true });
copyDir(path.join(ROOT, 'static'), OUT);
copyDir(path.join(ROOT, 'admin'), path.join(OUT, 'admin'));

// Portada
{
  const p = '';
  const principal = notas.find((n) => n.destacada) || notas[0];
  const resto = notas.filter((n) => n !== principal);
  const ultimas = resto.slice(0, 5);
  // las notas que ya están arriba no se repiten en los bloques de sección
  const yaVistas = new Set([principal, ...resto.slice(0, 3)]);
  const porSeccion = SECCIONES.map((s) => ({ s, items: notas.filter((n) => n.sec.slug === s.slug && !yaVistas.has(n)).slice(0, 3) })).filter((x) => x.items.length);
  const hoy = new Intl.DateTimeFormat('es-AR', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'America/Argentina/Salta' }).format(new Date());
  const body = !principal ? `<section class="vacio"><h1>Todavía no hay notas</h1><p>Entrá a <a href="admin/">/admin</a> y publicá la primera.</p></section>` : `
<section class="hero wrap">
  <article class="hero-main">
    <a class="hero-img" href="nota/${principal.slug}.html" tabindex="-1">${portada(principal, p, 'lg')}</a>
    <div class="hero-txt">
      ${meta(principal, p)}
      ${principal.volanta ? `<p class="volanta">${esc(principal.volanta)}</p>` : ''}<h1><a href="nota/${principal.slug}.html">${esc(principal.titulo)}</a></h1>
      <p>${esc(principal.bajada)}</p>
    </div>
  </article>
  <aside class="ultimas" aria-labelledby="ult">
    <h2 id="ult"><span class="pulso" aria-hidden="true"></span>Lo último <small>${esc(hoy)}</small></h2>
    <ol>${ultimas.map((n) => `<li><time datetime="${n.fecha.toISOString()}">${cuando(n.fecha)}</time><div><a href="nota/${n.slug}.html">${esc(n.titulo)}</a><span class="chip" data-sec="${n.sec.slug}">${n.sec.nombre}</span></div></li>`).join('')}</ol>
  </aside>
</section>
<section class="wrap grilla">${resto.slice(0, 3).map((n) => card(n, p, 'con-bajada')).join('')}</section>
<div class="wrap">${aviso(p, 0)}</div>
${porSeccion.map(({ s, items }) => `<section class="wrap bloque" data-sec="${s.slug}">
  <header class="bloque-tit"><h2><a href="seccion/${s.slug}.html">${s.nombre}</a></h2><a class="ver" href="seccion/${s.slug}.html">Ver todo →</a></header>
  <div class="fila">${items.map((n) => card(n, p)).join('')}</div>
</section>`).join('')}
<section class="wrap apoyo">
  <div><h2>El periodismo local se banca entre todos.</h2><p>Si ${esc(sitio.nombre)} te sirve, ayudanos a seguir. Un cafecito alcanza.</p></div>
  <a class="btn" href="${sitio.cafecito ? `https://cafecito.app/${esc(sitio.cafecito)}` : 'nosotros.html#apoya-el-periodismo-local'}">Invitanos un cafecito</a>
</section>`;
  write('index.html', layout({ prefix: p, body, canon: '' }));
}

// Notas
for (const n of notas) {
  const p = '../';
  const relacionadas = notas.filter((o) => o !== n && o.sec.slug === n.sec.slug).concat(notas.filter((o) => o !== n && o.sec.slug !== n.sec.slug)).slice(0, 3);
  const ld = { '@context': 'https://schema.org', '@type': 'NewsArticle', headline: n.titulo, description: n.bajada, datePublished: n.fecha.toISOString(), author: { '@type': 'Person', name: n.autor || sitio.autora }, publisher: { '@type': 'Organization', name: sitio.nombre }, image: n.imagen ? [abs(n.imagen)] : undefined };
  const body = `
<article class="nota" data-sec="${n.sec.slug}">
  <header class="nota-cab wrap-angosto">
    ${meta(n, p)}
    ${n.volanta ? `<p class="volanta">${esc(n.volanta)}</p>` : ''}<h1>${esc(n.titulo)}</h1>
    <p class="bajada">${esc(n.bajada)}</p>
    <div class="firma"><span>Por <strong>${esc(n.autor || sitio.autora)}</strong></span><time datetime="${n.fecha.toISOString()}">${fmtFecha(n.fecha)}, ${fmtHora(n.fecha)} h</time></div>
  </header>
  <figure class="nota-img wrap">${portada(n, p, 'lg')}${n.epigrafe ? `<figcaption>${esc(n.epigrafe)}</figcaption>` : ''}</figure>
  <div class="nota-grid wrap">
    <div class="compartir" aria-label="Compartir">
      <span>Compartir</span>
      <a data-share="wa" href="#" aria-label="Compartir en WhatsApp"><svg viewBox="0 0 24 24"><path d="M4 20l1.3-3.9A8 8 0 1 1 8 19z"/></svg></a>
      <a data-share="x" href="#" aria-label="Compartir en X"><svg viewBox="0 0 24 24"><path d="M5 5l14 14M19 5 5 19"/></svg></a>
      <a data-share="fb" href="#" aria-label="Compartir en Facebook"><svg viewBox="0 0 24 24"><path d="M14 8h3V4h-3a4 4 0 0 0-4 4v3H7v4h3v6h4v-6h3l1-4h-4V8z"/></svg></a>
      <button type="button" data-share="copiar" aria-label="Copiar enlace"><svg viewBox="0 0 24 24"><path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/></svg></button>
    </div>
    <div class="cuerpo">${n.html}</div>
  </div>
  <div class="wrap-angosto">${aviso(p, 1)}</div>
</article>
<section class="wrap bloque">
  <header class="bloque-tit"><h2>Seguí leyendo</h2></header>
  <div class="fila">${relacionadas.map((o) => card(o, p)).join('')}</div>
</section>`;
  write(`nota/${n.slug}.html`, layout({ prefix: p, title: n.titulo, desc: n.bajada, body, canon: `nota/${n.slug}.html`, image: n.imagen, type: 'article', active: n.sec.slug, extraHead: `<script type="application/ld+json">${JSON.stringify(ld).replace(/</g, '\\u003c')}</script>` }));
}

// Secciones
for (const s of SECCIONES) {
  const p = '../';
  const items = notas.filter((n) => n.sec.slug === s.slug);
  const body = `<header class="sec-cab wrap" data-sec="${s.slug}"><p class="eyebrow">Sección</p><h1>${s.nombre}</h1><p>${items.length} ${items.length === 1 ? 'nota' : 'notas'}</p></header>
<section class="wrap grilla">${items.length ? items.map((n) => card(n, p, 'con-bajada')).join('') : '<p class="vacio-txt">Pronto vas a encontrar notas acá.</p>'}</section>`;
  write(`seccion/${s.slug}.html`, layout({ prefix: p, title: s.nombre, body, canon: `seccion/${s.slug}.html`, active: s.slug }));
}

// Buscar
write('buscar.html', layout({ prefix: '', title: 'Buscar', canon: 'buscar.html', body: `
<section class="wrap buscar">
  <label for="q" class="eyebrow">Buscar en ${esc(sitio.nombre)}</label>
  <input id="q" type="search" placeholder="Escribí un tema, un lugar, una persona…" autocomplete="off" autofocus>
  <div class="filtros" role="group" aria-label="Filtrar por sección"><button type="button" aria-pressed="true" data-f="">Todas</button>${SECCIONES.map((s) => `<button type="button" aria-pressed="false" data-f="${s.slug}">${s.nombre}</button>`).join('')}</div>
  <p id="q-estado" class="q-estado" aria-live="polite"></p>
  <div id="q-res" class="grilla"></div>
</section>` }));

// Nosotros
write('nosotros.html', layout({ prefix: '', title: 'Quiénes somos', canon: 'nosotros.html', body: `
<article class="nota"><header class="nota-cab wrap-angosto"><p class="eyebrow">Quiénes somos</p><h1>${esc(sitio.nombre)}</h1><p class="bajada">${esc(sitio.descripcion)}</p></header>
<div class="wrap-angosto cuerpo">${marked.parse(sitio.sobre || '').replace(/<h2>([^<]+)<\/h2>/g, (_, t) => `<h2 id="${slugify(t)}">${t}</h2>`)}
<p><strong>Contacto:</strong> ${esc(sitio.email)}</p>${sitio.cafecito ? `<p><a class="btn" href="https://cafecito.app/${esc(sitio.cafecito)}" target="_blank" rel="noopener">Invitanos un cafecito</a></p>` : ''}</div></article>` }));

// 404
write('404.html', layout({ prefix: BASE + '/', title: 'Página no encontrada', canon: '404.html', body: `<section class="wrap vacio"><p class="eyebrow">Error 404</p><h1>Esta página no existe.</h1><p><a class="btn" href="${BASE}/">Volver a la portada</a></p></section>` }));

// Índice para el buscador, RSS y sitemap
write('noticias.json', JSON.stringify(notas.map((n) => ({ t: n.titulo, b: n.bajada, s: n.sec.slug, sn: n.sec.nombre, u: `nota/${n.slug}.html`, f: n.fecha.toISOString(), m: n.minutos, i: n.imagen || '' }))));
write('rss.xml', `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>${esc(sitio.nombre)}</title><link>${esc(BASE)}</link><description>${esc(sitio.descripcion)}</description><language>es-AR</language>${notas.slice(0, 30).map((n) => `<item><title>${esc(n.titulo)}</title><link>${esc(abs(`nota/${n.slug}.html`))}</link><guid>${esc(abs(`nota/${n.slug}.html`))}</guid><pubDate>${n.fecha.toUTCString()}</pubDate><description>${esc(n.bajada)}</description><category>${esc(n.sec.nombre)}</category></item>`).join('')}</channel></rss>`);
write('sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>${esc(BASE)}/</loc></url>${SECCIONES.map((s) => `<url><loc>${esc(abs(`seccion/${s.slug}.html`))}</loc></url>`).join('')}${notas.map((n) => `<url><loc>${esc(abs(`nota/${n.slug}.html`))}</loc><lastmod>${n.fecha.toISOString()}</lastmod></url>`).join('')}</urlset>`);
write('robots.txt', `User-agent: *\nAllow: /\nDisallow: /admin/\nSitemap: ${BASE}/sitemap.xml\n`);

console.log(`Listo: ${notas.length} notas generadas en /dist`);
