// Rende il sito leggibile da motori di ricerca e LLM senza eseguire JavaScript.
// UNICA fonte dei testi: src/app/core/landing-i18n.data.ts (+ packages/shared/src/company.ts).
// Genera, a ogni build:
//   - public/llms.txt        indice in formato llmstxt.org
//   - public/llms-full.txt   tutto il contenuto del sito in Markdown (IT)
//   - public/sitemap.xml     solo URL reali, con data di build
//   - src/index.html         contenuto statico dentro <cf-root> + JSON-LD completo (blocchi tra marker)
// Il contenuto statico dentro <cf-root> sparisce da solo quando Angular parte (Angular svuota l'host).
import { readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const here = dirname(fileURLToPath(import.meta.url));
const web = resolve(here, '..');
const SITE = 'https://childhood-friendship-website-pi.vercel.app';

async function loadTs(path) {
  const src = await readFile(path, 'utf8');
  const js = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.ES2022, target: ts.ScriptTarget.ES2022 } }).outputText;
  return import('data:text/javascript;base64,' + Buffer.from(js).toString('base64'));
}
const { LANDING_TRANSLATIONS } = await loadTs(resolve(web, 'src/app/core/landing-i18n.data.ts'));
const { COMPANY, vatLabel } = await loadTs(resolve(web, '../../packages/shared/src/company.ts'));
const t = LANDING_TRANSLATIONS.it;

