---
cssclasses: homepage-dashboard
---

```dataviewjs
const container = dv.container;
container.classList.add('homepage-root');

// ═══════════════════════════════════════════
// LOG DATA
// ═══════════════════════════════════════════
const logPages = dv.pages('"život/Log"');
const logData = new Map();

for (const page of logPages) {
  const match = page.file.path.match(/(\d{2})\.(\d{2})\.(\d{4})\.md$/);
  if (match) {
    const key = `${match[3]}-${match[2]}-${match[1]}`;
    const size = page.file.size || 0;
    const wordCount = Math.max(0, Math.round((size - 200) / 5));
    logData.set(key, wordCount);
  }
}

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
// WEATHER — Praha
// ═══════════════════════════════════════════
const WEATHER_CACHE_KEY = 'hp-weather-cache';
const WEATHER_CACHE_TTL = 10 * 60 * 1000;

const weatherIcons = {
  0: '☀️', 1: '🌤️', 2: '⛅', 3: '☁️',
  45: '🌫️', 48: '🌫️',
  51: '🌧️', 53: '🌧️', 55: '🌧️',
  56: '🌧️', 57: '🌧️',
  61: '🌦️', 63: '🌧️', 65: '🌧️',
  66: '🌧️', 67: '🌧️',
  71: '🌨️', 73: '🌨️', 75: '🌨️',
  77: '🌨️',
  80: '🌦️', 81: '🌧️', 82: '🌧️',
  85: '🌨️', 86: '🌨️',
  95: '⛈️', 96: '⛈️', 99: '⛈️'
};

const weatherDescriptions = {
  0: 'Jasno', 1: 'Převážně jasno', 2: 'Polojasno', 3: 'Zataženo',
  45: 'Mlha', 48: 'Mrznoucí mlha',
  51: 'Mrholení', 53: 'Mrholení', 55: 'Mrholení',
  56: 'Mrznoucí mrholení', 57: 'Mrznoucí mrholení',
  61: 'Déšť', 63: 'Déšť', 65: 'Déšť',
  66: 'Mrznoucí déšť', 67: 'Mrznoucí déšť',
  71: 'Sněžení', 73: 'Sněžení', 75: 'Sněžení',
  77: 'Sněhové zrnka',
  80: 'Přeháňky', 81: 'Přeháňky', 82: 'Přeháňky',
  85: 'Sněhové přeháňky', 86: 'Sněhové přeháňky',
  95: 'Bouřka', 96: 'Bouřka s kroupami', 99: 'Bouřka s kroupami'
};

const LOC = { lat: 50.08, lon: 14.43 };

async function fetchWeather() {
  try {
    const cached = localStorage.getItem(WEATHER_CACHE_KEY);
    if (cached) {
      const { data, timestamp } = JSON.parse(cached);
      if (Date.now() - timestamp < WEATHER_CACHE_TTL) {
        return data;
      }
    }

    const res = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${LOC.lat}&longitude=${LOC.lon}&current=temperature_2m,weather_code&timezone=Europe/Prague&forecast_days=1`
    );
    if (!res.ok) throw new Error('Weather fetch failed');
    const data = await res.json();

    localStorage.setItem(WEATHER_CACHE_KEY, JSON.stringify({
      data, timestamp: Date.now()
    }));
    return data;
  } catch (e) {
    const cached = localStorage.getItem(WEATHER_CACHE_KEY);
    if (cached) return JSON.parse(cached).data;
    return null;
  }
}

// ═══════════════════════════════════════════
// HEADER
// ═══════════════════════════════════════════
const header = container.createDiv({ cls: 'hp-header' });
header.createEl('h1', { text: 'JAN LEVÍNSKÝ', cls: 'hp-title' });

const meta = header.createDiv({ cls: 'hp-header-meta' });

// Weather bubble
const weatherEl = meta.createDiv({ cls: 'hp-meta-bubble' });
weatherEl.style.opacity = '0';
weatherEl.style.transition = 'opacity 0.4s cubic-bezier(0.0, 0.0, 0.2, 1)';

const weatherIcon = weatherEl.createEl('span', { cls: 'hp-meta-icon', text: '⏳' });
const weatherTemp = weatherEl.createEl('span', { cls: 'hp-meta-value', text: '--°' });
const weatherDesc = weatherEl.createEl('span', { cls: 'hp-meta-label', text: 'načítání…' });

// Streak bubble
const streakEl = meta.createDiv({ cls: 'hp-meta-bubble' });
streakEl.createEl('span', { cls: 'hp-meta-icon', text: '🔥' });
streakEl.createEl('span', { cls: 'hp-meta-value', text: `${streak}d` });
streakEl.createEl('span', { cls: 'hp-meta-label', text: 'streak' });

// Time bubble — realtime
const timeEl = meta.createDiv({ cls: 'hp-meta-bubble' });
const timeIcon = timeEl.createEl('span', { cls: 'hp-meta-icon', text: '◷' });
const timeValue = timeEl.createEl('span', { cls: 'hp-meta-value', text: '--:--' });
timeEl.createEl('span', { cls: 'hp-meta-label', text: 'cest' });

