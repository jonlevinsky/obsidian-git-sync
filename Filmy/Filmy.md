---
cssclasses: homepage-dashboard
---

```dataviewjs
const container = dv.container;
container.classList.add('overview-root');

// ═══════════════════════════════════════════
// HEADER
// ═══════════════════════════════════════════
const header = container.createDiv({ cls: 'hp-header' });
header.createEl('h1', { text: 'FILMY', cls: 'hp-title' });
const total = dv.pages('"Filmy"').length;
header.createEl('span', { text: `${total} souborů`, cls: 'hp-time' });

// ═══════════════════════════════════════════
// PROJEKTY
// ═══════════════════════════════════════════
const grid = container.createDiv({ cls: 'hp-nav-grid' });

const projects = [
  { name: 'Cordyceps', path: 'Filmy/Cordyceps', icon: '🎬' },
  { name: 'Metro', path: 'Filmy/Metro', icon: '🚇' },
  { name: 'Nový řád', path: 'Filmy/Nový řád', icon: '📜' },
  { name: 'Zub času', path: 'Filmy/Zub času', icon: '⏳' },
  { name: 'Kraťasy', path: 'Filmy/Kraťasy', icon: '🎞️' }
];

for (const p of projects) {
  const count = dv.pages(`"${p.path}"`).length;
  const card = grid.createDiv({ cls: 'hp-card' });
  card.createEl('span', { cls: 'hp-icon', text: p.icon });
  card.createEl('h3', { cls: 'hp-card-title', text: p.name.toUpperCase() });
  card.createEl('p', { cls: 'hp-card-sub', text: `${count} souborů` });
  card.style.cursor = 'pointer';
  card.addEventListener('click', () => {
    app.workspace.openLinkText(p.path, '');
  });
}

// ═══════════════════════════════════════════
// NEDÁVNÉ
// ═══════════════════════════════════════════
const recent = container.createDiv({ cls: 'hp-panel' });
recent.createEl('h2', { text: 'NEDÁVNÉ SOUBORY', cls: 'hp-panel-title' });

const files = dv.pages('"Filmy"').sort(f => f.file.mtime, 'desc').limit(6);
if (files.length > 0) {
  const ul = recent.createEl('ul', { cls: 'hp-list' });
  for (const f of files) {
    const li = ul.createEl('li');
    const link = li.createEl('a', {
      text: f.file.name,
      href: f.file.path,
      cls: 'internal-link hp-link'
    });
    link.addEventListener('click', (e) => {
      e.preventDefault();
      app.workspace.openLinkText(f.file.path, '');
    });
  }
} else {
  recent.createDiv({ cls: 'hp-empty' }).createEl('p', { text: 'Žádné soubory.' });
}