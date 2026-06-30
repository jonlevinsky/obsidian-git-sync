---
created: 2025-06-27
device: LevinskyJ Desktop
tags: [telos]
cssclasses: homepage-dashboard
---

```dataviewjs
const container = dv.container;
container.classList.add('overview-root');

// ═══════════════════════════════════════════
// NAČTENÍ DAT
// ═══════════════════════════════════════════
const telosFile = app.vault.getAbstractFileByPath("Telos.md") || 
                  app.vault.getAbstractFileByPath("Telos/Telos Data.md") ||
                  app.vault.getAbstractFileByPath("Telos/Telos.md");

let content = '';
if (telosFile) {
  content = await app.vault.read(telosFile);
}

const getSection = (text, keyword) => {
  const regex = new RegExp(`##\\s+[^\\n]*${keyword}[^\\n]*\\n([\\s\\S]*?)(?=\\n##\\s|$)`, 'i');
  const match = text.match(regex);
  return match ? match[1].trim() : null;
};

const getSubSection = (text, keyword) => {
  const regex = new RegExp(`###\\s+[^\\n]*${keyword}[^\\n]*\\n([\\s\\S]*?)(?=###\\s|$)`, 'i');
  const match = text.match(regex);
  return match ? match[1].trim() : null;
};

// ═══════════════════════════════════════════
// HEADER
// ═══════════════════════════════════════════
const header = container.createDiv({ cls: 'hp-header' });
header.createEl('h1', { text: 'TELOS', cls: 'hp-title' });
const logCount = dv.pages('"Telos/Log"').length;
header.createEl('span', { text: `${logCount} logů`, cls: 'hp-time' });

// ═══════════════════════════════════════════
// GRID — 6 karet
// ═══════════════════════════════════════════
const grid = container.createDiv({ cls: 'hp-nav-grid telos-grid' });

const sections = [
  { key: 'Problems',   title: 'PROBLEMS',   emoji: '✅' },
  { key: 'Missions',   title: 'MISSIONS',   emoji: '🎯' },
  { key: 'Goals',      title: 'GOALS',      emoji: '🥅' },
  { key: 'Challenges', title: 'CHALLENGES', emoji: '🚧' },
  { key: 'Strategies', title: 'STRATEGIES', emoji: '🔧' },
  { key: 'Projects',   title: 'PROJECTS',   emoji: '📂' }
];

for (const s of sections) {
  const body = getSection(content, s.key);
  const card = grid.createDiv({ cls: 'hp-card telos-card' });
  card.createEl('span', { cls: 'hp-icon', text: s.emoji });
  card.createEl('h3', { cls: 'hp-card-title', text: s.title });
  
  let bullets = [];
  let count = 0;
  if (body) {
    bullets = body.split('\n').filter(l => l.trim().startsWith('-')).slice(0, 2);
    count = body.split('\n').filter(l => l.trim().startsWith('-')).length;
  }
  
  card.createEl('p', { cls: 'hp-card-sub', text: `${count} položek` });
  
  if (bullets.length > 0) {
    const ul = card.createEl('ul', { cls: 'hp-mini-list' });
    for (const b of bullets) {
      let text = b.replace(/^-\s*/, '').replace(/\*\*[^*]+:\*\*\s*/, '');
      if (text.length > 55) text = text.slice(0, 55) + '...';
      ul.createEl('li', { text, cls: 'hp-mini-item' });
    }
  }
  
  card.style.cursor = 'pointer';
  card.addEventListener('click', () => {
    app.workspace.openLinkText(telosFile ? telosFile.path : 'Telos.md', '');
  });
}

// ═══════════════════════════════════════════
// SPLIT — Motivation + Future Day
// ═══════════════════════════════════════════
const split = container.createDiv({ cls: 'hp-split' });

// ── Motivation ──
const motivationPanel = split.createDiv({ cls: 'hp-panel' });
motivationPanel.createEl('h2', { text: '🔥 MOTIVACE', cls: 'hp-panel-title' });

const insightBody = getSection(content, 'Insight');
const motivationBody = insightBody ? getSubSection(insightBody, 'Motivation') : null;

if (motivationBody) {
  const ul = motivationPanel.createEl('ul', { cls: 'hp-list' });
  const bullets = motivationBody.split('\n').filter(l => l.trim().startsWith('-')).slice(0, 4);
  for (const b of bullets) {
    const li = ul.createEl('li');
    const text = b.replace(/^-\s*/, '').replace(/\*\*([^*]+)\*\*/, '$1');
    li.createEl('span', { text, cls: 'hp-motivation-text' });
  }
} else {
  motivationPanel.createDiv({ cls: 'hp-empty' }).createEl('p', { text: 'Sekce nenalezena.' });
}

// ── Future Day ──
const futurePanel = split.createDiv({ cls: 'hp-panel' });
futurePanel.createEl('h2', { text: '🌅 FUTURE DAY', cls: 'hp-panel-title' });

const futureBody = getSection(content, 'Future Day');
if (futureBody) {
  const text = futureBody.replace(/^-\s*/, '').replace(/\n/g, ' ').slice(0, 120) + '...';
  futurePanel.createEl('p', { text, cls: 'hp-log-text' });
  const link = futurePanel.createEl('a', { text: 'Celý text →', cls: 'hp-log-link' });
  link.addEventListener('click', (e) => {
    e.preventDefault();
    app.workspace.openLinkText(telosFile ? telosFile.path : 'Telos.md', '');
  });
} else {
  futurePanel.createDiv({ cls: 'hp-empty' }).createEl('p', { text: 'Sekce nenalezena.' });
}

// ═══════════════════════════════════════════
// LOGY — nedávné
// ═══════════════════════════════════════════
const logPanel = container.createDiv({ cls: 'hp-panel' });
logPanel.createEl('h2', { text: '📒 NEDÁVNÉ LOGY', cls: 'hp-panel-title' });

const logs = dv.pages('"Telos/Log"').sort(f => f.file.mtime, 'desc').limit(5);
if (logs.length > 0) {
  const ul = logPanel.createEl('ul', { cls: 'hp-list' });
  for (const l of logs) {
    const li = ul.createEl('li');
    const link = li.createEl('a', {
      text: l.file.name,
      href: l.file.path,
      cls: 'internal-link hp-link'
    });
    link.addEventListener('click', (e) => {
      e.preventDefault();
      app.workspace.openLinkText(l.file.path, '');
    });
  }
} else {
  logPanel.createDiv({ cls: 'hp-empty' }).createEl('p', { text: 'Žádné logy.' });
}