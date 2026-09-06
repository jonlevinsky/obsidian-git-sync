---
cssclasses: homepage-dashboard
type: database
name: Herní databáze
tags:
  - databaze
  - hra
---

```dataviewjs
const ACCENT = '#c49a5a';
const container = dv.container;
container.classList.add('homepage-root');
container.style.setProperty('--moc-accent', ACCENT);

const games = dv.pages('"Databaze/Hry"')
  .where(p => p.type === 'game');

const header = container.createDiv({ cls: 'moc-header' });
const left = header.createDiv({ cls: 'moc-header-left' });
left.createEl('span', { text: '🎮', cls: 'moc-header-icon' });
left.createEl('h1', { text: 'HERNÍ DATABÁZE' });

const meta = header.createDiv({ cls: 'moc-header-meta' });
const makeStat = (icon, val, label) => {
  const el = meta.createDiv({ cls: 'hp-meta-bubble' });
  el.createEl('span', { cls: 'hp-meta-icon', text: icon });
  el.createEl('span', { cls: 'hp-meta-value', text: `${val}` });
  el.createEl('span', { cls: 'hp-meta-label', text: label });
};
makeStat('🎮', games.length, 'her');
const withRating = games.values.filter(g => g.my_rating);
if (withRating.length > 0) {
  const avg = (withRating.reduce((s, g) => s + Number(g.my_rating), 0) / withRating.length).toFixed(1);
  makeStat('⭐', avg, 'ø hodnocení');
}
const completedCount = games.values.filter(g => g.status === 'completed').length;
makeStat('✅', completedCount, 'dohráno');

// ── CONTROLS ROW ──
const controlsRow = container.createDiv();
controlsRow.style.cssText = 'display:flex;gap:8px;margin-top:8px;padding:0 var(--space-8);flex-wrap:wrap;';

const searchInput = controlsRow.createEl('input', { type: 'text', placeholder: '🔍 Hledej v herní databázi...' });
searchInput.style.cssText = 'flex:1;min-width:160px;padding:10px 16px;border-radius:12px;border:1px solid var(--background-modifier-border);background:var(--background-primary);color:var(--text-normal);font-size:0.9em;';

const styleSelect = (sel) => {
  sel.style.cssText = 'padding:8px 12px;border-radius:10px;border:1px solid var(--background-modifier-border);background:var(--background-primary);color:var(--text-normal);font-size:0.8em;cursor:pointer;max-width:180px;';
};

const sortSelect = controlsRow.createEl('select');
styleSelect(sortSelect);
sortSelect.createEl('option', { value: 'my-rating-desc', text: '★ Hodnocení ▼' });
sortSelect.createEl('option', { value: 'my-rating-asc', text: '★ Hodnocení ▲' });
sortSelect.createEl('option', { value: 'year-desc', text: '📅 Rok ▼' });
sortSelect.createEl('option', { value: 'year-asc', text: '📅 Rok ▲' });
sortSelect.createEl('option', { value: 'title-asc', text: '🔤 Název A-Z' });

const statusFilterSelect = controlsRow.createEl('select');
styleSelect(statusFilterSelect);
statusFilterSelect.createEl('option', { value: 'all', text: '📋 Všechny stavy' });
statusFilterSelect.createEl('option', { value: 'completed', text: '✅ Dohráno' });
statusFilterSelect.createEl('option', { value: 'playing', text: '🎮 Hráno' });
statusFilterSelect.createEl('option', { value: 'backlog', text: '📋 Chci hrát' });
statusFilterSelect.createEl('option', { value: 'dropped', text: '❌ Nedohráno' });

const platformSelect = controlsRow.createEl('select');
styleSelect(platformSelect);
platformSelect.createEl('option', { value: 'all', text: '💻 Všechny platformy' });
platformSelect.createEl('option', { value: 'PC', text: 'PC' });
platformSelect.createEl('option', { value: 'PlayStation 5', text: 'PS5' });
platformSelect.createEl('option', { value: 'Xbox', text: 'Xbox' });
platformSelect.createEl('option', { value: 'Nintendo Switch', text: 'Switch' });

const addBtn = controlsRow.createEl('button', { text: '➕ Přidat hru' });
addBtn.style.cssText = 'padding:8px 18px;border-radius:10px;background:color-mix(in srgb, var(--moc-accent) 15%,transparent);color:var(--moc-accent);border:1px solid color-mix(in srgb, var(--moc-accent) 25%,transparent);font-weight:600;cursor:pointer;font-size:0.8em;white-space:nowrap;';
addBtn.addEventListener('click', () => {
  app.commands.executeCommandById('filmova-databaze:add-game');
});

const bulkBtn = controlsRow.createEl('button', { text: '📦 Hromadné přidání' });
bulkBtn.style.cssText = 'padding:8px 18px;border-radius:10px;background:color-mix(in srgb, var(--moc-accent) 15%,transparent);color:var(--moc-accent);border:1px solid color-mix(in srgb, var(--moc-accent) 25%,transparent);font-weight:600;cursor:pointer;font-size:0.8em;white-space:nowrap;';
bulkBtn.addEventListener('click', () => {
  app.commands.executeCommandById('filmova-databaze:bulk-add-games');
});

// ── GRID ──
let currentFilter = '';
let currentSort = 'my-rating-desc';
let currentStatusFilter = 'all';
let currentPlatformFilter = 'all';

function applyFilters() {
  let result = games.values;

  const q = currentFilter.toLowerCase().trim();
  if (q) {
    result = result.filter(g => {
      const t = (g.title || g.file.name).toLowerCase();
      const gen = (g.genre || '').toLowerCase();
      return t.includes(q) || gen.includes(q);
    });
  }

  if (currentStatusFilter !== 'all') {
    result = result.filter(g => (g.status || 'completed') === currentStatusFilter);
  }

  if (currentPlatformFilter !== 'all') {
    result = result.filter(g => (g.platform || 'PC') === currentPlatformFilter);
  }

  const [sortField, sortDir] = currentSort.split('-');
  result.sort((a, b) => {
    let va, vb;
    if (sortField === 'year') { va = a.release_year || ''; vb = b.release_year || ''; }
    else if (sortField === 'title') { va = (a.title || a.file.name || '').toLowerCase(); vb = (b.title || b.file.name || '').toLowerCase(); }
    else if (sortField === 'my') { va = Number(a.my_rating) || 0; vb = Number(b.my_rating) || 0; }
    if (typeof va === 'string') return sortDir === 'asc' ? va.localeCompare(vb) : vb.localeCompare(va);
    return sortDir === 'asc' ? va - vb : vb - va;
  });

  return result;
}

function renderGrid() {
  const oldGrid = container.querySelector('.game-grid');
  if (oldGrid) oldGrid.remove();

  const filtered = applyFilters();

  if (filtered.length > 0) {
    const grid = container.createDiv({ cls: 'moc-grid game-grid' });
    grid.style.cssText = 'display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:12px;padding:12px 16px;';

    for (const g of filtered) {
      const title = g.title || g.file.name;
      const card = grid.createDiv({ cls: 'moc-card' });
      card.style.cssText = 'cursor:pointer;padding:0;overflow:hidden;border-radius:12px;display:flex;flex-direction:column;';
      card.addEventListener('click', () => app.workspace.openLinkText(g.file.path, ''));

      if (g.cover_url) {
        const pw = card.createDiv();
        pw.style.cssText = 'width:100%;aspect-ratio:16/9;overflow:hidden;background:var(--background-primary);';
        const img = pw.createEl('img');
        img.src = g.cover_url;
        img.style.cssText = 'width:100%;height:100%;object-fit:cover;display:block;';
      }

      const info = card.createDiv();
      info.style.cssText = 'padding:10px 12px;display:flex;flex-direction:column;gap:4px;flex:1;';

      info.createEl('div', { text: title, style: 'font-weight:600;font-size:0.9em;line-height:1.3;' });

      const metaRow = info.createDiv();
      metaRow.style.cssText = 'display:flex;gap:6px;align-items:center;flex-wrap:wrap;font-size:0.7em;color:var(--text-muted);';

      if (g.release_year) metaRow.createEl('span', { text: `📅 ${g.release_year}` });
      if (g.platform) metaRow.createEl('span', { text: `💻 ${g.platform}` });
      if (g.playtime_hours) metaRow.createEl('span', { text: `⏳ ${g.playtime_hours}h` });

      if (g.my_rating) {
        const rat = info.createDiv({ text: `★ ${g.my_rating}/10` });
        rat.style.cssText = 'font-weight:700;color:var(--moc-accent);font-size:0.85em;margin-top:2px;';
      }
    }
  } else {
    const empty = container.createDiv({ cls: 'game-grid' });
    empty.style.cssText = 'margin-top:16px;text-align:center;padding:40px;color:var(--text-muted);';
    empty.textContent = '🎮 Žádné hry neodpovídají zadaným filtrům.';
  }
}

searchInput.addEventListener('input', () => { currentFilter = searchInput.value; renderGrid(); });
sortSelect.addEventListener('change', () => { currentSort = sortSelect.value; renderGrid(); });
statusFilterSelect.addEventListener('change', () => { currentStatusFilter = statusFilterSelect.value; renderGrid(); });
platformSelect.addEventListener('change', () => { currentPlatformFilter = platformSelect.value; renderGrid(); });

renderGrid();
```
