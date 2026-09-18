const { Plugin, ItemView, Modal, Setting, Notice, TFolder, TFile, requestUrl, PluginSettingTab } = require('obsidian');

const VIEW_TYPE = 'filmova-databaze-view';
const VIEW_TYPE_RECOMMENDER = 'movie-recommender-view';
const FOLDER = 'Databaze/Filmy';
const TMDB_BASE = 'https://api.themoviedb.org/3';
const IMG_BASE = 'https://image.tmdb.org/t/p/w500';

// ─── TMDB GENRE MAPPINGS ───

const GENRE_MAP_TMDB_TO_CZ = {
  28: 'Akční',
  12: 'Dobrodružný',
  16: 'Animovaný',
  35: 'Komedie',
  80: 'Krimi',
  99: 'Dokumentární',
  18: 'Drama',
  10751: 'Rodinný',
  14: 'Fantasy',
  36: 'Historický',
  27: 'Horor',
  10402: 'Hudební',
  9648: 'Mysteriózní',
  10749: 'Romantický',
  878: 'Sci-Fi',
  10770: 'TV film',
  53: 'Thriller',
  10752: 'Válečný',
  37: 'Western',
  10759: 'Akční & Dobrodružný',
  10762: 'Dětský',
  10763: 'Zprávy',
  10764: 'Reality-TV',
  10765: 'Sci-Fi & Fantasy',
  10766: 'Mýdlová opera',
  10767: 'Talk show',
  10768: 'Válka & Politika'
};

const GENRE_MAP_CZ_TO_TMDB = {
  'akční': 28,
  'dobrodružný': 12,
  'animovaný': 16,
  'komedie': 35,
  'krimi': 80,
  'dokumentární': 99,
  'drama': 18,
  'rodinný': 10751,
  'fantasy': 14,
  'historický': 36,
  'horor': 27,
  'hudební': 10402,
  'mysteriózní': 9648,
  'romantický': 10749,
  'sci-fi': 878,
  'sci-fi / vědeckofantastický': 878,
  'vědeckofantastický': 878,
  'tv film': 10770,
  'thriller': 53,
  'válečný': 10752,
  'western': 37,
  'tv sci-fi & fantasy': 10765,
  'sci-fi & fantasy': 10765,
  'tv action & adventure': 10759,
  'akční & dobrodružný': 10759,
  'dětský': 10762,
  'zprávy': 10763,
  'reality-tv': 10764,
  'mýdlová opera': 10766,
  'talk show': 10767,
  'válka & politika': 10768
};

const ORIGIN_FILTER_OPTIONS = [
  { id: '', label: '🌍 Všechny země / jazyky' },
  { id: 'cs_sk', label: '🇨🇿 Česko & Slovensko', lang: 'cs', extraLangs: ['cs', 'sk'], countries: ['CZ', 'SK'] },
  { id: 'en', label: '🇺🇸🇬🇧 Anglicky mluvící (US / UK)', lang: 'en', extraLangs: ['en'], countries: ['US', 'GB', 'CA', 'AU', 'NZ'] },
  { id: 'ko', label: '🇰🇷 Jižní Korea (K-Drama / Film)', lang: 'ko', extraLangs: ['ko'], countries: ['KR'] },
  { id: 'ja', label: '🇯🇵 Japonsko (Anime / J-Film)', lang: 'ja', extraLangs: ['ja'], countries: ['JP'] },
  { id: 'fr', label: '🇫🇷 Francie', lang: 'fr', extraLangs: ['fr'], countries: ['FR', 'BE'] },
  { id: 'de', label: '🇩🇪 Německo & Rakousko', lang: 'de', extraLangs: ['de'], countries: ['DE', 'AT', 'CH'] },
  { id: 'es', label: '🇪🇸 Španělsko & Latinská Amerika', lang: 'es', extraLangs: ['es'], countries: ['ES', 'MX', 'AR', 'CO'] },
  { id: 'it', label: '🇮🇹 Itálie', lang: 'it', extraLangs: ['it'], countries: ['IT'] },
  { id: 'nordic', label: '❄️ Skandinávie / Severské', lang: 'sv', extraLangs: ['sv', 'no', 'da', 'fi', 'is'], countries: ['SE', 'NO', 'DK', 'FI', 'IS'] },
  { id: 'pl', label: '🇵🇱 Polsko', lang: 'pl', extraLangs: ['pl'], countries: ['PL'] }
];

const LANG_BADGE_MAP = {
  cs: '🇨🇿 CS',
  sk: '🇸🇰 SK',
  en: '🇺🇸 EN',
  ko: '🇰🇷 KO',
  ja: '🇯🇵 JA',
  fr: '🇫🇷 FR',
  de: '🇩🇪 DE',
  es: '🇪🇸 ES',
  it: '🇮🇹 IT',
  sv: '🇸🇪 SV',
  no: '🇳🇴 NO',
  da: '🇩🇰 DA',
  fi: '🇫🇮 FI',
  is: '🇮🇸 IS',
  pl: '🇵🇱 PL',
  zh: '🇨🇳 ZH',
  hi: '🇮🇳 HI',
  pt: '🇵🇹 PT',
  ru: '🇷🇺 RU',
  uk: '🇺🇦 UK'
};

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

async function tmdbMovieRecommendations(apiKey, id, page = 1) {
  try {
    const url = `${TMDB_BASE}/movie/${id}/recommendations?api_key=${apiKey}&language=cs&page=${page}`;
    const resp = await requestUrl({ url, method: 'GET' });
    return resp.json;
  } catch (e) {
    return { results: [] };
  }
}

async function tmdbMovieSimilar(apiKey, id, page = 1) {
  try {
    const url = `${TMDB_BASE}/movie/${id}/similar?api_key=${apiKey}&language=cs&page=${page}`;
    const resp = await requestUrl({ url, method: 'GET' });
    return resp.json;
  } catch (e) {
    return { results: [] };
  }
}

async function tmdbTvRecommendations(apiKey, id, page = 1) {
  try {
    const url = `${TMDB_BASE}/tv/${id}/recommendations?api_key=${apiKey}&language=cs&page=${page}`;
    const resp = await requestUrl({ url, method: 'GET' });
    return resp.json;
  } catch (e) {
    return { results: [] };
  }
}

async function tmdbTvSimilar(apiKey, id, page = 1) {
  try {
    const url = `${TMDB_BASE}/tv/${id}/similar?api_key=${apiKey}&language=cs&page=${page}`;
    const resp = await requestUrl({ url, method: 'GET' });
    return resp.json;
  } catch (e) {
    return { results: [] };
  }
}

async function tmdbDiscoverMovies(apiKey, params = {}) {
  try {
    const sortBy = params.sortBy || 'popularity.desc';
    const withGenres = params.withGenres || '';
    const voteCountGte = params.voteCountGte || 50;
    const voteAvgGte = params.voteAvgGte || 6.5;
    const page = params.page || 1;
    let url = `${TMDB_BASE}/discover/movie?api_key=${apiKey}&language=cs&sort_by=${encodeURIComponent(sortBy)}&vote_count.gte=${voteCountGte}&vote_average.gte=${voteAvgGte}&page=${page}`;
    if (withGenres) url += `&with_genres=${encodeURIComponent(withGenres)}`;
    if (params.withOriginalLanguage) url += '&with_original_language=' + encodeURIComponent(params.withOriginalLanguage);
    if (params.withOriginCountry) url += '&with_origin_country=' + encodeURIComponent(params.withOriginCountry);
    if (params.voteCountLte) url += `&vote_count.lte=${params.voteCountLte}`;
    const resp = await requestUrl({ url, method: 'GET' });
    return resp.json;
  } catch (e) {
    return { results: [] };
  }
}

