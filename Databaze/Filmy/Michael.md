---
cssclasses: homepage-dashboard
type: film
title: Michael
year: 2026
director: 
genre: Hudební, Drama
country: United States of America
length: 128 min
tmdb_rating: 8.7
my_rating: 8
poster: https://image.tmdb.org/t/p/w500/zm0KAbOjlt9eR5y7vDiL2dEOwMl.jpg
tmdb_id: 936075
date_watched: 27.07.2026
watch_status: watched
tags: [film]
notes: 
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
    while (idx + 1 < lines.length && (lines[idx + 1].startsWith(' ') || lines[idx + 1].startsWith('\t'))) {
      lines.splice(idx + 1, 1);
    }
  }

  async function saveContent() {
    const file = app.vault.getAbstractFileByPath(page.file.path);
    if (!file) return;
    const c = await app.vault.read(file);
    const lines = c.split('\n');
    const idx = lines.findIndex(l => l.startsWith(fieldName + ':'));
    if (idx >= 0) {
      flushLines(lines, idx);
      const val = input.value.trim();
      if (val) {
        const v = val.split('\n');
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
    await app.vault.modify(file, lines.join('\n'));
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
```