const plain = (s) => String(s ?? '').replace(/<br\s*\/?>/gi, ' ').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
const esc = (s) => plain(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const today = new Date().toISOString().slice(0, 10);
const heroTitle = (t.hero.lines || []).map(plain).join(' ');
const aboutTitle = [t.about.titleL1, t.about.titleL2, t.about.titleL3, t.about.titleL4].filter(Boolean).map(plain).join(' ');
const priceOf = (from) => { const m = String(from).match(/([\d.]+)\s*€/); return m ? Number(m[1].replace(/\./g, '')) : null; };
const legal = `Ditta individuale di ${COMPANY.owner}, ${COMPANY.city} · ${vatLabel()} · regime ${COMPANY.taxRegime}`;
const summary = 'Studio di sviluppo software con base a Padova (Veneto), attivo in tutta Italia: siti web e landing page, web app e gestionali, app mobile iOS e Android, cura e crescita dopo il lancio.';

// ---------- llms-full.txt ----------
const md = [];
md.push(`# ${COMPANY.brand}`, '', `> ${summary}`, '');
md.push(`Sito: ${SITE}/ · Email: ${COMPANY.email} · ${legal}`, '');
md.push(`## ${plain(t.hero.kicker)}`, '', `**${heroTitle}**`, '', plain(t.hero.lede), '');
md.push(`## ${plain(t.services.title)}`, '', plain(t.services.subtitle), '');
for (const s of t.services.items) {
  md.push(`### ${plain(s.title)} — ${plain(s.from)}`, '', `${plain(s.line)} ${plain(s.body)}`, '', 'Include: ' + s.includes.map(plain).join('; ') + '.', '');
}
md.push(plain(t.services.note), '');
md.push(`## ${plain(t.about.kicker)}`, '', `**${aboutTitle}**`, '', plain(t.about.copy1), '', plain(t.about.copy2), '');
for (const f of t.about.facts) md.push(`- **${plain(f.k)}**: ${plain(f.v)}`);
md.push('');
md.push(`## ${plain(t.method.kicker)}: ${plain(t.method.title)}`, '');
for (const s of t.method.steps) md.push(`${Number(s.n)}. **${plain(s.title)}** — ${plain(s.text)} _${plain(s.proof)}_`);
md.push('');
md.push(`## ${plain(t.portfolio.kicker)}: ${plain(t.portfolio.title)}`, '');
for (const p of t.portfolio.projects) {
  md.push(`### ${plain(p.name)} (${plain(p.kind)})`, '', `${plain(p.line)} ${plain(p.what)}`, '', 'Cosa abbiamo costruito: ' + p.done.map(plain).join('; ') + '.', '', 'Tecnologie: ' + p.stack.map(plain).join(', ') + '.' + (p.link ? ` Sito: ${p.link.href}` : ''), '');
}
md.push('## Come iniziare', '', `Dal sito: pulsante «${plain(t.hero.cta)}» (breve quiz di 6 domande su progetto, tempi, budget e idea) oppure scrivi a ${COMPANY.email}.`, '');
md.push('## Note legali', '', `${legal}. Informativa privacy: ${SITE}/privacy · Cookie: ${SITE}/cookie.`, '');
const llmsFull = md.join('\n');

// ---------- llms.txt ----------
const idx = [];
idx.push(`# ${COMPANY.brand}`, '', `> ${summary}`, '');
idx.push('Prezzi indicativi (sempre "da"; il preventivo definitivo arriva con il prototipo). Hosting, dominio e cloud sono esclusi e restano intestati al cliente.', '');
idx.push('## Servizi', '');
for (const s of t.services.items) idx.push(`- [${plain(s.title)}](${SITE}/#servizi): ${plain(s.from)}. ${plain(s.line)}`);
idx.push('', '## Il sito', '');
idx.push(`- [Contenuto completo del sito in testo](${SITE}/llms-full.txt): servizi, prezzi, metodo, portfolio, contatti`);
idx.push(`- [Chi siamo](${SITE}/#chi-siamo): ${plain(t.about.copy1)}`);
idx.push(`- [Il metodo](${SITE}/#metodo): ${t.method.steps.map((s) => plain(s.title)).join(' → ')}`);
idx.push(`- [Portfolio](${SITE}/#progetti): ${t.portfolio.projects.map((p) => plain(p.name)).join(', ')}`);
idx.push(`- [Contatti](${SITE}/#contatti): quiz di 6 domande oppure ${COMPANY.email}`);
idx.push('', '## Legale', '');
idx.push(`- [Privacy](${SITE}/privacy)`, `- [Cookie](${SITE}/cookie)`, `- ${legal}`, '');
const llms = idx.join('\n');

// ---------- sitemap ----------
const urls = [['/', 'weekly', '1.0'], ['/caveau', 'monthly', '0.6'], ['/privacy', 'yearly', '0.3'], ['/cookie', 'yearly', '0.3']];
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map(([p, f, pr]) => `  <url>\n    <loc>${SITE}${p}</loc>\n    <lastmod>${today}</lastmod>\n    <changefreq>${f}</changefreq>\n    <priority>${pr}</priority>\n  </url>`).join('\n')}\n</urlset>\n`;

// ---------- JSON-LD ----------
const offer = (s) => {
  const price = priceOf(s.from);
  const monthly = /mese/i.test(s.from);
  return { '@type': 'Offer', itemOffered: { '@type': 'Service', name: plain(s.title), description: `${plain(s.line)} ${plain(s.body)}` },
    ...(price ? { priceSpecification: { '@type': 'PriceSpecification', minPrice: price, priceCurrency: 'EUR', ...(monthly ? { unitText: 'mese' } : {}), valueAddedTaxIncluded: false } } : {}) };
};
const jsonld = {
  '@context': 'https://schema.org',
  '@graph': [
    { '@type': 'ProfessionalService', '@id': `${SITE}/#org`, name: COMPANY.brand, url: `${SITE}/`, image: `${SITE}/icon-512.png`, email: COMPANY.email,
      description: summary, priceRange: '€€', slogan: plain(t.footer.quote),
      address: { '@type': 'PostalAddress', addressLocality: 'Padova', addressRegion: 'Veneto', addressCountry: 'IT' },
      areaServed: [{ '@type': 'Country', name: 'Italy' }, { '@type': 'AdministrativeArea', name: 'Veneto' }, { '@type': 'City', name: 'Padova' }],
      founder: { '@type': 'Person', name: COMPANY.owner },
      knowsAbout: ['sviluppo siti web', 'landing page', 'web app e gestionali', 'app mobile iOS e Android', 'SEO tecnica'],
      hasOfferCatalog: { '@type': 'OfferCatalog', name: 'Servizi di sviluppo software', itemListElement: t.services.items.map(offer) } },
    { '@type': 'WebSite', '@id': `${SITE}/#site`, url: `${SITE}/`, name: COMPANY.brand, inLanguage: 'it-IT', publisher: { '@id': `${SITE}/#org` } }
  ]
};
const ldBlock = `<!-- SEO:JSONLD:START (generato da scripts/build-seo.mjs) -->\n  <script type="application/ld+json">\n${JSON.stringify(jsonld, null, 2)}\n  </script>\n  <!-- SEO:JSONLD:END -->`;