const updateClock = () => {
  timeValue.textContent = new Date().toLocaleTimeString('cs-CZ', {
    hour: '2-digit', minute: '2-digit', second: '2-digit'
  });
};
updateClock();
setInterval(updateClock, 1000);

// Fetch weather
fetchWeather().then(data => {
  if (!data || !data.current) return;
  const code = data.current.weather_code;
  const temp = Math.round(data.current.temperature_2m);
  const icon = weatherIcons[code] || '🌡️';
  const desc = weatherDescriptions[code] || 'Neznámé';

  weatherIcon.textContent = icon;
  weatherTemp.textContent = `${temp}°`;
  weatherDesc.textContent = desc;
  weatherEl.style.opacity = '1';
}).catch(() => {
  weatherIcon.textContent = '—';
  weatherTemp.textContent = '';
  weatherDesc.textContent = 'nedostupné';
  weatherEl.style.opacity = '1';
});

// ═══════════════════════════════════════════
// SPACES — Projects with expandable files
// ═══════════════════════════════════════════
const spaces = container.createDiv({ cls: 'hp-spaces' });

const statusColors = {
  active: 'var(--bronze)',
  paused: '#8c8c8c',
  completed: '#5a8c5a',
  archived: '#555555'
};

const statusLabels = {
  active: 'AKTIVNÍ',
  paused: 'POZASTAVENO',
  completed: 'HOTOVO',
  archived: 'ARCHIV'
};

const spaceData = [
  {
    id: 'Film & Foto',
    label: 'FILM & FOTO',
    path: 'Film & Foto',
    icon: '🎬',
    accent: 'var(--bronze)'
  },
  {
    id: 'skola',
    label: 'STUDIUM',
    path: 'Škola',
    icon: '🎓',
    accent: '#6b8cae'
  },
  {
    id: 'produkce',
    label: 'PRODUKCE',
    path: 'Produkce',
    icon: '🎥',
    accent: '#8cae7a'
  },
  {
    id: 'zivot',
    label: 'ŽIVOT',
    path: 'Život',
    icon: '🏠',
    accent: '#ae8c7a'
  }
];

