---
tags:
  - TZ
  - tz
  - spsst-panska
type: project
project: Technologie zvuku
project_tags: tz
status: archived
description: 8 lekcí — mikrofony, mixáže, reproduktory
cssclasses: homepage-dashboard
---

```dataviewjs
const container = dv.container;
container.classList.add('homepage-root');
container.style.setProperty('--moc-accent', '#6b8cae');

const folder = dv.pages('"Škola/PANSKÁ/Technologie zvuku"').where(p => p.file.name !== 'Technologie zvuku.md').sort(p => p.file.name, 'asc');

const header = container.createDiv({ cls: 'moc-header' });
const left = header.createDiv({ cls: 'moc-header-left' });
left.createEl('span', { text: '🎧', cls: 'moc-header-icon' });
left.createEl('h1', { text: 'TECHNOLOGIE ZVUKU' });
const meta = header.createDiv({ cls: 'moc-header-meta' });
const s = (i, v, l) => { const e = meta.createDiv({ cls: 'hp-meta-bubble' }); e.createEl('span', { cls: 'hp-meta-icon', text: i }); e.createEl('span', { cls: 'hp-meta-value', text: `${v}` }); e.createEl('span', { cls: 'hp-meta-label', text: l }); };
s('📖', folder.length, 'lekcí');
s('🖼️', dv.pages('"Škola/PANSKÁ/Technologie zvuku/Images"').length, 'obrázků');

const grid = container.createDiv({ cls: 'moc-grid' });
for (const p of folder) {
  const card = grid.createDiv({ cls: 'moc-card' });
  const top = card.createDiv({ cls: 'moc-card-top' });
  const title = top.createEl('h2', { cls: 'moc-card-title' });
  const link = title.createEl('a', { text: p.file.name, cls: 'internal-link', href: p.file.path });
  link.setAttribute('data-href', p.file.path);
  const badge = top.createEl('span', { text: 'Lekce', cls: 'moc-card-badge' });
  badge.style.cssText = 'background:color-mix(in srgb, #6b8cae 15%,transparent);color:#6b8cae;border:1px solid color-mix(in srgb, #6b8cae 25%,transparent)';
  card.addEventListener('click', (e) => { if (e.target.closest('a')) return; app.workspace.openLinkText(p.file.path, ''); });
}
```
