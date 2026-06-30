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
header.createEl('h1', { text: 'ŠKOLA', cls: 'hp-title' });
const total = dv.pages('"Škola"').length;
header.createEl('span', { text: `${total} souborů`, cls: 'hp-time' });

// ═══════════════════════════════════════════
// PŘEDMĚTY
// ═══════════════════════════════════════════
const grid = container.createDiv({ cls: 'hp-nav-grid' });

const subjects = [
  { name: 'Dějiny filmu', path: 'Škola/PANSKÁ/Dějiny filmu', icon: '🎞️' },
  { name: 'Technologie Obrazu', path: 'Škola/PANSKÁ/Technologie Obrazu', icon: '📷' },
  { name: 'Technologie zvuku', path: 'Škola/PANSKÁ/Technologie zvuku', icon: '🔊' }
];

for (const s of subjects) {
  const count = dv.pages(`"${s.path}"`).length;
  const card = grid.createDiv({ cls: 'hp-card' });
  card.createEl('span', { cls: 'hp-icon', text: s.icon });
  card.createEl('h3', { cls: 'hp-card-title', text: s.name.toUpperCase() });
  card.createEl('p', { cls: 'hp-card-sub', text: `${count} souborů` });
  card.style.cursor = 'pointer';
  card.addEventListener('click', () => {
    app.workspace.openLinkText(s.path, '');
  });
}

// ═══════════════════════════════════════════
// NEDÁVNÉ
// ═══════════════════════════════════════════
const recent = container.createDiv({ cls: 'hp-panel' });
recent.createEl('h2', { text: 'NEDÁVNÉ SOUBORY', cls: 'hp-panel-title' });

const files = dv.pages('"Škola"').sort(f => f.file.mtime, 'desc').limit(6);
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
````