for (const s of spaceData) {
  // Get all files in this space folder
  const allFiles = dv.pages(`"${s.path}"`);
  
  // Get projects (files with type: project)
  const projects = allFiles.where(p => p.type === 'project').sort(p => p.file.mtime, 'desc');
  const activeProjects = projects.where(p => p.status === 'active');
  const activeCount = activeProjects.length;

  const space = spaces.createDiv({ cls: 'hp-space' });
  space.style.setProperty('--space-accent', s.accent);

  // Accent bar
  space.createDiv({ cls: 'hp-space-accent' });

  // Top row: icon + count
  const topRow = space.createDiv({ cls: 'hp-space-top' });
  topRow.createEl('span', { cls: 'hp-space-icon', text: s.icon });
  
  const countWrap = topRow.createDiv({ cls: 'hp-space-count-wrap' });
  countWrap.createEl('span', { cls: 'hp-space-count', text: `${activeCount}` });
  countWrap.createEl('span', { cls: 'hp-space-count-label', text: activeCount === 1 ? 'aktivní' : 'aktivních' });

  // Label
  space.createEl('h3', { cls: 'hp-space-title', text: s.label });

  // Status line
  const status = space.createDiv({ cls: 'hp-space-status' });
  if (activeCount > 0) {
    status.createEl('span', { cls: 'hp-space-status-dot' });
    status.createEl('span', { cls: 'hp-space-status-text', text: `${activeCount} aktivních projektů` });
  } else {
    status.createEl('span', { cls: 'hp-space-status-text', text: 'Žádný aktivní projekt' });
  }

  // Click hint
  space.createEl('span', { cls: 'hp-space-hint', text: 'klikni pro více' });

  // Projects panel (hidden by default)
  const projectsPanel = space.createDiv({ cls: 'hp-space-projects' });
  
  if (projects.length > 0) {
    const projectsList = projectsPanel.createEl('ul', { cls: 'hp-projects-list' });
    
    for (const proj of projects) {
      const projStatus = proj.status || 'unknown';
      const statusColor = statusColors[projStatus] || 'var(--text-muted)';
      const statusLabel = statusLabels[projStatus] || projStatus.toUpperCase();
      const projName = proj.project || proj.file.name;
      
      // Project item
      const li = projectsList.createEl('li', { cls: 'hp-project-item' });
      
      // Project header — clickable to expand files, NOT a link
      const projHeader = li.createDiv({ cls: 'hp-project-header' });
      
      // Project name — plain text, NOT a link
      projHeader.createEl('span', {
        text: projName,
        cls: 'hp-project-name'
      });

      const badge = projHeader.createEl('span', { 
        text: statusLabel,
        cls: 'hp-project-badge'
      });
      badge.style.setProperty('--badge-color', statusColor);
      
      // Files under this project
      const projectFiles = allFiles.where(p => 
        p.project === projName && p.type !== 'project'
      ).sort(p => p.file.mtime, 'desc');
      
      if (projectFiles.length > 0) {
        const filesWrap = li.createDiv({ cls: 'hp-project-files' });
        const filesList = filesWrap.createEl('ul', { cls: 'hp-files-list' });
        
        for (const f of projectFiles) {
          const fileLi = filesList.createEl('li');
          const fileLink = fileLi.createEl('a', {
            text: f.file.name,
            href: f.file.path,
            cls: 'internal-link hp-file-name'
          });
          fileLink.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            app.workspace.openLinkText(f.file.path, '');
          });
        }
        
        // Expand/collapse files on header click
        projHeader.style.cursor = 'pointer';
        projHeader.addEventListener('click', (e) => {
          // Stop propagation so space doesn't close
          e.stopPropagation();
          li.classList.toggle('hp-project-expanded');
        });
      } else {
        // Even without files, header is clickable but does nothing visually
        projHeader.style.cursor = 'default';
      }
    }
  } else {
    projectsPanel.createEl('p', { 
      text: 'Žádné projekty', 
      cls: 'hp-projects-empty' 
    });
  }

  // Click to toggle space — only on space itself, not on projects
  space.style.cursor = 'pointer';
  space.addEventListener('click', (e) => {
    // Don't toggle if clicking inside projects panel
    if (e.target.closest('.hp-space-projects')) return;
    
    // Close other spaces
    document.querySelectorAll('.hp-space-expanded').forEach(el => {
      if (el !== space) el.classList.remove('hp-space-expanded');
    });
    
    space.classList.toggle('hp-space-expanded');
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
    const logPath = `život/Log/${year}/${month}/${todayLog}.md`;

    let logFile = app.vault.getAbstractFileByPath(logPath);
    if (!logFile) {
      const paths = ['život/Log', `život/Log/${year}`, `život/Log/${year}/${month}`];
      for (const p of paths) {
        if (!app.vault.getAbstractFileByPath(p)) await app.vault.createFolder(p);
      }
      await app.vault.create(logPath, `---\ncreated: ${moment().format('YYYY-MM-DD')}\ndevice: LevinskyJ Desktop\ntags: [log, život]\n---\n\n<div style="text-align: center; color: gray; font-size: 1.1em; margin-bottom: 20px; font-family: Courier New">\n  ${moment().format('dd DD. MMMM YYYY')}\n</div>\n\n---\n\n`);
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

let widgetOrder = ['tasks', 'calendar', 'inbox'];
try {
  const saved = localStorage.getItem('homepage-widget-order');
  if (saved) {
    const parsed = JSON.parse(saved);
    const valid = ['tasks', 'calendar', 'inbox'];
    if (parsed.every(w => valid.includes(w)) && parsed.length === 3) {
      widgetOrder = parsed;
    }
  }
} catch (e) {}

const widgetData = {
  tasks: { title: 'AKTIVNÍ ÚKOLY', render: renderTasksWidget },
  calendar: { title: 'KALENDÁŘ', render: renderCalendarWidget },
  inbox: { title: 'INBOX', render: renderInboxWidget }
};

for (const widgetId of widgetOrder) {
  const data = widgetData[widgetId];
  if (!data) continue;

  const widgetEl = widgetGrid.createDiv({ cls: 'hp-widget' });
  widgetEl.setAttribute('data-widget-id', widgetId);
  widgetEl.setAttribute('draggable', 'true');

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
        const logPath = `život/Log/${dayMoment.format('YYYY')}/${dayMoment.format('MM')}/${dayMoment.format('DD.MM.YYYY')}.md`;
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
    .limit(8);

  if (inboxFiles.length > 0) {
    const ul = container.createEl('ul', { cls: 'hp-list hp-inbox-list' });
    for (const f of inboxFiles) {
      const li = ul.createEl('li');
      li.classList.add('hp-inbox-item');

      const link = li.createEl('a', {
        text: f.file.name,
        href: f.file.path,
        cls: 'internal-link hp-link'
      });
      link.addEventListener('click', (e) => {
        e.preventDefault();
        app.workspace.openLinkText(f.file.path, '');
      });

      const tags = f.file.tags || f.tags || [];
      const uniqueTags = [...new Set(tags)].filter(t => t && t !== '#quick-capture' && t !== '#inbox');

      if (uniqueTags.length > 0) {
        const tagWrap = li.createDiv({ cls: 'hp-inbox-tags' });
        for (const tag of uniqueTags.slice(0, 3)) {
          const cleanTag = tag.replace(/^#/, '');
          tagWrap.createEl('span', { text: cleanTag, cls: 'hp-inbox-tag' });
        }
        if (uniqueTags.length > 3) {
          tagWrap.createEl('span', { text: `+${uniqueTags.length - 3}`, cls: 'hp-inbox-tag hp-inbox-tag-more' });
        }
      }
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