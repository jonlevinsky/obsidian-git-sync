---
cssclasses: homepage-dashboard
---

```dataviewjs
const container = dv.container;
container.classList.add('homepage-root');
container.style.setProperty('--moc-accent', '#6b8cae');

const subjects = dv.pages('"Škola/PANSKÁ"').where(p => p.type === 'project').sort(p => p.project);

let totalLessons = 0;
for (const s of subjects) {
  totalLessons += dv.pages('"' + s.file.folder + '"').where(p => p.file.path !== s.file.path).length;
}

const icons = {
  'Filmové umění': '🎬',
  'Výtvarné umění': '🎨',
  'Technologie obrazu': '📷',
  'Technologie zvuku': '🎧'
};

const header = container.createDiv({ cls: 'moc-header' });
const left = header.createDiv({ cls: 'moc-header-left' });
left.createEl('span', { text: '🏫', cls: 'moc-header-icon' });
left.createEl('h1', { text: 'PANSKÁ' });
const meta = header.createDiv({ cls: 'moc-header-meta' });
const s = (i, v, l) => { const e = meta.createDiv({ cls: 'hp-meta-bubble' }); e.createEl('span', { cls: 'hp-meta-icon', text: i }); e.createEl('span', { cls: 'hp-meta-value', text: `${v}` }); e.createEl('span', { cls: 'hp-meta-label', text: l }); };
s('📚', subjects.length, 'předměty');
s('📖', totalLessons, 'lekcí');
s('🎯', 'Maturita', '2026');

const grid = container.createDiv({ cls: 'moc-grid' });

for (const subj of subjects) {
  const name = subj.project || subj.file.name;
  const folder = subj.file.folder;
  const subjPath = subj.file.path;
  const lessons = dv.pages('"' + folder + '"').where(f => f.file.path !== subjPath).sort(f => f.file.name, 'asc');
  const count = lessons.length;

  const card = grid.createDiv({ cls: 'moc-card' });
  const top = card.createDiv({ cls: 'moc-card-top' });
  const title = top.createEl('h2', { cls: 'moc-card-title' });
  const link = title.createEl('a', { text: `${icons[name] || '📄'} ${name}`, cls: 'internal-link', href: subj.file.path });
  link.setAttribute('data-href', subj.file.path);

  const badge = top.createEl('span', { text: `${count} lekcí`, cls: 'moc-card-badge' });
  badge.style.cssText = 'background:color-mix(in srgb, #6b8cae 15%,transparent);color:#6b8cae;border:1px solid color-mix(in srgb, #6b8cae 25%,transparent)';

  if (subj.description) card.createDiv({ text: subj.description, cls: 'moc-card-desc' });

  card.addEventListener('click', (e) => {
    if (e.target.closest('a')) return;
    card.classList.toggle('expanded');
    const fl = card.querySelector('.moc-card-files');
    if (fl) {
      if (card.classList.contains('expanded')) { fl.style.maxHeight = '400px'; fl.style.opacity = '1'; fl.style.marginTop = 'var(--space-2)'; }
      else { fl.style.maxHeight = '0'; fl.style.opacity = '0'; fl.style.marginTop = '0'; }
    }
  });

  if (count > 0) {
    const filesEl = card.createDiv({ cls: 'moc-card-files' });
    for (const l of lessons) {
      const row = filesEl.createDiv({ cls: 'moc-file-row' });
      const fl = row.createEl('a', { text: l.file.name, href: l.file.path, cls: 'internal-link moc-file-link' });
      fl.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); app.workspace.openLinkText(l.file.path, ''); });
    }
  }
}
```