async function tmdbDiscoverTv(apiKey, params = {}) {
  try {
    const sortBy = params.sortBy || 'popularity.desc';
    const withGenres = params.withGenres || '';
    const voteCountGte = params.voteCountGte || 30;
    const voteAvgGte = params.voteAvgGte || 6.5;
    const page = params.page || 1;
    let url = `${TMDB_BASE}/discover/tv?api_key=${apiKey}&language=cs&sort_by=${encodeURIComponent(sortBy)}&vote_count.gte=${voteCountGte}&vote_average.gte=${voteAvgGte}&page=${page}`;
    if (withGenres) url += `&with_genres=${encodeURIComponent(withGenres)}`;
    if (params.withOriginalLanguage) url += '&with_original_language=' + encodeURIComponent(params.withOriginalLanguage);
    if (params.withOriginCountry) url += '&with_origin_country=' + encodeURIComponent(params.withOriginCountry);
    if (params.voteCountLte) url += `&vote_count.lte=${params.voteCountLte}`;
    const resp = await requestUrl({ url, method: 'GET' });
    return resp.json;
  } catch (e) {
    return { results: [] };
  }
}

async function tmdbTrending(apiKey, mediaType = 'all', timeWindow = 'week') {
  try {
    const url = `${TMDB_BASE}/trending/${mediaType}/${timeWindow}?api_key=${apiKey}&language=cs`;
    const resp = await requestUrl({ url, method: 'GET' });
    return resp.json;
  } catch (e) {
    return { results: [] };
  }
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


// ─── HYBRID RECOMMENDATION ENGINE ───

async function syncRecommendationsToSupabase(profile, topRecs) {
  try {
    const body = {
      profile: {
        total_watched: profile.totalWatched || 0,
        total_movies: profile.totalMovies || 0,
        total_series: profile.totalSeries || 0,
        total_watchlist: profile.totalWatchlist || 0,
        avg_rating: profile.avgRating || '—',
        top_genres: (profile.topGenres || []).slice(0, 5),
        top_directors: (profile.topDirectors || []).slice(0, 5)
      },
      top_recommendations: (topRecs || []).slice(0, 10).map(r => ({
        id: r.id,
        title: r.title,
        media_type: r.media_type,
        match_percent: r.matchPercent,
        year: r.year,
        genres: r.genres
      })),
      timestamp: new Date().toISOString()
    };
    await requestUrl({
      url: 'https://bkgfohfmnbmascomaozv.supabase.co/rest/v1/recommendations_sync',
      method: 'POST',
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify(body)
    });
  } catch (e) {
    // Non-blocking sync error
  }
}

function extractUserProfile(app) {
  const mdFiles = app.vault.getMarkdownFiles();

  const watchedTmdbIds = new Set();
  const watchedTitles = new Set();
  const watchlistTmdbIds = new Set();
  const watchlistTitles = new Set();

  const genreScores = {};
  const genreCounts = {};
  const directorScores = {};
  const directorCounts = {};

  const allWatchedItems = [];
  let ratingSum = 0;
  let ratingCount = 0;
  let totalMovies = 0;
  let totalSeries = 0;
  let totalWatchlist = 0;

  for (const file of mdFiles) {
    const path = file.path;
    const cache = app.metadataCache.getFileCache(file)?.frontmatter;
    if (!cache) continue;

    const isMovie = path.startsWith('Databaze/Filmy/') && !file.name.endsWith('Filmy.md') && (cache.type === 'film' || cache.title);
    const isSeries = path.startsWith('Databaze/Serialy/') && !file.name.endsWith('Serialy.md') && !file.name.endsWith('Serie.md') && (cache.type === 'serial' || cache.title);
    const isWatchlist = path.startsWith('Databaze/Watchlist/') && !file.name.endsWith('Watchlist.md') && (cache.type === 'watchlist' || cache.title);

    const title = cache.title || file.basename;
    const normalizedTitle = title.toLowerCase().trim();
    const tmdbId = cache.tmdb_id ? Number(cache.tmdb_id) : null;

    if (isWatchlist) {
      totalWatchlist++;
      if (tmdbId) {
        watchlistTmdbIds.add(tmdbId);
        watchlistTmdbIds.add(String(tmdbId));
      }
      if (normalizedTitle) watchlistTitles.add(normalizedTitle);
      continue;
    }

    if (isMovie || isSeries) {
      const mediaType = isMovie ? 'movie' : 'tv';
      if (isMovie) totalMovies++;
      if (isSeries) totalSeries++;

      if (tmdbId) {
        watchedTmdbIds.add(tmdbId);
        watchedTmdbIds.add(String(tmdbId));
      }
      if (normalizedTitle) watchedTitles.add(normalizedTitle);

      const rawRating = cache.my_rating;
      let numericRating = null;
      if (rawRating !== undefined && rawRating !== null && rawRating !== '') {
        const parsed = parseFloat(rawRating);
        if (!isNaN(parsed) && parsed > 0) {
          numericRating = parsed;
          ratingSum += parsed;
          ratingCount++;
        }
      }

      // Dynamic weighting based on user rating
      let weight = 1;
      if (numericRating !== null) {
        if (numericRating >= 9) weight = 5;
        else if (numericRating >= 8) weight = 3.5;
        else if (numericRating >= 7) weight = 2;
        else if (numericRating >= 6) weight = 1;
        else if (numericRating >= 5) weight = 0.5;
        else weight = -2;
      }

      // Process genres
      const rawGenre = cache.genre || '';
      if (rawGenre) {
        const gList = rawGenre.split(/[,;/]+/).map(s => s.trim()).filter(Boolean);
        for (const g of gList) {
          genreScores[g] = (genreScores[g] || 0) + weight;
          genreCounts[g] = (genreCounts[g] || 0) + 1;
        }
      }

      // Process directors / creators
      const person = cache.director || cache.creator || '';
      if (person) {
        const pList = person.split(/[,;/]+/).map(s => s.trim()).filter(Boolean);
        for (const p of pList) {
          directorScores[p] = (directorScores[p] || 0) + weight;
          directorCounts[p] = (directorCounts[p] || 0) + 1;
        }
      }

      allWatchedItems.push({
        title,
        year: cache.year || '',
        media_type: mediaType,
        tmdb_id: tmdbId,
        my_rating: numericRating,
        tmdb_rating: cache.tmdb_rating ? parseFloat(cache.tmdb_rating) : null,
        genre: rawGenre,
        director: person,
        poster: cache.poster || '',
        file
      });
    }
  }

  // Top seeds: sorted by user rating descending, then tmdb rating
  const validSeeds = allWatchedItems
    .filter(item => item.tmdb_id)
    .sort((a, b) => {
      const rA = a.my_rating !== null ? a.my_rating : (a.tmdb_rating || 5);
      const rB = b.my_rating !== null ? b.my_rating : (b.tmdb_rating || 5);
      return rB - rA;
    });

  // Top genres & directors
  const topGenres = Object.entries(genreScores)
    .sort((a, b) => b[1] - a[1])
    .map(([genre, score]) => ({ genre, score, count: genreCounts[genre] || 0 }));

  const topDirectors = Object.entries(directorScores)
    .sort((a, b) => b[1] - a[1])
    .map(([director, score]) => ({ director, score, count: directorCounts[director] || 0 }));

  const avgRating = ratingCount > 0 ? (ratingSum / ratingCount).toFixed(1) : '—';
  const totalWatched = totalMovies + totalSeries;

  return {
    watchedTmdbIds,
    watchedTitles,
    watchlistTmdbIds,
    watchlistTitles,
    genreScores,
    genreCounts,
    directorScores,
    directorCounts,
    seeds: validSeeds,
    allWatchedItems,
    totalWatched,
    totalMovies,
    totalSeries,
    totalWatchlist,
    avgRating,
    topGenres,
    topDirectors
  };
}

async function generateHybridRecommendations(apiKey, app, options = {}) {
  const mode = options.mode || 'all'; // 'all' | 'movies' | 'tv'
  const discovery = options.discovery || 'balanced'; // 'balanced' | 'popular' | 'hidden_gems'
  const seedTmdbId = options.seedTmdbId ? Number(options.seedTmdbId) : null;
  const filterGenre = options.filterGenre ? options.filterGenre.trim() : '';
  const filterOrigin = options.filterOrigin || '';
  const originConfig = ORIGIN_FILTER_OPTIONS.find(o => o.id === filterOrigin);

  const profile = extractUserProfile(app);
  const candidateMap = new Map();

  function addCandidate(raw, sourceMeta = {}) {
    if (!raw || !raw.id) return;
    const mediaType = raw.media_type || (raw.first_air_date ? 'tv' : (raw.release_date ? 'movie' : (sourceMeta.fallbackType || 'movie')));
    const key = `${mediaType}_${raw.id}`;
    if (!candidateMap.has(key)) {
      candidateMap.set(key, {
        ...raw,
        media_type: mediaType,
        seedSources: [],
        discoverySource: sourceMeta.discoverySource || false,
        isTrending: sourceMeta.isTrending || false
      });
    }
    const entry = candidateMap.get(key);
    if (sourceMeta.seed) {
      if (!entry.seedSources.some(s => s.seedTitle === sourceMeta.seed.title)) {
        entry.seedSources.push({
          seedTitle: sourceMeta.seed.title,
          seedRating: sourceMeta.seed.my_rating,
          rank: sourceMeta.rank || 1
        });
      }
    }
    if (sourceMeta.isTrending) entry.isTrending = true;
    if (sourceMeta.discoverySource) entry.discoverySource = true;
  }

  const fetchPromises = [];

  if (seedTmdbId) {
    const seedItem = profile.seeds.find(s => s.tmdb_id === seedTmdbId) || { tmdb_id: seedTmdbId, title: 'Vybraný titul', media_type: 'movie', my_rating: 10 };
    const isTv = seedItem.media_type === 'tv';

    if (isTv) {
      fetchPromises.push(
        tmdbTvRecommendations(apiKey, seedTmdbId).then(res => {
          (res.results || []).forEach((r, idx) => addCandidate(r, { seed: seedItem, rank: idx + 1, fallbackType: 'tv' }));
        }),
        tmdbTvSimilar(apiKey, seedTmdbId).then(res => {
          (res.results || []).forEach((r, idx) => addCandidate(r, { seed: seedItem, rank: idx + 1, fallbackType: 'tv' }));
        })
      );
    } else {
      fetchPromises.push(
        tmdbMovieRecommendations(apiKey, seedTmdbId).then(res => {
          (res.results || []).forEach((r, idx) => addCandidate(r, { seed: seedItem, rank: idx + 1, fallbackType: 'movie' }));
        }),
        tmdbMovieSimilar(apiKey, seedTmdbId).then(res => {
          (res.results || []).forEach((r, idx) => addCandidate(r, { seed: seedItem, rank: idx + 1, fallbackType: 'movie' }));
        })
      );
    }
  } else {
    // 1. Top Seeds Recommendations & Similar
    const topSeeds = profile.seeds.slice(0, 6);
    for (const seed of topSeeds) {
      if (seed.media_type === 'tv') {
        if (mode !== 'movies') {
          fetchPromises.push(
            tmdbTvRecommendations(apiKey, seed.tmdb_id).then(res => {
              (res.results || []).slice(0, 10).forEach((r, idx) => addCandidate(r, { seed, rank: idx + 1, fallbackType: 'tv' }));
            }),
            tmdbTvSimilar(apiKey, seed.tmdb_id).then(res => {
              (res.results || []).slice(0, 10).forEach((r, idx) => addCandidate(r, { seed, rank: idx + 1, fallbackType: 'tv' }));
            })
          );
        }
      } else {
        if (mode !== 'tv') {
          fetchPromises.push(
            tmdbMovieRecommendations(apiKey, seed.tmdb_id).then(res => {
              (res.results || []).slice(0, 10).forEach((r, idx) => addCandidate(r, { seed, rank: idx + 1, fallbackType: 'movie' }));
            }),
            tmdbMovieSimilar(apiKey, seed.tmdb_id).then(res => {
              (res.results || []).slice(0, 10).forEach((r, idx) => addCandidate(r, { seed, rank: idx + 1, fallbackType: 'movie' }));
            })
          );
        }
      }
    }

    // 2. Discover by Top Genres
    const topGenreList = profile.topGenres.slice(0, 3);
    for (const gObj of topGenreList) {
      const gId = GENRE_MAP_CZ_TO_TMDB[gObj.genre.toLowerCase()];
      if (!gId) continue;

      let discoverParamsMovie = { withGenres: gId.toString() };
      let discoverParamsTv = { withGenres: gId.toString() };

      if (originConfig && originConfig.lang) {
        discoverParamsMovie.withOriginalLanguage = originConfig.lang;
        discoverParamsTv.withOriginalLanguage = originConfig.lang;
      }

      if (discovery === 'popular') {
        discoverParamsMovie.sortBy = 'popularity.desc';
        discoverParamsMovie.voteCountGte = 600;
        discoverParamsMovie.voteAvgGte = 7.0;

        discoverParamsTv.sortBy = 'popularity.desc';
        discoverParamsTv.voteCountGte = 300;
        discoverParamsTv.voteAvgGte = 7.0;
      } else if (discovery === 'hidden_gems') {
        discoverParamsMovie.sortBy = 'vote_average.desc';
        discoverParamsMovie.voteCountGte = 120;
        discoverParamsMovie.voteCountLte = 2500;
        discoverParamsMovie.voteAvgGte = 7.4;

        discoverParamsTv.sortBy = 'vote_average.desc';
        discoverParamsTv.voteCountGte = 60;
        discoverParamsTv.voteCountLte = 1500;
        discoverParamsTv.voteAvgGte = 7.4;
      } else {
        // Balanced
        discoverParamsMovie.sortBy = 'popularity.desc';
        discoverParamsMovie.voteCountGte = 100;
        discoverParamsMovie.voteAvgGte = 6.8;

        discoverParamsTv.sortBy = 'popularity.desc';
        discoverParamsTv.voteCountGte = 50;
        discoverParamsTv.voteAvgGte = 6.8;
      }

      // Adjust vote thresholds for specific languages
      if (originConfig && originConfig.id === 'cs_sk') {
        discoverParamsMovie.voteCountGte = 10;
        discoverParamsTv.voteCountGte = 5;
      } else if (originConfig && originConfig.lang && originConfig.lang !== 'en') {
        discoverParamsMovie.voteCountGte = Math.min(discoverParamsMovie.voteCountGte, 30);
        discoverParamsTv.voteCountGte = Math.min(discoverParamsTv.voteCountGte, 20);
      }

      if (mode !== 'tv') {
        fetchPromises.push(
          tmdbDiscoverMovies(apiKey, discoverParamsMovie).then(res => {
            (res.results || []).slice(0, 10).forEach(r => addCandidate(r, { discoverySource: true, fallbackType: 'movie' }));
          })
        );
      }
      if (mode !== 'movies') {
        fetchPromises.push(
          tmdbDiscoverTv(apiKey, discoverParamsTv).then(res => {
            (res.results || []).slice(0, 10).forEach(r => addCandidate(r, { discoverySource: true, fallbackType: 'tv' }));
          })
        );
      }
    }

    // Direct Discover calls for CZ/SK or specific non-English languages
    if (originConfig && originConfig.id === 'cs_sk') {
      if (mode !== 'tv') {
        fetchPromises.push(
          tmdbDiscoverMovies(apiKey, { withOriginalLanguage: 'cs', voteCountGte: 10, voteAvgGte: 6.0, sortBy: 'popularity.desc' }).then(res => {
            (res.results || []).slice(0, 15).forEach(r => addCandidate(r, { discoverySource: true, fallbackType: 'movie' }));
          }),
          tmdbDiscoverMovies(apiKey, { withOriginalLanguage: 'sk', voteCountGte: 5, voteAvgGte: 6.0, sortBy: 'popularity.desc' }).then(res => {
            (res.results || []).slice(0, 10).forEach(r => addCandidate(r, { discoverySource: true, fallbackType: 'movie' }));
          })
        );
      }
      if (mode !== 'movies') {
        fetchPromises.push(
          tmdbDiscoverTv(apiKey, { withOriginalLanguage: 'cs', voteCountGte: 5, voteAvgGte: 6.0, sortBy: 'popularity.desc' }).then(res => {
            (res.results || []).slice(0, 15).forEach(r => addCandidate(r, { discoverySource: true, fallbackType: 'tv' }));
          }),
          tmdbDiscoverTv(apiKey, { withOriginalLanguage: 'sk', voteCountGte: 5, voteAvgGte: 6.0, sortBy: 'popularity.desc' }).then(res => {
            (res.results || []).slice(0, 10).forEach(r => addCandidate(r, { discoverySource: true, fallbackType: 'tv' }));
          })
        );
      }
    } else if (originConfig && originConfig.lang && originConfig.lang !== 'en') {
      if (mode !== 'tv') {
        fetchPromises.push(
          tmdbDiscoverMovies(apiKey, { withOriginalLanguage: originConfig.lang, voteCountGte: 30, voteAvgGte: 6.5, sortBy: 'popularity.desc' }).then(res => {
            (res.results || []).slice(0, 15).forEach(r => addCandidate(r, { discoverySource: true, fallbackType: 'movie' }));
          })
        );
      }
      if (mode !== 'movies') {
        fetchPromises.push(
          tmdbDiscoverTv(apiKey, { withOriginalLanguage: originConfig.lang, voteCountGte: 20, voteAvgGte: 6.5, sortBy: 'popularity.desc' }).then(res => {
            (res.results || []).slice(0, 15).forEach(r => addCandidate(r, { discoverySource: true, fallbackType: 'tv' }));
          })
        );
      }
    }

    // 3. Trending Items
    const trendingType = mode === 'movies' ? 'movie' : (mode === 'tv' ? 'tv' : 'all');
    fetchPromises.push(
      tmdbTrending(apiKey, trendingType, 'week').then(res => {
        (res.results || []).slice(0, 15).forEach(r => addCandidate(r, { isTrending: true }));
      })
    );
  }

  await Promise.allSettled(fetchPromises);

  // Candidate Filtering & Deduplication
  const filteredCandidates = [];
  for (const cand of candidateMap.values()) {
    const id = cand.id;
    const mediaType = cand.media_type || (cand.first_air_date ? 'tv' : 'movie');
    const title = (cand.title || cand.name || cand.original_title || cand.original_name || '').trim();
    const origTitle = (cand.original_title || cand.original_name || '').trim();
    const normTitle = title.toLowerCase();
    const normOrig = origTitle.toLowerCase();

    // Skip already watched
    if (profile.watchedTmdbIds.has(id) || profile.watchedTmdbIds.has(String(id)) || profile.watchedTmdbIds.has(Number(id))) continue;
    if (normTitle && profile.watchedTitles.has(normTitle)) continue;
    if (normOrig && profile.watchedTitles.has(normOrig)) continue;

    // Filter by mode
    if (mode === 'movies' && mediaType !== 'movie') continue;
    if (mode === 'tv' && mediaType !== 'tv') continue;

    // Filter by origin / language
    if (originConfig && originConfig.id) {
      const candLang = (cand.original_language || '').toLowerCase();
      const candCountries = (cand.origin_country || []).map(c => c.toUpperCase());
      const matchLang = originConfig.extraLangs && originConfig.extraLangs.includes(candLang);
      const matchCountry = originConfig.countries && originConfig.countries.some(c => candCountries.includes(c));
      if (!matchLang && !matchCountry) continue;
    }

    // Filter by genre
    if (filterGenre) {
      const targetGId = GENRE_MAP_CZ_TO_TMDB[filterGenre.toLowerCase()];
      const candGIds = cand.genre_ids || [];
      const czGenres = candGIds.map(gid => GENRE_MAP_TMDB_TO_CZ[gid]).filter(Boolean);
      const matchesId = targetGId && candGIds.includes(targetGId);
      const matchesName = czGenres.some(g => g.toLowerCase() === filterGenre.toLowerCase());
      if (!matchesId && !matchesName) continue;
    }

    if (!title || !cand.poster_path) continue;
    filteredCandidates.push(cand);
  }

  // Multi-factor Hybrid Scoring
  const scoredRecs = filteredCandidates.map(cand => {
    const id = cand.id;
    const mediaType = cand.media_type || (cand.first_air_date ? 'tv' : 'movie');
    const title = (cand.title || cand.name || cand.original_title || cand.original_name || '').trim();
    const origTitle = (cand.original_title || cand.original_name || '').trim();
    const normTitle = title.toLowerCase();

    // 1. Graph Score (S_graph)
    let sGraph = 0;
    if (cand.seedSources && cand.seedSources.length > 0) {
      let rawGraph = 0;
      for (const s of cand.seedSources) {
        const ratingWeight = (s.seedRating || 8) / 10;
        const rankDecay = 1 / (1 + (s.rank - 1) * 0.12);
        rawGraph += ratingWeight * rankDecay;
      }
      sGraph = Math.min(1, rawGraph / 1.6);
    }

    // 2. Genre Overlap Score (S_genre)
    const candGenreIds = cand.genre_ids || [];
    const czGenres = candGenreIds.map(gid => GENRE_MAP_TMDB_TO_CZ[gid]).filter(Boolean);
    let rawGenreScore = 0;
    for (const g of czGenres) {
      const score = profile.genreScores[g] || 0;
      rawGenreScore += score;
    }
    const sGenre = Math.min(1, Math.max(0.15, (rawGenreScore + 2) / 16));

    // 3. Quality Score (S_quality)
    const voteAvg = cand.vote_average || 0;
    const voteCount = cand.vote_count || 0;
    const voteScore = voteAvg / 10;
    const countConfidence = Math.min(1, Math.log10(voteCount + 1) / 3.2);
    const sQuality = Math.min(1, Math.max(0, voteScore * 0.65 + countConfidence * 0.35));

    // Composite Final Score
    let finalScore;
    if (cand.seedSources && cand.seedSources.length > 0) {
      finalScore = (0.40 * sGraph) + (0.35 * sGenre) + (0.25 * sQuality);
    } else if (discovery === 'hidden_gems') {
      finalScore = (0.15 * sGraph) + (0.45 * sGenre) + (0.40 * sQuality);
    } else {
      finalScore = (0.10 * sGraph) + (0.50 * sGenre) + (0.40 * sQuality);
    }

    // Discovery mode adjustments
    if (discovery === 'hidden_gems' && voteAvg >= 7.3 && voteCount >= 100 && voteCount <= 2500) {
      finalScore += 0.08;
    }
    if (discovery === 'popular' && voteCount >= 1500) {
      finalScore += 0.06;
    }

    finalScore = Math.min(0.99, Math.max(0.05, finalScore));
    const matchPercent = Math.min(99, Math.max(60, Math.round(58 + finalScore * 41)));

    // Dynamic Czech explanation
    const reasonParts = [];
    if (cand.seedSources && cand.seedSources.length > 0) {
      const uniqueSeedTitles = [...new Set(cand.seedSources.map(s => s.seedTitle))].slice(0, 2);
      reasonParts.push(`Podobné vašim oblíbeným: **${uniqueSeedTitles.join('** a **')}**`);
    }

    const matchedFavGenres = czGenres.filter(g => (profile.genreScores[g] || 0) > 0).slice(0, 2);
    if (matchedFavGenres.length > 0) {
      reasonParts.push(`Oblíbený žánr: **${matchedFavGenres.join(', ')}**`);
    }

    if (voteAvg >= 7.8) {
      reasonParts.push(`Skvělé TMDB hodnocení (⭐ ${voteAvg.toFixed(1)})`);
    } else if (cand.isTrending) {
      reasonParts.push(`🔥 Aktuální trend na TMDB`);
    }

    const reason = reasonParts.length > 0
      ? `💡 **Proč doporučujeme:** ${reasonParts.join(' • ')}`
      : `💡 **Proč doporučujeme:** Vybráno na základě vašeho celkového filmového a seriálového vkusu.`;

    const inWatchlist = profile.watchlistTmdbIds.has(id) ||
                        profile.watchlistTmdbIds.has(String(id)) ||
                        profile.watchlistTitles.has(normTitle);

    const origLang = (cand.original_language || '').toLowerCase();
    const langBadge = LANG_BADGE_MAP[origLang] || (origLang ? origLang.toUpperCase() : '');

    return {
      id,
      title,
      original_title: origTitle,
      year: (cand.release_date || cand.first_air_date || '').split('-')[0] || '',
      media_type: mediaType,
      genres: czGenres.join(', ') || 'Film / Seriál',
      poster: cand.poster_path ? `${IMG_BASE}${cand.poster_path}` : '',
      overview: cand.overview || 'Popis v českém jazyce zatím není k dispozici.',
      tmdb_rating: voteAvg ? voteAvg.toFixed(1) : '',
      vote_count: voteCount,
      origLang,
      langBadge,
      matchPercent,
      finalScore,
      reason,
      inWatchlist
    };
  });

  scoredRecs.sort((a, b) => b.finalScore - a.finalScore);

  // Sync to Supabase in background
  syncRecommendationsToSupabase(profile, scoredRecs);

  return { recommendations: scoredRecs, profile };
}

  scoredRecs.sort((a, b) => b.finalScore - a.finalScore);

  // Sync to Supabase in background
  syncRecommendationsToSupabase(profile, scoredRecs);

  return { recommendations: scoredRecs, profile };
}

