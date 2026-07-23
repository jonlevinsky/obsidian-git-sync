---
cssclasses: homepage-dashboard
type: film
title: Odyssea
year: 2026
director: 
genre: Dobrodružný, Akční, Fantasy
country: United Kingdom, United States of America
length: 172 min
tmdb_rating: 7.9
my_rating: 5
poster: https://image.tmdb.org/t/p/w500/zLbUuaoCctimWJ4TUPW2C1yVImc.jpg
tmdb_id: 1368337
date_watched: 23.07.2026
tags: [film]
notes: Kamera nic moc | Zvuk a hudba hodně dobrý
dojmy: 
---

```dataviewjs
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

// Header
const header = container.createDiv({ cls: 'moc-header' });
const left = header.createDiv({ cls: 'moc-header-left' });
left.createEl('span', { text: '🎬', cls: 'moc-header-icon' });
left.createEl('h1', { text: title });

const meta = header.createDiv({ cls: 'moc-header-meta' });
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

// Main grid with poster
const grid = container.createDiv({ cls: 'moc-grid' });
grid.style.gridTemplateColumns = poster ? '220px 1fr' : '1fr';

// Poster
if (poster) {
  const posterCard = grid.createDiv({ cls: 'moc-card' });
  posterCard.style.padding = '0';
  posterCard.style.overflow = 'hidden';
  const img = posterCard.createEl('img');
  img.src = poster;
  img.style.cssText = 'width:100%;height:auto;display:block;border-radius:0;';
}

// Info + Rating combined card
const infoCard = grid.createDiv({ cls: 'moc-card' });
const infoTop = infoCard.createDiv({ cls: 'moc-card-top' });
infoTop.createEl('h2', { text: '📋 Informace', cls: 'moc-card-title' });

const infoTable = infoCard.createDiv();
infoTable.style.cssText = 'display:grid;grid-template-columns:auto 1fr;gap:6px 16px;font-size:0.85em;margin-top:4px;';

function addInfo(label, value, icon) {
  if (!value) return;
  infoTable.createEl('span', { text: icon + ' ' + label, style: 'color:var(--text-muted);font-weight:500;' });
  infoTable.createEl('span', { text: value });
}

addInfo('Režie', director, '🎬');
addInfo('Žánr', genre, '🎭');
addInfo('Země', country, '🌍');
addInfo('Délka', length, '⏱');

// Ratings inline in the info card
const ratingDiv = infoCard.createDiv();
ratingDiv.style.cssText = 'margin-top:10px;padding-top:10px;border-top:1px solid var(--background-modifier-border);display:flex;flex-direction:column;gap:6px;';

function addRating(label, score, icon, color) {
  if (!score && label !== 'Moje') return;
  const row = ratingDiv.createDiv();
  row.style.cssText = 'display:flex;align-items:center;justify-content:space-between;gap:8px;';

  const labelEl = row.createEl('span', { text: icon + ' ' + label });
  labelEl.style.cssText = 'font-size:0.8em;color:var(--text-muted);font-weight:500;';

  const right = row.createDiv();
  right.style.cssText = 'display:flex;align-items:center;gap:6px;';

  if (score) {
    const scoreEl = right.createEl('span', { text: score + '/10', style: 'font-size:0.85em;font-weight:700;' + (color ? 'color:' + color + ';' : '') });
    const starsEl = right.createEl('span', { text: stars(score, color), style: 'font-size:0.85em;letter-spacing:1px;color:' + (color || 'var(--text-muted)') + ';' });
  } else {
    right.createEl('span', { text: '—', style: 'font-size:0.85em;color:var(--text-muted);' });
  }
}

addRating('TMDB', tmdb, '⭐', '#888');
addRating('Moje', myRating || '', '★', STAR_COLOR);

// Description
if (desc) {
  const descCard = container.createDiv({ cls: 'moc-card' });
  const descTop = descCard.createDiv({ cls: 'moc-card-top' });
  descTop.createEl('h2', { text: '📖 Příběh', cls: 'moc-card-title' });
  descCard.createDiv({ text: desc, cls: 'moc-card-desc' });
}

// Notes card - editable
const notesCard = container.createDiv({ cls: 'moc-card' });
const notesTop = notesCard.createDiv({ cls: 'moc-card-top' });
notesTop.createEl('h2', { text: '📝 Poznámky', cls: 'moc-card-title' });
const notesInput = notesCard.createEl('textarea', { placeholder: 'Napiš poznámky k filmu...' });
notesInput.style.cssText = 'width:100%;min-height:60px;padding:8px 10px;border-radius:8px;border:1px solid var(--background-modifier-border);background:var(--background-primary);color:var(--text-normal);font-size:0.8em;resize:vertical;box-sizing:border-box;margin-top:4px;font-family:inherit;line-height:1.5;';
if (notes) notesInput.value = notes;

const notesSave = notesCard.createEl('button', { text: '💾 Uložit' });
notesSave.style.cssText = 'margin-top:6px;padding:5px 14px;border-radius:8px;background:color-mix(in srgb, var(--moc-accent) 15%,transparent);color:var(--moc-accent);border:1px solid color-mix(in srgb, var(--moc-accent) 25%,transparent);font-weight:600;cursor:pointer;font-size:0.75em;align-self:flex-end;';
notesSave.addEventListener('mouseenter', () => notesSave.style.background = 'color-mix(in srgb, var(--moc-accent) 25%,transparent)');
notesSave.addEventListener('mouseleave', () => notesSave.style.background = 'color-mix(in srgb, var(--moc-accent) 15%,transparent)');
notesSave.addEventListener('click', async () => {
  const file = app.vault.getAbstractFileByPath(page.file.path);
  if (!file) return;
  const content = await app.vault.read(file);
  const val = notesInput.value.replace(/"/g, '').split('\n').map(s => s.trim()).filter(Boolean).join(' | ');
  const lines = content.split('\n');
  const idx = lines.findIndex(l => l.startsWith('notes:'));
  if (idx >= 0) lines[idx] = 'notes: ' + val;
  await app.vault.modify(file, lines.join('\n'));
  new Notice('Poznámky uloženy');
});

// Dojmy card - editable
const dojmyCard = container.createDiv({ cls: 'moc-card' });
const dojmyTop = dojmyCard.createDiv({ cls: 'moc-card-top' });
dojmyTop.createEl('h2', { text: '💭 Dojmy', cls: 'moc-card-title' });
const dojmyInput = dojmyCard.createEl('textarea', { placeholder: 'Napiš své dojmy z filmu...' });
dojmyInput.style.cssText = 'width:100%;min-height:60px;padding:8px 10px;border-radius:8px;border:1px solid var(--background-modifier-border);background:var(--background-primary);color:var(--text-normal);font-size:0.8em;resize:vertical;box-sizing:border-box;margin-top:4px;font-family:inherit;line-height:1.5;';
if (dojmy) dojmyInput.value = dojmy;

const dojmySave = dojmyCard.createEl('button', { text: '💾 Uložit' });
dojmySave.style.cssText = 'margin-top:6px;padding:5px 14px;border-radius:8px;background:color-mix(in srgb, var(--moc-accent) 15%,transparent);color:var(--moc-accent);border:1px solid color-mix(in srgb, var(--moc-accent) 25%,transparent);font-weight:600;cursor:pointer;font-size:0.75em;align-self:flex-end;';
dojmySave.addEventListener('mouseenter', () => dojmySave.style.background = 'color-mix(in srgb, var(--moc-accent) 25%,transparent)');
dojmySave.addEventListener('mouseleave', () => dojmySave.style.background = 'color-mix(in srgb, var(--moc-accent) 15%,transparent)');
dojmySave.addEventListener('click', async () => {
  const file = app.vault.getAbstractFileByPath(page.file.path);
  if (!file) return;
  const content = await app.vault.read(file);
  const val = dojmyInput.value.replace(/"/g, '').split('\n').map(s => s.trim()).filter(Boolean).join(' | ');
  const lines = content.split('\n');
  const idx = lines.findIndex(l => l.startsWith('dojmy:'));
  if (idx >= 0) lines[idx] = 'dojmy: ' + val;
  await app.vault.modify(file, lines.join('\n'));
  new Notice('Dojmy uloženy');
});
```