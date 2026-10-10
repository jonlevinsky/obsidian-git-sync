---
cssclasses: homepage-dashboard
type: game
title: GTFO
platform: PC
genre: Adventure, Action
status: completed
my_rating: 7
playtime_hours: 
release_year: 2021
cover_url: https://media.rawg.io/media/games/814/8140301ae3791d2cd4303d6c6f485b9a.jpg
date_added: 10.10.2026
tags: [hra]
notes: GTFO is a 4 player action/horror cooperative game for those looking for a real challenge. Players get to play as a team of scavengers, forced to explore and extract valuable artefacts from a vast underground complex that has been overrun by horrifying monsters. Gather weapons, tools and resources to help you survive - and work to unearth the answers about your past and how to escape.KEY FEATURES4 player cooperative PvE gameplay that puts you and your teammates through ultimate co-op test. Toge
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