// ─── MOVIE RECOMMENDER VIEW ───

class MovieRecommenderView extends ItemView {
  constructor(leaf, plugin) {
    super(leaf);
    this.plugin = plugin;
    this.currentMode = 'all';
    this.currentDiscovery = 'balanced';
    this.currentSeedTmdbId = null;
    this.currentGenre = '';
    this.currentOrigin = '';
    this.profile = null;
    this.recommendations = [];
    this.isLoading = false;
  }

  getViewType() { return VIEW_TYPE_RECOMMENDER; }
  getDisplayText() { return 'Doporučení filmů & seriálů'; }
  getIcon() { return 'sparkles'; }

  async onOpen() {
    this.render();
    await this.loadRecommendations();
  }

  render() {
    const container = this.containerEl;
    container.empty();
    container.style.cssText = 'padding:24px 20px;overflow-y:auto;height:100%;box-sizing:border-box;display:flex;flex-direction:column;gap:20px;';

    // Hero Header
    const header = container.createDiv({ cls: 'rec-header' });
    header.style.cssText = 'display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:16px;border-bottom:1px solid var(--background-modifier-border);padding-bottom:16px;';

    const titleGroup = header.createDiv();
    const h1 = titleGroup.createEl('h1', { text: '✨ DOPORUČENÍ FILMŮ & SERIÁLŮ' });
    h1.style.cssText = 'margin:0 0 6px 0;font-size:1.6em;font-weight:800;letter-spacing:-0.5px;color:var(--text-normal);display:flex;align-items:center;gap:8px;';

    const desc = titleGroup.createEl('p', { text: 'Hybridní doporučovací systém analyzující váš vkus, hodnocení a TMDB graf pro objevování nových děl.' });
    desc.style.cssText = 'margin:0;font-size:0.9em;color:var(--text-muted);max-width:700px;line-height:1.4;';

    // Taste Profile Bento Card
    this.profileContainer = container.createDiv({ cls: 'rec-profile-card' });
    this.profileContainer.style.cssText = 'border-radius:14px;background:var(--background-secondary);border:1px solid var(--background-modifier-border);padding:18px 20px;display:flex;flex-direction:column;gap:14px;';
    this.renderProfilePlaceholder();

    // Controls Bento Card
    this.controlsContainer = container.createDiv({ cls: 'rec-controls-card' });
    this.controlsContainer.style.cssText = 'border-radius:14px;background:var(--background-secondary);border:1px solid var(--background-modifier-border);padding:16px 20px;display:flex;flex-direction:column;gap:14px;';
    this.renderControls();

    // Recommendations Grid Section
    this.gridContainer = container.createDiv({ cls: 'rec-grid-section' });
    this.gridContainer.style.cssText = 'display:flex;flex-direction:column;gap:14px;';
  }

