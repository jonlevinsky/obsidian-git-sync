const { Plugin, ItemView, Modal, Setting, Notice, TFolder, TFile, requestUrl, PluginSettingTab } = require('obsidian');

const VIEW_TYPE = 'filmova-databaze-view';
const FOLDER = 'Databaze/Film';
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

// ─── SETTINGS ───

class FilmovaDatabazeSettingTab extends PluginSettingTab {
  constructor(app, plugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display() {
    const { containerEl } = this;
    containerEl.empty();
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

    const files = folder.children.filter(f => f instanceof TFile && f.extension === 'md' && f.name !== 'Film.md');
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

// ─── PLUGIN ───

const DEFAULT_SETTINGS = { apiKey: '' };

module.exports = class FilmovaDatabazePlugin extends Plugin {
  async onload() {
    await this.loadSettings();

    this.registerView(VIEW_TYPE, (leaf) => new MovieDatabaseView(leaf));

    this.addCommand({
      id: 'open-filmova-databaze',
      name: 'Otevřít filmovou databázi',
      callback: () => this.activateView(),
    });

    this.addCommand({
      id: 'add-movie',
      name: 'Přidat film (vyhledat na TMDB)',
      callback: () => new SearchMovieModal(this.app, this, () => {
        this.refreshView();
      }).open(),
    });

    this.addRibbonIcon('film', 'Filmová databáze', () => this.activateView());

    this.addSettingTab(new FilmovaDatabazeSettingTab(this.app, this));
  }

  searchAndAdd(query) {
    new SearchMovieModal(this.app, this, () => {
      this.refreshView();
    }, query).open();
  }

  refreshView() {
    const leaves = this.app.workspace.getLeavesOfType(VIEW_TYPE);
    if (leaves.length > 0) {
      const view = leaves[0].view;
      if (view instanceof MovieDatabaseView) view.loadMovies();
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
};
