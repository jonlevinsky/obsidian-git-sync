---
project: log
type: project
status: active
cssclasses: homepage-dashboard
---

```dataviewjs
const ACCENT = '#c49a5a';
const container = dv.container;
container.classList.add('homepage-root');
container.style.setProperty('--moc-accent', ACCENT);

const entries = dv.pages('"Život/Log"')
  .where(p => p.tags && p.tags.includes('log'))
  .sort(p => p.created, 'desc');

// ─── HEADER ───
const header = container.createDiv({ cls: 'moc-header' });
const left = header.createDiv({ cls: 'moc-header-left' });
left.createEl('span', { text: '📓', cls: 'moc-header-icon' });
left.createEl('h1', { text: 'DENÍK' });

const meta = header.createDiv({ cls: 'moc-header-meta' });
const makeStat = (icon, val, label) => {
  const el = meta.createDiv({ cls: 'hp-meta-bubble' });
  el.createEl('span', { cls: 'hp-meta-icon', text: icon });
  el.createEl('span', { cls: 'hp-meta-value', text: `${val}` });
  el.createEl('span', { cls: 'hp-meta-label', text: label });
};
makeStat('📝', entries.length, 'zápisů');

const moods = new Set();
entries.values.forEach(e => { if (e.mood) moods.add(e.mood); });
if (moods.size > 0) {
  const moodArr = [...moods].sort();
  let moodStr = moodArr.slice(0, 3).join(', ');
  if (moodArr.length > 3) moodStr += ` +${moodArr.length - 3}`;
  makeStat('😊', moodStr, 'nálady');
}

const devices = new Set();
entries.values.forEach(e => { if (e.device) devices.add(e.device); });
if (devices.size > 0) {
  makeStat('💻', [...devices].join(', '), 'zařízení');
}

// ─── LOAD ALL CONTENT ───
const entryContent = {};
for (const entry of entries) {
  const file = app.vault.getAbstractFileByPath(entry.file.path);
  if (file) {
    entryContent[entry.file.path] = await app.vault.read(file);
  }
}

// ─── SEARCH + CONTROLS ───
const controlsRow = container.createDiv();
controlsRow.style.cssText = 'display:flex;gap:8px;margin-top:8px;padding:0 var(--space-8);flex-wrap:wrap;';

const searchInput = controlsRow.createEl('input', { type: 'text', placeholder: '🔍 Hledej v zápisech...' });
searchInput.style.cssText = 'flex:1;min-width:160px;padding:10px 16px;border-radius:12px;border:1px solid var(--background-modifier-border);background:var(--background-primary);color:var(--text-normal);font-size:0.9em;';

// ─── STATISTICS SECTION ───
const statsCard = container.createDiv();
statsCard.style.cssText = 'margin-top:12px;padding:16px;border-radius:12px;background:var(--surface);border:1px solid var(--border);';

const statsTitle = statsCard.createEl('h2', { text: '📊 Statistiky' });
statsTitle.style.cssText = 'margin:0 0 12px 0;font-size:1em;color:var(--bronze);';

const statsGrid = statsCard.createDiv();
statsGrid.style.cssText = 'display:grid;grid-template-columns:1fr 1fr;gap:16px;';

// Month histogram
function renderMonthChart(parent) {
  const monthCounts = {};
  for (const entry of entries) {
    const created = entry.created;
    let dateStr = '';
    if (created) {
      if (typeof created === 'object' && created.toISODate) dateStr = created.toISODate();
      else if (typeof created === 'object' && created.toISOString) dateStr = created.toISOString().substring(0, 10);
      else dateStr = String(created).substring(0, 10);
    }
    const monthKey = dateStr ? dateStr.substring(0, 7) : 'unknown';
    monthCounts[monthKey] = (monthCounts[monthKey] || 0) + 1;
  }
  const sorted = Object.entries(monthCounts).sort((a, b) => a[0].localeCompare(b[0]));
  const maxCount = Math.max(...Object.values(monthCounts), 1);

  const chart = parent.createDiv();
  chart.style.cssText = 'display:flex;flex-direction:column;gap:3px;';

  for (const [month, count] of sorted) {
    const [y, m] = month.split('-');
    const pct = (count / maxCount) * 100;
    const row = chart.createDiv();
    row.style.cssText = 'display:flex;align-items:center;gap:6px;';

    const label = row.createEl('span', { text: `${m}/${y.substring(2)}` });
    label.style.cssText = 'font-size:0.6em;color:var(--text-muted);min-width:40px;text-align:right;';

    const barWrap = row.createDiv();
    barWrap.style.cssText = 'flex:1;height:14px;border-radius:4px;background:color-mix(in srgb, var(--moc-accent) 10%,transparent);overflow:hidden;';

    const bar = barWrap.createDiv();
    bar.style.cssText = `height:100%;width:${pct}%;border-radius:4px;background:var(--moc-accent);transition:width 0.3s;`;

    const val = row.createEl('span', { text: String(count) });
    val.style.cssText = 'font-size:0.6em;color:var(--text-muted);min-width:16px;';
  }
}

// Mood distribution
function renderMoodChart(parent) {
  const moodCounts = {};
  const moodMap = { good: '😊', bad: '😞', tired: '😴', happy: '😄', sad: '😢', neutral: '😐', amazing: '🤩', stressed: '😰', energetic: '⚡', calm: '😌', sick: '🤒' };
  for (const entry of entries) {
    if (entry.mood) moodCounts[entry.mood] = (moodCounts[entry.mood] || 0) + 1;
  }
  const sorted = Object.entries(moodCounts).sort((a, b) => b[1] - a[1]);
  const maxCount = Math.max(...Object.values(moodCounts), 1);

  const chart = parent.createDiv();
  chart.style.cssText = 'display:flex;flex-direction:column;gap:3px;';

  for (const [mood, count] of sorted) {
    const pct = (count / maxCount) * 100;
    const icon = moodMap[mood] || '😶';
    const row = chart.createDiv();
    row.style.cssText = 'display:flex;align-items:center;gap:6px;';

    const label = row.createEl('span', { text: `${icon} ${mood}` });
    label.style.cssText = 'font-size:0.6em;color:var(--text-muted);min-width:60px;text-align:right;';

    const barWrap = row.createDiv();
    barWrap.style.cssText = 'flex:1;height:14px;border-radius:4px;background:color-mix(in srgb, #f5c842 10%,transparent);overflow:hidden;';

    const bar = barWrap.createDiv();
    bar.style.cssText = `height:100%;width:${pct}%;border-radius:4px;background:#f5c842;transition:width 0.3s;`;

    const val = row.createEl('span', { text: String(count) });
    val.style.cssText = 'font-size:0.6em;color:var(--text-muted);min-width:16px;';
  }
}