  renderProfilePlaceholder() {
    this.profileContainer.empty();
    this.profileContainer.createEl('div', {
      text: '⏳ Načítám váš profil vkusu...',
      style: 'color:var(--text-muted);font-size:0.9em;text-align:center;padding:12px;'
    });
  }

  renderProfileCard(profile) {
    this.profileContainer.empty();

    const topRow = this.profileContainer.createDiv();
    topRow.style.cssText = 'display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px;';

    const titleDiv = topRow.createDiv();
    titleDiv.style.cssText = 'font-weight:700;font-size:1.05em;color:var(--text-normal);display:flex;align-items:center;gap:8px;';
    titleDiv.createEl('span', { text: '🎯' });
    titleDiv.createEl('span', { text: 'Váš osobní profil vkusu' });

    // Bento stat chips
    const statsRow = this.profileContainer.createDiv();
    statsRow.style.cssText = 'display:grid;grid-template-columns:repeat(auto-fit, minmax(130px, 1fr));gap:10px;';

    const createStatChip = (icon, label, value, color) => {
      const chip = statsRow.createDiv();
      chip.style.cssText = 'padding:10px 14px;border-radius:10px;background:var(--background-primary);border:1px solid var(--background-modifier-border);display:flex;flex-direction:column;gap:2px;';
      const labelRow = chip.createDiv();
      labelRow.style.cssText = 'font-size:0.75em;color:var(--text-muted);display:flex;align-items:center;gap:6px;';
      labelRow.createEl('span', { text: icon });
      labelRow.createEl('span', { text: label });
      const valEl = chip.createDiv({ text: `${value}` });
      valEl.style.cssText = `font-size:1.25em;font-weight:800;color:${color || 'var(--text-normal)'};margin-top:2px;`;
    };

    createStatChip('🎬', 'Filmy', profile.totalMovies, 'var(--text-normal)');
    createStatChip('📺', 'Seriály', profile.totalSeries, 'var(--text-normal)');
    createStatChip('⭐', 'Průměrné hodnocení', `${profile.avgRating}/10`, '#f5c842');
    createStatChip('📋', 'Ve Watchlistu', profile.totalWatchlist, '#4fc3f7');

    // Genre and Director Chips Row
    if (profile.topGenres && profile.topGenres.length > 0) {
      const genreRow = this.profileContainer.createDiv();
      genreRow.style.cssText = 'display:flex;align-items:center;gap:8px;flex-wrap:wrap;font-size:0.82em;padding-top:4px;';
      genreRow.createEl('span', { text: '🎭 Top žánry:', style: 'color:var(--text-muted);font-weight:600;' });

      profile.topGenres.slice(0, 6).forEach(g => {
        const pill = genreRow.createDiv();
        pill.style.cssText = 'padding:3px 10px;border-radius:20px;background:color-mix(in srgb, var(--interactive-accent) 15%, transparent);color:var(--text-normal);border:1px solid color-mix(in srgb, var(--interactive-accent) 25%, transparent);font-size:0.85em;font-weight:500;display:flex;align-items:center;gap:4px;';
        pill.createEl('span', { text: `${g.genre}` });
        pill.createEl('span', { text: `+${Math.round(g.score)}b`, style: 'font-size:0.75em;color:var(--text-muted);' });
      });
    }

    if (profile.topDirectors && profile.topDirectors.length > 0) {
      const dirRow = this.profileContainer.createDiv();
      dirRow.style.cssText = 'display:flex;align-items:center;gap:8px;flex-wrap:wrap;font-size:0.82em;';
      dirRow.createEl('span', { text: '🎬 Oblíbení tvůrci:', style: 'color:var(--text-muted);font-weight:600;' });

      profile.topDirectors.slice(0, 4).forEach(d => {
        const pill = dirRow.createDiv();
        pill.style.cssText = 'padding:3px 10px;border-radius:20px;background:var(--background-primary);color:var(--text-normal);border:1px solid var(--background-modifier-border);font-size:0.85em;font-weight:500;';
        pill.textContent = `${d.director}`;
      });
    }
  }

