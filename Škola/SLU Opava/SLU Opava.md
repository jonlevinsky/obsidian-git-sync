---
cssclasses: homepage-dashboard
---

```dataviewjs
const container = dv.container;
container.classList.add('homepage-root');

const style = document.createElement('style');
style.textContent = `
.slu-header {
  display: flex; justify-content: space-between; align-items: center;
  padding: var(--space-8) var(--space-8) var(--space-6); flex-wrap: wrap; gap: var(--space-4);
  border-bottom: 1px solid var(--bronze-dim);
}
.slu-header-left { display: flex; align-items: center; gap: var(--space-4); }
.slu-header-icon { font-size: 2rem; line-height: 1; }
.slu-header h1 {
  font-family: "Bricolage Grotesque", "Cormorant Garamond", Georgia, serif;
  font-size: var(--text-xl); color: var(--bronze); font-weight: 600;
  letter-spacing: -0.02em; margin: 0; line-height: 1.2; border: none;
}
.slu-subtitle { font-size: var(--text-xs); color: var(--text-muted); margin-top: 2px; }

.slu-semesters { display: flex; flex-direction: column; gap: var(--space-6); padding: var(--space-6) var(--space-8); }

.slu-semester-header {
  display: flex; align-items: center; gap: var(--space-3);
  padding: var(--space-3) var(--space-4);
  border-radius: var(--radius-md);
  background: color-mix(in srgb, var(--bronze) 8%, transparent);
  border: 1px solid color-mix(in srgb, var(--bronze) 15%, transparent);
  margin-bottom: var(--space-3); cursor: pointer;
  transition: background var(--duration-fast);
}
.slu-semester-header:hover { background: color-mix(in srgb, var(--bronze) 14%, transparent); }
.slu-semester-title {
  font-family: "Bricolage Grotesque", "Inter", sans-serif;
  font-size: var(--text-base); font-weight: 600; color: var(--bronze);
}
.slu-semester-count { font-size: var(--text-xs); color: var(--text-muted); margin-left: auto; }

.slu-subject-grid {
  display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: var(--space-4);
  animation: hp-fade-up 0.5s 0.05s var(--ease-out) both;
}

.slu-subject-card {
  background: var(--surface); border: 1px solid var(--border);
  border-radius: var(--radius-lg); padding: var(--space-5);
  cursor: pointer;
  transition: background var(--duration-fast) var(--ease-out),
              border-color var(--duration-fast) var(--ease-out),
              transform var(--duration-fast) var(--ease-out);
}
.slu-subject-card:hover { background: var(--surface-elev); border-color: var(--border-hover); transform: translateY(-2px); }
.slu-subject-name { font-size: var(--text-sm); font-weight: 600; color: var(--text); margin-bottom: var(--space-1); }
.slu-subject-lectures { font-size: var(--text-xs); color: var(--text-muted); }

.slu-empty {
  text-align: center; padding: var(--space-12); color: var(--text-muted); font-size: var(--text-sm);
}

@media (max-width: 720px) {
  .slu-semesters { padding: var(--space-4); }
}
`;
document.head.appendChild(style);

const allSLU = dv.pages('"Škola/SLU Opava"').where(p => p.type !== undefined || p.file.name !== 'SLU Opava.md');

const lectures = allSLU.where(p => p.tags && p.tags.includes('prednaska')).sort(p => p.file.name, 'asc');
const subjects = allSLU.where(p => p.type === 'subject').sort(p => p.file.name, 'asc');

// header
const header = container.createDiv({ cls: 'slu-header' });
const left = header.createDiv({ cls: 'slu-header-left' });
left.createEl('span', { text: '🎓', cls: 'slu-header-icon' });
const titleGroup = left.createDiv();
titleGroup.createEl('h1', { text: 'SLU OPAVA' });
titleGroup.createEl('div', { text: 'Multimedia & Popularizace', cls: 'slu-subtitle' });
const meta = header.createDiv({ cls: 'moc-header-meta' });
const stat = (icon, val, label) => {
  const el = meta.createDiv({ cls: 'hp-meta-bubble' });
  el.createEl('span', { cls: 'hp-meta-icon', text: icon });
  el.createEl('span', { cls: 'hp-meta-value', text: `${val}` });
  el.createEl('span', { cls: 'hp-meta-label', text: label });
};
stat('📖', lectures.length, 'přednášek');
stat('📚', subjects.length, 'předmětů');

const semesters = container.createDiv({ cls: 'slu-semesters' });

for (const sem of ['1. semestr', '2. semestr']) {
  const semLectures = lectures.where(p => p.file.folder && p.file.folder.includes(sem));
  const semSubjects = subjects.where(p => p.file.folder && p.file.folder.includes(sem));

  const section = semesters.createDiv({ cls: 'slu-semester' });
  const sh = section.createDiv({ cls: 'slu-semester-header' });
  sh.createEl('span', { text: sem, cls: 'slu-semester-title' });
  sh.createEl('span', { text: `${semLectures.length} přednášek`, cls: 'slu-semester-count' });

  sh.addEventListener('click', () => {
    const grid = section.querySelector('.slu-subject-grid');
    if (grid) grid.style.display = grid.style.display === 'none' ? '' : 'none';
  });

  if (semLectures.length === 0 && semSubjects.length === 0) {
    section.createDiv({ text: 'Semestr zatím prázdný — přidej první předmět nebo přednášku.', cls: 'slu-empty' });
  } else {
    const grid = section.createDiv({ cls: 'slu-subject-grid' });

    for (const subj of semSubjects) {
      const subjLectures = lectures.where(p => p.file.folder && p.file.folder === subj.file.folder);
      const card = grid.createDiv({ cls: 'slu-subject-card' });
      card.createEl('div', { text: subj.project || subj.file.name, cls: 'slu-subject-name' });
      card.createEl('div', { text: `${subjLectures.length} přednášek`, cls: 'slu-subject-lectures' });
      card.addEventListener('click', () => app.workspace.openLinkText(subj.file.path, ''));
    }

    // Group lectures by subject folder for subjects that have no MOC file yet
    const lectByFolder = {};
    for (const l of semLectures) {
      const folder = l.file.folder;
      if (!lectByFolder[folder]) lectByFolder[folder] = [];
      lectByFolder[folder].push(l);
    }

    for (const [folder, lects] of Object.entries(lectByFolder)) {
      const subjExists = semSubjects.some(s => s.file.folder === folder);
      if (subjExists) continue;
      const card = grid.createDiv({ cls: 'slu-subject-card' });
      card.createEl('div', { text: folder.split('/').pop(), cls: 'slu-subject-name' });
      card.createEl('div', { text: `${lects.length} přednášek`, cls: 'slu-subject-lectures' });
      card.addEventListener('click', () => {
        const first = lects[0];
        if (first) app.workspace.openLinkText(first.file.folder, '');
      });
    }

    // Also show lectures directly if no grouping
    // Actually the lectures themselves are grouped under subjects now
  }
}
```
