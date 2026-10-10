---
tags: [slu, slu-1-semestr, subject, skola]
type: subject
project: Základy zvuku
subject_code: MPBPOF03/A
semester: 1. semestr
school: SLU Opava
status: active
cssclasses: homepage-dashboard
---

```dataviewjs
const { Modal, Setting, Notice } = require('obsidian');
const container = dv.container;
container.classList.add('homepage-root');
container.style.setProperty('--moc-accent', '#6b8cae');

const lessons = dv.pages('"Škola/SLU Opava/1. semestr/Základy zvuku"')
  .where(p => p.type === 'lesson')
  .sort(p => p.date, 'desc');

const emptyLessons = lessons.where(p => !p.topic);
const filledLessons = lessons.where(p => p.topic);

const header = container.createDiv({ cls: 'moc-header' });
const left = header.createDiv({ cls: 'moc-header-left' });
left.createEl('span', { text: '📖', cls: 'moc-header-icon' });
left.createEl('h1', { text: 'ZÁKLADY ZVUKU' });
const meta = header.createDiv({ cls: 'moc-header-meta' });
const stat = (icon, value, label) => {
  const el = meta.createDiv({ cls: 'hp-meta-bubble' });
  el.createEl('span', { cls: 'hp-meta-icon', text: icon });
  el.createEl('span', { cls: 'hp-meta-value', text: String(value) });
  el.createEl('span', { cls: 'hp-meta-label', text: label });
};
stat('📚', lessons.length, 'proběhlých hodin');
stat('✍️', filledLessons.length, 'zapsaných poznámek');

class TopicModal extends Modal {
  constructor(app, file) { super(app); this.file = file; }
  onOpen() {
    let { contentEl } = this;
    contentEl.createEl('h2', {text: 'Doplnit hodinu: ' + this.file.name});
    let topic = ''; let notes = '';
    new Setting(contentEl).setName('Téma').addText(t => t.onChange(v => topic = v));
    new Setting(contentEl).setName('Rychlá poznámka').addTextArea(t => t.onChange(v => notes = v));
    new Setting(contentEl).addButton(btn => btn.setButtonText('Uložit').setCta().onClick(async () => {
      if (!topic) { new Notice('Téma je povinné!'); return; }
      let tFile = app.vault.getAbstractFileByPath(this.file.path);
      let text = await app.vault.read(tFile);
      text = text.replace(/^topic:.*$/m, `topic: "${topic}"`);
      text = text.replace(/^######.*$/m, `###### ${topic}`);
      if (notes) text = text.replace(/## Poznámky\r?\n/m, `## Poznámky\n\n${notes}\n`);
      await app.vault.modify(tFile, text);
      new Notice('Uloženo!');
      this.close();
    }));
  }
  onClose() { this.contentEl.empty(); }
}

const renderGrid = (list, isEmpty) => {
  if (list.length === 0) return;
  const grid = container.createDiv({ cls: 'moc-grid' });
  list.forEach(l => {
    const card = grid.createDiv({ cls: 'moc-card' });
    const top = card.createDiv({ cls: 'moc-card-top' });
    const titleText = isEmpty ? l.file.name.replace('.md', '') : l.topic;
    const title = top.createEl('h2', { cls: 'moc-card-title' });
    const link = title.createEl('a', { text: titleText, cls: 'internal-link', href: l.file.path });
    link.setAttribute('data-href', l.file.path);
    
    if (isEmpty) {
      const btnWrap = top.createDiv();
      const btn = btnWrap.createEl('button', { text: 'Doplnit' });
      btn.style.cssText = 'background:var(--moc-accent);color:#fff;border:none;border-radius:4px;padding:2px 8px;font-size:10px;cursor:pointer;font-weight:bold;';
      btn.addEventListener('click', (e) => { e.stopPropagation(); new TopicModal(app, l.file).open(); });
    } else {
      const badge = top.createEl('span', { text: l.date, cls: 'moc-card-badge' });
      badge.style.cssText = 'background:color-mix(in srgb, var(--moc-accent) 15%,transparent);color:var(--moc-accent);border:1px solid color-mix(in srgb, var(--moc-accent) 25%,transparent)';
    }
    
    const descText = isEmpty ? `${l.date} · ${l.time} · ${l.location}` : `${l.time} · ${l.location}`;
    card.createDiv({ text: descText, cls: 'moc-card-desc' });
    card.addEventListener('click', (e) => { if (!e.target.closest('button') && !e.target.closest('a')) app.workspace.openLinkText(l.file.path, ''); });
  });
};

container.createEl('h3', { text: 'K doplnění' });
if (emptyLessons.length === 0) container.createEl('p', { text: 'Vše je doplněno 🎉', cls: 'hp-empty' });
else renderGrid(emptyLessons, true);

container.createEl('h3', { text: 'Zapsané hodiny', style: 'margin-top: 32px;' });
if (filledLessons.length === 0) container.createEl('p', { text: 'Zatím žádné poznámky.', cls: 'hp-empty' });
else renderGrid(filledLessons, false);
```

## Rychlý přehled

- **Kód:** `MPBPOF03/A`
- **Semestr:** 1. semestr
- **Škola:** Slezská univerzita v Opavě

## Co si hlídat

- [ ] Zkouška / zápočet ^todo-v2018w9
- [ ] Odevzdání ^todo-pgtxzdu
- [ ] Materiály ke stažení ^todo-exepqyb

## Důležité odkazy

- IS SU: 
- Studijní materiály: 