// ---------- contenuto statico dentro <cf-root> ----------
const li = (arr) => `<ul>${arr.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>`;
const staticHtml = `<!-- SEO:STATIC:START (generato da scripts/build-seo.mjs) -->
    <div class="seo-static" data-seo-static>
      <header><p>${esc(t.hero.kicker)}</p><h1>${esc(heroTitle)}</h1><p>${esc(t.hero.lede)}</p><p><a href="#contatti">${esc(t.hero.cta)}</a> · <a href="/llms-full.txt">Versione testuale del sito</a></p></header>
      <main>
        <section id="seo-servizi"><h2>${esc(t.services.title)}</h2><p>${esc(t.services.subtitle)}</p>
${t.services.items.map((s) => `          <article><h3>${esc(s.title)} — ${esc(s.from)}</h3><p>${esc(s.line)} ${esc(s.body)}</p>${li(s.includes)}</article>`).join('\n')}
          <p>${esc(t.services.note)}</p></section>
        <section id="seo-chi-siamo"><h2>${esc(t.about.kicker)}: ${esc(aboutTitle)}</h2><p>${esc(t.about.copy1)}</p><p>${esc(t.about.copy2)}</p>${li(t.about.facts.map((f) => `${plain(f.k)}: ${plain(f.v)}`))}</section>
        <section id="seo-metodo"><h2>${esc(t.method.kicker)}: ${esc(t.method.title)}</h2><ol>${t.method.steps.map((s) => `<li><h3>${esc(s.title)}</h3><p>${esc(s.text)} ${esc(s.proof)}</p></li>`).join('')}</ol></section>
        <section id="seo-portfolio"><h2>${esc(t.portfolio.kicker)}: ${esc(t.portfolio.title)}</h2>
${t.portfolio.projects.map((p) => `          <article><h3>${esc(p.name)} — ${esc(p.kind)}</h3><p>${esc(p.line)} ${esc(p.what)}</p>${li(p.done)}<p>Tecnologie: ${esc(p.stack.join(', '))}</p></article>`).join('\n')}
        </section>
        <section id="seo-contatti"><h2>${esc(t.contact.eyebrow)}</h2><p>Scrivici a <a href="mailto:${esc(COMPANY.email)}">${esc(COMPANY.email)}</a> o compila il breve quiz sul sito. ${esc(legal)}.</p></section>
      </main>
      <footer><p>${esc(t.footer.quote)}</p><nav aria-label="${esc(t.footer.legalAria)}"><a href="/privacy">${esc(t.footer.privacy)}</a> · <a href="/cookie">${esc(t.footer.cookie)}</a> · <a href="/caveau">${esc(t.footer.caveau)}</a></nav></footer>
    </div>
    <!-- SEO:STATIC:END -->`;

const headStyle = `<!-- SEO:STYLE:START -->
  <style>.seo-static{position:absolute;width:1px;height:1px;margin:-1px;padding:0;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0}</style>
  <noscript><style>.seo-static{position:static;width:auto;height:auto;margin:0;padding:2rem;overflow:visible;clip:auto;white-space:normal;color:#fff;background:#120A26;font-family:system-ui,sans-serif;line-height:1.5}.seo-static a{color:#c4b5fd}</style></noscript>
  <link rel="alternate" type="text/plain" href="/llms-full.txt" title="Contenuto del sito in testo">
  <!-- SEO:STYLE:END -->`;

// ---------- applica a index.html (idempotente) ----------
const indexPath = resolve(web, 'src/index.html');
let html = await readFile(indexPath, 'utf8');
const swap = (name, block, fallbackRe, fallbackWrap) => {
  const re = new RegExp(`<!-- SEO:${name}:START[\\s\\S]*?<!-- SEO:${name}:END -->`);
  if (re.test(html)) html = html.replace(re, () => block);
  else if (fallbackRe.test(html)) html = html.replace(fallbackRe, () => fallbackWrap(block));
  else throw new Error(`index.html: punto di inserimento non trovato per ${name}`);
};
swap('JSONLD', ldBlock, /<script type="application\/ld\+json">[\s\S]*?<\/script>/, (b) => b);
swap('STATIC', staticHtml, /<cf-root><\/cf-root>/, (b) => `<cf-root>\n    ${b}\n  </cf-root>`);
swap('STYLE', headStyle, /<\/head>/, (b) => `  ${b}\n</head>`);
await writeFile(indexPath, html);

await writeFile(resolve(web, 'public/llms.txt'), llms);
await writeFile(resolve(web, 'public/llms-full.txt'), llmsFull);
await writeFile(resolve(web, 'public/sitemap.xml'), sitemap);
console.log(`[seo] llms.txt ${llms.length} B · llms-full.txt ${llmsFull.length} B · sitemap ${urls.length} URL · index.html aggiornato (${html.length} B)`);
