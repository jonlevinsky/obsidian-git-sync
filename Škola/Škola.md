---
cssclasses: homepage-dashboard
---

```dataviewjs
const container = dv.container;
container.classList.add('homepage-root');

const style = document.createElement('style');
style.textContent = `
.skola-section-header {
  display: flex; justify-content: space-between; align-items: center;
  padding: var(--space-8) var(--space-8) var(--space-6); flex-wrap: wrap; gap: var(--space-4);
  border-bottom: 1px solid var(--bronze-dim);
}
.skola-section-header-left { display: flex; align-items: center; gap: var(--space-4); }
.skola-section-header-icon { font-size: 2rem; line-height: 1; }
.skola-section-header h1 {
  font-family: "Bricolage Grotesque", "Cormorant Garamond", Georgia, serif;
  font-size: var(--text-xl); color: var(--bronze); font-weight: 600;
  letter-spacing: -0.02em; margin: 0; line-height: 1.2; border: none;
}
.skola-section-header-meta { display: flex; gap: var(--space-2); flex-wrap: wrap; }

.skola-school-grid {
  display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: var(--space-4); padding: var(--space-6) var(--space-8);
  animation: hp-fade-up 0.6s 0.1s var(--ease-out) both;
}

.skola-school-card {
  background: var(--surface); border: 1px solid var(--border);
  border-radius: var(--radius-lg); padding: var(--space-5);
  cursor: pointer;
  transition: background var(--duration-fast) var(--ease-out),
              border-color var(--duration-fast) var(--ease-out),
              transform var(--duration-fast) var(--ease-out),
              box-shadow var(--duration-fast) var(--ease-out);
  position: relative; overflow: hidden;
}
.skola-school-card::before {
  content: ''; position: absolute; top: 0; left: 0; right: 0; height: 3px;
  background: var(--school-accent, var(--bronze));
  transition: transform var(--duration-base) var(--ease-out);
}
.skola-school-card:hover { background: var(--surface-elev); border-color: var(--border-hover); transform: translateY(-2px); box-shadow: 0 12px 32px -8px rgba(0,0,0,0.3); }
.skola-school-card-top { display: flex; justify-content: space-between; align-items: flex-start; gap: var(--space-2); }
.skola-school-card-title { font-size: var(--text-base); font-weight: 600; color: var(--text); }
.skola-school-card-badge {
  font-size: 9px; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase;
  padding: 2px 8px; border-radius: var(--radius-sm); flex-shrink: 0;
}
.skola-school-card-desc { font-size: var(--text-xs); color: var(--text-secondary); margin-top: var(--space-1); }
.skola-school-card-stats { display: flex; gap: var(--space-3); margin-top: var(--space-3); flex-wrap: wrap; }
.skola-stat { font-size: var(--text-xs); color: var(--text-muted); }

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
              transform var(--duration-fast) var(--ease-out);
  position: relative; overflow: hidden;
  display: flex; flex-direction: column; gap: var(--space-3);
  cursor: pointer;
}
.moc-card::before {
  content: ''; position: absolute; top: 0; left: 0; right: 0; height: 3px;
  background: var(--moc-accent, var(--bronze)); transform: scaleX(0); transform-origin: left;
  transition: transform var(--duration-base) var(--ease-out);
}
.moc-card:hover { background: var(--surface-elev); border-color: var(--border-hover); transform: translateY(-2px); }
.moc-card:hover::before { transform: scaleX(1); }