  renderControls() {
    this.controlsContainer.empty();

    const topFilterRow = this.controlsContainer.createDiv();
    topFilterRow.style.cssText = 'display:flex;gap:12px;align-items:center;flex-wrap:wrap;justify-content:space-between;';

    // Left controls
    const leftControls = topFilterRow.createDiv();
    leftControls.style.cssText = 'display:flex;gap:10px;align-items:center;flex-wrap:wrap;';

    const styleSelect = (el) => {
      el.style.cssText = 'padding:8px 12px;border-radius:8px;border:1px solid var(--background-modifier-border);background:var(--background-primary);color:var(--text-normal);font-size:0.85em;cursor:pointer;';
    };

    // 1. Media Type Selector
    const modeSelect = leftControls.createEl('select');
    styleSelect(modeSelect);
    modeSelect.createEl('option', { value: 'all', text: '✨ Vše (Filmy & Seriály)' });
    modeSelect.createEl('option', { value: 'movies', text: '🎬 Pouze Filmy' });
    modeSelect.createEl('option', { value: 'tv', text: '📺 Pouze Seriály' });
    modeSelect.value = this.currentMode;
    modeSelect.addEventListener('change', () => {
      this.currentMode = modeSelect.value;
      this.loadRecommendations();
    });

    // 2. Discovery Mode Selector
    const discSelect = leftControls.createEl('select');
    styleSelect(discSelect);
    discSelect.createEl('option', { value: 'balanced', text: '✨ Vyvážený hybrid' });
    discSelect.createEl('option', { value: 'popular', text: '🏆 Sázky na jistotu (Blockbustery)' });
    discSelect.createEl('option', { value: 'hidden_gems', text: '💎 Skryté klenoty (Hidden Gems)' });
    discSelect.value = this.currentDiscovery;
    discSelect.addEventListener('change', () => {
      this.currentDiscovery = discSelect.value;
      this.loadRecommendations();
    });

    // 3. Seed Selector
    this.seedSelect = leftControls.createEl('select');
    styleSelect(this.seedSelect);
    this.updateSeedOptions();
    this.seedSelect.addEventListener('change', () => {
      this.currentSeedTmdbId = this.seedSelect.value ? Number(this.seedSelect.value) : null;
      this.loadRecommendations();
    });

    // 4. Genre Mood Selector
    this.genreSelect = leftControls.createEl('select');
    styleSelect(this.genreSelect);
    this.updateGenreOptions();
    this.genreSelect.addEventListener('change', () => {
      this.currentGenre = this.genreSelect.value;
      this.loadRecommendations();
    });

    // 5. Country / Language Selector
    this.originSelect = leftControls.createEl('select');
    styleSelect(this.originSelect);
    ORIGIN_FILTER_OPTIONS.forEach(opt => {
      this.originSelect.createEl('option', { value: opt.id, text: opt.label });
    });
    this.originSelect.value = this.currentOrigin;
    this.originSelect.addEventListener('change', () => {
      this.currentOrigin = this.originSelect.value;
      this.loadRecommendations();
    });

    // Action button
    const generateBtn = topFilterRow.createEl('button', { cls: 'mod-cta' });
    generateBtn.style.cssText = 'padding:8px 20px;border-radius:8px;font-weight:700;font-size:0.9em;cursor:pointer;display:flex;align-items:center;gap:6px;';
    generateBtn.textContent = this.isLoading ? '⏳ Načítám...' : '✨ Vygenerovat';
    generateBtn.disabled = this.isLoading;
    generateBtn.addEventListener('click', () => this.loadRecommendations());
  }

