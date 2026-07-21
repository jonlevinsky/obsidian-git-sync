<%*
const semestry = ['1. semestr', '2. semestr'];

// Fetch existing subject folders
let predmety = [];
for (const sem of semestry) {
  const semPath = `Škola/SLU Opava/${sem}`;
  try {
    const entries = await app.vault.adapter.list(semPath);
    if (entries && entries.folders) {
      for (const folder of entries.folders) {
        const name = folder.split('/').pop();
        if (name && !name.startsWith('_')) {
          predmety.push({ label: `${sem} — ${name}`, folder: folder, semestr: sem, predmet: name });
        }
      }
    }
  } catch (e) {}
}

if (predmety.length === 0) {
  // No subjects yet — prompt to create a new subject folder
  const semVolba = await tp.system.suggester(semestry, semestry);
  const nazevPredmetu = await tp.system.prompt("Název předmětu:");
  const subFolder = `Škola/SLU Opava/${semVolba}/${nazevPredmetu}`;
  await app.vault.createFolder(subFolder);
  const subFile = `${subFolder}/${nazevPredmetu}.md`;
  await app.vault.create(subFile, `---
cssclasses: homepage-dashboard
---

\`\`\`dataviewjs
const container = dv.container;
container.classList.add('homepage-root');
container.style.setProperty('--moc-accent', 'var(--bronze)');

const lectures = dv.pages('"${subFolder}"')
  .where(p => p.tags && p.tags.includes('prednaska'))
  .sort(p => p.file.name, 'desc');

const header = container.createDiv({ cls: 'moc-header' });
const left = header.createDiv({ cls: 'moc-header-left' });
left.createEl('span', { text: '📖', cls: 'moc-header-icon' });
left.createEl('h1', { text: '${nazevPredmetu}' });
const meta = header.createDiv({ cls: 'moc-header-meta' });
const stat = (icon, val, label) => {
  const el = meta.createDiv({ cls: 'hp-meta-bubble' });
  el.createEl('span', { cls: 'hp-meta-icon', text: icon });
  el.createEl('span', { cls: 'hp-meta-value', text: String(val) });
  el.createEl('span', { cls: 'hp-meta-label', text: label });
};
stat('📖', lectures.length, 'přednášek');

if (lectures.length === 0) {
  container.createDiv({ cls: 'hp-empty' }).createEl('p', { text: 'Zatím žádné přednášky.' });
} else {
  const grid = container.createDiv({ cls: 'moc-grid' });
  for (const l of lectures) {
    const card = grid.createDiv({ cls: 'moc-card' });
    const top = card.createDiv({ cls: 'moc-card-top' });
    const title = top.createEl('h2', { cls: 'moc-card-title' });
    const link = title.createEl('a', { text: l.lecture || l.file.name, cls: 'internal-link', href: l.file.path });
    link.setAttribute('data-href', l.file.path);
    const badge = top.createEl('span', { text: 'Přednáška', cls: 'moc-card-badge' });
    badge.style.cssText = 'background:color-mix(in srgb, var(--bronze) 15%,transparent);color:var(--bronze);border:1px solid color-mix(in srgb, var(--bronze) 25%,transparent)';
    card.createDiv({ text: l.file.name.slice(0, 10), cls: 'moc-card-desc' });
    card.addEventListener('click', (e) => {
      if (e.target.closest('a')) return;
      app.workspace.openLinkText(l.file.path, '');
    });
  }
}
\`\`\`
`);
  predmety = [{ label: `${semVolba} — ${nazevPredmetu}`, folder: subFolder, semestr: semVolba, predmet: nazevPredmetu }];
}

const vyber = await tp.system.suggester(predmety.map(p => p.label), predmety);
if (!vyber) { new Notice("Zrušeno"); return; }

const nazev = await tp.system.prompt("Téma přednášky:", `Přednáška ${tp.date.now("DD.MM.YYYY")}`);
if (!nazev) { new Notice("Zrušeno"); return; }

const cislo = vyber.predmet.slice(0, 2).toLowerCase();
const datStr = tp.date.now("YYYY-MM-DD");
const fileName = `${datStr} — ${nazev}`;
await tp.file.rename(fileName);
await tp.file.move(`/${vyber.folder}/${fileName}`);
_%>
---
created: <% tp.date.now("YYYY-MM-DD HH:mm") %>
semester: <% vyber.semestr %>
subject: <% vyber.predmet %>
lecture: <% nazev %>
tags: [slu, prednaska, <% cislo %>]
---

# <% nazev %>

> **Předmět:** <% vyber.predmet %> | **Semestr:** <% vyber.semestr %> | **Datum:** <% tp.date.now("DD.MM.YYYY") %>

---

## Klíčové pojmy

-

## Poznámky



## Zdroje a odkazy

-

## Otázky k zamyšlení

-