.moc-card-top { display: flex; justify-content: space-between; align-items: flex-start; gap: var(--space-2); }
.moc-card-title { font-size: var(--text-base); font-weight: 600; color: var(--text); margin: 0; line-height: 1.3; }
.moc-card-title a { color: var(--text); text-decoration: none; }
.moc-card-title a:hover { color: var(--moc-accent, var(--bronze)); }
.moc-card-badge {
  font-size: 9px; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase;
  padding: 2px 8px; border-radius: var(--radius-sm); flex-shrink: 0; line-height: 1.4;
}
.moc-card-desc { font-size: var(--text-xs); color: var(--text-secondary); margin: 0; line-height: 1.5; }
.moc-card-tags { display: flex; flex-wrap: wrap; gap: 4px; }
.moc-card-tag {
  font-size: 9px; padding: 2px 8px; border-radius: 10px;
  background: color-mix(in srgb, var(--moc-accent, var(--bronze)) 12%, transparent);
  color: var(--moc-accent, var(--bronze));
  border: 0.5px solid color-mix(in srgb, var(--moc-accent, var(--bronze)) 20%, transparent);
}
@media (max-width: 720px) {
  .moc-grid, .skola-school-grid { padding: var(--space-2) var(--space-4); }
}
`;
document.head.appendChild(style);

const subjects = dv.pages('"Škola"').where(p => p.type === 'project').sort(p => p.project);

let totalNotes = 0;
for (const p of subjects) {
  totalNotes += dv.pages('"' + p.file.folder + '"').length - 1;
}

const sluLectures = dv.pages('"Škola/SLU Opava"').where(p => p.tags && p.tags.includes('prednaska'));

// ===== HEADER =====
const header = container.createDiv({ cls: 'skola-section-header' });
const left = header.createDiv({ cls: 'skola-section-header-left' });
left.createEl('span', { text: '🎓', cls: 'skola-section-header-icon' });
left.createEl('h1', { text: 'ŠKOLA' });
const meta = header.createDiv({ cls: 'skola-section-header-meta' });
const stat = (icon, val, label) => {
  const el = meta.createDiv({ cls: 'hp-meta-bubble' });
  el.createEl('span', { cls: 'hp-meta-icon', text: icon });
  el.createEl('span', { cls: 'hp-meta-value', text: `${val}` });
  el.createEl('span', { cls: 'hp-meta-label', text: label });
};
stat('📚', subjects.length + 1, 'obory'); // +1 for SLU
stat('📝', totalNotes + sluLectures.length, 'poznámek');

// ===== SCHOOL CARDS =====
const schoolGrid = container.createDiv({ cls: 'skola-school-grid' });

// SLU Opava card
const sluCard = schoolGrid.createDiv({ cls: 'skola-school-card' });
sluCard.style.setProperty('--school-accent', '#c4956a');
const sluTop = sluCard.createDiv({ cls: 'skola-school-card-top' });
sluTop.createEl('span', { text: '🎓 SLU Opava', cls: 'skola-school-card-title' });
const sluBadge = sluTop.createEl('span', { text: 'Aktivní', cls: 'skola-school-card-badge' });
sluBadge.style.cssText = 'background:color-mix(in srgb, #5a8c5a 15%,transparent);color:#5a8c5a;border:1px solid color-mix(in srgb, #5a8c5a 25%,transparent)';
sluCard.createDiv({ text: 'Multimedia & Popularizace — 1. semestr', cls: 'skola-school-card-desc' });
const sluStats = sluCard.createDiv({ cls: 'skola-school-card-stats' });
sluStats.createEl('span', { text: `📖 ${sluLectures.length} přednášek`, cls: 'skola-stat' });
sluCard.addEventListener('click', () => app.workspace.openLinkText('Škola/SLU Opava/SLU Opava.md', ''));

// PANSKÁ card
const panskaCard = schoolGrid.createDiv({ cls: 'skola-school-card' });
panskaCard.style.setProperty('--school-accent', '#6b8cae');
const panskaTop = panskaCard.createDiv({ cls: 'skola-school-card-top' });
panskaTop.createEl('span', { text: '🏫 PANSKÁ', cls: 'skola-school-card-title' });
const panskaBadge = panskaTop.createEl('span', { text: 'Archiv', cls: 'skola-school-card-badge' });
panskaBadge.style.cssText = 'background:color-mix(in srgb, #555 15%,transparent);color:#999;border:1px solid color-mix(in srgb, #555 25%,transparent)';
panskaCard.createDiv({ text: 'Střední škola — 4 obory, maturita', cls: 'skola-school-card-desc' });
const panskaStats = panskaCard.createDiv({ cls: 'skola-school-card-stats' });
panskaStats.createEl('span', { text: `📚 ${subjects.length} předmětů`, cls: 'skola-stat' });
panskaStats.createEl('span', { text: `📝 ${totalNotes} poznámek`, cls: 'skola-stat' });
panskaCard.addEventListener('click', () => {
  const grid = document.querySelector('.moc-grid');
  if (grid) grid.style.display = grid.style.display === 'none' ? '' : 'none';
});

// ===== PANSKÁ SUBJECTS (collapsible) =====
const grid = container.createDiv({ cls: 'moc-grid' });
grid.style.setProperty('--moc-accent', '#6b8cae');

const descs = {
  "Výtvarné umění": "Dějiny umění — 10 lekcí od pravěku po surrealismus",
  "Technologie obrazu": "15 lekcí — světlo, TV, komprese, kamera, osvětlení",
  "Technologie zvuku": "8 lekcí — mikrofony, mixáže, reproduktory",
  "Filmové umění": "Dějiny filmu — 12+ lekcí od počátků po novou vlnu"
};

for (const p of subjects) {
  const projName = p.project || p.file.name;
  const folder = p.file.folder;
  const folderFiles = dv.pages('"' + folder + '"');
  const noteCount = folderFiles.length - 1;

  const projectTags = p.project_tags
    ? (Array.isArray(p.project_tags) ? p.project_tags : [p.project_tags])
    : [];

  const card = grid.createDiv({ cls: 'moc-card' });

  const top = card.createDiv({ cls: 'moc-card-top' });
  const title = top.createEl('h2', { cls: 'moc-card-title' });
  const link = title.createEl('a', { text: projName, cls: 'internal-link', href: p.file.path });
  link.setAttribute('data-href', p.file.path);

  const badge = top.createEl('span', { text: 'Archiv', cls: 'moc-card-badge' });
  badge.style.cssText = 'background:color-mix(in srgb, #555 15%,transparent);color:#999;border:1px solid color-mix(in srgb, #555 25%,transparent)';

  if (descs[projName]) {
    card.createDiv({ text: descs[projName], cls: 'moc-card-desc' });
  }

  if (projectTags.length > 0) {
    const tagsEl = card.createDiv({ cls: 'moc-card-tags' });
    for (const t of projectTags) {
      tagsEl.createEl('span', { text: `#${t}`, cls: 'moc-card-tag' });
    }
  }

  if (noteCount > 0) {
    const filesEl = card.createDiv({ cls: 'hp-space-projects' });
    filesEl.style.cssText = 'max-height:0;overflow:hidden;opacity:0;transition:max-height 0.4s var(--ease-out),opacity 0.3s var(--ease-out),margin 0.3s var(--ease-out);margin:0';
    card.addEventListener('click', (e) => {
      if (e.target.closest('a')) return;
      card.classList.toggle('expanded');
      const f = card.querySelector('.hp-space-projects');
      if (card.classList.contains('expanded')) {
        f.style.maxHeight = '400px'; f.style.opacity = '1'; f.style.marginTop = 'var(--space-2)';
      } else {
        f.style.maxHeight = '0'; f.style.opacity = '0'; f.style.marginTop = '0';
      }
    });

    for (const f of folderFiles) {
      if (f.file.path === p.file.path) continue;
      const row = filesEl.createDiv({ cls: 'moc-file-row' });
      row.style.cssText = 'display:flex;align-items:center;gap:var(--space-2);padding:var(--space-1) var(--space-2);border-radius:var(--radius-sm)';
      const fl = row.createEl('a', { text: f.file.name, href: f.file.path, cls: 'internal-link moc-file-link' });
      fl.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); app.workspace.openLinkText(f.file.path, ''); });
    }
  } else {
    card.addEventListener('click', (e) => {
      if (e.target.closest('a')) return;
      app.workspace.openLinkText(p.file.path, p.file.path);
    });
  }
}
```