  updateSeedOptions() {
    if (!this.seedSelect) return;
    this.seedSelect.empty();
    this.seedSelect.createEl('option', { value: '', text: '🌱 Podle celého mého profilu' });
    if (this.profile && this.profile.seeds) {
      this.profile.seeds.slice(0, 15).forEach(s => {
        const ratingStr = s.my_rating ? `★${s.my_rating}` : (s.tmdb_rating ? `⭐${s.tmdb_rating}` : '');
        this.seedSelect.createEl('option', {
          value: s.tmdb_id.toString(),
          text: `🎯 Podobné jako: ${s.title} ${ratingStr ? `(${ratingStr})` : ''}`
        });
      });
    }
    if (this.currentSeedTmdbId) {
      this.seedSelect.value = this.currentSeedTmdbId.toString();
    }
  }

  updateGenreOptions() {
    if (!this.genreSelect) return;
    this.genreSelect.empty();
    this.genreSelect.createEl('option', { value: '', text: '🎭 Žánr podle nálady: Vše' });

    const addedGenres = new Set();
    if (this.profile && this.profile.topGenres) {
      this.profile.topGenres.forEach(g => {
        if (!addedGenres.has(g.genre)) {
          addedGenres.add(g.genre);
          this.genreSelect.createEl('option', { value: g.genre, text: `🎭 ${g.genre}` });
        }
      });
    }

    Object.values(GENRE_MAP_TMDB_TO_CZ).forEach(gName => {
      if (!addedGenres.has(gName)) {
        addedGenres.add(gName);
        this.genreSelect.createEl('option', { value: gName, text: `🎭 ${gName}` });
      }
    });

    if (this.currentGenre) {
      this.genreSelect.value = this.currentGenre;
    }
  }