// Device distribution
function renderDeviceChart(parent) {
  const deviceCounts = {};
  for (const entry of entries) {
    const dev = entry.device || 'neznámé';
    deviceCounts[dev] = (deviceCounts[dev] || 0) + 1;
  }
  const sorted = Object.entries(deviceCounts).sort((a, b) => b[1] - a[1]);
  const maxCount = Math.max(...Object.values(deviceCounts), 1);

  const chart = parent.createDiv();
  chart.style.cssText = 'display:flex;flex-direction:column;gap:3px;';

  for (const [dev, count] of sorted) {
    const pct = (count / maxCount) * 100;
    const short = dev.includes('Desktop') ? '💻 Desktop' : dev.includes('Samsung') ? '📱 Phone' : dev.includes('Surface') ? '💻 Surface' : '💻 ' + dev;
    const row = chart.createDiv();
    row.style.cssText = 'display:flex;align-items:center;gap:6px;';

    const label = row.createEl('span', { text: short });
    label.style.cssText = 'font-size:0.6em;color:var(--text-muted);min-width:70px;text-align:right;';

    const barWrap = row.createDiv();
    barWrap.style.cssText = 'flex:1;height:14px;border-radius:4px;background:color-mix(in srgb, var(--moc-accent) 10%,transparent);overflow:hidden;';

    const bar = barWrap.createDiv();
    bar.style.cssText = `height:100%;width:${pct}%;border-radius:4px;background:var(--moc-accent);transition:width 0.3s;`;

    const val = row.createEl('span', { text: String(count) });
    val.style.cssText = 'font-size:0.6em;color:var(--text-muted);min-width:16px;';
  }
}

