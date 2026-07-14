---
cssclasses: homepage-dashboard
---

```dataviewjs
const container = dv.container;
container.classList.add('homepage-root');

// ═══════════════════════════════════════════
// LOG DATA
// ═══════════════════════════════════════════
const logs = dv.pages('"Telos/Log"').map(p => p.file);
const logData = new Map();
for (const log of logs) {
  const match = log.path.match(/(\d{2})\.(\d{2})\.(\d{4})\.md$/);
  if (match) {
    const key = `${match[3]}-${match[2]}-${match[1]}`;
    logData.set(key, log.wordCount || 1);
  }
}

// Streak
let streak = 0;
let checkDate = moment();
while (true) {
  const key = checkDate.format('YYYY-MM-DD');
  if (logData.has(key)) {
    streak++;
    checkDate.subtract(1, 'day');
  } else {
    break;
  }
}

let totalLogs = logData.size;
let totalWords = 0;
for (const count of logData.values()) {
  totalWords += count;
}

// ═══════════════════════════════════════════
// HEADER
// ═══════════════════════════════════════════
const header = container.createDiv({ cls: 'hp-header' });
header.createEl('h1', { text: 'JAN LEVÍNSKÝ', cls: 'hp-title' });
const meta = header.createDiv({ cls: 'hp-header-meta' });
meta.createEl('span', { text: `${streak}d 🔥`, cls: 'hp-streak' });
const timeEl = meta.createEl('span', { cls: 'hp-time' });

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
  { label: 'Filmy',    path: 'Filmy',    sub: 'projektů',    icon: '🎬' },
  { label: 'Škola',    path: 'Škola',    sub: 'předmětů',    icon: '📚' },
  { label: 'Produkce', path: 'Produkce', sub: 'souborů',     icon: '🎥' }
];

for (const c of cards) {
  const count = getCount(c.path);
  const card = nav.createDiv({ cls: 'hp-card' });

  card.createEl('span', { cls: 'hp-icon', text: c.icon });

  const cardMeta = card.createDiv({ cls: 'hp-card-meta' });
  cardMeta.createEl('span', { cls: 'hp-card-label', text: c.label });
  cardMeta.createEl('span', { cls: 'hp-card-count', text: `${count}` });

  card.createEl('h3', { cls: 'hp-card-title', text: c.label.toUpperCase() });
  card.createEl('p',  { cls: 'hp-card-sub', text: `${count} ${c.sub}` });

  card.style.cursor = 'pointer';
  card.addEventListener('click', () => {
    app.workspace.openLinkText(c.path, '');
  });
}

// ═══════════════════════════════════════════
// QUICK CAPTURE
// ═══════════════════════════════════════════
let captureMode = 'log';

const captureBar = container.createDiv({ cls: 'hp-capture-bar' });

const pillGroup = captureBar.createDiv({ cls: 'hp-pill-group' });
const logPill = pillGroup.createEl('button', { text: 'LOG', cls: 'hp-pill hp-pill-active' });
const inboxPill = pillGroup.createEl('button', { text: 'INBOX', cls: 'hp-pill' });

const setMode = (mode) => {
  captureMode = mode;
  if (mode === 'log') {
    logPill.classList.add('hp-pill-active');
    inboxPill.classList.remove('hp-pill-active');
    captureInput.placeholder = 'Zapsat do logu...';
  } else {
    inboxPill.classList.add('hp-pill-active');
    logPill.classList.remove('hp-pill-active');
    captureInput.placeholder = 'Nová poznámka...';
  }
};

logPill.addEventListener('click', () => setMode('log'));
inboxPill.addEventListener('click', () => setMode('inbox'));

const captureInput = captureBar.createEl('input', {
  type: 'text',
  placeholder: 'Zapsat do logu...',
  cls: 'hp-capture-input'
});

const captureBtn = captureBar.createEl('button', {
  text: '→',
  cls: 'hp-capture-btn'
});

const doCapture = async () => {
  const text = captureInput.value.trim();
  if (!text) return;

  if (captureMode === 'log') {
    const todayLog = moment().format('DD.MM.YYYY');
    const year = moment().format('YYYY');
    const month = moment().format('MM');
    const logPath = `Telos/Log/${year}/${month}/${todayLog}.md`;

    let logFile = app.vault.getAbstractFileByPath(logPath);
    if (!logFile) {
      const paths = ['Telos/Log', `Telos/Log/${year}`, `Telos/Log/${year}/${month}`];
      for (const p of paths) {
        if (!app.vault.getAbstractFileByPath(p)) await app.vault.createFolder(p);
      }
      await app.vault.create(logPath, `---\ncreated: ${moment().format('YYYY-MM-DD')}\ndevice: LevinskyJ Desktop\ntags: [log, telos]\n---\n\n<div style="text-align: center; color: gray; font-size: 1.1em; margin-bottom: 20px; font-family: Courier New">\n  ${moment().format('dd DD. MMMM YYYY')}\n</div>\n\n---\n\n`);
      logFile = app.vault.getAbstractFileByPath(logPath);
    }

    const existing = await app.vault.read(logFile);
    const newContent = existing + `\n- ${text}\n`;
    await app.vault.modify(logFile, newContent);

    captureInput.value = '';
    new Notice('Zapsáno do logu');

  } else {
    const year = moment().format('YYYY');
    const month = moment().format('MM');
    const day = moment().format('DD.MM.YYYY');
    const time = moment().format('HH-mm-ss');

    const dayFolder = `Inbox/${year}/${month}/${day}`;
    const filePath = `${dayFolder}/${time}.md`;

    const paths = ['Inbox', `Inbox/${year}`, `Inbox/${year}/${month}`, dayFolder];
    for (const p of paths) {
      if (!app.vault.getAbstractFileByPath(p)) await app.vault.createFolder(p);
    }

    const fileContent = `---\ncreated: ${moment().format('YYYY-MM-DD')}\nsource: quick-capture\n---\n${text}\n`;

    await app.vault.create(filePath, fileContent);

    captureInput.value = '';
    new Notice(`Vytvořeno ${filePath}`);
  }
};

captureBtn.addEventListener('click', doCapture);
captureInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') doCapture();
});

// ═══════════════════════════════════════════
// DRAGGABLE WIDGET GRID
// ═══════════════════════════════════════════
const widgetGrid = container.createDiv({ cls: 'hp-widget-grid' });

// Load saved order
let widgetOrder = ['tasks', 'calendar', 'inbox'];
try {
  const saved = localStorage.getItem('homepage-widget-order');
  if (saved) {
    const parsed = JSON.parse(saved);
    // Validate all widgets exist
    const valid = ['tasks', 'calendar', 'inbox'];
    if (parsed.every(w => valid.includes(w)) && parsed.length === 3) {
      widgetOrder = parsed;
    }
  }
} catch (e) {}

// Widget data
const widgetData = {
  tasks: { title: 'AKTIVNÍ ÚKOLY', render: renderTasksWidget },
  calendar: { title: 'KALENDÁŘ', render: renderCalendarWidget },
  inbox: { title: 'INBOX', render: renderInboxWidget }
};

// Render widgets in order
for (const widgetId of widgetOrder) {
  const data = widgetData[widgetId];
  if (!data) continue;

  const widgetEl = widgetGrid.createDiv({ cls: 'hp-widget' });
  widgetEl.setAttribute('data-widget-id', widgetId);
  widgetEl.setAttribute('draggable', 'true');

  // Drag handle
  const handle = widgetEl.createDiv({ cls: 'hp-widget-handle' });
  handle.createEl('span', { text: '⋮⋮', cls: 'hp-widget-handle-icon' });
  handle.createEl('span', { text: data.title, cls: 'hp-panel-title hp-widget-title' });

  const content = widgetEl.createDiv({ cls: 'hp-widget-content' });
  data.render(content);
}

// Drag & Drop logic
let draggedEl = null;
let draggedId = null;

widgetGrid.addEventListener('dragstart', (e) => {
  draggedEl = e.target.closest('.hp-widget');
  if (!draggedEl) return;
  draggedId = draggedEl.getAttribute('data-widget-id');
  draggedEl.classList.add('hp-widget-dragging');
  e.dataTransfer.effectAllowed = 'move';
  e.dataTransfer.setData('text/plain', draggedId);
});

widgetGrid.addEventListener('dragend', (e) => {
  if (draggedEl) {
    draggedEl.classList.remove('hp-widget-dragging');
  }
  draggedEl = null;
  draggedId = null;

  // Save new order
  const widgets = widgetGrid.querySelectorAll('.hp-widget');
  const newOrder = Array.from(widgets).map(w => w.getAttribute('data-widget-id'));
  localStorage.setItem('homepage-widget-order', JSON.stringify(newOrder));
});

widgetGrid.addEventListener('dragover', (e) => {
  e.preventDefault();
  e.dataTransfer.dropEffect = 'move';

  const target = e.target.closest('.hp-widget');
  if (!target || target === draggedEl) return;

  const rect = target.getBoundingClientRect();
  const midpoint = rect.left + rect.width / 2;

  if (e.clientX < midpoint) {
    widgetGrid.insertBefore(draggedEl, target);
  } else {
    widgetGrid.insertBefore(draggedEl, target.nextSibling);
  }
});

// ═══════════════════════════════════════════
// WIDGET RENDERERS
// ═══════════════════════════════════════════

function renderTasksWidget(container) {
  const tasks = dv.pages().file.tasks.where(t => !t.completed).limit(8);

  if (tasks.length > 0) {
    const ul = container.createEl('ul', { cls: 'hp-task-list' });

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
    const empty = container.createDiv({ cls: 'hp-empty' });
    empty.createEl('p', { text: 'Žádné nehotové úkoly.' });
  }
}

function renderCalendarWidget(container) {
  const calNav = container.createDiv({ cls: 'hp-cal-widget-nav' });
  const prevBtn = calNav.createEl('button', { text: '←', cls: 'hp-cal-widget-btn' });
  const monthLabel = calNav.createEl('span', { text: '', cls: 'hp-cal-widget-month' });
  const nextBtn = calNav.createEl('button', { text: '→', cls: 'hp-cal-widget-btn' });

  const calGrid = container.createDiv({ cls: 'hp-cal-widget' });

  let widgetMonth = moment().startOf('month');

  const renderWidgetCalendar = () => {
    monthLabel.textContent = widgetMonth.format('MMMM YYYY').toUpperCase();
    calGrid.innerHTML = '';

    const dayHeaders = ['P', 'Ú', 'S', 'Č', 'P', 'S', 'N'];
    for (const d of dayHeaders) {
      calGrid.createEl('div', { text: d, cls: 'hp-cal-widget-day-header' });
    }

    const year = widgetMonth.year();
    const month = widgetMonth.month();
    const daysInMonth = widgetMonth.daysInMonth();
    const firstDayOfMonth = moment([year, month, 1]).day();
    const daysFromMonday = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1;

    for (let i = 0; i < daysFromMonday; i++) {
      calGrid.createDiv({ cls: 'hp-cal-widget-cell hp-cal-widget-cell-empty' });
    }

    for (let d = 1; d <= daysInMonth; d++) {
      const dayMoment = moment([year, month, d]);
      const key = dayMoment.format('YYYY-MM-DD');
      const wordCount = logData.get(key) || 0;
      const isToday = dayMoment.isSame(moment(), 'day');

      let intensity = 0;
      if (wordCount > 0) {
        if (wordCount < 50) intensity = 1;
        else if (wordCount < 150) intensity = 2;
        else intensity = 3;
      }

      const cell = calGrid.createDiv({ cls: 'hp-cal-widget-cell' });
      if (isToday) cell.classList.add('hp-cal-widget-cell-today');
      if (intensity > 0) cell.classList.add(`hp-cal-widget-cell-log-${intensity}`);

      cell.createEl('span', { text: `${d}`, cls: 'hp-cal-widget-day-num' });

      if (wordCount > 0) {
        cell.createDiv({ cls: 'hp-cal-widget-dot' });
        cell.setAttribute('title', `${dayMoment.format('DD.MM.YYYY')} — ${wordCount.toLocaleString('cs')} slov`);
      } else {
        cell.setAttribute('title', dayMoment.format('DD.MM.YYYY'));
      }

      cell.addEventListener('click', () => {
        const logPath = `Telos/Log/${dayMoment.format('YYYY')}/${dayMoment.format('MM')}/${dayMoment.format('DD.MM.YYYY')}.md`;
        app.workspace.openLinkText(logPath, '');
      });
    }

    const totalCells = daysFromMonday + daysInMonth;
    const remaining = (7 - (totalCells % 7)) % 7;
    for (let i = 0; i < remaining; i++) {
      calGrid.createDiv({ cls: 'hp-cal-widget-cell hp-cal-widget-cell-empty' });
    }
  };

  renderWidgetCalendar();

  prevBtn.addEventListener('click', () => {
    widgetMonth.subtract(1, 'month');
    renderWidgetCalendar();
  });

  nextBtn.addEventListener('click', () => {
    widgetMonth.add(1, 'month');
    renderWidgetCalendar();
  });
}

function renderInboxWidget(container) {
  const inboxFiles = dv.pages('"Inbox"')
    .sort(f => f.file.mtime, 'desc')
    .limit(6);

  if (inboxFiles.length > 0) {
    const ul = container.createEl('ul', { cls: 'hp-list' });
    for (const f of inboxFiles) {
      const li = ul.createEl('li');
      const link = li.createEl('a', {
        text: f.file.name,
        href: f.file.path,
        cls: 'internal-link hp-link'
      });
      link.addEventListener('click', (e) => {
        e.preventDefault();
        app.workspace.openLinkText(f.file.path, '');
      });
    }
  } else {
    container.createDiv({ cls: 'hp-empty' }).createEl('p', { text: 'Inbox je prázdný.' });
  }
}

// ═══════════════════════════════════════════
// NOW BAR
// ═══════════════════════════════════════════
const nowBar = container.createDiv({ cls: 'hp-now' });
nowBar.createEl('span', { cls: 'hp-now-label', text: 'NOW' });

const nowItems = ['Hledání bytu Opava', 'Portfolio', 'Produkce'];
nowItems.forEach((text, i) => {
  if (i > 0) nowBar.createEl('span', { cls: 'hp-now-sep', text: '·' });
  nowBar.createEl('span', { cls: 'hp-now-item', text });
});