  async loadRecommendations() {
    const apiKey = this.plugin.settings.apiKey;
    this.isLoading = true;
    this.renderControls();

    this.gridContainer.empty();
    const loadingCard = this.gridContainer.createDiv();
    loadingCard.style.cssText = 'border-radius:14px;background:var(--background-secondary);border:1px solid var(--background-modifier-border);padding:40px 20px;text-align:center;display:flex;flex-direction:column;align-items:center;gap:12px;';
    loadingCard.createEl('div', { text: '✨', style: 'font-size:2.5em;' });
    loadingCard.createEl('strong', { text: 'Analyzuji váš vkus a hledám doporučení...', style: 'font-size:1.1em;' });
    loadingCard.createEl('span', { text: 'Procházím TMDB graf, podobná díla a hodnotící váhy vašich poznámek.', style: 'color:var(--text-muted);font-size:0.85em;' });

    if (!apiKey) {
      loadingCard.empty();
      loadingCard.createEl('div', { text: '⚠️', style: 'font-size:2.5em;' });
      loadingCard.createEl('strong', { text: 'TMDB API klíč není nastaven' });
      loadingCard.createEl('p', { text: 'Pro generování doporučení zadejte svůj bezplatný TMDB API klíč v nastavení pluginu (Filmová databáze).', style: 'color:var(--text-muted);font-size:0.9em;' });
      this.isLoading = false;
      this.renderControls();
      return;
    }

    try {
      const result = await generateHybridRecommendations(apiKey, this.app, {
        mode: this.currentMode,
        discovery: this.currentDiscovery,
        seedTmdbId: this.currentSeedTmdbId,
        filterGenre: this.currentGenre,
        filterOrigin: this.currentOrigin
      });

      this.profile = result.profile;
      this.recommendations = result.recommendations;
      this.renderProfileCard(this.profile);
      this.updateSeedOptions();
      this.updateGenreOptions();
      this.renderRecommendationsGrid();
    } catch (e) {
      this.gridContainer.empty();
      const errCard = this.gridContainer.createDiv();
      errCard.style.cssText = 'border-radius:14px;background:var(--background-secondary);border:1px solid var(--background-modifier-border);padding:30px 20px;text-align:center;';
      errCard.createEl('p', { text: `Chyba při generování doporučení: ${e.message}`, style: 'color:var(--text-error);font-weight:600;' });
    } finally {
      this.isLoading = false;
      this.renderControls();
    }
  }

