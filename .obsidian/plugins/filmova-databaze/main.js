const { Plugin, ItemView, Modal, Setting, Notice, TFolder, TFile, requestUrl, PluginSettingTab } = require('obsidian');

const VIEW_TYPE = 'filmova-databaze-view';
const FOLDER = 'Databaze/Filmy';
const TMDB_BASE = 'https://api.themoviedb.org/3';
const IMG_BASE = 'https://image.tmdb.org/t/p/w500';

// ─── TMDB API ───

async function tmdbSearch(apiKey, query) {
  const url = `${TMDB_BASE}/search/movie?api_key=${apiKey}&query=${encodeURIComponent(query)}&language=cs`;
  const resp = await requestUrl({ url, method: 'GET' });
  return resp.json;
}

async function tmdbDetails(apiKey, id) {
  const url = `${TMDB_BASE}/movie/${id}?api_key=${apiKey}&language=cs`;
  const resp = await requestUrl({ url, method: 'GET' });
  return resp.json;
}

// ─── HELPERS ───

function mapTmdbToNote(detail) {
  return {
    title: detail.title || detail.original_title || 'Neznámý',
    year: detail.release_date ? detail.release_date.split('-')[0] : '',
    director: '', // TMDB detail doesn't include director in basic call
    genre: detail.genres ? detail.genres.map(g => g.name).join(', ') : '',
    country: detail.production_countries ? detail.production_countries.map(c => c.name).join(', ') : '',
    length: detail.runtime ? `${detail.runtime} min` : '',
    tmdb_rating: detail.vote_average ? detail.vote_average.toFixed(1) : '',
    poster: detail.poster_path ? `${IMG_BASE}${detail.poster_path}` : '',
    description: detail.overview || '',
    tmdb_id: detail.id,
  };
}

