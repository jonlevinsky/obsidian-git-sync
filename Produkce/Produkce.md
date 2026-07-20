---
cssclasses: homepage-dashboard
---

```dataviewjs
const container = dv.container;
container.classList.add('homepage-root');

const style = document.createElement('style');
style.textContent = `
.moc-header {
  display: flex; justify-content: space-between; align-items: center;
  padding: var(--space-8) var(--space-8) var(--space-6); flex-wrap: wrap; gap: var(--space-4);
  border-bottom: 1px solid var(--bronze-dim);
}
.moc-header-left { display: flex; align-items: center; gap: var(--space-4); }
.moc-header-icon { font-size: 2rem; line-height: 1; }
.moc-header h1 {
  font-family: "Bricolage Grotesque", "Cormorant Garamond", Georgia, serif;
  font-size: var(--text-xl); color: var(--bronze); font-weight: 600;
  letter-spacing: -0.02em; margin: 0; line-height: 1.2; border: none;
}
.moc-header-meta { display: flex; gap: var(--space-2); flex-wrap: wrap; }

.moc-grid {
  display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: var(--space-4); padding: var(--space-6) var(--space-8);
  animation: hp-fade-up 0.6s 0.1s var(--ease-out) both;
}

.moc-card {
  background: var(--surface); border: 1px solid var(--border);
  border-radius: var(--radius-lg); padding: var(--space-5);
  transition: background var(--duration-fast) var(--ease-out),
              border-color var(--duration-fast) var(--ease-out),
              transform var(--duration-fast) var(--ease-out),
              box-shadow var(--duration-fast) var(--ease-out);
  position: relative; overflow: hidden;
  display: flex; flex-direction: column; gap: var(--space-3);
  cursor: pointer;
}
.moc-card::before {
  content: ''; position: absolute; top: 0; left: 0; right: 0; height: 3px;
  background: #8cae7a; transform: scaleX(0); transform-origin: left;
  transition: transform var(--duration-base) var(--ease-out);
}
.moc-card:hover { background: var(--surface-elev); border-color: var(--border-hover); transform: translateY(-2px); }
.moc-card:hover::before, .moc-card.expanded::before { transform: scaleX(1); }
.moc-card.expanded { background: var(--surface-elev); border-color: var(--border-hover); box-shadow: 0 16px 48px -12px rgba(0,0,0,0.5); }

