---
tags: [slu, slu-1-semestr, subject, skola]
type: subject
project: Dějiny kinematografie
subject_code: MPBPSMT01/A
semester: 1. semestr
school: SLU Opava
status: active
cssclasses: homepage-dashboard
---

```dataviewjs
const container = dv.container;
container.classList.add('homepage-root');
container.style.setProperty('--moc-accent', '#6b8cae');

const lessons = dv.pages('"Škola/SLU Opava/1. semestr/Dějiny kinematografie"')
  .where(p => p.type === 'lesson')
  .sort(p => p.date, 'desc');

const header = container.createDiv({ cls: 'moc-header' });
const left = header.createDiv({ cls: 'moc-header-left' });
left.createEl('span', { text: '📖', cls: 'moc-header-icon' });
left.createEl('h1', { text: 'DĚJINY KINEMATOGRAFIE' });
const meta = header.createDiv({ cls: 'moc-header-meta' });
const stat = (icon, value, label) => {
  const el = meta.createDiv({ cls: 'hp-meta-bubble' });
  el.createEl('span', { cls: 'hp-meta-icon', text: icon });
  el.createEl('span', { cls: 'hp-meta-value', text: String(value) });
  el.createEl('span', { cls: 'hp-meta-label', text: label });
};
stat('📚', lessons.length, 'hodin');
stat('📝', lessons.length, 'poznámek');

const grid = container.createDiv({ cls: 'moc-grid' });
for (const lesson of lessons) {
  const card = grid.createDiv({ cls: 'moc-card' });
  const top = card.createDiv({ cls: 'moc-card-top' });
  const title = top.createEl('h2', { cls: 'moc-card-title' });
  const link = title.createEl('a', { text: lesson.file.name, cls: 'internal-link', href: lesson.file.path });
  link.setAttribute('data-href', lesson.file.path);
  const badge = top.createEl('span', { text: 'Hodina', cls: 'moc-card-badge' });
  badge.style.cssText = 'background:color-mix(in srgb, #6b8cae 15%,transparent);color:#6b8cae;border:1px solid color-mix(in srgb, #6b8cae 25%,transparent)';
  card.createDiv({ text: lesson.date + ' · ' + lesson.time + ' · místnost ' + lesson.location, cls: 'moc-card-desc' });
  card.addEventListener('click', (e) => { if (!e.target.closest('a')) app.workspace.openLinkText(lesson.file.path, ''); });
}

if (lessons.length === 0) container.createDiv({ cls: 'hp-empty' }).createEl('p', { text: 'Zatím žádné proběhlé hodiny.' });
```

## Rychlý přehled

- **Kód:** `MPBPSMT01/A`
- **Semestr:** 1. semestr
- **Škola:** Slezská univerzita v Opavě

## Co si hlídat

- [ ] Zkouška / zápočet ^todo-31j0grk
 ^todo-0fo5nuh
- [ ] Odevzdání ^todo-vuxgvad
 ^todo-kkvxzdd
- [ ] Materiály ke stažení ^todo-bui9d56
 ^todo-p18u04j

## Důležité odkazy

- IS SU: 
- Studijní materiály: 
