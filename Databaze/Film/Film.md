---
cssclasses: homepage-dashboard
type: database
name: Filmová databáze
tags: [databaze, film]
---

```dataviewjs
const ACCENT = '#c49a5a';
const container = dv.container;
container.classList.add('homepage-root');
container.style.setProperty('--moc-accent', ACCENT);

const films = dv.pages('"Databaze/Film"')
  .where(p => p.type === 'film')
  .sort(p => p.year, 'desc');

const header = container.createDiv({ cls: 'moc-header' });
const left = header.createDiv({ cls: 'moc-header-left' });
left.createEl('span', { text: '🎞️', cls: 'moc-header-icon' });
left.createEl('h1', { text: 'FILMOVÁ DATABÁZE' });

const meta = header.createDiv({ cls: 'moc-header-meta' });
const makeStat = (icon, val, label) => {
  const el = meta.createDiv({ cls: 'hp-meta-bubble' });
  el.createEl('span', { cls: 'hp-meta-icon', text: icon });
  el.createEl('span', { cls: 'hp-meta-value', text: `${val}` });
  el.createEl('span', { cls: 'hp-meta-label', text: label });
};
makeStat('🎬', films.length, 'filmů');
const withRating = films.values.filter(f => f.my_rating);
if (withRating.length > 0) {
  const avg = (withRating.reduce((s, f) => s + Number(f.my_rating), 0) / withRating.length).toFixed(1);
  makeStat('⭐', avg, 'ø hodnocení');
}
makeStat('📝', films.values.filter(f => !f.my_rating).length, 'k ohodnocení');

// ── SEARCH ──
const searchRow = container.createDiv();
searchRow.style.cssText = 'display:flex;gap:8px;margin-top:8px;padding:0 var(--space-8);';

const searchInput = searchRow.createEl('input', { type: 'text', placeholder: '🔍 Hledej v databázi...' });
searchInput.style.cssText = 'flex:1;padding:10px 16px;border-radius:12px;border:1px solid var(--background-modifier-border);background:var(--background-primary);color:var(--text-normal);font-size:0.9em;';

const addBtn = searchRow.createEl('button', { text: '➕ Přidat film' });
addBtn.style.cssText = 'padding:10px 20px;border-radius:12px;background:color-mix(in srgb, var(--moc-accent) 15%,transparent);color:var(--moc-accent);border:1px solid color-mix(in srgb, var(--moc-accent) 25%,transparent);font-weight:600;cursor:pointer;font-size:0.85em;white-space:nowrap;';
addBtn.addEventListener('mouseenter', () => addBtn.style.background = 'color-mix(in srgb, var(--moc-accent) 25%,transparent)');
addBtn.addEventListener('mouseleave', () => addBtn.style.background = 'color-mix(in srgb, var(--moc-accent) 15%,transparent)');
addBtn.addEventListener('click', () => {
  app.commands.executeCommandById('filmova-databaze:add-movie');
});

// ── GRID ──
let currentFilter = '';

function renderGrid() {
  const oldGrid = container.querySelector('.film-grid');
  if (oldGrid) oldGrid.remove();

  const q = currentFilter.toLowerCase().trim();
  const filtered = q
    ? films.where(f => {
        const t = (f.title || f.file.name).toLowerCase();
        const d = (f.director || '').toLowerCase();
        const g = (f.genre || '').toLowerCase();
        return t.includes(q) || d.includes(q) || g.includes(q);
      })
    : films;

  if (filtered.length > 0) {
    const grid = container.createDiv({ cls: 'moc-grid film-grid' });

    for (const f of filtered) {
      const title = f.title || f.file.name;
      const card = grid.createDiv({ cls: 'moc-card' });
      card.style.cursor = 'pointer';
      card.style.padding = '0';
      card.style.overflow = 'hidden';
      card.addEventListener('click', () => app.workspace.openLinkText(f.file.path, ''));

      if (f.poster) {
        const pw = card.createDiv();
        pw.style.cssText = 'width:100%;aspect-ratio:2/3;overflow:hidden;background:var(--background-primary);';
        const img = pw.createEl('img');
        img.src = f.poster;
        img.style.cssText = 'width:100%;height:100%;object-fit:cover;display:block;';
        img.onerror = function() { this.style.display = 'none'; pw.style.display = 'none'; };
      }

      const info = card.createDiv();
      info.style.cssText = 'padding:10px 12px 12px;display:flex;flex-direction:column;gap:4px;';

      const tr = info.createDiv();
      tr.style.cssText = 'display:flex;align-items:flex-start;justify-content:space-between;gap:6px;';

      const te = tr.createEl('div', { text: title });
      te.style.cssText = 'font-weight:600;font-size:0.85em;line-height:1.3;flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;';

      if (f.year) {
        const y = tr.createEl('span', { text: f.year });
        y.style.cssText = 'font-size:0.65em;padding:1px 6px;border-radius:4px;background:color-mix(in srgb, var(--moc-accent) 15%,transparent);color:var(--moc-accent);white-space:nowrap;flex-shrink:0;';
      }

      if (f.director) {
        const d = info.createEl('div', { text: `🎬 ${f.director}` });
        d.style.cssText = 'font-size:0.7em;color:var(--text-muted);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;';
      }

      const tags = info.createDiv({ cls: 'moc-card-tags' });
      if (f.tmdb_rating) tags.createEl('span', { text: `⭐ ${f.tmdb_rating}`, cls: 'moc-card-tag' });
      if (f.my_rating) {
        const mt = tags.createEl('span', { text: `★ ${f.my_rating}/10`, cls: 'moc-card-tag' });
        mt.style.fontWeight = '700';
      }
      if (f.genre) tags.createEl('span', { text: f.genre, cls: 'moc-card-tag' });
    }
  } else {
    const empty = container.createDiv({ cls: 'film-grid' });
    empty.style.cssText = 'margin-top:16px;';

    const msg = empty.createDiv({ cls: 'moc-card' });
    msg.style.cssText = 'text-align:center;padding:40px 20px;';

    if (q) {
      msg.createEl('p', { text: `"${q}" není v databázi` });
      msg.createEl('p', { text: 'Chceš film přidat?', style: 'color:var(--text-muted);margin-top:4px;' });
      const addFromSearch = msg.createEl('button', { text: `🔍 Vyhledat "${q}" na TMDB` });
      addFromSearch.style.cssText = 'margin-top:12px;padding:10px 24px;border-radius:12px;background:color-mix(in srgb, var(--moc-accent) 15%,transparent);color:var(--moc-accent);border:1px solid color-mix(in srgb, var(--moc-accent) 25%,transparent);font-weight:600;cursor:pointer;font-size:0.9em;';
      addFromSearch.addEventListener('mouseenter', () => addFromSearch.style.background = 'color-mix(in srgb, var(--moc-accent) 25%,transparent)');
      addFromSearch.addEventListener('mouseleave', () => addFromSearch.style.background = 'color-mix(in srgb, var(--moc-accent) 15%,transparent)');
      addFromSearch.addEventListener('click', () => {
        const plugin = app.plugins.getPlugin('filmova-databaze');
        if (plugin) plugin.searchAndAdd(q);
      });
    } else {
      msg.createEl('p', { text: '🎬 Databáze je prázdná' });
      msg.createEl('p', { text: 'Přidej první film tlačítkem nahoře.', style: 'color:var(--text-muted);margin-top:4px;' });
    }
  }
}

searchInput.addEventListener('input', () => {
  currentFilter = searchInput.value;
  renderGrid();
});

renderGrid();
```