.moc-card-top { display: flex; justify-content: space-between; align-items: flex-start; gap: var(--space-2); }
.moc-card-title {
  font-family: "Bricolage Grotesque", "Inter", sans-serif;
  font-size: var(--text-base); font-weight: 600; color: var(--text); margin: 0; line-height: 1.3;
}
.moc-card-title a { color: var(--text); text-decoration: none; }
.moc-card-title a:hover { color: #8cae7a; }
.moc-card-badge {
  font-size: 9px; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase;
  padding: 2px 8px; border-radius: var(--radius-sm);
  flex-shrink: 0; line-height: 1.4; white-space: nowrap;
}
.moc-card-desc { font-size: var(--text-xs); color: var(--text-secondary); margin: 0; line-height: 1.5; }
.moc-card-tags { display: flex; flex-wrap: wrap; gap: 4px; }
.moc-card-tag {
  font-size: 9px; padding: 2px 8px; border-radius: 10px;
  background: color-mix(in srgb, #8cae7a 12%, transparent); color: #8cae7a;
  border: 0.5px solid color-mix(in srgb, #8cae7a 20%, transparent);
}

.moc-card-files { max-height: 0; overflow: hidden; opacity: 0; transition: max-height 0.4s var(--ease-out), opacity 0.3s var(--ease-out), margin 0.3s var(--ease-out); margin: 0; }
.moc-card.expanded .moc-card-files { max-height: 400px; opacity: 1; margin-top: var(--space-2); overflow-y: auto; }
.moc-file-row {
  display: flex; align-items: center; gap: var(--space-2);
  padding: var(--space-1) var(--space-2); border-radius: var(--radius-sm);
  transition: background var(--duration-fast) var(--ease-out);
}
.moc-file-row:hover { background: var(--surface-high); }
.moc-file-link {
  font-size: var(--text-xs); color: var(--text-secondary); text-decoration: none;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap; flex: 1; min-width: 0;
}
.moc-file-link:hover { color: #8cae7a; }
.moc-file-tag {
  font-size: 8px; padding: 0 5px; border-radius: 4px; font-weight: 500;
  background: color-mix(in srgb, #8cae7a 12%, transparent); color: #8cae7a;
  border: 0.5px solid color-mix(in srgb, #8cae7a 20%, transparent); white-space: nowrap; line-height: 1.5; opacity: 0.85;
}
`;
document.head.appendChild(style);

const projects = dv.pages('"Produkce"')
  .where(p => p.type === 'project')
  .sort(p => {
    const order = { active: 0, completed: 1, archived: 2 };
    return order[p.status] ?? 3;
  }, 'desc');

const techPage = dv.page('"Produkce/Technika/Technika.md"');
const techFiles = techPage ? dv.pages('"Produkce/Technika"') : dv.empty();

const statusConfig = {
  active: { label: 'Aktivní', color: 'var(--bronze)' },
  archived: { label: 'Archiv', color: '#555' }
};

const header = container.createDiv({ cls: 'moc-header' });
const left = header.createDiv({ cls: 'moc-header-left' });
left.createEl('span', { text: '🎥', cls: 'moc-header-icon' });
left.createEl('h1', { text: 'PRODUKCE' });
const meta = header.createDiv({ cls: 'moc-header-meta' });

const makeStat = (icon, val, label) => {
  const el = meta.createDiv({ cls: 'hp-meta-bubble' });
  el.createEl('span', { cls: 'hp-meta-icon', text: icon });
  el.createEl('span', { cls: 'hp-meta-value', text: `${val}` });
  el.createEl('span', { cls: 'hp-meta-label', text: label });
};
makeStat('🟢', projects.where(p => p.status === 'active').length, 'aktivních');
makeStat('📁', projects.where(p => p.status === 'archived').length, 'archiv');
if (techPage) makeStat('🔧', techFiles.length - 1, 'technika');

const descs = {
  "Dent&Life WEB": "Firemní web pro dentální laboratoř",
  "Portfolio": "Osobní web levinskyj.art",
};

const grid = container.createDiv({ cls: 'moc-grid' });

for (const p of projects) {
  const projName = p.project || p.file.name;
  const st = statusConfig[p.status] || statusConfig.archived;
  const folder = p.file.folder;
  const projectFiles = dv.pages('"' + folder + '"')
    .where(f => f.file.path !== p.file.path)
    .sort(f => f.file.name);

  const projectTags = p.project_tags
    ? (Array.isArray(p.project_tags) ? p.project_tags : [p.project_tags])
    : [];

  const card = grid.createDiv({ cls: 'moc-card' });

  const top = card.createDiv({ cls: 'moc-card-top' });
  const title = top.createEl('h2', { cls: 'moc-card-title' });
  const link = title.createEl('a', { text: projName, cls: 'internal-link', href: p.file.path });
  link.setAttribute('data-href', p.file.path);

  const badge = top.createEl('span', { text: st.label, cls: 'moc-card-badge' });
  badge.style.cssText = `background:color-mix(in srgb, ${st.color} 15%,transparent);color:${st.color};border:1px solid color-mix(in srgb, ${st.color} 25%,transparent)`;

  if (descs[projName]) {
    card.createDiv({ text: descs[projName], cls: 'moc-card-desc' });
  }

  if (projectTags.length > 0) {
    const tagsEl = card.createDiv({ cls: 'moc-card-tags' });
    for (const t of projectTags) {
      tagsEl.createEl('span', { text: `#${t}`, cls: 'moc-card-tag' });
    }
  }

  if (projectFiles.length > 0) {
    card.addEventListener('click', (e) => {
      if (e.target.closest('a')) return;
      card.classList.toggle('expanded');
    });

    const filesEl = card.createDiv({ cls: 'moc-card-files' });
    for (const f of projectFiles) {
      const row = filesEl.createDiv({ cls: 'moc-file-row' });
      const fl = row.createEl('a', { text: f.file.name, href: f.file.path, cls: 'internal-link moc-file-link' });
      fl.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); app.workspace.openLinkText(f.file.path, ''); });

      const fileTags = (f.file.tags || []).map(t => t.replace(/^#/, ''));
      const matching = projectTags.filter(pt => fileTags.includes(pt.toLowerCase()));
      if (matching.length > 0) {
        matching.slice(0, 1).forEach(mt => {
          row.createEl('span', { text: `#${mt}`, cls: 'moc-file-tag' });
        });
      }
    }
  } else {
    card.addEventListener('click', (e) => {
      if (e.target.closest('a')) return;
      app.workspace.openLinkText(p.file.path, p.file.path);
    });
  }
}

// ── TECH CARD ──
if (techPage) {
  const techCard = grid.createDiv({ cls: 'moc-card' });
  techCard.style.setProperty('--space-accent', '#6496c8');

  const top = techCard.createDiv({ cls: 'moc-card-top' });
  const title = top.createEl('h2', { cls: 'moc-card-title' });
  const link = title.createEl('a', { text: '🔧 Technika', cls: 'internal-link', href: techPage.file.path });
  link.setAttribute('data-href', techPage.file.path);
  link.style.color = '#6496c8';

  const count = techFiles.length - 1;
  const badge = top.createEl('span', { text: `${count} položek`, cls: 'moc-card-badge' });
  badge.style.cssText = 'background:color-mix(in srgb, #6496c8 15%,transparent);color:#6496c8;border:1px solid color-mix(in srgb, #6496c8 25%,transparent)';

  techCard.createDiv({ text: 'Přehled vybavení — kamera, optika, světla, grip', cls: 'moc-card-desc' });

  techCard.addEventListener('click', (e) => {
    if (e.target.closest('a')) return;
    techCard.classList.toggle('expanded');
  });

  const filesEl = techCard.createDiv({ cls: 'moc-card-files' });
  for (const f of techFiles) {
    if (f.file.path === techPage.file.path) continue;
    const row = filesEl.createDiv({ cls: 'moc-file-row' });
    const fl = row.createEl('a', { text: f.file.name, href: f.file.path, cls: 'internal-link moc-file-link' });
    fl.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); app.workspace.openLinkText(f.file.path, ''); });
  }
}
```
