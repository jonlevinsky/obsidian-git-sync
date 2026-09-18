---
cssclasses: homepage-dashboard
type: dashboard
title: Doporučení filmů a seriálů
tags:
  - databaze
  - doporuceni
---

```dataviewjs
const ACCENT = '#c49a5a';
const STAR_COLOR = '#f5c842';
const container = dv.container;
container.classList.add('homepage-root');
container.style.setProperty('--moc-accent', ACCENT);

// Load data
const films = dv.pages('"Databaze/Filmy"').where(p => p.type === 'film');
const series = dv.pages('"Databaze/Serialy"').where(p => p.type === 'serial');
const watchlist = dv.pages('"Databaze/Watchlist"').where(p => p.type === 'watchlist');

const allRated = [...films.values, ...series.values].filter(item => item.my_rating);
const avgRating = allRated.length > 0
  ? (allRated.reduce((s, i) => s + Number(i.my_rating), 0) / allRated.length).toFixed(1)
  : '—';

// Calculate genre stats
const genreCounts = {};
[...films.values, ...series.values].forEach(item => {
  if (item.genre) {
    item.genre.split(/[,;/]+/).map(g => g.trim()).filter(Boolean).forEach(g => {
      genreCounts[g] = (genreCounts[g] || 0) + 1;
    });
  }
});
const topGenres = Object.entries(genreCounts)
  .sort((a, b) => b[1] - a[1])
  .slice(0, 5);

// Header
const header = container.createDiv({ cls: 'moc-header' });
header.style.cssText = 'display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;margin-bottom:20px;';

const left = header.createDiv({ cls: 'moc-header-left' });
left.style.cssText = 'display:flex;align-items:center;gap:10px;';
left.createEl('span', { text: '✨', style: 'font-size:1.4em;' });
const titleEl = left.createEl('h1', { text: 'DOPORUČENÍ FILMŮ & SERIÁLŮ' });
titleEl.style.cssText = 'margin:0;font-size:1.5em;color:var(--bronze);font-weight:700;';

// Bento Stats Tiles
const statsGrid = container.createDiv();
statsGrid.style.cssText = 'display:grid;grid-template-columns:repeat(auto-fit, minmax(140px, 1fr));gap:12px;margin-bottom:20px;';

const createStatTile = (icon, label, value, color) => {
  const tile = statsGrid.createDiv();
  tile.style.cssText = 'padding:14px;border-radius:12px;background:var(--surface);border:1px solid var(--border);display:flex;flex-direction:column;gap:4px;';
  const labelRow = tile.createDiv();
  labelRow.style.cssText = 'font-size:0.8em;color:var(--text-muted);display:flex;align-items:center;gap:6px;';
  labelRow.createEl('span', { text: icon });
  labelRow.createEl('span', { text: label });
  const valEl = tile.createDiv({ text: `${value}` });
  valEl.style.cssText = `font-size:1.4em;font-weight:800;color:${color || 'var(--text)'};margin-top:2px;`;
};

createStatTile('🎬', 'Filmy', films.length, 'var(--text)');
createStatTile('📺', 'Seriály', series.length, 'var(--text)');
createStatTile('⭐', 'Průměrné hodnocení', `${avgRating}/10`, STAR_COLOR);
createStatTile('📋', 'Watchlist', watchlist.length, '#4fc3f7');

// Top Genres Card
if (topGenres.length > 0) {
  const genreCard = container.createDiv();
  genreCard.style.cssText = 'padding:16px 20px;border-radius:12px;background:var(--surface);border:1px solid var(--border);margin-bottom:20px;display:flex;align-items:center;gap:10px;flex-wrap:wrap;';
  genreCard.createEl('strong', { text: '🎭 Nejčastější žánry:', style: 'color:var(--bronze);font-size:0.9em;' });
  topGenres.forEach(([genre, count]) => {
    const pill = genreCard.createDiv();
    pill.style.cssText = 'padding:4px 12px;border-radius:20px;background:var(--surface-elev);border:1px solid var(--border);font-size:0.8em;display:flex;align-items:center;gap:6px;';
    pill.createEl('span', { text: genre, style: 'font-weight:600;color:var(--text);' });
    pill.createEl('span', { text: `(${count})`, style: 'color:var(--text-muted);font-size:0.85em;' });
  });
}

// Hero Launch CTA Card
const launchCard = container.createDiv();
launchCard.style.cssText = 'padding:24px;border-radius:14px;background:linear-gradient(135deg, color-mix(in srgb, var(--moc-accent) 18%, var(--surface)), var(--surface));border:1px solid color-mix(in srgb, var(--moc-accent) 35%, transparent);display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:16px;margin-bottom:28px;box-shadow:0 4px 14px rgba(0,0,0,0.1);';

const launchInfo = launchCard.createDiv();
launchInfo.style.cssText = 'display:flex;flex-direction:column;gap:6px;max-width:600px;';
const launchTitle = launchInfo.createEl('h2', { text: '✨ Hybridní Recommender v reálném čase' });
launchTitle.style.cssText = 'margin:0;font-size:1.25em;color:var(--bronze);font-weight:700;';
const launchDesc = launchInfo.createEl('p', { text: 'Spusťte interaktivní Bento-Grid rozhraní pro procházení doporučení, filtrování podle skrytých klenotů, nálady a konkrétních filmů.' });
launchDesc.style.cssText = 'margin:0;font-size:0.85em;color:var(--text-secondary);line-height:1.4;';

const launchBtn = launchCard.createEl('button', { text: '✨ Otevřít Hybridní Recommender' });
launchBtn.style.cssText = 'padding:12px 24px;border-radius:10px;background:var(--bronze-dim);color:var(--bronze);border:1px solid var(--bronze-dim);font-weight:700;font-size:0.95em;cursor:pointer;transition:all 0.2s;white-space:nowrap;box-shadow:0 2px 8px rgba(0,0,0,0.15);';
launchBtn.addEventListener('mouseenter', () => { launchBtn.style.background = 'var(--bronze-hover)'; });
launchBtn.addEventListener('mouseleave', () => { launchBtn.style.background = 'var(--bronze-dim)'; });
launchBtn.addEventListener('click', () => {
  const plugin = app.plugins.plugins['filmova-databaze'];
  if (plugin && typeof plugin.activateRecommenderView === 'function') {
    plugin.activateRecommenderView();
  } else {
    app.commands.executeCommandById('filmova-databaze:open-recommender');
  }
});

// Top Rated Inspiration Section
const inspirationHeader = container.createDiv();
inspirationHeader.style.cssText = 'display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;';
const inspTitle = inspirationHeader.createEl('h2', { text: '🌟 Vaše základní inspirace (Nejvýše hodnocené tituly)' });
inspTitle.style.cssText = 'margin:0;font-size:1.15em;color:var(--bronze);font-weight:600;';

const topRated = [...films.values, ...series.values]
  .filter(i => i.my_rating)
  .sort((a, b) => Number(b.my_rating) - Number(a.my_rating))
  .slice(0, 6);

if (topRated.length > 0) {
  const inspGrid = container.createDiv();
  inspGrid.style.cssText = 'display:grid;grid-template-columns:repeat(auto-fill, minmax(160px, 1fr));gap:14px;';

  topRated.forEach(item => {
    const card = inspGrid.createDiv({ cls: 'moc-card' });
    card.style.cssText = 'padding:0;overflow:hidden;cursor:pointer;border-radius:10px;background:var(--surface);border:1px solid var(--border);display:flex;flex-direction:column;transition:transform 0.15s, border-color 0.15s;';
    card.addEventListener('mouseenter', () => { card.style.borderColor = 'var(--bronze)'; card.style.transform = 'translateY(-2px)'; });
    card.addEventListener('mouseleave', () => { card.style.borderColor = 'var(--border)'; card.style.transform = 'translateY(0)'; });
    card.addEventListener('click', () => app.workspace.openLinkText(item.file.path, ''));

    if (item.poster) {
      const pw = card.createDiv();
      pw.style.cssText = 'width:100%;aspect-ratio:2/3;overflow:hidden;background:var(--surface-elev);';
      const img = pw.createEl('img');
      img.src = item.poster;
      img.style.cssText = 'width:100%;height:100%;object-fit:cover;display:block;';
    }

    const info = card.createDiv();
    info.style.cssText = 'padding:10px;display:flex;flex-direction:column;gap:4px;flex:1;';

    const titleRow = info.createDiv();
    titleRow.style.cssText = 'display:flex;align-items:flex-start;justify-content:space-between;gap:4px;';
    const nameEl = titleRow.createEl('strong', { text: item.title || item.file.name });
    nameEl.style.cssText = 'font-size:0.85em;line-height:1.3;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;';

    const metaRow = info.createDiv();
    metaRow.style.cssText = 'display:flex;align-items:center;justify-content:space-between;margin-top:auto;padding-top:4px;font-size:0.75em;';

    const typeBadge = metaRow.createEl('span', { text: item.type === 'serial' ? '📺 Seriál' : '🎬 Film' });
    typeBadge.style.cssText = 'color:var(--text-muted);';

    const ratingBadge = metaRow.createEl('span', { text: `★ ${item.my_rating}/10` });
    ratingBadge.style.cssText = `font-weight:700;color:${STAR_COLOR};`;
  });
}
```