// First column: month histogram
const col1 = statsGrid.createDiv();
const col1Title = col1.createEl('h3', { text: '📅 Zápisy za měsíc' });
col1Title.style.cssText = 'margin:0 0 8px 0;font-size:0.85em;color:var(--text-muted);';
renderMonthChart(col1);

// Second column: mood + device
const col2 = statsGrid.createDiv();
col2.style.cssText = 'display:flex;flex-direction:column;gap:12px;';
const col2MoodTitle = col2.createEl('h3', { text: '😊 Nálady' });
col2MoodTitle.style.cssText = 'margin:0 0 8px 0;font-size:0.85em;color:var(--text-muted);';
renderMoodChart(col2);
const col2DevTitle = col2.createEl('h3', { text: '💻 Zařízení' });
col2DevTitle.style.cssText = 'margin:12px 0 8px 0;font-size:0.85em;color:var(--text-muted);';
renderDeviceChart(col2);

// ─── TAG CLOUD ───
const tagCard = container.createDiv();
tagCard.style.cssText = 'margin-top:12px;padding:16px;border-radius:12px;background:var(--surface);border:1px solid var(--border);';

const tagTitle = tagCard.createEl('h2', { text: '🏷 Tag cloud' });
tagTitle.style.cssText = 'margin:0 0 10px 0;font-size:1em;color:var(--bronze);';

const tagCloud = tagCard.createDiv();
tagCloud.style.cssText = 'display:flex;flex-wrap:wrap;gap:6px;';

function stripFrontmatter(raw) {
  return raw.replace(/^---[\s\S]*?---\n*/, '').replace(/<div[^>]*>[\s\S]*?<\/div>/g, '').replace(/---/g, '');
}

