---
cssclasses: homepage-dashboard
---

```dataviewjs
const ACCENT = 'var(--bronze)';
const ICON = '🎬';
const TITLE = 'FILM & FOTO';

const container = dv.container;
container.classList.add('homepage-root');
container.style.setProperty('--moc-accent', ACCENT);

const projects = dv.pages('"Film & Foto"')
  .where(p => p.type === 'project')
  .sort(p => {
    const order = { active: 0, completed: 1, archived: 2 };
    return order[p.status] ?? 3;
  }, 'desc');

const statusConfig = {
  active: { label: 'Aktivní', color: 'var(--bronze)' },
  completed: { label: 'Dokončeno', color: '#5a8c5a' },
  archived: { label: 'Archiv', color: '#555' }
};

const header = container.createDiv({ cls: 'moc-header' });
const left = header.createDiv({ cls: 'moc-header-left' });
left.createEl('span', { text: ICON, cls: 'moc-header-icon' });
left.createEl('h1', { text: TITLE });
const meta = header.createDiv({ cls: 'moc-header-meta' });

const makeStat = (icon, val, label) => {
  const el = meta.createDiv({ cls: 'hp-meta-bubble' });
  el.createEl('span', { cls: 'hp-meta-icon', text: icon });
  el.createEl('span', { cls: 'hp-meta-value', text: `${val}` });
  el.createEl('span', { cls: 'hp-meta-label', text: label });
};
makeStat('📦', projects.length, 'projektů');
makeStat('🟢', projects.where(p => p.status === 'active').length, 'aktivních');
makeStat('✅', projects.where(p => p.status === 'completed').length, 'hotovo');
makeStat('📁', projects.where(p => p.status === 'archived').length, 'archiv');

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

  if (p.description) {
    card.createDiv({ text: p.description, cls: 'moc-card-desc' });
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
```
