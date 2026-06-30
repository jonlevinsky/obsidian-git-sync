---
tags: homepage
cssclasses: homepage-dashboard
---

```dataviewjs
const container = dv.container;
container.classList.add('homepage-root');

// ═══════════════════════════════════════════
// HEADER
// ═══════════════════════════════════════════
const header = container.createDiv({ cls: 'hp-header' });
header.createEl('h1', { text: 'JAN LEVÍNSKÝ', cls: 'hp-title' });
const timeEl = header.createEl('span', { cls: 'hp-time' });

const updateClock = () => {
  timeEl.textContent = new Date().toLocaleTimeString('cs-CZ', {
    hour: '2-digit', minute: '2-digit'
  });
};
updateClock();
setInterval(updateClock, 60000);

// ═══════════════════════════════════════════
// NAV GRID
// ═══════════════════════════════════════════
const nav = container.createDiv({ cls: 'hp-nav-grid' });

const getCount = (path) => {
  try { return dv.pages(`"${path}"`).length; }
  catch (e) { return 0; }
};

const cards = [
  { label: 'Filmy',  path: 'Filmy',  sub: 'projektů' },
  { label: 'Škola',  path: 'Škola',  sub: 'předmětů' },
  { label: 'Produkce', path: 'Produkce', sub: 'souborů' }
];

for (const c of cards) {
  const count = getCount(c.path);
  const card = nav.createDiv({ cls: 'hp-card' });
  
  const meta = card.createDiv({ cls: 'hp-card-meta' });
  meta.createEl('span', { cls: 'hp-card-label', text: c.label });
  meta.createEl('span', { cls: 'hp-card-count', text: `${count}` });
  
  card.createEl('h3', { cls: 'hp-card-title', text: c.label.toUpperCase() });
  card.createEl('p',  { cls: 'hp-card-sub', text: `${count} ${c.sub}` });
  
  card.style.cursor = 'pointer';
  card.addEventListener('click', () => {
    app.workspace.openLinkText(c.path, '');
  });
}

// ═══════════════════════════════════════════
// SPLIT — Úkoly + Denní log
// ═══════════════════════════════════════════
const split = container.createDiv({ cls: 'hp-split' });

// ── Levý panel: Aktivní úkoly ──
const todoPanel = split.createDiv({ cls: 'hp-panel' });
todoPanel.createEl('h2', { text: 'AKTIVNÍ ÚKOLY', cls: 'hp-panel-title' });

const taskContainer = todoPanel.createDiv({ cls: 'hp-task-container' });
const tasks = dv.pages().file.tasks.where(t => !t.completed).limit(8);

if (tasks.length > 0) {
  const ul = taskContainer.createEl('ul', { cls: 'hp-task-list' });
  
  for (const task of tasks) {
    const li = ul.createEl('li', { cls: 'hp-task-item' });
    
    const checkbox = li.createEl('input', { 
      type: 'checkbox', 
      cls: 'hp-task-checkbox'
    });
    checkbox.checked = false;
    checkbox.disabled = true;
    
    const textSpan = li.createEl('span', { cls: 'hp-task-text' });
    
    const text = task.text;
    const linkRegex = /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g;
    let lastIndex = 0;
    let match;
    
    while ((match = linkRegex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        textSpan.appendText(text.slice(lastIndex, match.index));
      }
      
      const linkTarget = match[1];
      const linkDisplay = match[2] || match[1];
      const a = textSpan.createEl('a', {
        text: linkDisplay,
        href: linkTarget,
        cls: 'internal-link'
      });
      a.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        app.workspace.openLinkText(linkTarget, task.path);
      });
      
      lastIndex = match.index + match[0].length;
    }
    
    if (lastIndex < text.length) {
      textSpan.appendText(text.slice(lastIndex));
    }
    
    li.addEventListener('click', (e) => {
      if (e.target.tagName !== 'A' && e.target.tagName !== 'INPUT') {
        app.workspace.openLinkText(task.path, '');
      }
    });
  }
} else {
  const empty = taskContainer.createDiv({ cls: 'hp-empty' });
  empty.createEl('p', { text: 'Žádné nehotové úkoly.' });
}

// ── Pravý panel: Denní log ──
const dailyPanel = split.createDiv({ cls: 'hp-panel' });
dailyPanel.createEl('h2', { text: 'DNEŠNÍ LOG', cls: 'hp-panel-title' });

const todayLog = moment().format('DD.MM.YYYY');
const year  = moment().format('YYYY');
const month = moment().format('MM');
const logPath = `Telos/Log/${year}/${month}/${todayLog}.md`;
const logFile = app.vault.getAbstractFileByPath(logPath);

if (logFile) {
  const logContent = await app.vault.read(logFile);
  
  // Odstraníme frontmatter
  let content = logContent.replace(/^---[\s\S]*?---\n*/, '');
  
  // Odstraníme vše až po první horizontální čáru (---)
  // To odstraní ten <div> s datem a první ---
  const firstHrIndex = content.search(/\n---\s*\n/);
  if (firstHrIndex !== -1) {
    content = content.slice(firstHrIndex + 4).trim();
  }
  
  if (content) {
    const logPreview = dailyPanel.createDiv({ cls: 'hp-log-preview' });
    const previewText = content.length > 100 ? content.slice(0, 100) + '...' : content;
    logPreview.createEl('p', { text: previewText, cls: 'hp-log-text' });
    
    const link = logPreview.createEl('a', {
      text: 'Otevřít log →',
      href: logPath,
      cls: 'hp-log-link'
    });
    link.addEventListener('click', (e) => {
      e.preventDefault();
      app.workspace.openLinkText(logPath, '');
    });
  } else {
    const empty = dailyPanel.createDiv({ cls: 'hp-empty' });
    empty.createEl('p', { text: 'Log je prázdný.' });
    const link = empty.createEl('a', {
      text: 'Otevřít log',
      href: logPath,
      cls: 'hp-log-link'
    });
    link.addEventListener('click', (e) => {
      e.preventDefault();
      app.workspace.openLinkText(logPath, '');
    });
  }
} else {
  const empty = dailyPanel.createDiv({ cls: 'hp-empty' });
  empty.createEl('p', { text: `Log ${todayLog} ještě neexistuje.` });
  const btn = empty.createEl('button', { cls: 'hp-btn-secondary', text: '+ Vytvořit' });
  btn.addEventListener('click', async () => {
    try {
      const paths = ['Telos/Log', `Telos/Log/${year}`, `Telos/Log/${year}/${month}`];
      for (const p of paths) {
        if (!app.vault.getAbstractFileByPath(p)) await app.vault.createFolder(p);
      }
      await app.vault.create(logPath, `---\ncreated: ${moment().format('YYYY-MM-DD')}\ndevice: LevinskyJ Desktop\ntags: [log, telos]\n---\n\n<div style="text-align: center; color: gray; font-size: 1.1em; margin-bottom: 20px; font-family: Courier New">\n  ${moment().format('dd DD. MMMM YYYY')}\n</div>\n\n---\n\n`);
      new Notice('Denní log vytvořen');
      app.workspace.activeLeaf?.rebuildView?.();
    } catch (e) {
      new Notice('Chyba: ' + e.message);
    }
  });
}

// ═══════════════════════════════════════════
// PROJEKTY
// ═══════════════════════════════════════════
const projects = container.createDiv({ cls: 'hp-projects' });

const makeCol = (title, items) => {
  const col = projects.createDiv({ cls: 'hp-project-col' });
  col.createEl('h2', { text: title, cls: 'hp-panel-title' });
  const ul = col.createEl('ul', { cls: 'hp-list' });
  for (const item of items) {
    const li = ul.createEl('li');
    const link = li.createEl('a', {
      text: item.split('/').pop(),
      href: item,
      cls: 'internal-link hp-link'
    });
    link.addEventListener('click', (e) => {
      e.preventDefault();
      app.workspace.openLinkText(item, '');
    });
  }
};

makeCol('FILMY', [
  'Filmy/Cordyceps',
  'Filmy/Metro',
  'Filmy/Nový řád',
  'Filmy/Zub času',
  'Filmy/Kraťasy'
]);

makeCol('PRODUKCE', [
  'Produkce/WEB',
  'Produkce/Technika'
]);

// ═══════════════════════════════════════════
// NOW BAR
// ═══════════════════════════════════════════
const nowBar = container.createDiv({ cls: 'hp-now' });
nowBar.createEl('span', { cls: 'hp-now-label', text: 'NOW' });

const nowItems = ['Hledání bytu Opava', 'Portfolio deploy', 'Plugin dev'];
nowItems.forEach((text, i) => {
  if (i > 0) nowBar.createEl('span', { cls: 'hp-now-sep', text: '·' });
  nowBar.createEl('span', { cls: 'hp-now-item', text });
});