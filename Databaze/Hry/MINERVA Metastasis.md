---
cssclasses: homepage-dashboard
type: game
title: MINERVA: Metastasis
platform: PC
genre: Shooter
status: playing
my_rating: 
playtime_hours: 1
release_year: 2005
cover_url: https://media.rawg.io/media/screenshots/b4f/b4fcc9fe6aac972a2361c33b6faf56d1.jpg
date_added: 19.09.2026
tags: [hra]
notes: 
---

```dataviewjs
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

if (year) metaRow.createEl('span', { text: `📅 ${year}` });
if (platform) metaRow.createEl('span', { text: `💻 ${platform}` });
if (playtime) metaRow.createEl('span', { text: `⏳ ${playtime}h` });
metaRow.createEl('span', { text: statusLabel });

if (myRating) {
  const rat = info.createDiv();
  rat.style.cssText = 'font-weight:bold;color:var(--moc-accent);font-size:1.1em;';
  rat.textContent = `★ ${myRating} / 10`;
}

if (genre) {
  const g = info.createDiv();
  g.style.cssText = 'font-size:0.85em;color:var(--text-muted);';
  g.textContent = `🎭 Žánr: ${genre}`;
}

if (notes) {
  const n = info.createDiv();
  n.style.cssText = 'margin-top:8px;padding-top:8px;border-top:1px solid var(--background-modifier-border);font-size:0.9em;';
  n.textContent = notes;
}
```