function getWords(text) {
  const czechStopWords = new Set([
    'a','aby','ale','ano','asi','at','atd','az','bez','by','byl','byla','byli','bylo','byt','ch','chtít','chce',
    'co','cz','další','dále','dnes','do','dobrý','dva','dvacet','dvě','ho','i','já','jak','jako','je','jeho','její',
    'jejich','jen','jenom','jestli','ještě','ji','jí','jich','jim','jiný','jsem','jseš','jsme','jsou','jste','k',
    'kde','který','která','které','kterou','kteří','ku','ma','mají','málo','mám','máme','máš','mé','mezi','mi','mít',
    'mne','mnou','moc','mohl','mohou','moje','moji','mu','musí','můj','může','na','nad','nade','nám','námi','nás',
    'náš','ne','nebo','neco','nedá','nejsou','nemá','nemají','nemám','nemůže','není','než','nic','ní','níž','no',
    'nám','nýbrž','o','od','ode','on','ona','oni','ono','po','pod','podle','pokud','polovina','pořád','potom','potřebovat',
    'pouze','pravé','pro','proč','prostě','první','prý','před','přede','před','přes','při','proto','protože','půl',
    'rovně','s','se','si','sice','skoro','slovo','svoje','své','svůj','svou','t','ta','tady','tak','takhle','také',
    'takový','tam','tamten','te','ted','teď','tento','té','tě','ti','tím','to','tobě','tohle','tom','tomto','tomu',
    'toto','trochu','třeba','tři','tvá','tvůj','ty','u','určitě','už','v','vaše','vaší','ve','velmi','víc','vlastně',
    'vše','všechno','však','vůbec','vy','vám','vámi','vás','váš','z','za','zase','zdá','ze','že','',' ','  ','   ','–','“','„','...','..','.',',','!','?',':',';','\'','"','(',')','[',']','<div','</div>','<br>'
  ]);

  return text.toLowerCase()
    .replace(/[.,!?;:()\[\]{}""„“–—…\/\\#@$%^&*+=<>|~`'']/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 2 && !czechStopWords.has(w) && !/^\d+$/.test(w));
}

const wordCounts = {};
let totalWords = 0;
for (const entry of entries) {
  const raw = entryContent[entry.file.path] || '';
  const body = stripFrontmatter(raw);
  const words = getWords(body);
  for (const w of words) {
    wordCounts[w] = (wordCounts[w] || 0) + 1;
    totalWords++;
  }
}

const sortedWords = Object.entries(wordCounts).sort((a, b) => b[1] - a[1]).slice(0, 60);
const maxFreq = sortedWords.length > 0 ? sortedWords[0][1] : 1;

for (const [word, count] of sortedWords) {
  const ratio = count / maxFreq;
  const size = 0.65 + ratio * 0.6;
  const opacity = 0.5 + ratio * 0.5;
  const tag = tagCloud.createEl('span', { text: word });
  tag.style.cssText = `font-size:${size.toFixed(2)}em;padding:2px 8px;border-radius:6px;background:color-mix(in srgb, var(--moc-accent) ${(ratio * 20 + 5).toFixed(0)}%,transparent);color:var(--moc-accent);cursor:pointer;transition:all 0.15s;opacity:${opacity.toFixed(2)};`;
  tag.title = `${count}x`;
  tag.addEventListener('mouseenter', () => tag.style.background = 'color-mix(in srgb, var(--moc-accent) 30%,transparent)');
  tag.addEventListener('mouseleave', () => tag.style.background = `color-mix(in srgb, var(--moc-accent) ${(ratio * 20 + 5).toFixed(0)}%,transparent)`);
  tag.addEventListener('click', () => {
    searchInput.value = word;
    currentQuery = word;
    renderTimeline();
  });
}

if (sortedWords.length === 0) {
  tagCloud.createEl('span', { text: 'Zatím žádná data.', style: 'font-size:0.8em;color:var(--text-muted);' });
}

// ─── TIMELINE ───
const timeline = container.createDiv();
timeline.style.cssText = 'margin-top:16px;padding:0 var(--space-8);display:flex;flex-direction:column;gap:8px;';

let currentQuery = '';

function matchesSearch(entry) {
  if (!currentQuery) return true;
  const q = currentQuery.toLowerCase().trim();
  if (!q) return true;
  const raw = entryContent[entry.file.path] || '';
  return raw.toLowerCase().includes(q);
}

function renderTimeline() {
  const oldTimeline = container.querySelector('.log-timeline');
  if (oldTimeline) oldTimeline.remove();

  const tl = container.createDiv({ cls: 'log-timeline' });
  tl.style.cssText = 'margin-top:16px;padding:0 var(--space-8);display:flex;flex-direction:column;gap:8px;';

  const filtered = entries.values.filter(e => matchesSearch(e));

  if (filtered.length === 0) {
    const empty = tl.createDiv({ cls: 'moc-card' });
    empty.style.cssText = 'text-align:center;padding:40px 20px;';
    empty.createEl('p', { text: 'Žádný zápis neodpovídá hledání.' });
    return;
  }

  let currentMonth = '';
  for (const entry of filtered) {
    const created = entry.created;
    let dateStr = '';
    if (created) {
      if (typeof created === 'object' && created.toISODate) dateStr = created.toISODate();
      else if (typeof created === 'object' && created.toISOString) dateStr = created.toISOString().substring(0, 10);
      else dateStr = String(created).substring(0, 10);
    }
    const monthKey = dateStr.substring(0, 7);

    if (monthKey !== currentMonth) {
      currentMonth = monthKey;
      const monthHeader = tl.createDiv();
      monthHeader.style.cssText = 'font-size:0.9em;font-weight:700;color:var(--moc-accent);padding:8px 0 4px;border-bottom:1px solid color-mix(in srgb, var(--moc-accent) 20%,transparent);margin-top:4px;';

      const [y, m] = monthKey.split('-');
      const monthNames = ['ledna','února','března','dubna','května','června','července','srpna','září','října','listopadu','prosince'];
      const monthName = monthNames[parseInt(m) - 1] || m;
      monthHeader.textContent = `${monthName} ${y}`;
    }

    const card = tl.createDiv();
    card.style.cssText = 'padding:10px 14px;border-radius:10px;background:var(--surface);border:1px solid var(--border);cursor:pointer;transition:all 0.15s;display:flex;gap:12px;align-items:flex-start;';
    card.addEventListener('mouseenter', () => card.style.background = 'var(--surface-elev)');
    card.addEventListener('mouseleave', () => card.style.background = 'var(--surface)');
    card.addEventListener('click', () => app.workspace.openLinkText(entry.file.path, ''));

    const dateCol = card.createDiv();
    dateCol.style.cssText = 'text-align:center;min-width:44px;flex-shrink:0;';
    const dayNum = dateCol.createEl('div', { text: dateStr ? dateStr.split('-')[2] : '' });
    dayNum.style.cssText = 'font-size:1.1em;font-weight:700;color:var(--moc-accent);line-height:1.2;';
    const dayName = dateCol.createEl('div', { text: entry.file.name ? String(entry.file.name).split('.')[0] : '' });
    dayName.style.cssText = 'font-size:0.55em;color:var(--text-muted);text-transform:uppercase;';

    const contentCol = card.createDiv();
    contentCol.style.cssText = 'flex:1;min-width:0;';

    const titleRow = contentCol.createDiv();
    titleRow.style.cssText = 'display:flex;align-items:center;gap:6px;flex-wrap:wrap;';

    const dateText = titleRow.createEl('span', { text: String(entry.file.name) });
    dateText.style.cssText = 'font-weight:600;font-size:0.85em;';

    if (entry.mood) {
      const moodMap = { good: '😊', bad: '😞', tired: '😴', happy: '😄', sad: '😢', neutral: '😐', amazing: '🤩', stressed: '😰', energetic: '⚡', calm: '😌', sick: '🤒' };
      const moodIcon = moodMap[entry.mood] || '😶';
      const moodBadge = titleRow.createEl('span', { text: `${moodIcon} ${entry.mood}` });
      moodBadge.style.cssText = 'font-size:0.6em;padding:1px 6px;border-radius:4px;background:color-mix(in srgb, var(--moc-accent) 12%,transparent);color:var(--text-muted);';
    }

    if (entry.device) {
      const devBadge = titleRow.createEl('span', { text: `💻 ${entry.device}` });
      devBadge.style.cssText = 'font-size:0.6em;padding:1px 6px;border-radius:4px;background:color-mix(in srgb, var(--moc-accent) 8%,transparent);color:var(--text-muted);';
    }

    const raw = entryContent[entry.file.path] || '';
    const body = stripFrontmatter(raw);
    const snippet = body.substring(0, 200).trim();
    if (snippet) {
      const snippetEl = contentCol.createDiv({ text: snippet + (body.length > 200 ? '…' : '') });
      snippetEl.style.cssText = 'font-size:0.75em;color:var(--text-muted);margin-top:4px;line-height:1.5;overflow:hidden;text-overflow:ellipsis;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;';
    }
  }

  container.insertBefore(tl, container.lastChild);
}

searchInput.addEventListener('input', () => {
  currentQuery = searchInput.value;
  renderTimeline();
});

renderTimeline();
```