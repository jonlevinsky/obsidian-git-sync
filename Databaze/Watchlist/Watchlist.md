---
obsidianUIMode: reading
cssclasses: homepage-dashboard
type: database
name: Sledování
tags:
  - databaze
  - watchlist
"tags:": databaze
tags?: databaze
---

```dataviewjs
const ACCENT = '#c49a5a';
const container = dv.container;
container.classList.add('homepage-root');
container.style.setProperty('--moc-accent', ACCENT);

const items = dv.pages('"Databaze/Watchlist"')
  .where(p => p.type === 'watchlist');

// ─── HEADER ───
const header = container.createDiv({ cls: 'moc-header' });
const left = header.createDiv({ cls: 'moc-header-left' });
left.createEl('span', { text: '👀', cls: 'moc-header-icon' });
left.createEl('h1', { text: 'WATCHLIST' });

const meta = header.createDiv({ cls: 'moc-header-meta' });
const makeStat = (icon, val, label) => {
  const el = meta.createDiv({ cls: 'hp-meta-bubble' });
  el.createEl('span', { cls: 'hp-meta-icon', text: icon });
  el.createEl('span', { cls: 'hp-meta-value', text: `${val}` });
  el.createEl('span', { cls: 'hp-meta-label', text: label });
};
makeStat('👀', items.values.filter(i => !i.watched).length, 'ke zhlédnutí');
makeStat('✅', items.values.filter(i => i.watched).length, 'zhlédnuté');

// ─── CONTROLS ROW ───
const controlsRow = container.createDiv();
controlsRow.style.cssText = 'display:flex;gap:8px;margin-top:8px;padding:0 var(--space-8);flex-wrap:wrap;';

const searchInput = controlsRow.createEl('input', { type: 'text', placeholder: '🔍 Hledej ve watchlistu...' });
searchInput.style.cssText = 'flex:1;min-width:160px;padding:10px 16px;border-radius:12px;border:1px solid var(--background-modifier-border);background:var(--background-primary);color:var(--text-normal);font-size:0.9em;';

const styleSelect = (sel) => {
  sel.style.cssText = 'padding:8px 12px;border-radius:10px;border:1px solid var(--background-modifier-border);background:var(--background-primary);color:var(--text-normal);font-size:0.8em;cursor:pointer;max-width:180px;';
};

const filterSelect = controlsRow.createEl('select');
styleSelect(filterSelect);
filterSelect.createEl('option', { value: 'all', text: '📋 Vše' });
filterSelect.createEl('option', { value: 'unwatched', text: '👀 Ke zhlédnutí' });
filterSelect.createEl('option', { value: 'watched', text: '✅ Zhlédnuté' });

const sortSelect = controlsRow.createEl('select');
styleSelect(sortSelect);
sortSelect.createEl('option', { value: 'date-desc', text: '📅 Přidáno ▼' });
sortSelect.createEl('option', { value: 'date-asc', text: '📅 Přidáno ▲' });
sortSelect.createEl('option', { value: 'title-asc', text: '🔤 Název A-Z' });
sortSelect.createEl('option', { value: 'title-desc', text: '🔤 Název Z-A' });

const compactBtn = controlsRow.createEl('button', { text: '🔲' });
compactBtn.title = 'Přepnout kompaktní zobrazení';
compactBtn.style.cssText = 'padding:8px 10px;border-radius:10px;background:color-mix(in srgb, var(--moc-accent) 10%,transparent);color:var(--text-muted);border:1px solid color-mix(in srgb, var(--moc-accent) 15%,transparent);font-size:0.85em;cursor:pointer;line-height:1;';

const addBtn = controlsRow.createEl('button', { text: '➕ Přidat do watchlistu' });
addBtn.style.cssText = 'padding:8px 18px;border-radius:10px;background:color-mix(in srgb, var(--moc-accent) 15%,transparent);color:var(--moc-accent);border:1px solid color-mix(in srgb, var(--moc-accent) 25%,transparent);font-weight:600;cursor:pointer;font-size:0.8em;white-space:nowrap;';
addBtn.addEventListener('mouseenter', () => addBtn.style.background = 'color-mix(in srgb, var(--moc-accent) 25%,transparent)');
addBtn.addEventListener('mouseleave', () => addBtn.style.background = 'color-mix(in srgb, var(--moc-accent) 15%,transparent)');
addBtn.addEventListener('click', () => {
  app.commands.executeCommandById('filmova-databaze:add-to-watchlist');
});

// ─── GRID ───
let currentSearch = '';
let currentFilter = 'all';
let currentSort = 'date-desc';
let compact = false;

// Load settings from localStorage
const STORAGE_KEY = 'filmova-db-watchlist';
(function loadSettings() {
  try {
    const s = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    if (s.filter) { currentFilter = s.filter; filterSelect.value = s.filter; }
    if (s.sort) { currentSort = s.sort; sortSelect.value = s.sort; }
    if (s.compact) {
      compact = true;
      compactBtn.style.background = 'color-mix(in srgb, var(--moc-accent) 25%,transparent)';
      compactBtn.style.color = 'var(--moc-accent)';
    }
  } catch(e) {}
})();
const saveSettings = () => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({
    filter: currentFilter, sort: currentSort, compact,
  }));
};

async function toggleWatched(file, currentVal) {
  const c = await app.vault.read(file);
  const lines = c.split('\n');
  const idx = lines.findIndex(l => l.startsWith('watched:'));
  if (idx >= 0) {
    lines[idx] = 'watched: ' + (!currentVal);
  }
  await app.vault.modify(file, lines.join('\n'));
  renderGrid();
}

async function deleteItem(file) {
  await app.vault.delete(file);
  renderGrid();
}

async function moveToDatabase(file, item) {
  const title = item.title || file.basename;
  const year = item.year || '';
  const poster = item.poster || '';
  const tmdbId = item.tmdb_id || '';
  const mediaType = item.media_type || 'movie';
  const now = window.moment().format('DD.MM.YYYY');

  let folder, type, tmdbRating;

  if (mediaType === 'movie') {
    folder = 'Databaze/Filmy';
    type = 'film';
    try {
      const resp = await fetch(`https://api.themoviedb.org/3/movie/${tmdbId}?api_key=${app.plugins.plugins['filmova-databaze'].settings.apiKey}&language=cs`);
      const d = await resp.json();
      tmdbRating = d.vote_average ? d.vote_average.toFixed(1) : '';
    } catch (e) {}
  } else {
    folder = 'Databaze/Serialy';
    type = 'serial';
    try {
      const resp = await fetch(`https://api.themoviedb.org/3/tv/${tmdbId}?api_key=${app.plugins.plugins['filmova-databaze'].settings.apiKey}&language=cs`);
      const d = await resp.json();
      tmdbRating = d.vote_average ? d.vote_average.toFixed(1) : '';
    } catch (e) {}
  }

  const fileName = title.replace(/[<>:"/\\|?*]/g, '').trim() + '.md';
  const filePath = `${folder}/${fileName}`;
  const existing = app.vault.getAbstractFileByPath(filePath);
  if (existing) {
    new Notice(`"${title}" už v databázi existuje`);
    return;
  }

  const safeTitle = title.replace(/[<>:"/\\|?*]/g, '').trim();
  const content = `---
cssclasses: homepage-dashboard
type: ${type}
title: ${title}
year: ${year}
${mediaType === 'movie' ? 'director: ' : 'creator: '}
genre: 
country: 
${mediaType === 'movie' ? 'length: ' : `seasons: \nepisodes: \nstatus: \nnetwork: `}
tmdb_rating: ${tmdbRating}
my_rating: 
poster: ${poster}
tmdb_id: ${tmdbId}
date_watched: ${now}
tags: [${type === 'film' ? 'film' : 'serial'}, databaze]
notes: |
  Přesunuto z watchlistu
dojmy: 
---`;
  await app.vault.create(filePath, content);
  await app.vault.delete(file);
  new Notice(`"${title}" přesunut do ${type === 'film' ? 'filmů' : 'seriálů'}`);
  renderGrid();
}

function renderGrid() {
  const oldGrid = container.querySelector('.wl-grid');
  if (oldGrid) oldGrid.remove();

  let result = items.values;
  const q = currentSearch.toLowerCase().trim();
  if (q) {
    result = result.filter(i => {
      const t = (i.title || i.file.name).toLowerCase();
      return t.includes(q);
    });
  }
  if (currentFilter === 'unwatched') result = result.filter(i => !i.watched);
  if (currentFilter === 'watched') result = result.filter(i => i.watched);

  const [sortField, sortDir] = currentSort.split('-');
  result.sort((a, b) => {
    if (sortField === 'date') {
      const da = a.date_added || '';
      const db = b.date_added || '';
      return sortDir === 'asc' ? da.localeCompare(db) : db.localeCompare(da);
    }
    if (sortField === 'title') {
      const ta = (a.title || a.file.name || '').toLowerCase();
      const tb = (b.title || b.file.name || '').toLowerCase();
      return sortDir === 'asc' ? ta.localeCompare(tb) : tb.localeCompare(ta);
    }
    return 0;
  });

  if (result.length > 0) {
    const grid = container.createDiv({ cls: 'moc-grid wl-grid' });
    if (compact) grid.style.cssText = 'display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:8px;padding:12px 16px;';

    for (const item of result) {
      const title = item.title || item.file.name;
      const card = grid.createDiv({ cls: 'moc-card' });
      card.style.cssText = 'padding:0;overflow:hidden;display:flex;flex-direction:column;' + (compact ? 'border-radius:8px;' : '');

      if (item.poster) {
        const pw = card.createDiv();
        pw.style.cssText = 'width:100%;aspect-ratio:2/3;overflow:hidden;background:var(--background-primary);' + (compact ? 'max-height:180px;' : '');
        const img = pw.createEl('img');
        img.src = item.poster;
        img.style.cssText = 'width:100%;height:100%;object-fit:cover;display:block;';
        img.onerror = function () { this.style.display = 'none'; pw.style.display = 'none'; };
      }

      const info = card.createDiv();
      info.style.cssText = 'padding:10px 12px 12px;display:flex;flex-direction:column;gap:4px;flex:1;' + (compact ? 'padding:6px 8px 8px;gap:2px;' : '');

      const tr = info.createDiv();
      tr.style.cssText = 'display:flex;align-items:flex-start;justify-content:space-between;gap:6px;';

      const te = tr.createEl('div', { text: title });
      te.style.cssText = 'font-weight:600;font-size:0.85em;line-height:1.3;flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;' + (compact ? 'font-size:0.7em;' : '');

      if (item.year) {
        const y = tr.createEl('span', { text: item.year });
        y.style.cssText = 'font-size:0.65em;padding:1px 6px;border-radius:4px;background:color-mix(in srgb, var(--moc-accent) 15%,transparent);color:var(--moc-accent);white-space:nowrap;flex-shrink:0;' + (compact ? 'font-size:0.55em;padding:1px 4px;' : '');
      }

      // Type badge
      const mt = item.media_type || 'movie';
      const typeBadge = info.createEl('span', { text: mt === 'movie' ? '🎬 Film' : '📺 Seriál' });
      typeBadge.style.cssText = 'font-size:0.65em;padding:1px 6px;border-radius:4px;background:color-mix(in srgb, var(--moc-accent) 10%,transparent);color:var(--text-muted);align-self:flex-start;' + (compact ? 'font-size:0.55em;padding:1px 4px;' : '');

      // Date added
      if (item.date_added) {
        const da = info.createEl('div', { text: `➕ ${item.date_added}` });
        da.style.cssText = 'font-size:0.65em;color:var(--text-muted);' + (compact ? 'font-size:0.55em;' : '');
      }

      // Action buttons
      const actions = info.createDiv();
      actions.style.cssText = 'display:flex;gap:6px;margin-top:4px;flex-wrap:wrap;' + (compact ? 'gap:4px;margin-top:2px;' : '');

      // Watched checkbox
      const watchLabel = actions.createEl('label');
      watchLabel.style.cssText = 'display:flex;align-items:center;gap:4px;font-size:0.7em;cursor:pointer;padding:3px 8px;border-radius:6px;background:color-mix(in srgb, var(--moc-accent) 10%,transparent);' + (compact ? 'font-size:0.6em;padding:2px 6px;' : '');
      const cb = watchLabel.createEl('input', { type: 'checkbox' });
      cb.checked = item.watched;
      cb.style.cssText = 'margin:0;cursor:pointer;';
      watchLabel.createEl('span', { text: item.watched ? '✅ Zhlédnuto' : '⬜ Označit' });
      cb.addEventListener('change', () => toggleWatched(item.file.path, item.watched));

      // Move to DB button
      const moveBtn = actions.createEl('button', { text: '📁 Do databáze' });
      moveBtn.style.cssText = 'padding:3px 8px;border-radius:6px;background:color-mix(in srgb, #4fc3f7 15%,transparent);color:#4fc3f7;border:1px solid color-mix(in srgb, #4fc3f7 20%,transparent);font-size:0.65em;cursor:pointer;font-weight:600;' + (compact ? 'font-size:0.55em;padding:2px 6px;' : '');
      moveBtn.addEventListener('mouseenter', () => moveBtn.style.background = 'color-mix(in srgb, #4fc3f7 25%,transparent)');
      moveBtn.addEventListener('mouseleave', () => moveBtn.style.background = 'color-mix(in srgb, #4fc3f7 15%,transparent)');
      moveBtn.addEventListener('click', () => moveToDatabase(item.file.path, item));

      // Delete button
      const delBtn = actions.createEl('button', { text: '🗑' });
      delBtn.style.cssText = 'padding:3px 8px;border-radius:6px;background:color-mix(in srgb, #ef4444 15%,transparent);color:#ef4444;border:1px solid color-mix(in srgb, #ef4444 20%,transparent);font-size:0.65em;cursor:pointer;' + (compact ? 'padding:2px 6px;' : '');
      delBtn.addEventListener('mouseenter', () => delBtn.style.background = 'color-mix(in srgb, #ef4444 25%,transparent)');
      delBtn.addEventListener('mouseleave', () => delBtn.style.background = 'color-mix(in srgb, #ef4444 15%,transparent)');
      delBtn.addEventListener('click', () => deleteItem(item.file.path));
    }
  } else {
    const empty = container.createDiv({ cls: 'wl-grid' });
    empty.style.cssText = 'margin-top:16px;';
    const msg = empty.createDiv({ cls: 'moc-card' });
    msg.style.cssText = 'text-align:center;padding:40px 20px;';

    if (currentSearch || currentFilter !== 'all') {
      msg.createEl('p', { text: 'Žádná položka neodpovídá filtrům.' });
    } else {
      msg.createEl('p', { text: '👀 Watchlist je prázdný' });
      msg.createEl('p', { text: 'Přidej něco tlačítkem nahoře.', style: 'color:var(--text-muted);margin-top:4px;' });
    }
  }
}

searchInput.addEventListener('input', () => {
  currentSearch = searchInput.value;
  renderGrid();
});

filterSelect.addEventListener('change', () => {
  currentFilter = filterSelect.value;
  saveSettings();
  renderGrid();
});

sortSelect.addEventListener('change', () => {
  currentSort = sortSelect.value;
  saveSettings();
  renderGrid();
});

compactBtn.addEventListener('click', () => {
  compact = !compact;
  compactBtn.style.background = compact ? 'color-mix(in srgb, var(--moc-accent) 25%,transparent)' : 'color-mix(in srgb, var(--moc-accent) 10%,transparent)';
  compactBtn.style.color = compact ? 'var(--moc-accent)' : 'var(--text-muted)';
  saveSettings();
  renderGrid();
});

renderGrid();
```