async function createMovieNote(app, data) {
  const folder = app.vault.getAbstractFileByPath(FOLDER);
  if (!folder || !(folder instanceof TFolder)) {
    await app.vault.createFolder(FOLDER);
  }

  const fileName = data.title.replace(/[<>:"/\\|?*]/g, '').trim() + '.md';
  const filePath = `${FOLDER}/${fileName}`;

  const existing = app.vault.getAbstractFileByPath(filePath);
  if (existing instanceof TFile) {
    new Notice(`Film "${data.title}" už existuje`);
    return existing;
  }

  const now = window.moment().format('DD.MM.YYYY');
  const content = `---
cssclasses: homepage-dashboard
type: film
title: ${data.title || ''}
year: ${data.year || ''}
director: ${data.director || ''}
genre: ${data.genre || ''}
country: ${data.country || ''}
length: ${data.length || ''}
tmdb_rating: ${data.tmdb_rating || ''}
my_rating: ${data.my_rating || ''}
poster: ${data.poster || ''}
tmdb_id: ${data.tmdb_id || ''}
date_watched: ${now}
watch_status: watched
tags: [film]
notes: 
dojmy: 
---

\`\`\`dataviewjs
const ACCENT = '#c49a5a';
const STAR_COLOR = '#f5c842';
const container = dv.container;
container.classList.add('homepage-root');
container.style.setProperty('--moc-accent', ACCENT);

const page = dv.current();
const title = page.title || 'Film';
const year = page.year || '';
const director = page.director || '';
const genre = page.genre || '';
const country = page.country || '';
const length = page.length || '';
const tmdb = page.tmdb_rating || '';
const myRating = page.my_rating || '';
const poster = page.poster || '';
const desc = page.description || '';
const notes = page.notes || '';
const dojmy = page.dojmy || '';
const watchStatus = page.watch_status || 'watched';

function stars(score, color) {
  if (!score) return '';
  const n = Math.round(Number(score));
  return '★'.repeat(n) + '☆'.repeat(10 - n);
}

// ─── HEADER ───
const header = container.createDiv({ cls: 'moc-header' });
header.style.cssText = 'display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;margin-bottom:20px;';

const left = header.createDiv({ cls: 'moc-header-left' });
left.style.cssText = 'display:flex;align-items:center;gap:10px;';
left.createEl('span', { text: '🎬', style: 'font-size:1.3em;' });
const titleEl = left.createEl('h1', { text: title });
titleEl.style.cssText = 'margin:0;font-size:1.5em;color:var(--bronze);font-weight:600;';

const meta = header.createDiv({ cls: 'moc-header-meta' });
meta.style.cssText = 'display:flex;align-items:center;gap:8px;flex-wrap:wrap;';
if (year) {
  const y = meta.createDiv({ cls: 'hp-meta-bubble' });
  y.createEl('span', { cls: 'hp-meta-icon', text: '📅' });
  y.createEl('span', { cls: 'hp-meta-value', text: year });
  y.createEl('span', { cls: 'hp-meta-label', text: 'rok' });
}
if (myRating) {
  const m = meta.createDiv({ cls: 'hp-meta-bubble' });
  m.createEl('span', { cls: 'hp-meta-icon', text: '★' });
  m.createEl('span', { cls: 'hp-meta-value', text: myRating, style: 'color:' + STAR_COLOR });
  m.createEl('span', { cls: 'hp-meta-label', text: 'moje' });
}
if (tmdb) {
  const t = meta.createDiv({ cls: 'hp-meta-bubble' });
  t.createEl('span', { cls: 'hp-meta-icon', text: '⭐' });
  t.createEl('span', { cls: 'hp-meta-value', text: tmdb });
  t.createEl('span', { cls: 'hp-meta-label', text: 'TMDB' });
}
if (watchStatus === 'watchlist') {
  const w = meta.createDiv({ cls: 'hp-meta-bubble' });
  w.createEl('span', { cls: 'hp-meta-icon', text: '👀' });
  w.createEl('span', { cls: 'hp-meta-value', text: 'Ke zhlédnutí', style: 'color:#f5c842;' });
} else if (watchStatus === 'watching') {
  const w = meta.createDiv({ cls: 'hp-meta-bubble' });
  w.createEl('span', { cls: 'hp-meta-icon', text: '📺' });
  w.createEl('span', { cls: 'hp-meta-value', text: 'Sleduji', style: 'color:#4fc3f7;' });
}

// ─── MAIN GRID: Poster + Info ───
const mainGrid = container.createDiv();
mainGrid.style.cssText = 'display:grid;grid-template-columns:220px 1fr;gap:16px;';

if (poster) {
  const posterCard = mainGrid.createDiv();
  posterCard.style.cssText = 'border-radius:12px;overflow:hidden;background:var(--surface);border:1px solid var(--border);';
  const img = posterCard.createEl('img');
  img.src = poster;
  img.style.cssText = 'width:100%;height:auto;display:block;';
}

const infoCard = mainGrid.createDiv();
infoCard.style.cssText = 'padding:16px;border-radius:12px;background:var(--surface);border:1px solid var(--border);display:flex;flex-direction:column;gap:12px;';

const infoTitle = infoCard.createEl('h2', { text: '📋 Informace' });
infoTitle.style.cssText = 'margin:0;font-size:1em;color:var(--bronze);';

const infoTable = infoCard.createDiv();
infoTable.style.cssText = 'display:grid;grid-template-columns:auto 1fr;gap:8px 16px;font-size:0.85em;';

function addInfo(label, value, icon) {
  if (!value) return;
  const lbl = infoTable.createEl('span', { text: icon + ' ' + label });
  lbl.style.cssText = 'color:var(--text-muted);font-weight:500;white-space:nowrap;';
  const val = infoTable.createEl('span', { text: value });
  val.style.cssText = 'color:var(--text);';
}
addInfo('Režie', director, '🎬');
addInfo('Žánr', genre, '🎭');
addInfo('Země', country, '🌍');
addInfo('Délka', length, '⏱');

const ratingDiv = infoCard.createDiv();
ratingDiv.style.cssText = 'padding-top:12px;border-top:1px solid var(--border);display:flex;flex-direction:column;gap:6px;';

function addRating(label, score, icon, color) {
  if (!score && label !== 'Moje') return;
  const row = ratingDiv.createDiv();
  row.style.cssText = 'display:flex;align-items:center;justify-content:space-between;gap:8px;';
  const lbl = row.createEl('span', { text: icon + ' ' + label });
  lbl.style.cssText = 'font-size:0.8em;color:var(--text-muted);font-weight:500;';
  const right = row.createDiv();
  right.style.cssText = 'display:flex;align-items:center;gap:6px;';
  if (score) {
    right.createEl('span', { text: score + '/10', style: 'font-size:0.85em;font-weight:700;' + (color ? 'color:' + color + ';' : '') });
    right.createEl('span', { text: stars(score, color), style: 'font-size:0.85em;letter-spacing:1px;color:' + (color || 'var(--text-muted)') + ';' });
  } else {
    right.createEl('span', { text: '—', style: 'font-size:0.85em;color:var(--text-muted);' });
  }
}
addRating('TMDB', tmdb, '⭐', '#888');
addRating('Moje', myRating || '', '★', STAR_COLOR);

// ─── DESCRIPTION ───
if (desc) {
  const descCard = container.createDiv();
  descCard.style.cssText = 'margin-top:16px;padding:16px;border-radius:12px;background:var(--surface);border:1px solid var(--border);';
  const descTitle = descCard.createEl('h2', { text: '📖 Příběh' });
  descTitle.style.cssText = 'margin:0 0 8px 0;font-size:1em;color:var(--bronze);';
  descCard.createDiv({ text: desc, style: 'font-size:0.85em;color:var(--text-secondary);line-height:1.6;' });
}

// ─── NOTES + DOJMY GRID ───
const notesGrid = container.createDiv();
notesGrid.style.cssText = 'display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-top:16px;';

function createEditorCard(parent, titleText, icon, placeholder, initialValue, fieldName) {
  const card = parent.createDiv();
  card.style.cssText = 'padding:16px;border-radius:12px;background:var(--surface);border:1px solid var(--border);display:flex;flex-direction:column;';

  const headerRow = card.createDiv();
  headerRow.style.cssText = 'display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;';

  const heading = headerRow.createEl('h2', { text: icon + ' ' + titleText });
  heading.style.cssText = 'margin:0;font-size:1em;color:var(--bronze);';

  const input = card.createEl('textarea', { placeholder: placeholder });
  input.style.cssText = 'width:100%;min-height:100px;padding:10px 12px;border-radius:8px;border:1px solid var(--border);background:var(--surface-elev);color:var(--text);font-size:0.85em;resize:vertical;box-sizing:border-box;font-family:inherit;line-height:1.6;transition:border-color 0.15s;';
  input.addEventListener('focus', () => { input.style.borderColor = 'var(--bronze)'; });
  input.addEventListener('blur', () => { input.style.borderColor = 'var(--border)'; });

  const footer = card.createDiv();
  footer.style.cssText = 'display:flex;align-items:center;justify-content:flex-end;gap:8px;margin-top:8px;';

  const savedLabel = footer.createEl('span', { text: '' });
  savedLabel.style.cssText = 'font-size:0.7em;color:var(--text-muted);transition:opacity 0.3s;opacity:0;';

  const saveBtn = footer.createEl('button', { text: icon + ' Uložit' });
  saveBtn.style.cssText = 'padding:5px 14px;border-radius:8px;background:var(--bronze-dim);color:var(--bronze);border:1px solid var(--bronze-dim);font-weight:600;cursor:pointer;font-size:0.75em;transition:all 0.15s;';
  saveBtn.addEventListener('mouseenter', () => { saveBtn.style.background = 'var(--bronze-hover)'; });
  saveBtn.addEventListener('mouseleave', () => { saveBtn.style.background = 'var(--bronze-dim)'; });

  if (initialValue) input.value = initialValue;

  function flushLines(lines, idx) {
    while (idx + 1 < lines.length && (lines[idx + 1].startsWith(' ') || lines[idx + 1].startsWith('\\t'))) {
      lines.splice(idx + 1, 1);
    }
  }

  async function saveContent() {
    const file = app.vault.getAbstractFileByPath(page.file.path);
    if (!file) return;
    const c = await app.vault.read(file);
    const lines = c.split('\\n');
    const idx = lines.findIndex(l => l.startsWith(fieldName + ':'));
    if (idx >= 0) {
      flushLines(lines, idx);
      const val = input.value.trim();
      if (val) {
        const v = val.split('\\n');
        if (v.length > 1) {
          lines[idx] = fieldName + ': |-';
          for (const line of v) lines.splice(idx + 1, 0, '  ' + line);
        } else {
          lines[idx] = fieldName + ': ' + val;
        }
      } else {
        lines[idx] = fieldName + ': ';
      }
    }
    await app.vault.modify(file, lines.join('\\n'));
    savedLabel.textContent = '✓ uloženo';
    savedLabel.style.opacity = '1';
    setTimeout(() => { savedLabel.style.opacity = '0'; }, 2000);
  }

  input.addEventListener('keydown', e => {
    if (e.key === 'Enter' && e.ctrlKey) { e.preventDefault(); saveContent(); }
  });
  saveBtn.addEventListener('click', () => saveContent());
}

createEditorCard(notesGrid, 'Poznámky', '📝', 'Napiš poznámky k filmu...', notes, 'notes');
createEditorCard(notesGrid, 'Dojmy', '💭', 'Napiš své dojmy z filmu...', dojmy, 'dojmy');
\`\`\``;

  const file = await app.vault.create(filePath, content);
  new Notice(`Film "${data.title}" přidán`);
  return file;
}

// ─── TMDB API (TV Series) ───

async function tmdbSearchSeries(apiKey, query) {
  const url = `${TMDB_BASE}/search/tv?api_key=${apiKey}&query=${encodeURIComponent(query)}&language=cs`;
  const resp = await requestUrl({ url, method: 'GET' });
  return resp.json;
}

async function tmdbSeriesDetails(apiKey, id) {
  const url = `${TMDB_BASE}/tv/${id}?api_key=${apiKey}&language=cs`;
  const resp = await requestUrl({ url, method: 'GET' });
  return resp.json;
}

// ─── HELPERS (TV Series) ───

function mapTmdbToSeriesNote(detail) {
  return {
    title: detail.name || detail.original_name || 'Neznámý',
    year: detail.first_air_date ? detail.first_air_date.split('-')[0] : '',
    creator: detail.created_by ? detail.created_by.map(c => c.name).join(', ') : '',
    genre: detail.genres ? detail.genres.map(g => g.name).join(', ') : '',
    country: detail.production_countries ? detail.production_countries.map(c => c.name).join(', ') : '',
    seasons: detail.number_of_seasons || '',
    episodes: detail.number_of_episodes || '',
    status: detail.status || '',
    network: detail.networks ? detail.networks.map(n => n.name).join(', ') : '',
    tmdb_rating: detail.vote_average ? detail.vote_average.toFixed(1) : '',
    poster: detail.poster_path ? `${IMG_BASE}${detail.poster_path}` : '',
    description: detail.overview || '',
    tmdb_id: detail.id,
  };
}

const FOLDER_SERIES = 'Databaze/Serialy';

async function createSeriesNote(app, data) {
  const folder = app.vault.getAbstractFileByPath(FOLDER_SERIES);
  if (!folder || !(folder instanceof TFolder)) {
    await app.vault.createFolder(FOLDER_SERIES);
  }

  const fileName = data.title.replace(/[<>:"/\\|?*]/g, '').trim() + '.md';
  const filePath = `${FOLDER_SERIES}/${fileName}`;

  const existing = app.vault.getAbstractFileByPath(filePath);
  if (existing instanceof TFile) {
    new Notice(`Seriál "${data.title}" už existuje`);
    return existing;
  }

  const now = window.moment().format('DD.MM.YYYY');
  const content = `---
cssclasses: homepage-dashboard
type: serial
title: ${data.title || ''}
year: ${data.year || ''}
creator: ${data.creator || ''}
genre: ${data.genre || ''}
country: ${data.country || ''}
seasons: ${data.seasons || ''}
episodes: ${data.episodes || ''}
status: ${data.status || ''}
network: ${data.network || ''}
tmdb_rating: ${data.tmdb_rating || ''}
my_rating: ${data.my_rating || ''}
poster: ${data.poster || ''}
tmdb_id: ${data.tmdb_id || ''}
date_watched: ${now}
watch_status: watched
tags: [serial]
notes: 
dojmy: 
---

\`\`\`dataviewjs
const ACCENT = '#c49a5a';
const STAR_COLOR = '#f5c842';
const container = dv.container;
container.classList.add('homepage-root');
container.style.setProperty('--moc-accent', ACCENT);

const page = dv.current();
const title = page.title || 'Seriál';
const year = page.year || '';
const creator = page.creator || '';
const genre = page.genre || '';
const country = page.country || '';
const seasons = page.seasons || '';
const episodes = page.episodes || '';
const status = page.status || '';
const network = page.network || '';
const tmdb = page.tmdb_rating || '';
const myRating = page.my_rating || '';
const poster = page.poster || '';
const desc = page.description || '';
const notes = page.notes || '';
const dojmy = page.dojmy || '';
const watchStatus = page.watch_status || 'watched';

function stars(score, color) {
  if (!score) return '';
  const n = Math.round(Number(score));
  return '★'.repeat(n) + '☆'.repeat(10 - n);
}

// ─── HEADER ───
const header = container.createDiv({ cls: 'moc-header' });
header.style.cssText = 'display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;margin-bottom:20px;';

const left = header.createDiv({ cls: 'moc-header-left' });
left.style.cssText = 'display:flex;align-items:center;gap:10px;';
left.createEl('span', { text: '📺', style: 'font-size:1.3em;' });
const titleEl = left.createEl('h1', { text: title });
titleEl.style.cssText = 'margin:0;font-size:1.5em;color:var(--bronze);font-weight:600;';

const meta = header.createDiv({ cls: 'moc-header-meta' });
meta.style.cssText = 'display:flex;align-items:center;gap:8px;flex-wrap:wrap;';
if (year) {
  const y = meta.createDiv({ cls: 'hp-meta-bubble' });
  y.createEl('span', { cls: 'hp-meta-icon', text: '📅' });
  y.createEl('span', { cls: 'hp-meta-value', text: year });
  y.createEl('span', { cls: 'hp-meta-label', text: 'rok' });
}
if (myRating) {
  const m = meta.createDiv({ cls: 'hp-meta-bubble' });
  m.createEl('span', { cls: 'hp-meta-icon', text: '★' });
  m.createEl('span', { cls: 'hp-meta-value', text: myRating, style: 'color:' + STAR_COLOR });
  m.createEl('span', { cls: 'hp-meta-label', text: 'moje' });
}
if (tmdb) {
  const t = meta.createDiv({ cls: 'hp-meta-bubble' });
  t.createEl('span', { cls: 'hp-meta-icon', text: '⭐' });
  t.createEl('span', { cls: 'hp-meta-value', text: tmdb });
  t.createEl('span', { cls: 'hp-meta-label', text: 'TMDB' });
}
if (watchStatus === 'watchlist') {
  const w = meta.createDiv({ cls: 'hp-meta-bubble' });
  w.createEl('span', { cls: 'hp-meta-icon', text: '👀' });
  w.createEl('span', { cls: 'hp-meta-value', text: 'Ke zhlédnutí', style: 'color:#f5c842;' });
} else if (watchStatus === 'watching') {
  const w = meta.createDiv({ cls: 'hp-meta-bubble' });
  w.createEl('span', { cls: 'hp-meta-icon', text: '📺' });
  w.createEl('span', { cls: 'hp-meta-value', text: 'Sleduji', style: 'color:#4fc3f7;' });
}

// ─── MAIN GRID: Poster + Info ───
const mainGrid = container.createDiv();
mainGrid.style.cssText = 'display:grid;grid-template-columns:220px 1fr;gap:16px;';

if (poster) {
  const posterCard = mainGrid.createDiv();
  posterCard.style.cssText = 'border-radius:12px;overflow:hidden;background:var(--surface);border:1px solid var(--border);';
  const img = posterCard.createEl('img');
  img.src = poster;
  img.style.cssText = 'width:100%;height:auto;display:block;';
}

const infoCard = mainGrid.createDiv();
infoCard.style.cssText = 'padding:16px;border-radius:12px;background:var(--surface);border:1px solid var(--border);display:flex;flex-direction:column;gap:12px;';

const infoTitle = infoCard.createEl('h2', { text: '📋 Informace' });
infoTitle.style.cssText = 'margin:0;font-size:1em;color:var(--bronze);';

const infoTable = infoCard.createDiv();
infoTable.style.cssText = 'display:grid;grid-template-columns:auto 1fr;gap:8px 16px;font-size:0.85em;';

function addInfo(label, value, icon) {
  if (!value) return;
  const lbl = infoTable.createEl('span', { text: icon + ' ' + label });
  lbl.style.cssText = 'color:var(--text-muted);font-weight:500;white-space:nowrap;';
  const val = infoTable.createEl('span', { text: value });
  val.style.cssText = 'color:var(--text);';
}
addInfo('Tvůrce', creator, '🎬');
addInfo('Žánr', genre, '🎭');
addInfo('Země', country, '🌍');
addInfo('Řady', seasons, '📦');
addInfo('Epizody', episodes, '🎞');
addInfo('Stav', status, '📡');
addInfo('Síť', network, '📺');

const ratingDiv = infoCard.createDiv();
ratingDiv.style.cssText = 'padding-top:12px;border-top:1px solid var(--border);display:flex;flex-direction:column;gap:6px;';

function addRating(label, score, icon, color) {
  if (!score && label !== 'Moje') return;
  const row = ratingDiv.createDiv();
  row.style.cssText = 'display:flex;align-items:center;justify-content:space-between;gap:8px;';
  const lbl = row.createEl('span', { text: icon + ' ' + label });
  lbl.style.cssText = 'font-size:0.8em;color:var(--text-muted);font-weight:500;';
  const right = row.createDiv();
  right.style.cssText = 'display:flex;align-items:center;gap:6px;';
  if (score) {
    right.createEl('span', { text: score + '/10', style: 'font-size:0.85em;font-weight:700;' + (color ? 'color:' + color + ';' : '') });
    right.createEl('span', { text: stars(score, color), style: 'font-size:0.85em;letter-spacing:1px;color:' + (color || 'var(--text-muted)') + ';' });
  } else {
    right.createEl('span', { text: '—', style: 'font-size:0.85em;color:var(--text-muted);' });
  }
}
addRating('TMDB', tmdb, '⭐', '#888');
addRating('Moje', myRating || '', '★', STAR_COLOR);

// ─── DESCRIPTION ───
if (desc) {
  const descCard = container.createDiv();
  descCard.style.cssText = 'margin-top:16px;padding:16px;border-radius:12px;background:var(--surface);border:1px solid var(--border);';
  const descTitle = descCard.createEl('h2', { text: '📖 Příběh' });
  descTitle.style.cssText = 'margin:0 0 8px 0;font-size:1em;color:var(--bronze);';
  descCard.createDiv({ text: desc, style: 'font-size:0.85em;color:var(--text-secondary);line-height:1.6;' });
}

// ─── NOTES + DOJMY GRID ───
const notesGrid = container.createDiv();
notesGrid.style.cssText = 'display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-top:16px;';

function createEditorCard(parent, titleText, icon, placeholder, initialValue, fieldName) {
  const card = parent.createDiv();
  card.style.cssText = 'padding:16px;border-radius:12px;background:var(--surface);border:1px solid var(--border);display:flex;flex-direction:column;';

  const headerRow = card.createDiv();
  headerRow.style.cssText = 'display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;';

  const heading = headerRow.createEl('h2', { text: icon + ' ' + titleText });
  heading.style.cssText = 'margin:0;font-size:1em;color:var(--bronze);';

  const input = card.createEl('textarea', { placeholder: placeholder });
  input.style.cssText = 'width:100%;min-height:100px;padding:10px 12px;border-radius:8px;border:1px solid var(--border);background:var(--surface-elev);color:var(--text);font-size:0.85em;resize:vertical;box-sizing:border-box;font-family:inherit;line-height:1.6;transition:border-color 0.15s;';
  input.addEventListener('focus', () => { input.style.borderColor = 'var(--bronze)'; });
  input.addEventListener('blur', () => { input.style.borderColor = 'var(--border)'; });

  const footer = card.createDiv();
  footer.style.cssText = 'display:flex;align-items:center;justify-content:flex-end;gap:8px;margin-top:8px;';

  const savedLabel = footer.createEl('span', { text: '' });
  savedLabel.style.cssText = 'font-size:0.7em;color:var(--text-muted);transition:opacity 0.3s;opacity:0;';

  const saveBtn = footer.createEl('button', { text: icon + ' Uložit' });
  saveBtn.style.cssText = 'padding:5px 14px;border-radius:8px;background:var(--bronze-dim);color:var(--bronze);border:1px solid var(--bronze-dim);font-weight:600;cursor:pointer;font-size:0.75em;transition:all 0.15s;';
  saveBtn.addEventListener('mouseenter', () => { saveBtn.style.background = 'var(--bronze-hover)'; });
  saveBtn.addEventListener('mouseleave', () => { saveBtn.style.background = 'var(--bronze-dim)'; });

  if (initialValue) input.value = initialValue;

  function flushLines(lines, idx) {
    while (idx + 1 < lines.length && (lines[idx + 1].startsWith(' ') || lines[idx + 1].startsWith('\\t'))) {
      lines.splice(idx + 1, 1);
    }
  }

  async function saveContent() {
    const file = app.vault.getAbstractFileByPath(page.file.path);
    if (!file) return;
    const c = await app.vault.read(file);
    const lines = c.split('\\n');
    const idx = lines.findIndex(l => l.startsWith(fieldName + ':'));
    if (idx >= 0) {
      flushLines(lines, idx);
      const val = input.value.trim();
      if (val) {
        const v = val.split('\\n');
        if (v.length > 1) {
          lines[idx] = fieldName + ': |-';
          for (const line of v) lines.splice(idx + 1, 0, '  ' + line);
        } else {
          lines[idx] = fieldName + ': ' + val;
        }
      } else {
        lines[idx] = fieldName + ': ';
      }
    }
    await app.vault.modify(file, lines.join('\\n'));
    savedLabel.textContent = '✓ uloženo';
    savedLabel.style.opacity = '1';
    setTimeout(() => { savedLabel.style.opacity = '0'; }, 2000);
  }

  input.addEventListener('keydown', e => {
    if (e.key === 'Enter' && e.ctrlKey) { e.preventDefault(); saveContent(); }
  });
  saveBtn.addEventListener('click', () => saveContent());
}

createEditorCard(notesGrid, 'Poznámky', '📝', 'Napiš poznámky k seriálu...', notes, 'notes');
createEditorCard(notesGrid, 'Dojmy', '💭', 'Napiš své dojmy ze seriálu...', dojmy, 'dojmy');
\`\`\``;

  const file = await app.vault.create(filePath, content);
  new Notice(`Seriál "${data.title}" přidán`);
  return file;
}

// ─── WATCHLIST ───

const FOLDER_WATCHLIST = 'Databaze/Watchlist';

async function tmdbMultiSearch(apiKey, query) {
  const url = `${TMDB_BASE}/search/multi?api_key=${apiKey}&query=${encodeURIComponent(query)}&language=cs`;
  const resp = await requestUrl({ url, method: 'GET' });
  return resp.json;
}

async function createWatchlistNote(app, data) {
  const folder = app.vault.getAbstractFileByPath(FOLDER_WATCHLIST);
  if (!folder || !(folder instanceof TFolder)) {
    await app.vault.createFolder(FOLDER_WATCHLIST);
  }

  const fileName = data.title.replace(/[<>:"/\\|?*]/g, '').trim() + '.md';
  const filePath = `${FOLDER_WATCHLIST}/${fileName}`;

  const existing = app.vault.getAbstractFileByPath(filePath);
  if (existing instanceof TFile) {
    new Notice(`"${data.title}" už je ve watchlistu`);
    return existing;
  }

  const now = window.moment().format('DD.MM.YYYY');
  const content = `---
cssclasses: homepage-dashboard
type: watchlist
title: ${data.title || ''}
year: ${data.year || ''}
media_type: ${data.media_type || 'movie'}
tmdb_id: ${data.tmdb_id || ''}
poster: ${data.poster || ''}
date_added: ${now}
watched: false
notes: 
---
`;
  const file = await app.vault.create(filePath, content);
  new Notice(`"${data.title}" přidán do watchlistu`);
  return file;
}

// ─── SEARCH WATCHLIST MODAL ───

class SearchWatchlistModal extends Modal {
  constructor(app, plugin, onAdd, initialQuery) {
    super(app);
    this.plugin = plugin;
    this.onAdd = onAdd;
    this.results = [];
    this.initialQuery = initialQuery || '';
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.createEl('h2', { text: '👀 Přidat do watchlistu' });

    const apiKey = this.plugin.settings.apiKey;
    if (!apiKey) {
      contentEl.createEl('p', {
        text: 'Nejprve nastav TMDB API klíč v nastavení pluginu.',
      });
      return;
    }

    const searchInput = contentEl.createEl('input', { type: 'text', placeholder: '🔍 Zadej název filmu nebo seriálu...' });
    searchInput.style.cssText = 'width:100%;padding:10px 14px;border-radius:8px;border:1px solid var(--background-modifier-border);background:var(--background-primary);color:var(--text-normal);font-size:1em;box-sizing:border-box;';
    searchInput.focus();

    if (this.initialQuery) {
      searchInput.value = this.initialQuery;
      setTimeout(() => searchInput.dispatchEvent(new Event('input')), 100);
    }

    this.resultsEl = contentEl.createDiv();
    this.resultsEl.style.cssText = 'margin-top:12px;display:flex;flex-direction:column;gap:6px;max-height:400px;overflow-y:auto;';

    let timeout;
    searchInput.addEventListener('input', () => {
      clearTimeout(timeout);
      timeout = setTimeout(async () => {
        const q = searchInput.value.trim();
        if (q.length < 2) { this.resultsEl.empty(); return; }
        this.resultsEl.innerHTML = '<p style="color:var(--text-muted);font-size:0.85em;">Načítám...</p>';
        try {
          const data = await tmdbMultiSearch(apiKey, q);
          this.results = (data.results || []).filter(r => r.media_type === 'movie' || r.media_type === 'tv');
          this.renderResults();
        } catch (e) {
          this.resultsEl.innerHTML = `<p style="color:var(--text-error);">Chyba: ${e.message}</p>`;
        }
      }, 400);
    });

    searchInput.addEventListener('keydown', e => {
      if (e.key === 'Escape') this.close();
    });
  }

  renderResults() {
    this.resultsEl.empty();
    if (this.results.length === 0) {
      this.resultsEl.createEl('p', { text: 'Nic nenalezeno', style: 'color:var(--text-muted);' });
      return;
    }

    for (const r of this.results.slice(0, 12)) {
      const card = this.resultsEl.createDiv();
      card.style.cssText = 'padding:10px 12px;border-radius:8px;background:var(--background-primary-alt);border:0.5px solid var(--background-modifier-border);cursor:pointer;transition:background 0.15s;display:flex;align-items:center;gap:10px;';
      card.addEventListener('mouseenter', () => card.style.background = 'var(--background-modifier-hover)');
      card.addEventListener('mouseleave', () => card.style.background = 'var(--background-primary-alt)');
      card.addEventListener('click', () => this.selectResult(r));

      if (r.poster_path) {
        const img = card.createEl('img');
        img.src = `${IMG_BASE}${r.poster_path}`;
        img.style.cssText = 'width:36px;height:54px;border-radius:4px;object-fit:cover;flex-shrink:0;';
      }

      const info = card.createDiv();
      info.style.cssText = 'flex:1;min-width:0;';

      const name = info.createEl('strong', { text: r.title || r.name || r.original_title || r.original_name });
      name.style.cssText = 'font-size:0.85em;display:block;';

      const meta = info.createDiv();
      meta.style.cssText = 'font-size:0.7em;color:var(--text-muted);margin-top:2px;';
      const parts = [];
      const releaseDate = r.release_date || r.first_air_date || '';
      if (releaseDate) parts.push(releaseDate.split('-')[0]);
      if (r.vote_average) parts.push(`⭐ ${r.vote_average.toFixed(1)}`);
      parts.push(r.media_type === 'tv' ? '📺 Seriál' : '🎬 Film');
      meta.textContent = parts.join(' · ');

      if (r.overview) {
        const desc = info.createDiv();
        desc.textContent = r.overview.substring(0, 80) + (r.overview.length > 80 ? '…' : '');
        desc.style.cssText = 'font-size:0.7em;color:var(--text-muted);margin-top:2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;';
      }
    }
  }

  async selectResult(r) {
    this.close();
    const title = r.title || r.name || r.original_title || r.original_name;
    const year = (r.release_date || r.first_air_date || '').split('-')[0] || '';
    const data = {
      title: title,
      year: year,
      media_type: r.media_type,
      tmdb_id: r.id,
      poster: r.poster_path ? `${IMG_BASE}${r.poster_path}` : '',
    };
    await createWatchlistNote(this.app, data);
    if (this.onAdd) this.onAdd();
  }

  onClose() {
    const { contentEl } = this;
    contentEl.empty();
  }
}

// ─── WATCHLIST SIDEBAR VIEW ───

const VIEW_TYPE_WATCHLIST = 'watchlist-view';

class WatchlistView extends ItemView {
  constructor(leaf) {
    super(leaf);
    this.items = [];
    this.filtered = [];
  }

  getViewType() { return VIEW_TYPE_WATCHLIST; }
  getDisplayText() { return 'Watchlist'; }
  getIcon() { return 'list'; }

  async onOpen() {
    this.render();
    this.loadItems();
  }

  async loadItems() {
    const folder = this.app.vault.getAbstractFileByPath(FOLDER_WATCHLIST);
    if (!folder || !(folder instanceof TFolder)) {
      const count = this.containerEl.querySelector('.wl-count');
      if (count) count.textContent = '0 položek';
      return;
    }

    const files = folder.children.filter(f => f instanceof TFile && f.extension === 'md' && f.name !== 'Watchlist.md');
    this.items = [];

    for (const file of files) {
      const cache = this.app.metadataCache.getFileCache(file);
      if (cache?.frontmatter?.type === 'watchlist') {
        this.items.push({
          file,
          title: cache.frontmatter.title || file.basename,
          year: cache.frontmatter.year || '',
          media_type: cache.frontmatter.media_type || 'movie',
          poster: cache.frontmatter.poster || '',
          watched: cache.frontmatter.watched || false,
          date_added: cache.frontmatter.date_added || '',
        });
      }
    }

    this.filtered = [...this.items];
    this.renderList();
  }

  render() {
    const container = this.containerEl;
    container.empty();
    container.style.cssText = 'padding:16px;overflow-y:auto;height:100%;';

    const header = container.createDiv();
    header.style.cssText = 'display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;';

    const title = header.createEl('h2', { text: '👀 Watchlist' });
    title.style.cssText = 'margin:0;font-size:1.2em;';

    const count = header.createEl('span', { text: '0 položek', cls: 'wl-count' });
    count.style.cssText = 'font-size:0.8em;color:var(--text-muted);';

    const searchRow = container.createDiv();
    searchRow.style.cssText = 'display:flex;gap:6px;margin-bottom:12px;';

    const searchInput = searchRow.createEl('input', { type: 'text', placeholder: '🔍 Hledat...' });
    searchInput.style.cssText = 'flex:1;padding:8px 12px;border-radius:8px;border:1px solid var(--background-modifier-border);background:var(--background-primary);color:var(--text-normal);font-size:0.85em;';
    searchInput.addEventListener('input', () => {
      const q = searchInput.value.toLowerCase().trim();
      this.filtered = this.items.filter(i => i.title.toLowerCase().includes(q));
      this.renderList();
    });

    const addBtn = searchRow.createEl('button', { text: '+', cls: 'mod-cta' });
    addBtn.style.cssText = 'padding:8px 16px;border-radius:8px;font-weight:700;cursor:pointer;';
    addBtn.addEventListener('click', () => {
      new SearchWatchlistModal(this.app, this.plugin, () => this.loadItems()).open();
    });

    this.listEl = container.createDiv();
    this.listEl.style.cssText = 'display:flex;flex-direction:column;gap:6px;';
  }

  renderList() {
    if (!this.listEl) return;
    this.listEl.empty();

    const count = this.containerEl.querySelector('.wl-count');
    if (count) count.textContent = `${this.filtered.length} položek`;

    if (this.filtered.length === 0) {
      this.listEl.createEl('p', {
        text: this.items.length === 0
          ? 'Watchlist je prázdný. Klikni na + pro přidání.'
          : 'Žádná položka neodpovídá hledání.',
      });
      this.listEl.lastChild.style.cssText = 'color:var(--text-muted);text-align:center;padding:20px;';
      return;
    }

    for (const item of this.filtered) {
      const card = this.listEl.createDiv();
      card.style.cssText = 'padding:10px 12px;border-radius:8px;background:var(--background-primary-alt);border:0.5px solid var(--background-modifier-border);cursor:pointer;transition:background 0.15s;';
      card.addEventListener('mouseenter', () => card.style.background = 'var(--background-modifier-hover)');
      card.addEventListener('mouseleave', () => card.style.background = 'var(--background-primary-alt)');
      card.addEventListener('click', () => {
        this.app.workspace.openLinkText(item.file.path, '');
      });

      const row = card.createDiv();
      row.style.cssText = 'display:flex;align-items:center;gap:10px;';

      if (item.poster) {
        const img = row.createEl('img');
        img.src = item.poster;
        img.style.cssText = 'width:30px;height:45px;border-radius:4px;object-fit:cover;flex-shrink:0;';
        img.onerror = () => img.style.display = 'none';
      }

      const info = row.createDiv();
      info.style.cssText = 'flex:1;min-width:0;';

      const nameEl = info.createEl('strong', { text: item.title });
      nameEl.style.cssText = 'font-size:0.85em;display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;';

      const meta = info.createDiv();
      meta.style.cssText = 'font-size:0.7em;color:var(--text-muted);margin-top:2px;';
      const parts = [];
      if (item.year) parts.push(item.year);
      parts.push(item.media_type === 'tv' ? '📺' : '🎬');
      meta.textContent = parts.join(' · ');

      const right = card.createDiv();
      right.style.cssText = 'display:flex;align-items:center;gap:4px;flex-shrink:0;';

      const statusBadge = right.createEl('span', {
        text: item.watched ? '✅' : '👀',
      });
      statusBadge.style.cssText = 'font-size:0.8em;';
    }
  }
}

// ─── SETTINGS ───

class FilmovaDatabazeSettingTab extends PluginSettingTab {
  constructor(app, plugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display() {
    const { containerEl } = this;
    containerEl.empty();
    new Setting(containerEl)
      .setName('RAWG.io API Key (Herní Databáze)')
      .setDesc('Váš osobní API klíč z RAWG.io pro vyhledávání her')
      .addText(text => text
        .setValue(this.plugin.settings.rawgApiKey || '6da16180684e4a93bf3a95c5003738ab')
        .onChange(async (val) => {
          this.plugin.settings.rawgApiKey = val.trim();
          await this.plugin.saveSettings();
        }));
    containerEl.createEl('h2', { text: '🎬 Filmová databáze - nastavení' });

    new Setting(containerEl)
      .setName('TMDB API klíč')
      .setDesc('Zadej svůj API klíč z themoviedb.org (zdarma). Zaregistruj se na https://www.themoviedb.org/settings/api')
      .addText(t => {
        t.setValue(this.plugin.settings.apiKey || '');
        t.inputEl.style.width = '100%';
        t.onChange(async v => {
          this.plugin.settings.apiKey = v;
          await this.plugin.saveSettings();
        });
      });
  }
}

// ─── SEARCH MODAL ───

class SearchMovieModal extends Modal {
  constructor(app, plugin, onAdd, initialQuery) {
    super(app);
    this.plugin = plugin;
    this.onAdd = onAdd;
    this.results = [];
    this.initialQuery = initialQuery || '';
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.createEl('h2', { text: '🎬 Přidat film' });

    const apiKey = this.plugin.settings.apiKey;
    if (!apiKey) {
      contentEl.createEl('p', {
        text: 'Nejprve nastav TMDB API klíč v nastavení pluginu.',
      });
      return;
    }

    const searchInput = contentEl.createEl('input', { type: 'text', placeholder: '🔍 Zadej název filmu...' });
    searchInput.style.cssText = 'width:100%;padding:10px 14px;border-radius:8px;border:1px solid var(--background-modifier-border);background:var(--background-primary);color:var(--text-normal);font-size:1em;box-sizing:border-box;';
    searchInput.focus();

    if (this.initialQuery) {
      searchInput.value = this.initialQuery;
      // Auto-trigger search after a short delay
      setTimeout(() => {
        searchInput.dispatchEvent(new Event('input'));
      }, 100);
    }

    this.resultsEl = contentEl.createDiv();
    this.resultsEl.style.cssText = 'margin-top:12px;display:flex;flex-direction:column;gap:6px;max-height:400px;overflow-y:auto;';

    let timeout;
    searchInput.addEventListener('input', () => {
      clearTimeout(timeout);
      timeout = setTimeout(async () => {
        const q = searchInput.value.trim();
        if (q.length < 2) { this.resultsEl.empty(); return; }
        this.resultsEl.innerHTML = '<p style="color:var(--text-muted);font-size:0.85em;">Načítám...</p>';
        try {
          const data = await tmdbSearch(apiKey, q);
          this.results = data.results || [];
          this.renderResults();
        } catch (e) {
          this.resultsEl.innerHTML = `<p style="color:var(--text-error);">Chyba: ${e.message}</p>`;
        }
      }, 400);
    });

    searchInput.addEventListener('keydown', e => {
      if (e.key === 'Escape') this.close();
    });
  }

  async renderResults() {
    this.resultsEl.empty();
    if (this.results.length === 0) {
      this.resultsEl.createEl('p', { text: 'Nic nenalezeno', style: 'color:var(--text-muted);' });
      return;
    }

    for (const r of this.results.slice(0, 10)) {
      const card = this.resultsEl.createDiv();
      card.style.cssText = 'padding:10px 12px;border-radius:8px;background:var(--background-primary-alt);border:0.5px solid var(--background-modifier-border);cursor:pointer;transition:background 0.15s;display:flex;align-items:center;gap:10px;';
      card.addEventListener('mouseenter', () => card.style.background = 'var(--background-modifier-hover)');
      card.addEventListener('mouseleave', () => card.style.background = 'var(--background-primary-alt)');
      card.addEventListener('click', () => this.selectMovie(r.id));

      // Poster
      if (r.poster_path) {
        const img = card.createEl('img');
        img.src = `${IMG_BASE}${r.poster_path}`;
        img.style.cssText = 'width:36px;height:54px;border-radius:4px;object-fit:cover;flex-shrink:0;';
      }

      const info = card.createDiv();
      info.style.cssText = 'flex:1;min-width:0;';

      const name = info.createEl('strong', { text: r.title || r.original_title });
      name.style.cssText = 'font-size:0.85em;display:block;';

      const meta = info.createDiv();
      meta.style.cssText = 'font-size:0.7em;color:var(--text-muted);margin-top:2px;';
      const parts = [];
      if (r.release_date) parts.push(r.release_date.split('-')[0]);
      if (r.vote_average) parts.push(`⭐ ${r.vote_average.toFixed(1)}`);
      meta.textContent = parts.join(' · ');

      if (r.overview) {
        const desc = info.createDiv();
        desc.textContent = r.overview.substring(0, 80) + (r.overview.length > 80 ? '…' : '');
        desc.style.cssText = 'font-size:0.7em;color:var(--text-muted);margin-top:2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;';
      }
    }
  }

  async selectMovie(id) {
    this.selectedId = id;
    this.resultsEl.empty();

    const apiKey = this.plugin.settings.apiKey;
    new Notice('Načítám detaily...');
    let detail;
    try {
      detail = await tmdbDetails(apiKey, id);
    } catch (e) {
      new Notice('Chyba: ' + e.message);
      this.close();
      return;
    }

    const data = mapTmdbToNote(detail);
    this.resultsEl.style.maxHeight = 'none';

    // Show selected movie info + rating prompt
    const infoCard = this.resultsEl.createDiv();
    infoCard.style.cssText = 'padding:12px;border-radius:8px;background:var(--background-primary-alt);border:0.5px solid var(--background-modifier-border);display:flex;align-items:center;gap:12px;margin-bottom:12px;';

    if (data.poster) {
      const img = infoCard.createEl('img');
      img.src = data.poster;
      img.style.cssText = 'width:50px;height:75px;border-radius:4px;object-fit:cover;flex-shrink:0;';
    }

    const info = infoCard.createDiv();
    info.style.cssText = 'flex:1;';
    info.createEl('strong', { text: data.title, style: 'font-size:1em;display:block;' });
    if (data.year) info.createEl('span', { text: `${data.year} · ⭐ ${data.tmdb_rating || '?'}/10`, style: 'font-size:0.8em;color:var(--text-muted);' });
    if (data.genre) info.createEl('span', { text: data.genre, style: 'font-size:0.75em;color:var(--text-muted);display:block;margin-top:2px;' });

    // Rating input
    const ratingLabel = this.resultsEl.createEl('label', { text: 'Moje hodnocení (1-10):', style: 'font-size:0.85em;font-weight:600;display:block;margin-bottom:4px;' });
    const ratingRow = this.resultsEl.createDiv();
    ratingRow.style.cssText = 'display:flex;gap:6px;align-items:center;';

    const ratingInput = ratingRow.createEl('input', { type: 'number', placeholder: '1-10' });
    ratingInput.style.cssText = 'flex:1;padding:8px 12px;border-radius:8px;border:1px solid var(--background-modifier-border);background:var(--background-primary);color:var(--text-normal);font-size:0.9em;';
    ratingInput.min = '1';
    ratingInput.max = '10';
    ratingInput.focus();

    const starsDisplay = ratingRow.createEl('span', { text: '★☆☆☆☆☆☆☆☆☆', style: 'font-size:1.2em;letter-spacing:2px;min-width:140px;' });

    ratingInput.addEventListener('input', () => {
      const val = parseInt(ratingInput.value);
      if (val >= 1 && val <= 10) {
        starsDisplay.textContent = '★'.repeat(val) + '☆'.repeat(10 - val);
      } else {
        starsDisplay.textContent = '★☆☆☆☆☆☆☆☆☆';
      }
    });

    // Buttons
    const btnRow = this.resultsEl.createDiv();
    btnRow.style.cssText = 'display:flex;gap:8px;justify-content:flex-end;margin-top:12px;';

    const backBtn = btnRow.createEl('button', { text: 'Zpět', cls: 'mod-cta' });
    backBtn.style.cssText = 'background:var(--background-modifier-border);color:var(--text-normal);';
    backBtn.addEventListener('click', () => {
      this.selectedId = null;
      this.renderResults();
    });

    const confirmBtn = btnRow.createEl('button', { text: '✅ Přidat film', cls: 'mod-cta' });
    confirmBtn.addEventListener('click', async () => {
      const val = parseInt(ratingInput.value);
      if (val >= 1 && val <= 10) {
        data.my_rating = val;
      }
      this.close();
      const file = await createMovieNote(this.app, data);
      if (file && this.onAdd) this.onAdd(file);
    });

    // Enter to confirm
    ratingInput.addEventListener('keydown', e => {
      if (e.key === 'Enter') confirmBtn.click();
      if (e.key === 'Escape') backBtn.click();
    });
  }

  onClose() {
    const { contentEl } = this;
    contentEl.empty();
  }
}

// ─── SEARCH SERIES MODAL ───

class SearchSeriesModal extends Modal {
  constructor(app, plugin, onAdd, initialQuery) {
    super(app);
    this.plugin = plugin;
    this.onAdd = onAdd;
    this.results = [];
    this.initialQuery = initialQuery || '';
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.createEl('h2', { text: '📺 Přidat seriál' });

    const apiKey = this.plugin.settings.apiKey;
    if (!apiKey) {
      contentEl.createEl('p', {
        text: 'Nejprve nastav TMDB API klíč v nastavení pluginu.',
      });
      return;
    }

    const searchInput = contentEl.createEl('input', { type: 'text', placeholder: '🔍 Zadej název seriálu...' });
    searchInput.style.cssText = 'width:100%;padding:10px 14px;border-radius:8px;border:1px solid var(--background-modifier-border);background:var(--background-primary);color:var(--text-normal);font-size:1em;box-sizing:border-box;';
    searchInput.focus();

    if (this.initialQuery) {
      searchInput.value = this.initialQuery;
      setTimeout(() => {
        searchInput.dispatchEvent(new Event('input'));
      }, 100);
    }

    this.resultsEl = contentEl.createDiv();
    this.resultsEl.style.cssText = 'margin-top:12px;display:flex;flex-direction:column;gap:6px;max-height:400px;overflow-y:auto;';

    let timeout;
    searchInput.addEventListener('input', () => {
      clearTimeout(timeout);
      timeout = setTimeout(async () => {
        const q = searchInput.value.trim();
        if (q.length < 2) { this.resultsEl.empty(); return; }
        this.resultsEl.innerHTML = '<p style="color:var(--text-muted);font-size:0.85em;">Načítám...</p>';
        try {
          const data = await tmdbSearchSeries(apiKey, q);
          this.results = data.results || [];
          this.renderResults();
        } catch (e) {
          this.resultsEl.innerHTML = `<p style="color:var(--text-error);">Chyba: ${e.message}</p>`;
        }
      }, 400);
    });

    searchInput.addEventListener('keydown', e => {
      if (e.key === 'Escape') this.close();
    });
  }

  async renderResults() {
    this.resultsEl.empty();
    if (this.results.length === 0) {
      this.resultsEl.createEl('p', { text: 'Nic nenalezeno', style: 'color:var(--text-muted);' });
      return;
    }

    for (const r of this.results.slice(0, 10)) {
      const card = this.resultsEl.createDiv();
      card.style.cssText = 'padding:10px 12px;border-radius:8px;background:var(--background-primary-alt);border:0.5px solid var(--background-modifier-border);cursor:pointer;transition:background 0.15s;display:flex;align-items:center;gap:10px;';
      card.addEventListener('mouseenter', () => card.style.background = 'var(--background-modifier-hover)');
      card.addEventListener('mouseleave', () => card.style.background = 'var(--background-primary-alt)');
      card.addEventListener('click', () => this.selectSeries(r.id));

      if (r.poster_path) {
        const img = card.createEl('img');
        img.src = `${IMG_BASE}${r.poster_path}`;
        img.style.cssText = 'width:36px;height:54px;border-radius:4px;object-fit:cover;flex-shrink:0;';
      }

      const info = card.createDiv();
      info.style.cssText = 'flex:1;min-width:0;';

      const name = info.createEl('strong', { text: r.name || r.original_name });
      name.style.cssText = 'font-size:0.85em;display:block;';

      const meta = info.createDiv();
      meta.style.cssText = 'font-size:0.7em;color:var(--text-muted);margin-top:2px;';
      const parts = [];
      if (r.first_air_date) parts.push(r.first_air_date.split('-')[0]);
      if (r.vote_average) parts.push(`⭐ ${r.vote_average.toFixed(1)}`);
      meta.textContent = parts.join(' · ');

      if (r.overview) {
        const desc = info.createDiv();
        desc.textContent = r.overview.substring(0, 80) + (r.overview.length > 80 ? '…' : '');
        desc.style.cssText = 'font-size:0.7em;color:var(--text-muted);margin-top:2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;';
      }
    }
  }

  async selectSeries(id) {
    this.selectedId = id;
    this.resultsEl.empty();

    const apiKey = this.plugin.settings.apiKey;
    new Notice('Načítám detaily...');
    let detail;
    try {
      detail = await tmdbSeriesDetails(apiKey, id);
    } catch (e) {
      new Notice('Chyba: ' + e.message);
      this.close();
      return;
    }

    const data = mapTmdbToSeriesNote(detail);
    this.resultsEl.style.maxHeight = 'none';

    const infoCard = this.resultsEl.createDiv();
    infoCard.style.cssText = 'padding:12px;border-radius:8px;background:var(--background-primary-alt);border:0.5px solid var(--background-modifier-border);display:flex;align-items:center;gap:12px;margin-bottom:12px;';

    if (data.poster) {
      const img = infoCard.createEl('img');
      img.src = data.poster;
      img.style.cssText = 'width:50px;height:75px;border-radius:4px;object-fit:cover;flex-shrink:0;';
    }

    const info = infoCard.createDiv();
    info.style.cssText = 'flex:1;';
    info.createEl('strong', { text: data.title, style: 'font-size:1em;display:block;' });
    if (data.year) info.createEl('span', { text: `${data.year} · ⭐ ${data.tmdb_rating || '?'}/10`, style: 'font-size:0.8em;color:var(--text-muted);' });
    if (data.genre) info.createEl('span', { text: data.genre, style: 'font-size:0.75em;color:var(--text-muted);display:block;margin-top:2px;' });

    const ratingLabel = this.resultsEl.createEl('label', { text: 'Moje hodnocení (1-10):', style: 'font-size:0.85em;font-weight:600;display:block;margin-bottom:4px;' });
    const ratingRow = this.resultsEl.createDiv();
    ratingRow.style.cssText = 'display:flex;gap:6px;align-items:center;';

    const ratingInput = ratingRow.createEl('input', { type: 'number', placeholder: '1-10' });
    ratingInput.style.cssText = 'flex:1;padding:8px 12px;border-radius:8px;border:1px solid var(--background-modifier-border);background:var(--background-primary);color:var(--text-normal);font-size:0.9em;';
    ratingInput.min = '1';
    ratingInput.max = '10';
    ratingInput.focus();

    const starsDisplay = ratingRow.createEl('span', { text: '★☆☆☆☆☆☆☆☆☆', style: 'font-size:1.2em;letter-spacing:2px;min-width:140px;' });

    ratingInput.addEventListener('input', () => {
      const val = parseInt(ratingInput.value);
      if (val >= 1 && val <= 10) {
        starsDisplay.textContent = '★'.repeat(val) + '☆'.repeat(10 - val);
      } else {
        starsDisplay.textContent = '★☆☆☆☆☆☆☆☆☆';
      }
    });

    const btnRow = this.resultsEl.createDiv();
    btnRow.style.cssText = 'display:flex;gap:8px;justify-content:flex-end;margin-top:12px;';

    const backBtn = btnRow.createEl('button', { text: 'Zpět', cls: 'mod-cta' });
    backBtn.style.cssText = 'background:var(--background-modifier-border);color:var(--text-normal);';
    backBtn.addEventListener('click', () => {
      this.selectedId = null;
      this.renderResults();
    });

    const confirmBtn = btnRow.createEl('button', { text: '✅ Přidat seriál', cls: 'mod-cta' });
    confirmBtn.addEventListener('click', async () => {
      const val = parseInt(ratingInput.value);
      if (val >= 1 && val <= 10) {
        data.my_rating = val;
      }
      this.close();
      const file = await createSeriesNote(this.app, data);
      if (file && this.onAdd) this.onAdd(file);
    });

    ratingInput.addEventListener('keydown', e => {
      if (e.key === 'Enter') confirmBtn.click();
      if (e.key === 'Escape') backBtn.click();
    });
  }

  onClose() {
    const { contentEl } = this;
    contentEl.empty();
  }
}

// ─── MOVIE DATABASE VIEW ───

class MovieDatabaseView extends ItemView {
  constructor(leaf) {
    super(leaf);
    this.movies = [];
    this.filtered = [];
  }

  getViewType() { return VIEW_TYPE; }
  getDisplayText() { return 'Filmová databáze'; }
  getIcon() { return 'film'; }

  async onOpen() {
    this.render();
    this.loadMovies();
  }

  async loadMovies() {
    const folder = this.app.vault.getAbstractFileByPath(FOLDER);
    if (!folder || !(folder instanceof TFolder)) {
      const count = this.containerEl.querySelector('.movie-count');
      if (count) count.textContent = '0 filmů';
      return;
    }

    const files = folder.children.filter(f => f instanceof TFile && f.extension === 'md' && f.name !== 'Filmy.md');
    this.movies = [];

    for (const file of files) {
      const cache = this.app.metadataCache.getFileCache(file);
      if (cache?.frontmatter?.type === 'film') {
        this.movies.push({
          file,
          title: cache.frontmatter.title || file.basename,
          year: cache.frontmatter.year || '',
          director: cache.frontmatter.director || '',
          genre: cache.frontmatter.genre || '',
          tmdb_rating: cache.frontmatter.tmdb_rating || '',
          my_rating: cache.frontmatter.my_rating || '',
          poster: cache.frontmatter.poster || '',
          watch_status: cache.frontmatter.watch_status || 'watched',
        });
      }
    }

    this.filtered = [...this.movies];
    this.renderList();
  }

  render() {
    const container = this.containerEl;
    container.empty();
    container.style.cssText = 'padding:16px;overflow-y:auto;height:100%;';

    const header = container.createDiv();
    header.style.cssText = 'display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;';

    const title = header.createEl('h2', { text: '🎞️ Filmy' });
    title.style.cssText = 'margin:0;font-size:1.2em;';

    const count = header.createEl('span', { text: '0 filmů', cls: 'movie-count' });
    count.style.cssText = 'font-size:0.8em;color:var(--text-muted);';

    const searchRow = container.createDiv();
    searchRow.style.cssText = 'display:flex;gap:6px;margin-bottom:12px;';

    const searchInput = searchRow.createEl('input', { type: 'text', placeholder: '🔍 Hledat v databázi...' });
    searchInput.style.cssText = 'flex:1;padding:8px 12px;border-radius:8px;border:1px solid var(--background-modifier-border);background:var(--background-primary);color:var(--text-normal);font-size:0.85em;';
    searchInput.addEventListener('input', () => {
      const q = searchInput.value.toLowerCase().trim();
      this.filtered = this.movies.filter(m =>
        m.title.toLowerCase().includes(q) ||
        m.director.toLowerCase().includes(q) ||
        m.genre.toLowerCase().includes(q)
      );
      this.renderList();
    });

    const addBtn = searchRow.createEl('button', { text: '+', cls: 'mod-cta' });
    addBtn.style.cssText = 'padding:8px 16px;border-radius:8px;font-weight:700;cursor:pointer;';
    addBtn.addEventListener('click', () => {
      new SearchMovieModal(this.app, this.plugin, () => this.loadMovies()).open();
    });

    this.listEl = container.createDiv();
    this.listEl.style.cssText = 'display:flex;flex-direction:column;gap:6px;';
  }

  renderList() {
    if (!this.listEl) return;
    this.listEl.empty();

    const count = this.containerEl.querySelector('.movie-count');
    if (count) count.textContent = `${this.filtered.length} filmů`;

    if (this.filtered.length === 0) {
      this.listEl.createEl('p', {
        text: this.movies.length === 0
          ? 'Databáze je prázdná. Klikni na + pro přidání filmu.'
          : 'Žádný film neodpovídá hledání.',
      });
      this.listEl.lastChild.style.cssText = 'color:var(--text-muted);text-align:center;padding:20px;';
      return;
    }

    for (const movie of this.filtered) {
      const card = this.listEl.createDiv();
      card.style.cssText = 'padding:10px 12px;border-radius:8px;background:var(--background-primary-alt);border:0.5px solid var(--background-modifier-border);cursor:pointer;transition:background 0.15s;';
      card.addEventListener('mouseenter', () => card.style.background = 'var(--background-modifier-hover)');
      card.addEventListener('mouseleave', () => card.style.background = 'var(--background-primary-alt)');
      card.addEventListener('click', () => {
        this.app.workspace.openLinkText(movie.file.path, '');
      });

      const row = card.createDiv();
      row.style.cssText = 'display:flex;align-items:center;gap:10px;';

      if (movie.poster) {
        const img = row.createEl('img');
        img.src = movie.poster;
        img.style.cssText = 'width:30px;height:45px;border-radius:4px;object-fit:cover;flex-shrink:0;';
        img.onerror = () => img.style.display = 'none';
      }

      const info = row.createDiv();
      info.style.cssText = 'flex:1;min-width:0;';

      const nameEl = info.createEl('strong', { text: movie.title });
      nameEl.style.cssText = 'font-size:0.85em;display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;';

      const meta = info.createDiv();
      meta.style.cssText = 'font-size:0.7em;color:var(--text-muted);margin-top:2px;';
      const parts = [];
      if (movie.year) parts.push(movie.year);
      if (movie.director) parts.push(movie.director);
      if (movie.genre) parts.push(movie.genre);
      meta.textContent = parts.join(' · ');

      const right = card.createDiv();
      right.style.cssText = 'display:flex;align-items:center;gap:6px;flex-shrink:0;justify-content:flex-end;';

      if (movie.watch_status === 'watchlist') {
        const wb = right.createEl('span', { text: '👀' });
        wb.style.cssText = 'font-size:0.7em;padding:2px 6px;border-radius:4px;background:color-mix(in srgb, #f5c842 20%,transparent);';
      } else if (movie.watch_status === 'watching') {
        const wb = right.createEl('span', { text: '📺' });
        wb.style.cssText = 'font-size:0.7em;padding:2px 6px;border-radius:4px;background:color-mix(in srgb, #4fc3f7 20%,transparent);';
      }

      if (movie.tmdb_rating) {
        const badge = right.createEl('span', { text: `⭐ ${movie.tmdb_rating}` });
        badge.style.cssText = 'font-size:0.65em;padding:2px 6px;border-radius:4px;background:color-mix(in srgb, var(--interactive-accent) 12%,transparent);color:var(--interactive-accent);white-space:nowrap;';
      }

      if (movie.my_rating) {
        const myBadge = right.createEl('span', { text: `★ ${movie.my_rating}` });
        myBadge.style.cssText = 'font-size:0.65em;padding:2px 6px;border-radius:4px;font-weight:700;color:var(--text-normal);white-space:nowrap;';
      }
    }
  }
}

// ─── SERIES DATABASE VIEW ───

const VIEW_TYPE_SERIES = 'serialova-databaze-view';

class SeriesDatabaseView extends ItemView {
  constructor(leaf) {
    super(leaf);
    this.series = [];
    this.filtered = [];
  }

  getViewType() { return VIEW_TYPE_SERIES; }
  getDisplayText() { return 'Seriálová databáze'; }
  getIcon() { return 'tv'; }

  async onOpen() {
    this.render();
    this.loadSeries();
  }

  async loadSeries() {
    const folder = this.app.vault.getAbstractFileByPath(FOLDER_SERIES);
    if (!folder || !(folder instanceof TFolder)) {
      const count = this.containerEl.querySelector('.series-count');
      if (count) count.textContent = '0 seriálů';
      return;
    }

    const files = folder.children.filter(f => f instanceof TFile && f.extension === 'md' && f.name !== 'Serie.md');
    this.series = [];

    for (const file of files) {
      const cache = this.app.metadataCache.getFileCache(file);
      if (cache?.frontmatter?.type === 'serial') {
        this.series.push({
          file,
          title: cache.frontmatter.title || file.basename,
          year: cache.frontmatter.year || '',
          creator: cache.frontmatter.creator || '',
          genre: cache.frontmatter.genre || '',
          tmdb_rating: cache.frontmatter.tmdb_rating || '',
          my_rating: cache.frontmatter.my_rating || '',
          poster: cache.frontmatter.poster || '',
          watch_status: cache.frontmatter.watch_status || 'watched',
        });
      }
    }

    this.filtered = [...this.series];
    this.renderList();
  }

  render() {
    const container = this.containerEl;
    container.empty();
    container.style.cssText = 'padding:16px;overflow-y:auto;height:100%;';

    const header = container.createDiv();
    header.style.cssText = 'display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;';

    const title = header.createEl('h2', { text: '📺 Seriály' });
    title.style.cssText = 'margin:0;font-size:1.2em;';

    const count = header.createEl('span', { text: '0 seriálů', cls: 'series-count' });
    count.style.cssText = 'font-size:0.8em;color:var(--text-muted);';

    const searchRow = container.createDiv();
    searchRow.style.cssText = 'display:flex;gap:6px;margin-bottom:12px;';

    const searchInput = searchRow.createEl('input', { type: 'text', placeholder: '🔍 Hledat v databázi...' });
    searchInput.style.cssText = 'flex:1;padding:8px 12px;border-radius:8px;border:1px solid var(--background-modifier-border);background:var(--background-primary);color:var(--text-normal);font-size:0.85em;';
    searchInput.addEventListener('input', () => {
      const q = searchInput.value.toLowerCase().trim();
      this.filtered = this.series.filter(s =>
        s.title.toLowerCase().includes(q) ||
        s.creator.toLowerCase().includes(q) ||
        s.genre.toLowerCase().includes(q)
      );
      this.renderList();
    });

    const addBtn = searchRow.createEl('button', { text: '+', cls: 'mod-cta' });
    addBtn.style.cssText = 'padding:8px 16px;border-radius:8px;font-weight:700;cursor:pointer;';
    addBtn.addEventListener('click', () => {
      new SearchSeriesModal(this.app, this.plugin, () => this.loadSeries()).open();
    });

    this.listEl = container.createDiv();
    this.listEl.style.cssText = 'display:flex;flex-direction:column;gap:6px;';
  }

  renderList() {
    if (!this.listEl) return;
    this.listEl.empty();

    const count = this.containerEl.querySelector('.series-count');
    if (count) count.textContent = `${this.filtered.length} seriálů`;

    if (this.filtered.length === 0) {
      this.listEl.createEl('p', {
        text: this.series.length === 0
          ? 'Databáze je prázdná. Klikni na + pro přidání seriálu.'
          : 'Žádný seriál neodpovídá hledání.',
      });
      this.listEl.lastChild.style.cssText = 'color:var(--text-muted);text-align:center;padding:20px;';
      return;
    }

    for (const s of this.filtered) {
      const card = this.listEl.createDiv();
      card.style.cssText = 'padding:10px 12px;border-radius:8px;background:var(--background-primary-alt);border:0.5px solid var(--background-modifier-border);cursor:pointer;transition:background 0.15s;';
      card.addEventListener('mouseenter', () => card.style.background = 'var(--background-modifier-hover)');
      card.addEventListener('mouseleave', () => card.style.background = 'var(--background-primary-alt)');
      card.addEventListener('click', () => {
        this.app.workspace.openLinkText(s.file.path, '');
      });

      const row = card.createDiv();
      row.style.cssText = 'display:flex;align-items:center;gap:10px;';

      if (s.poster) {
        const img = row.createEl('img');
        img.src = s.poster;
        img.style.cssText = 'width:30px;height:45px;border-radius:4px;object-fit:cover;flex-shrink:0;';
        img.onerror = () => img.style.display = 'none';
      }

      const info = row.createDiv();
      info.style.cssText = 'flex:1;min-width:0;';

      const nameEl = info.createEl('strong', { text: s.title });
      nameEl.style.cssText = 'font-size:0.85em;display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;';

      const meta = info.createDiv();
      meta.style.cssText = 'font-size:0.7em;color:var(--text-muted);margin-top:2px;';
      const parts = [];
      if (s.year) parts.push(s.year);
      if (s.creator) parts.push(s.creator);
      if (s.genre) parts.push(s.genre);
      meta.textContent = parts.join(' · ');

      const right = card.createDiv();
      right.style.cssText = 'display:flex;align-items:center;gap:6px;flex-shrink:0;justify-content:flex-end;';

      if (s.watch_status === 'watchlist') {
        const wb = right.createEl('span', { text: '👀' });
        wb.style.cssText = 'font-size:0.7em;padding:2px 6px;border-radius:4px;background:color-mix(in srgb, #f5c842 20%,transparent);';
      } else if (s.watch_status === 'watching') {
        const wb = right.createEl('span', { text: '📺' });
        wb.style.cssText = 'font-size:0.7em;padding:2px 6px;border-radius:4px;background:color-mix(in srgb, #4fc3f7 20%,transparent);';
      }

      if (s.tmdb_rating) {
        const badge = right.createEl('span', { text: `⭐ ${s.tmdb_rating}` });
        badge.style.cssText = 'font-size:0.65em;padding:2px 6px;border-radius:4px;background:color-mix(in srgb, var(--interactive-accent) 12%,transparent);color:var(--interactive-accent);white-space:nowrap;';
      }

      if (s.my_rating) {
        const myBadge = right.createEl('span', { text: `★ ${s.my_rating}` });
        myBadge.style.cssText = 'font-size:0.65em;padding:2px 6px;border-radius:4px;font-weight:700;color:var(--text-normal);white-space:nowrap;';
      }
    }
  }
}


// ─── HERNÍ DATABÁZE & RAWG.IO & SUPABASE ───

const GAME_FOLDER = 'Databaze/Hry';
const SUPABASE_GAMES_URL = 'https://bkgfohfmnbmascomaozv.supabase.co/rest/v1/games';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJrZ2ZvaGZtbmJtYXNjb21hb3p2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgzMzMwMzYsImV4cCI6MjEwMzkwOTAzNn0.RgxJDflLqIuBIH17imSvdLmbRjg8Fp3vDWK_O5u6w-c';

async function pushGameToSupabase(data) {
  const body = {
    title: data.title || '',
    platform: data.platform || 'PC',
    genre: data.genre || '',
    status: data.status || 'completed',
    my_rating: data.my_rating ? parseFloat(data.my_rating) : null,
    playtime_hours: data.playtime_hours ? parseInt(data.playtime_hours) : null,
    release_year: data.release_year ? parseInt(data.release_year) : null,
    cover_url: data.cover_url || '',
    notes: data.notes ? data.notes.replace(/\n/g, ' ') : ''
  };

  try {
    const resp = await requestUrl({
      url: SUPABASE_GAMES_URL,
      method: 'POST',
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });
    if (resp.status >= 200 && resp.status < 300) {
      new Notice('☁️ Hra byla synchronizována do Supabase Personal API!');
    }
  } catch (e) {
    console.error('Supabase Sync Error:', e);
  }
}

async function searchRawg(apiKey, query) {
  if (!query || !apiKey) return [];
  const url = `https://api.rawg.io/api/games?key=${apiKey}&search=${encodeURIComponent(query)}&page_size=15`;
  try {
    const resp = await requestUrl({
      url,
      method: 'GET',
      headers: { 'User-Agent': 'Obsidian-Media-Database/1.0' }
    });

    if (resp.status === 200 && resp.json && Array.isArray(resp.json.results)) {
      return resp.json.results.map(g => {
        let year = '';
        if (g.released) year = g.released.split('-')[0];

        const genres = g.genres ? g.genres.map(x => x.name).join(', ') : '';
        const platforms = g.platforms ? g.platforms.map(x => x.platform.name).join(', ') : 'PC';
        const rating = g.rating ? (g.rating * 2).toFixed(1) : '';

        return {
          id: g.id,
          title: g.name || '',
          year,
          cover_url: g.background_image || '',
          genre: genres,
          platform: platforms,
          rawg_rating: rating
        };
      });
    }
  } catch (e) {
    console.error('RAWG Search Error:', e);
  }
  return [];
}

async function getRawgDetails(apiKey, id) {
  if (!id || !apiKey) return null;
  const url = `https://api.rawg.io/api/games/${id}?key=${apiKey}`;
  try {
    const resp = await requestUrl({
      url,
      method: 'GET',
      headers: { 'User-Agent': 'Obsidian-Media-Database/1.0' }
    });

    if (resp.status === 200 && resp.json) {
      const d = resp.json;
      return {
        description: d.description_raw || d.description || '',
        playtime: d.playtime ? d.playtime.toString() : ''
      };
    }
  } catch (e) {
    console.error('RAWG Details Error:', e);
  }
  return null;
}

class SearchGameModal extends Modal {
  constructor(app, plugin, onSelectGame) {
    super(app);
    this.plugin = plugin;
    this.onSelectGame = onSelectGame;
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.createEl('h2', { text: '🎮 Hledat hru na RAWG.io' });

    const searchBox = contentEl.createDiv({ cls: 'search-box-row' });
    searchBox.style.cssText = 'display:flex;gap:8px;margin-bottom:16px;';

    const input = searchBox.createEl('input', { type: 'text', placeholder: 'Zadejte název hry (např. Cyberpunk 2077, Witcher, GTA V)...' });
    input.style.cssText = 'flex:1;padding:10px 14px;border-radius:8px;border:1px solid var(--background-modifier-border);background:var(--background-primary);color:var(--text-normal);font-size:1em;';

    const searchBtn = searchBox.createEl('button', { text: 'Hledat na RAWG' });
    searchBtn.style.cssText = 'padding:10px 18px;border-radius:8px;background:var(--interactive-accent);color:var(--text-on-accent);font-weight:bold;cursor:pointer;';

    const resultsContainer = contentEl.createDiv();
    resultsContainer.style.cssText = 'display:flex;flex-direction:column;gap:10px;max-height:400px;overflow-y:auto;padding-right:4px;';

    const manualBtn = contentEl.createEl('button', { text: '➕ Přidat hru ručně (bez hledání)' });
    manualBtn.style.cssText = 'margin-top:16px;width:100%;padding:10px;border-radius:8px;background:color-mix(in srgb, var(--interactive-accent) 15%, transparent);color:var(--interactive-accent);border:1px solid var(--interactive-accent);font-weight:bold;cursor:pointer;';
    manualBtn.addEventListener('click', () => {
      this.close();
      this.onSelectGame(null);
    });

    const doSearch = async () => {
      const q = input.value.trim();
      if (!q) return;

      resultsContainer.empty();
      resultsContainer.createEl('div', { text: '⏳ Vyhledávám na RAWG.io...', style: 'color:var(--text-muted);padding:16px;text-align:center;' });

      const apiKey = this.plugin.settings.rawgApiKey || '6da16180684e4a93bf3a95c5003738ab';
      const results = await searchRawg(apiKey, q);

      resultsContainer.empty();

      if (!results || results.length === 0) {
        resultsContainer.createEl('div', { text: '❌ Žádná hra nebyla nalezena.', style: 'color:var(--text-muted);padding:16px;text-align:center;' });
        return;
      }

      for (const game of results) {
        const item = resultsContainer.createDiv({ cls: 'game-result-card' });
        item.style.cssText = 'display:flex;gap:12px;padding:10px;border-radius:8px;border:1px solid var(--background-modifier-border);background:var(--background-secondary);cursor:pointer;align-items:center;transition:background 0.2s;';
        item.addEventListener('mouseenter', () => item.style.background = 'var(--background-primary)');
        item.addEventListener('mouseleave', () => item.style.background = 'var(--background-secondary)');

        if (game.cover_url) {
          const img = item.createEl('img');
          img.src = game.cover_url;
          img.style.cssText = 'width:60px;height:75px;object-fit:cover;border-radius:6px;flex-shrink:0;';
        } else {
          const iconPlaceholder = item.createDiv();
          iconPlaceholder.style.cssText = 'width:60px;height:75px;background:var(--background-modifier-border);border-radius:6px;display:flex;align-items:center;justify-content:center;font-size:1.5em;';
          iconPlaceholder.textContent = '🎮';
        }

        const info = item.createDiv();
        info.style.cssText = 'display:flex;flex-direction:column;gap:4px;flex:1;';

        const titleRow = info.createDiv();
        titleRow.style.cssText = 'display:flex;gap:8px;align-items:center;';
        titleRow.createEl('span', { text: game.title, style: 'font-weight:bold;font-size:1.05em;color:var(--text-normal);' });
        if (game.year) {
          titleRow.createEl('span', { text: `(${game.year})`, style: 'font-size:0.85em;color:var(--text-muted);' });
        }

        const subRow = info.createDiv();
        subRow.style.cssText = 'font-size:0.8em;color:var(--text-muted);';
        const parts = [];
        if (game.platform) parts.push(`💻 ${game.platform}`);
        if (game.genre) parts.push(`🎭 ${game.genre}`);
        if (game.rawg_rating) parts.push(`⭐ RAWG: ${game.rawg_rating}/10`);
        subRow.textContent = parts.join(' • ');

        item.addEventListener('click', async () => {
          this.close();
          new Notice(`⏳ Načítám detaily hry "${game.title}"...`);
          const details = await getRawgDetails(apiKey, game.id);
          if (details) {
            game.summary = details.description;
            if (details.playtime && details.playtime !== '0') {
              game.playtime = details.playtime;
            }
          }
          this.onSelectGame(game);
        });
      }
    };

    let searchTimeout;
    input.addEventListener('input', () => {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(doSearch, 350);
    });

    searchBtn.addEventListener('click', doSearch);
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') doSearch();
    });

    setTimeout(() => input.focus(), 100);
  }

  onClose() {
    this.contentEl.empty();
  }
}


class BulkAddGamesModal extends Modal {
  constructor(app, plugin) {
    super(app);
    this.plugin = plugin;
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.empty();

    contentEl.createEl('h2', { text: '📦 Hromadné přidávání her (Bulk Adder)' });
    contentEl.createEl('p', {
      text: 'Vložte seznam her (každá hra na samostatný řádek). Plugin automaticky vyhledá detaily z RAWG.io, vytvoří poznámky a odesle je do Supabase.',
      style: 'font-size:0.9em;color:var(--text-muted);margin-bottom:16px;'
    });

    let defaultStatus = 'completed';
    let defaultPlatform = 'PC';

    new Setting(contentEl)
      .setName('Výchozí stav dohrání')
      .addDropdown(dd => dd
        .addOption('completed', '✅ Dohráno')
        .addOption('playing', '🎮 Hráno')
        .addOption('backlog', '📋 Chci si zahrát')
        .addOption('dropped', '❌ Nedohráno')
        .setValue(defaultStatus)
        .onChange(val => defaultStatus = val));

    new Setting(contentEl)
      .setName('Výchozí platforma')
      .addDropdown(dd => dd
        .addOption('PC', 'PC')
        .addOption('PlayStation 5', 'PlayStation 5')
        .addOption('Xbox', 'Xbox')
        .addOption('Nintendo Switch', 'Nintendo Switch')
        .addOption('Mobil', 'Mobil')
        .setValue(defaultPlatform)
        .onChange(val => defaultPlatform = val));

    const textArea = contentEl.createEl('textarea', {
      placeholder: 'Cyberpunk 2077\nThe Witcher 3: Wild Hunt\nKingdom Come: Deliverance\nGTA V\nElden Ring\nRed Dead Redemption 2'
    });
    textArea.style.cssText = 'width:100%;height:180px;padding:12px;border-radius:8px;border:1px solid var(--background-modifier-border);background:var(--background-primary);color:var(--text-normal);font-family:monospace;font-size:0.9em;box-sizing:border-box;margin-bottom:16px;line-height:1.5;';

    const statusProgress = contentEl.createDiv();
    statusProgress.style.cssText = 'font-size:0.9em;color:var(--interactive-accent);margin-bottom:12px;font-weight:bold;';

    const actionBtn = contentEl.createEl('button', { text: '🚀 Hromadně vyhledat a přidat vše' });
    actionBtn.style.cssText = 'width:100%;padding:12px;border-radius:8px;background:var(--interactive-accent);color:var(--text-on-accent);font-weight:bold;font-size:1em;cursor:pointer;';

    actionBtn.addEventListener('click', async () => {
      const rawText = textArea.value.trim();
      if (!rawText) {
        new Notice('Zadejte seznam her pro vytvoření.');
        return;
      }

      const titles = rawText.split('\n').map(l => l.trim()).filter(l => l.length > 0);
      if (titles.length === 0) return;

      actionBtn.disabled = true;
      actionBtn.style.opacity = '0.5';
      const apiKey = this.plugin.settings.rawgApiKey || '6da16180684e4a93bf3a95c5003738ab';

      let countSuccess = 0;

      for (let i = 0; i < titles.length; i++) {
        const query = titles[i];
        statusProgress.textContent = `⏳ [${i + 1}/${titles.length}] Vyhledávám: "${query}"...`;

        try {
          const results = await searchRawg(apiKey, query);
          let gameData = {
            title: query,
            platform: defaultPlatform,
            genre: '',
            status: defaultStatus,
            my_rating: '8',
            playtime_hours: '',
            release_year: '',
            cover_url: '',
            notes: ''
          };

          if (results && results.length > 0) {
            const topGame = results[0];
            const details = await getRawgDetails(apiKey, topGame.id);

            gameData.title = topGame.title || query;
            gameData.platform = topGame.platform || defaultPlatform;
            gameData.genre = topGame.genre || '';
            gameData.release_year = topGame.year || '';
            gameData.cover_url = topGame.cover_url || '';
            gameData.my_rating = topGame.rawg_rating ? Math.round(Number(topGame.rawg_rating)).toString() : '8';
            if (details) {
              gameData.notes = details.description ? details.description.substring(0, 400) : '';
              if (details.playtime) gameData.playtime_hours = details.playtime;
            }
          }

          await this.plugin.createGameNote(gameData);
          countSuccess++;
        } catch (e) {
          console.error(`Error processing ${query}:`, e);
        }

        await new Promise(r => setTimeout(r, 300));
      }

      statusProgress.textContent = `✅ Hromadný import dokončen! Přidáno ${countSuccess} / ${titles.length} her.`;
      new Notice(`🎉 Všechna herní data (${countSuccess} her) byla přidána do databáze i Supabase!`);
      setTimeout(() => this.close(), 1500);
    });
  }

  onClose() {
    this.contentEl.empty();
  }
}


class AddGameModal extends Modal {
  constructor(app, initialData, onSubmit) {
    super(app);
    this.onSubmit = onSubmit;
    this.gameData = {
      title: initialData ? initialData.title : '',
      platform: initialData && initialData.platform ? initialData.platform : 'PC',
      genre: initialData ? initialData.genre : 'RPG',
      status: 'completed',
      my_rating: initialData && initialData.rawg_rating ? Math.round(Number(initialData.rawg_rating)).toString() : '9',
      playtime_hours: initialData && initialData.playtime ? initialData.playtime : '40',
      release_year: initialData ? initialData.year : new Date().getFullYear().toString(),
      cover_url: initialData ? initialData.cover_url : '',
      notes: initialData && initialData.summary ? initialData.summary.substring(0, 500) : ''
    };
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.createEl('h2', { text: '🎮 Uložení hry do databáze' });

    new Setting(contentEl)
      .setName('Název hry')
      .addText(text => text.setValue(this.gameData.title).onChange(val => this.gameData.title = val));

    new Setting(contentEl)
      .setName('Platforma')
      .addDropdown(dd => dd
        .addOption('PC', 'PC')
        .addOption('PlayStation 5', 'PlayStation 5')
        .addOption('Xbox', 'Xbox')
        .addOption('Nintendo Switch', 'Nintendo Switch')
        .addOption('Mobil', 'Mobil')
        .setValue(this.gameData.platform)
        .onChange(val => this.gameData.platform = val));

    new Setting(contentEl)
      .setName('Žánr')
      .addText(text => text.setValue(this.gameData.genre).onChange(val => this.gameData.genre = val));

    new Setting(contentEl)
      .setName('Stav dohrání')
      .addDropdown(dd => dd
        .addOption('completed', '✅ Dohráno')
        .addOption('playing', '🎮 Hráno')
        .addOption('backlog', '📋 Chci si zahrát')
        .addOption('dropped', '❌ Nedohráno')
        .setValue(this.gameData.status)
        .onChange(val => this.gameData.status = val));

    new Setting(contentEl)
      .setName('Moje hodnocení (1 - 10)')
      .addText(text => text.setValue(this.gameData.my_rating).onChange(val => this.gameData.my_rating = val));

    new Setting(contentEl)
      .setName('Odehrané hodiny')
      .addText(text => text.setValue(this.gameData.playtime_hours).onChange(val => this.gameData.playtime_hours = val));

    new Setting(contentEl)
      .setName('Rok vydání')
      .addText(text => text.setValue(this.gameData.release_year).onChange(val => this.gameData.release_year = val));

    new Setting(contentEl)
      .setName('URL obalu / Posteru')
      .addText(text => text.setValue(this.gameData.cover_url).onChange(val => this.gameData.cover_url = val));

    new Setting(contentEl)
      .setName('Poznámky / Popis')
      .addTextArea(ta => ta.setValue(this.gameData.notes).onChange(val => this.gameData.notes = val));

    new Setting(contentEl)
      .addButton(btn => btn
        .setButtonText('Uložit hru do databáze')
        .setCta()
        .onClick(() => {
          if (!this.gameData.title.trim()) {
            new Notice('Zadejte prosím název hry');
            return;
          }
          this.close();
          this.onSubmit(this.gameData);
        }));
  }

  onClose() {
    this.contentEl.empty();
  }
}


// ─── PLUGIN ───

const DEFAULT_SETTINGS = { apiKey: '', rawgApiKey: '6da16180684e4a93bf3a95c5003738ab' };

module.exports = class FilmovaDatabazePlugin extends Plugin {
  async onload() {
    await this.loadSettings();

    this.registerView(VIEW_TYPE, (leaf) => new MovieDatabaseView(leaf));
    this.registerView(VIEW_TYPE_SERIES, (leaf) => new SeriesDatabaseView(leaf));
    this.registerView(VIEW_TYPE_WATCHLIST, (leaf) => new WatchlistView(leaf));

    this.addCommand({
      id: 'open-filmova-databaze',
      name: 'Otevřít filmovou databázi',
      callback: () => this.activateView(),
    });

    this.addCommand({
      id: 'open-serialova-databaze',
      name: 'Otevřít seriálovou databázi',
      callback: () => this.activateSeriesView(),
    });

    this.addCommand({
      id: 'add-movie',
      name: 'Přidat film (vyhledat na TMDB)',
      callback: () => new SearchMovieModal(this.app, this, () => {
        this.refreshView();
      }).open(),
    });

    this.addCommand({
      id: 'add-series',
      name: 'Přidat seriál (vyhledat na TMDB)',
      callback: () => new SearchSeriesModal(this.app, this, () => {
        this.refreshSeriesView();
      }).open(),
    });

    this.addCommand({
      id: 'add-to-watchlist',
      name: 'Přidat do watchlistu (vyhledat na TMDB)',
      callback: () => new SearchWatchlistModal(this.app, this, () => {
        this.refreshWatchlistView();
      }).open(),
    });

    this.addCommand({
      id: 'open-watchlist',
      name: 'Otevřít watchlist',
      callback: () => this.activateWatchlistView(),
    });

    this.addRibbonIcon('film', 'Filmová databáze', () => this.activateView());
    this.addRibbonIcon('tv', 'Seriálová databáze', () => this.activateSeriesView());
    this.addRibbonIcon('list', 'Watchlist', () => this.activateWatchlistView());

            this.addCommand({
      id: 'bulk-add-games',
      name: '📦 Hromadně přidat hry (Bulk Adder)',
      callback: () => new BulkAddGamesModal(this.app, this).open(),
    });

    this.addCommand({
      id: 'add-game',
      name: 'Přidat hru (vyhledat na RAWG.io)',
      callback: () => new SearchGameModal(this.app, this, (selectedGame) => {
        new AddGameModal(this.app, selectedGame, async (data) => {
          await this.createGameNote(data);
        }).open();
      }).open(),
    });

    this.addRibbonIcon('gamepad-2', 'Herní databáze', () => {
      new SearchGameModal(this.app, this, (selectedGame) => {
        new AddGameModal(this.app, selectedGame, async (data) => {
          await this.createGameNote(data);
        }).open();
      }).open();
    });

    this.addSettingTab(new FilmovaDatabazeSettingTab(this.app, this));
  }

  async createGameNote(data) {
    const folder = this.app.vault.getAbstractFileByPath(GAME_FOLDER);
    if (!folder || !(folder instanceof TFolder)) {
      await this.app.vault.createFolder(GAME_FOLDER);
    }

    const safeTitle = data.title.replace(/[<>:"/\\|?*]/g, '').trim();
    const fileName = `${safeTitle}.md`;
    const filePath = `${GAME_FOLDER}/${fileName}`;

    const existing = this.app.vault.getAbstractFileByPath(filePath);
    if (existing instanceof TFile) {
      new Notice(`Hra "${data.title}" už v databázi existuje`);
      return existing;
    }

    const now = window.moment ? window.moment().format('DD.MM.YYYY') : '';
    const content = `---
cssclasses: homepage-dashboard
type: game
title: ${data.title || ''}
platform: ${data.platform || 'PC'}
genre: ${data.genre || ''}
status: ${data.status || 'completed'}
my_rating: ${data.my_rating || ''}
playtime_hours: ${data.playtime_hours || ''}
release_year: ${data.release_year || ''}
cover_url: ${data.cover_url || ''}
date_added: ${now}
tags: [hra]
notes: ${data.notes ? data.notes.replace(/\n/g, ' ') : ''}
---

\`\`\`dataviewjs
const ACCENT = '#c49a5a';
const container = dv.container;
container.classList.add('homepage-root');
container.style.setProperty('--moc-accent', ACCENT);

const page = dv.current();
const title = page.title || page.file.name;
const platform = page.platform || 'PC';
const genre = page.genre || '';
const status = page.status || 'completed';
const myRating = page.my_rating || '';
const playtime = page.playtime_hours || '';
const year = page.release_year || '';
const cover = page.cover_url || '';
const notes = page.notes || '';

const statusLabel = {
  completed: '✅ Dohráno',
  playing: '🎮 Hráno',
  backlog: '📋 Chci hrát',
  dropped: '❌ Nedohráno'
}[status] || status;

const header = container.createDiv({ cls: 'moc-header' });
const left = header.createDiv({ cls: 'moc-header-left' });
left.createEl('span', { text: '🎮', cls: 'moc-header-icon' });
left.createEl('h1', { text: title.toUpperCase() });

const card = container.createDiv({ cls: 'moc-card' });
card.style.cssText = 'padding:16px;display:flex;gap:16px;align-items:flex-start;margin-top:16px;';

if (cover) {
  const imgBox = card.createDiv();
  imgBox.style.cssText = 'width:140px;aspect-ratio:2/3;border-radius:8px;overflow:hidden;flex-shrink:0;';
  const img = imgBox.createEl('img');
  img.src = cover;
  img.style.cssText = 'width:100%;height:100%;object-fit:cover;';
}

const info = card.createDiv();
info.style.cssText = 'display:flex;flex-direction:column;gap:8px;flex:1;';

info.createEl('h2', { text: title, style: 'margin:0;color:var(--text-normal);' });

const metaRow = info.createDiv();
metaRow.style.cssText = 'display:flex;gap:8px;flex-wrap:wrap;font-size:0.85em;color:var(--text-muted);';

if (year) metaRow.createEl('span', { text: \`📅 \${year}\` });
if (platform) metaRow.createEl('span', { text: \`💻 \${platform}\` });
if (playtime) metaRow.createEl('span', { text: \`⏳ \${playtime}h\` });
metaRow.createEl('span', { text: statusLabel });

if (myRating) {
  const rat = info.createDiv();
  rat.style.cssText = 'font-weight:bold;color:var(--moc-accent);font-size:1.1em;';
  rat.textContent = \`★ \${myRating} / 10\`;
}

if (genre) {
  const g = info.createDiv();
  g.style.cssText = 'font-size:0.85em;color:var(--text-muted);';
  g.textContent = \`🎭 Žánr: \${genre}\`;
}

if (notes) {
  const n = info.createDiv();
  n.style.cssText = 'margin-top:8px;padding-top:8px;border-top:1px solid var(--background-modifier-border);font-size:0.9em;';
  n.textContent = notes;
}
\`\`\`
`;

    await this.app.vault.create(filePath, content);
    new Notice(`Hra "${data.title}" byla úspěšně přidána!`);
    await pushGameToSupabase(data);

    const newFile = this.app.vault.getAbstractFileByPath(filePath);
    if (newFile instanceof TFile) {
      this.app.workspace.openLinkText(newFile.path, '');
    }
  }

  searchAndAdd(query) {
    new SearchMovieModal(this.app, this, () => {
      this.refreshView();
    }, query).open();
  }

  searchAndAddSeries(query) {
    new SearchSeriesModal(this.app, this, () => {
      this.refreshSeriesView();
    }, query).open();
  }

  refreshView() {
    const leaves = this.app.workspace.getLeavesOfType(VIEW_TYPE);
    if (leaves.length > 0) {
      const view = leaves[0].view;
      if (view instanceof MovieDatabaseView) view.loadMovies();
    }
  }

  refreshSeriesView() {
    const leaves = this.app.workspace.getLeavesOfType(VIEW_TYPE_SERIES);
    if (leaves.length > 0) {
      const view = leaves[0].view;
      if (view instanceof SeriesDatabaseView) view.loadSeries();
    }
  }

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }

  async activateView() {
    const existing = this.app.workspace.getLeavesOfType(VIEW_TYPE);
    if (existing.length > 0) {
      this.app.workspace.revealLeaf(existing[0]);
      return;
    }

    const leaf = this.app.workspace.getRightLeaf(false);
    if (leaf) {
      await leaf.setViewState({ type: VIEW_TYPE, active: true });
      this.app.workspace.revealLeaf(leaf);
    }
  }

  async activateSeriesView() {
    const existing = this.app.workspace.getLeavesOfType(VIEW_TYPE_SERIES);
    if (existing.length > 0) {
      this.app.workspace.revealLeaf(existing[0]);
      return;
    }

    const leaf = this.app.workspace.getRightLeaf(false);
    if (leaf) {
      await leaf.setViewState({ type: VIEW_TYPE_SERIES, active: true });
      this.app.workspace.revealLeaf(leaf);
    }
  }

  refreshWatchlistView() {
    const leaves = this.app.workspace.getLeavesOfType(VIEW_TYPE_WATCHLIST);
    if (leaves.length > 0) {
      const view = leaves[0].view;
      if (view instanceof WatchlistView) view.loadItems();
    }
  }

  async activateWatchlistView() {
    const existing = this.app.workspace.getLeavesOfType(VIEW_TYPE_WATCHLIST);
    if (existing.length > 0) {
      this.app.workspace.revealLeaf(existing[0]);
      return;
    }

    const leaf = this.app.workspace.getRightLeaf(false);
    if (leaf) {
      await leaf.setViewState({ type: VIEW_TYPE_WATCHLIST, active: true });
      this.app.workspace.revealLeaf(leaf);
    }
  }
};