  renderRecommendationsGrid() {
    this.gridContainer.empty();

    const headerRow = this.gridContainer.createDiv();
    headerRow.style.cssText = 'display:flex;justify-content:space-between;align-items:center;margin-top:6px;';
    headerRow.createEl('span', {
      text: `Nalezeno ${this.recommendations.length} doporučení`,
      style: 'font-weight:600;font-size:0.95em;color:var(--text-muted);'
    });

    if (this.recommendations.length === 0) {
      const emptyCard = this.gridContainer.createDiv();
      emptyCard.style.cssText = 'border-radius:14px;background:var(--background-secondary);border:1px solid var(--background-modifier-border);padding:40px 20px;text-align:center;';
      emptyCard.createEl('p', { text: 'Žádná nová doporučení nebyla nalezena pro aktuální filtry.', style: 'font-size:1.05em;' });
      emptyCard.createEl('p', { text: 'Zkuste přepnout režim objevování nebo zrušit žánrový filtr.', style: 'color:var(--text-muted);font-size:0.85em;margin-top:4px;' });
      return;
    }

    const grid = this.gridContainer.createDiv();
    grid.style.cssText = 'display:grid;grid-template-columns:repeat(auto-fill, minmax(340px, 1fr));gap:16px;';

    this.recommendations.forEach(r => {
      const card = grid.createDiv({ cls: 'rec-card' });
      card.style.cssText = 'border-radius:14px;background:var(--background-secondary);border:1px solid var(--background-modifier-border);padding:14px;display:flex;flex-direction:column;gap:12px;transition:border-color 0.15s, box-shadow 0.15s;';
      card.addEventListener('mouseenter', () => {
        card.style.borderColor = 'var(--interactive-accent)';
        card.style.boxShadow = '0 6px 16px rgba(0,0,0,0.2)';
      });
      card.addEventListener('mouseleave', () => {
        card.style.borderColor = 'var(--background-modifier-border)';
        card.style.boxShadow = 'none';
      });

      // Top Section: Poster + Info
      const topSection = card.createDiv();
      topSection.style.cssText = 'display:flex;gap:12px;align-items:flex-start;';

      // Poster
      if (r.poster) {
        const img = topSection.createEl('img');
        img.src = r.poster;
        img.style.cssText = 'width:95px;height:142px;border-radius:8px;object-fit:cover;flex-shrink:0;box-shadow:0 3px 8px rgba(0,0,0,0.3);';
        img.onerror = () => { img.style.display = 'none'; };
      } else {
        const placeholder = topSection.createDiv();
        placeholder.style.cssText = 'width:95px;height:142px;border-radius:8px;background:var(--background-primary);display:flex;align-items:center;justify-content:center;font-size:2em;flex-shrink:0;';
        placeholder.textContent = r.media_type === 'tv' ? '📺' : '🎬';
      }

      // Info column
      const info = topSection.createDiv();
      info.style.cssText = 'flex:1;min-width:0;display:flex;flex-direction:column;gap:5px;';

      // Badges row
      const badgeRow = info.createDiv();
      badgeRow.style.cssText = 'display:flex;gap:5px;align-items:center;flex-wrap:wrap;';

      // Match % badge
      const matchBadge = badgeRow.createEl('span', { text: `🎯 ${r.matchPercent}% Shoda` });
      matchBadge.style.cssText = 'font-size:0.7em;font-weight:700;padding:2px 7px;border-radius:6px;background:linear-gradient(135deg, rgba(196,154,90,0.25), rgba(245,200,66,0.2));color:var(--text-accent, #f5c842);border:1px solid rgba(245,200,66,0.3);white-space:nowrap;';

      // Media Type badge
      const typeBadge = badgeRow.createEl('span', { text: r.media_type === 'tv' ? '📺 Seriál' : '🎬 Film' });
      typeBadge.style.cssText = 'font-size:0.7em;padding:2px 6px;border-radius:6px;background:var(--background-primary);color:var(--text-muted);border:1px solid var(--background-modifier-border);white-space:nowrap;';

      // TMDB Rating badge
      if (r.tmdb_rating) {
        const tmdbBadge = badgeRow.createEl('span', { text: `⭐ ${r.tmdb_rating}` });
        tmdbBadge.style.cssText = 'font-size:0.7em;font-weight:600;padding:2px 6px;border-radius:6px;background:var(--background-primary);color:var(--text-normal);border:1px solid var(--background-modifier-border);white-space:nowrap;';
      }

      // Watchlist status badge
      if (r.inWatchlist) {
        const wlBadge = badgeRow.createEl('span', { text: '📋 Watchlist' });
        wlBadge.style.cssText = 'font-size:0.7em;font-weight:600;padding:2px 6px;border-radius:6px;background:rgba(79,195,247,0.15);color:#4fc3f7;border:1px solid rgba(79,195,247,0.3);white-space:nowrap;';
      }

      // Title & Year
      const titleEl = info.createEl('h3', { text: r.title });
      titleEl.style.cssText = 'margin:2px 0 0 0;font-size:1em;font-weight:700;line-height:1.3;color:var(--text-normal);display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;';

      if (r.year) {
        const yearEl = info.createEl('span', { text: `Rok: ${r.year}` });
        yearEl.style.cssText = 'font-size:0.75em;color:var(--text-muted);';
      }

      if (r.genres) {
        const genreEl = info.createEl('span', { text: `🎭 ${r.genres}` });
        genreEl.style.cssText = 'font-size:0.75em;color:var(--text-muted);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;';
      }

      // Reason Box (Dynamic Czech explanation)
      const reasonBox = card.createDiv();
      reasonBox.style.cssText = 'padding:8px 10px;border-radius:8px;background:color-mix(in srgb, var(--interactive-accent) 10%, var(--background-primary));border:1px solid color-mix(in srgb, var(--interactive-accent) 20%, transparent);font-size:0.78em;color:var(--text-normal);line-height:1.45;';
      reasonBox.innerHTML = r.reason.replace(/\*\*(.*?)\*\*/g, '<strong style="color:var(--text-accent, #f5c842);">$1</strong>');

      // Overview / Synopsis
      if (r.overview) {
        const overviewEl = card.createDiv();
        overviewEl.style.cssText = 'font-size:0.8em;color:var(--text-muted);line-height:1.45;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden;text-overflow:ellipsis;';
        overviewEl.textContent = r.overview;
      }

      // Action Buttons Bar
      const actionsRow = card.createDiv();
      actionsRow.style.cssText = 'display:flex;gap:6px;align-items:center;flex-wrap:wrap;margin-top:auto;padding-top:8px;border-top:1px solid var(--background-modifier-border);';

      const buttonStyle = (btn, isPrimary = false) => {
        btn.style.cssText = `padding:5px 10px;border-radius:6px;font-size:0.75em;font-weight:600;cursor:pointer;display:inline-flex;align-items:center;gap:4px;transition:all 0.15s;${
          isPrimary
            ? 'background:var(--interactive-accent);color:var(--text-on-accent);border:none;'
            : 'background:var(--background-primary);color:var(--text-normal);border:1px solid var(--background-modifier-border);'
        }`;
      };

      // Watchlist Button
      const wlBtn = actionsRow.createEl('button');
      if (r.inWatchlist) {
        buttonStyle(wlBtn, false);
        wlBtn.textContent = '✅ Ve Watchlistu';
        wlBtn.disabled = true;
        wlBtn.style.opacity = '0.6';
      } else {
        buttonStyle(wlBtn, false);
        wlBtn.textContent = '➕ Watchlist';
        wlBtn.addEventListener('click', async () => {
          wlBtn.disabled = true;
          wlBtn.textContent = '⏳ Ukládám...';
          try {
            await createWatchlistNote(this.app, {
              title: r.title,
              year: r.year,
              media_type: r.media_type,
              tmdb_id: r.id,
              poster: r.poster
            });
            r.inWatchlist = true;
            wlBtn.textContent = '✅ Ve Watchlistu';
            wlBtn.style.opacity = '0.7';
          } catch (e) {
            new Notice(`Chyba: ${e.message}`);
            wlBtn.disabled = false;
            wlBtn.textContent = '➕ Watchlist';
          }
        });
      }

      // Add to DB Button
      const dbBtn = actionsRow.createEl('button');
      buttonStyle(dbBtn, false);
      dbBtn.textContent = '⭐ Přidat do DB';
      dbBtn.addEventListener('click', async () => {
        const apiKey = this.plugin.settings.apiKey;
        if (!apiKey) {
          new Notice('Zadejte TMDB API klíč v nastavení pluginu.');
          return;
        }
        dbBtn.disabled = true;
        dbBtn.textContent = '⏳ Načítám...';
        try {
          let file;
          if (r.media_type === 'tv') {
            const detail = await tmdbSeriesDetails(apiKey, r.id);
            const data = mapTmdbToSeriesNote(detail);
            file = await createSeriesNote(this.app, data);
          } else {
            const detail = await tmdbDetails(apiKey, r.id);
            const data = mapTmdbToNote(detail);
            file = await createMovieNote(this.app, data);
          }
          dbBtn.textContent = '✅ V databázi';
          dbBtn.style.opacity = '0.7';
          if (file instanceof TFile) {
            this.app.workspace.openLinkText(file.path, '');
          }
        } catch (e) {
          new Notice(`Chyba: ${e.message}`);
          dbBtn.disabled = false;
          dbBtn.textContent = '⭐ Přidat do DB';
        }
      });

      // TMDB Link
      const tmdbBtn = actionsRow.createEl('button');
      buttonStyle(tmdbBtn, false);
      tmdbBtn.textContent = '🔗 TMDB';
      tmdbBtn.title = 'Otevřít stránku na TheMovieDB';
      tmdbBtn.addEventListener('click', () => {
        const url = `https://www.themoviedb.org/${r.media_type === 'tv' ? 'tv' : 'movie'}/${r.id}`;
        window.open(url, '_blank');
      });

      // ČSFD Link
      const csfdBtn = actionsRow.createEl('button');
      buttonStyle(csfdBtn, false);
      csfdBtn.textContent = '🎬 ČSFD';
      csfdBtn.title = 'Vyhledat na ČSFD.cz';
      csfdBtn.addEventListener('click', () => {
        const url = `https://www.csfd.cz/hledat/?q=${encodeURIComponent(r.title)}`;
        window.open(url, '_blank');
      });
    });
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
    this.registerView(VIEW_TYPE_RECOMMENDER, (leaf) => new MovieRecommenderView(leaf, this));

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
      id: 'open-recommender',
      name: '✨ Otevřít Doporučení filmů a seriálů (Hybrid Recommender)',
      callback: () => this.activateRecommenderView(),
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
    this.addRibbonIcon('sparkles', '✨ Doporučení filmů a seriálů', () => this.activateRecommenderView());
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

  async activateRecommenderView() {
    const existing = this.app.workspace.getLeavesOfType(VIEW_TYPE_RECOMMENDER);
    if (existing.length > 0) {
      this.app.workspace.revealLeaf(existing[0]);
      return;
    }

    const leaf = this.app.workspace.getLeaf(true);
    if (leaf) {
      await leaf.setViewState({ type: VIEW_TYPE_RECOMMENDER, active: true });
      this.app.workspace.revealLeaf(leaf);
    }
  }
};
