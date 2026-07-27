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

const films = dv.pages('"Databaze/Filmy"')
  .where(p => p.type === 'film');

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

// ── CONTROLS ROW ──
const controlsRow = container.createDiv();
controlsRow.style.cssText = 'display:flex;gap:8px;margin-top:8px;padding:0 var(--space-8);flex-wrap:wrap;';

const searchInput = controlsRow.createEl('input', { type: 'text', placeholder: '🔍 Hledej v databázi...' });
searchInput.style.cssText = 'flex:1;min-width:160px;padding:10px 16px;border-radius:12px;border:1px solid var(--background-modifier-border);background:var(--background-primary);color:var(--text-normal);font-size:0.9em;';

const styleSelect = (sel) => {
  sel.style.cssText = 'padding:8px 12px;border-radius:10px;border:1px solid var(--background-modifier-border);background:var(--background-primary);color:var(--text-normal);font-size:0.8em;cursor:pointer;max-width:180px;';
};

const sortSelect = controlsRow.createEl('select');
styleSelect(sortSelect);
sortSelect.createEl('option', { value: 'year-desc', text: '📅 Rok ▼' });
sortSelect.createEl('option', { value: 'year-asc', text: '📅 Rok ▲' });
sortSelect.createEl('option', { value: 'title-asc', text: '🔤 Název A-Z' });
sortSelect.createEl('option', { value: 'title-desc', text: '🔤 Název Z-A' });
sortSelect.createEl('option', { value: 'my-rating-desc', text: '★ Moje ▼' });
sortSelect.createEl('option', { value: 'my-rating-asc', text: '★ Moje ▲' });
sortSelect.createEl('option', { value: 'tmdb-rating-desc', text: '⭐ TMDB ▼' });
sortSelect.createEl('option', { value: 'tmdb-rating-asc', text: '⭐ TMDB ▲' });

// Collect unique genres
const allGenres = new Set();
films.values.forEach(f => {
  if (f.genre) f.genre.split(', ').forEach(g => { if (g.trim()) allGenres.add(g.trim()); });
});
const sortedGenres = [...allGenres].sort();

const genreSelect = controlsRow.createEl('select');
styleSelect(genreSelect);
genreSelect.createEl('option', { value: '', text: '🎭 Všechny žánry' });
for (const g of sortedGenres) genreSelect.createEl('option', { value: g, text: g });

const ratingFilterSelect = controlsRow.createEl('select');
styleSelect(ratingFilterSelect);
ratingFilterSelect.createEl('option', { value: 'all', text: '📊 Vše' });
ratingFilterSelect.createEl('option', { value: 'rated', text: '★ Ohodnocené' });
ratingFilterSelect.createEl('option', { value: 'unrated', text: '☆ Neohodnocené' });

const addBtn = controlsRow.createEl('button', { text: '➕ Přidat film' });
addBtn.style.cssText = 'padding:8px 18px;border-radius:10px;background:color-mix(in srgb, var(--moc-accent) 15%,transparent);color:var(--moc-accent);border:1px solid color-mix(in srgb, var(--moc-accent) 25%,transparent);font-weight:600;cursor:pointer;font-size:0.8em;white-space:nowrap;';
addBtn.addEventListener('mouseenter', () => addBtn.style.background = 'color-mix(in srgb, var(--moc-accent) 25%,transparent)');
addBtn.addEventListener('mouseleave', () => addBtn.style.background = 'color-mix(in srgb, var(--moc-accent) 15%,transparent)');
addBtn.addEventListener('click', () => {
  app.commands.executeCommandById('filmova-databaze:add-movie');
});

// ── GRID ──
let currentFilter = '';
let currentSort = 'year-desc';
let currentGenre = '';
let currentRatingFilter = 'all';

function applyFilters() {
  let result = films.values;

  // Text search
  const q = currentFilter.toLowerCase().trim();
  if (q) {
    result = result.filter(f => {
      const t = (f.title || f.file.name).toLowerCase();
      const d = (f.director || '').toLowerCase();
      const g = (f.genre || '').toLowerCase();
      return t.includes(q) || d.includes(q) || g.includes(q);
    });
  }

  // Genre filter
  if (currentGenre) {
    result = result.filter(f => f.genre && f.genre.split(', ').includes(currentGenre));
  }

  // Rating filter
  if (currentRatingFilter === 'rated') result = result.filter(f => f.my_rating);
  if (currentRatingFilter === 'unrated') result = result.filter(f => !f.my_rating);

  // Sort
  const [sortField, sortDir] = currentSort.split('-');
  result.sort((a, b) => {
    let va, vb;
    if (sortField === 'year') { va = a.year || ''; vb = b.year || ''; }
    else if (sortField === 'title') { va = (a.title || a.file.name || '').toLowerCase(); vb = (b.title || b.file.name || '').toLowerCase(); }
    else if (sortField === 'my') { va = Number(a.my_rating) || 0; vb = Number(b.my_rating) || 0; }
    else if (sortField === 'tmdb') { va = Number(a.tmdb_rating) || 0; vb = Number(b.tmdb_rating) || 0; }
    if (typeof va === 'string') return sortDir === 'asc' ? va.localeCompare(vb) : vb.localeCompare(va);
    return sortDir === 'asc' ? va - vb : vb - va;
  });

  return result;
}

function renderGrid() {
  const oldGrid = container.querySelector('.film-grid');
  if (oldGrid) oldGrid.remove();

  const filtered = applyFilters();

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

    if (currentFilter || currentGenre || currentRatingFilter !== 'all') {
      msg.createEl('p', { text: 'Žádný film neodpovídá aktuálním filtrům.' });
      msg.createEl('p', { text: 'Zkus změnit filtry.', style: 'color:var(--text-muted);margin-top:4px;' });
    } else {
      msg.createEl('p', { text: '🎬 Databáze je prázdná' });
      msg.createEl('p', { text: 'Přidej první film tlačítkem nahoře.', style: 'color:var(--text-muted);margin-top:4px;' });
    }
  }
  updateCount(filtered.length);
}

function updateCount(n) {
  let el = container.querySelector('.film-count');
  if (!el) {
    el = container.createEl('div', { cls: 'film-count' });
    el.style.cssText = 'font-size:0.75em;color:var(--text-muted);text-align:right;padding:4px var(--space-8);margin-top:4px;';
    container.insertBefore(el, container.querySelector('.film-grid') || container.lastChild);
  }
  el.textContent = `${n} z ${films.length} filmů`;
}

searchInput.addEventListener('input', () => {
  currentFilter = searchInput.value;
  renderGrid();
});

sortSelect.addEventListener('change', () => {
  currentSort = sortSelect.value;
  renderGrid();
});

genreSelect.addEventListener('change', () => {
  currentGenre = genreSelect.value;
  renderGrid();
});

ratingFilterSelect.addEventListener('change', () => {
  currentRatingFilter = ratingFilterSelect.value;
  renderGrid();
});

renderGrid();
```
