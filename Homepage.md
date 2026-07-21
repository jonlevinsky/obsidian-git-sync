---
cssclasses: homepage-dashboard
---

```dataviewjs
const container = dv.container;
container.classList.add('homepage-root');

// ═══════════════════════════════════════════
// LOG DATA
// ═══════════════════════════════════════════
const logPages = dv.pages('"Život/Log"');
const logData = new Map();
const moodData = new Map();

for (const page of logPages) {
  const match = page.file.path.match(/(\d{2})\.(\d{2})\.(\d{4})\.md$/);
  if (match) {
    const key = `${match[3]}-${match[2]}-${match[1]}`;
    const size = page.file.size || 0;
    const wordCount = Math.max(0, Math.round((size - 200) / 5));
    logData.set(key, wordCount);

    if (page.mood) {
      moodData.set(key, String(page.mood).toLowerCase().trim());
    }
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
// MOOD CONFIG
// ═══════════════════════════════════════════
const moodConfig = {
  good:   { emoji: '😁', label: 'Skvěle', color: '#7cb87c' },
  ok:     { emoji: '😊', label: 'Dobře', color: '#b8b87c' },
  normal: { emoji: '🫤', label: 'Normálně', color: '#b8a07c' },
  tired:  { emoji: '🥱', label: 'Unaveně', color: '#b88c7c' },
  bad:    { emoji: '😟', label: 'Špatně', color: '#b87c7c' }
};

function getMoodInfo(moodStr) {
  const normalized = String(moodStr).toLowerCase().trim();
  return moodConfig[normalized] || null;
}

function getTodayMood() {
  const todayKey = moment().format('YYYY-MM-DD');
  return moodData.get(todayKey) || null;
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

// ═══════════════════════════════════════════
// MOOD BUBBLE — pill s dropdown pickerem
// ═══════════════════════════════════════════
const moodEl = meta.createDiv({ cls: 'hp-meta-bubble hp-mood-bubble' });
const todayMood = getTodayMood();
const todayMoodInfo = todayMood ? getMoodInfo(todayMood) : null;

// Default display: "🫥 NÁLADA" (vždy, i když už máš náladu zapsanou)
const moodDisplay = moodEl.createDiv({ cls: 'hp-mood-display' });
const moodEmojiSpan = moodDisplay.createEl('span', { 
  cls: 'hp-mood-emoji', 
  text: todayMoodInfo ? todayMoodInfo.emoji : '🫥' 
});
moodDisplay.createEl('span', { cls: 'hp-mood-text', text: 'NÁLADA' });

if (todayMoodInfo) {
  moodEl.style.borderColor = `color-mix(in srgb, ${todayMoodInfo.color} 30%, var(--border))`;
}

// Horizontal mood picker — hidden by default
const moodPicker = moodEl.createDiv({ cls: 'hp-mood-picker' });

for (const [key, info] of Object.entries(moodConfig)) {
  const btn = moodPicker.createEl('button', { 
    text: info.emoji,
    cls: 'hp-mood-picker-btn',
    attr: { 'data-mood': key, 'title': info.label }
  });

  btn.addEventListener('click', async (e) => {
    e.stopPropagation();

    const today = moment().format('DD.MM.YYYY');
    const year = moment().format('YYYY');
    const month = moment().format('MM');
    const logPath = `Život/Log/${year}/${month}/${today}.md`;

    let logFile = app.vault.getAbstractFileByPath(logPath);

    if (!logFile) {
      const paths = ['Život/Log', `Život/Log/${year}`, `Život/Log/${year}/${month}`];
      for (const p of paths) {
        if (!app.vault.getAbstractFileByPath(p)) await app.vault.createFolder(p);
      }
      await app.vault.create(logPath, `---
created: ${moment().format('YYYY-MM-DD')}
device: LevinskyJ Desktop
tags: [log, Život]
mood: ${key}
---

<div style="text-align: center; color: gray; font-size: 1.1em; margin-bottom: 20px; font-family: Courier New">
  ${moment().format('dd DD. MMMM YYYY')}
</div>

---

`);
    } else {
      const content = await app.vault.read(logFile);
      let newContent;
      if (content.match(/^mood:\s*.+$/m)) {
        newContent = content.replace(/^mood:\s*.+$/m, `mood: ${key}`);
      } else {
        newContent = content.replace(/^(---\n)/, `$1mood: ${key}\n`);
      }
      await app.vault.modify(logFile, newContent);
    }

    // Update emoji v pillu
    moodEmojiSpan.textContent = info.emoji;
    moodEl.style.borderColor = `color-mix(in srgb, ${info.color} 30%, var(--border))`;

    // Zavřít picker
    moodEl.classList.remove('hp-mood-open');

    new Notice(`Nálada: ${info.label}`);
  });
}

// Toggle picker on click (ne na picker tlačítka)
moodEl.addEventListener('click', (e) => {
  if (e.target.closest('.hp-mood-picker-btn')) return;

  // Zavřít ostatní otevřené
  document.querySelectorAll('.hp-mood-open').forEach(el => {
    if (el !== moodEl) el.classList.remove('hp-mood-open');
  });

  moodEl.classList.toggle('hp-mood-open');
});

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

// Close mood picker on outside click
container.addEventListener('click', (e) => {
  if (!e.target.closest('.hp-mood-bubble')) {
    document.querySelectorAll('.hp-mood-open').forEach(el => {
      el.classList.remove('hp-mood-open');
    });
  }
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
    accent: 'var(--bronze)',
    itemLabels: { one: 'projekt', few: 'projekty', many: 'projektů' }
  },
  {
    id: 'skola',
    label: 'STUDIUM',
    path: 'Škola',
    icon: '🎓',
    accent: '#6b8cae',
    itemLabels: { one: 'předmět', few: 'předměty', many: 'předmětů' }
  },
  {
    id: 'produkce',
    label: 'PRODUKCE',
    path: 'Produkce',
    icon: '🎥',
    accent: '#8cae7a',
    itemLabels: { one: 'projekt', few: 'projekty', many: 'projektů' }
  },
  {
    id: 'zivot',
    label: 'Život',
    path: 'Život',
    icon: '🏠',
    accent: '#ae8c7a',
    itemLabels: { one: 'projekt', few: 'projekty', many: 'projektů' }
  }
];

function getAllFileTags(file) {
  const tags = file.file.tags || [];
  return tags.map(t => t.replace(/^#/, '').toLowerCase());
}

function fileMatchesProjectTags(file, projectTags) {
  let tags = [];
  if (projectTags) {
    if (Array.isArray(projectTags)) {
      tags = projectTags;
    } else if (typeof projectTags === 'string') {
      tags = [projectTags];
    }
  }
  if (tags.length === 0) return false;
  const fileTags = getAllFileTags(file);
  const fileTagSet = new Set(fileTags);
  return tags.some(tag => fileTagSet.has(tag.toLowerCase()));
}

function getProjectProgress(proj) {
  // Try to get progress from frontmatter
  if (proj.progress !== undefined && proj.progress !== null) {
    return Math.min(100, Math.max(0, parseInt(proj.progress) || 0));
  }

  // Calculate from tasks
  try {
    const allTasks = dv.pages().file.tasks.where(t => {
      return t.path && t.path.startsWith(proj.file.folder);
    });
    const total = allTasks.length;
    if (total === 0) return null;
    const completed = allTasks.where(t => t.completed).length;
    return Math.round((completed / total) * 100);
  } catch (e) {
    return null;
  }
}

for (const s of spaceData) {
  const labels = s.itemLabels || { one: 'projekt', few: 'projekty', many: 'projektů' };

  const allFiles = dv.pages(`"${s.path}"`);

  const projects = allFiles.where(p => p.type === 'project').sort(p => {
    const pinned = p.pin === true ? 1 : 0;
    return pinned * 1e15 + p.file.mtime;
  }, 'desc');
  const activeProjects = projects.where(p => p.status === 'active');
  const activeCount = activeProjects.length;

  const space = spaces.createDiv({ cls: 'hp-space' });
  space.style.setProperty('--space-accent', s.accent);

  space.createDiv({ cls: 'hp-space-accent' });

  const topRow = space.createDiv({ cls: 'hp-space-top' });
  topRow.createEl('span', { cls: 'hp-space-icon', text: s.icon });

  const countWrap = topRow.createDiv({ cls: 'hp-space-count-wrap' });
  countWrap.createEl('span', { cls: 'hp-space-count', text: `${activeCount}` });
  const countLabel = activeCount === 1 ? labels.one : labels.many;
  countWrap.createEl('span', { cls: 'hp-space-count-label', text: countLabel });

  space.createEl('h3', { cls: 'hp-space-title', text: s.label });

  const status = space.createDiv({ cls: 'hp-space-status' });
  if (activeCount > 0) {
    status.createEl('span', { cls: 'hp-space-status-dot' });
    let projText;
    if (activeCount === 1) {
      projText = `1 aktivní ${labels.one}`;
    } else if (activeCount >= 2 && activeCount <= 4) {
      projText = `${activeCount} aktivní ${labels.few}`;
    } else {
      projText = `${activeCount} aktivních ${labels.many}`;
    }
    status.createEl('span', { cls: 'hp-space-status-text', text: projText });
  } else {
    status.createEl('span', { cls: 'hp-space-status-text', text: `Žádný aktivní ${labels.one}` });
  }

  space.createEl('span', { cls: 'hp-space-hint', text: 'klikni pro více' });

  const projectsPanel = space.createDiv({ cls: 'hp-space-projects' });

  if (projects.length > 0) {
    const projectsList = projectsPanel.createEl('ul', { cls: 'hp-projects-list' });

    for (const proj of projects) {
      const projStatus = proj.status || 'unknown';
      const statusColor = statusColors[projStatus] || 'var(--text-muted)';
      const statusLabel = statusLabels[projStatus] || projStatus.toUpperCase();
      const projName = proj.project || proj.file.name;
      const progress = getProjectProgress(proj);

      let projectTags = [];
      if (proj.project_tags) {
        if (Array.isArray(proj.project_tags)) {
          projectTags = proj.project_tags;
        } else if (typeof proj.project_tags === 'string') {
          projectTags = [proj.project_tags];
        }
      }

      const li = projectsList.createEl('li', { cls: 'hp-project-item' });

      const projHeader = li.createDiv({ cls: 'hp-project-header' });

      if (proj.pin === true) {
        const pinIcon = projHeader.createEl('span', {
          text: '◈',
          cls: 'hp-project-pin'
        });
        pinIcon.style.marginRight = '6px';
        pinIcon.style.color = 'var(--space-accent)';
        pinIcon.style.fontSize = '0.85em';
        pinIcon.style.opacity = '0.9';
      }

      projHeader.createEl('span', {
        text: projName,
        cls: 'hp-project-name'
      });

      const badge = projHeader.createEl('span', { 
        text: statusLabel,
        cls: 'hp-project-badge'
      });
      badge.style.setProperty('--badge-color', statusColor);

      // Progress bar — only for active projects
      if (projStatus === 'active' && progress !== null) {
        const progressWrap = li.createDiv({ cls: 'hp-project-progress' });
        const progressBar = progressWrap.createDiv({ cls: 'hp-project-progress-bar' });
        progressBar.style.width = `${progress}%`;
        progressBar.style.setProperty('--space-accent', s.accent);
      }

      const explicitFiles = allFiles.where(p => {
        if (p.type === 'project') return false;
        return p.project === projName;
      });

      let taggedFiles = [];
      if (projectTags.length > 0) {
        const tagQueries = projectTags.map(t => `#${t}`).join(' OR ');
        try {
          taggedFiles = dv.pages(tagQueries).where(p => {
            if (p.type === 'project') return false;
            if (p.project === projName) return false;
            return fileMatchesProjectTags(p, projectTags);
          });
        } catch (e) {
          taggedFiles = dv.pages().where(p => {
            if (p.type === 'project') return false;
            if (p.project === projName) return false;
            return fileMatchesProjectTags(p, projectTags);
          });
        }
      }

      const fileMap = new Map();
      for (const f of explicitFiles) {
        fileMap.set(f.file.path, { file: f, source: 'explicit' });
      }
      for (const f of taggedFiles) {
        if (!fileMap.has(f.file.path)) {
          fileMap.set(f.file.path, { file: f, source: 'tag' });
        }
      }

      const projectFiles = Array.from(fileMap.values())
        .sort((a, b) => (b.file.file.mtime || 0) - (a.file.file.mtime || 0));

      if (projectFiles.length > 0) {
        const filesWrap = li.createDiv({ cls: 'hp-project-files' });
        const filesList = filesWrap.createEl('ul', { cls: 'hp-files-list' });

        for (const { file: f, source } of projectFiles) {
          const fileLi = filesList.createEl('li');

          const fileRow = fileLi.createDiv({ cls: 'hp-file-row' });

          const fileLink = fileRow.createEl('a', {
            text: f.file.name,
            href: f.file.path,
            cls: 'internal-link hp-file-name'
          });
          fileLink.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            app.workspace.openLinkText(f.file.path, '');
          });

          const fileTags = getAllFileTags(f);
          const matchingTags = projectTags.filter(pt => 
            fileTags.includes(pt.toLowerCase())
          );

          if (matchingTags.length > 0) {
            const tagWrap = fileRow.createDiv({ cls: 'hp-file-tag-wrap' });
            tagWrap.style.display = 'inline-flex';
            tagWrap.style.gap = '3px';
            tagWrap.style.marginLeft = '6px';
            tagWrap.style.flexShrink = '0';
            tagWrap.style.alignItems = 'center';

            for (const mt of matchingTags.slice(0, 2)) {
              const pill = tagWrap.createEl('span', { 
                text: `#${mt}`, 
                cls: 'hp-file-tag' 
              });
              pill.style.display = 'inline-flex';
              pill.style.alignItems = 'center';
              pill.style.padding = '0px 5px';
              pill.style.borderRadius = '4px';
              pill.style.fontSize = '0.6em';
              pill.style.fontWeight = '500';
              pill.style.letterSpacing = '0.02em';
              pill.style.background = 'color-mix(in srgb, var(--space-accent) 12%, transparent)';
              pill.style.color = 'var(--space-accent)';
              pill.style.border = '0.5px solid color-mix(in srgb, var(--space-accent) 20%, transparent)';
              pill.style.whiteSpace = 'nowrap';
              pill.style.lineHeight = '1.4';
              pill.style.opacity = '0.85';
            }

            if (matchingTags.length > 2) {
              const more = tagWrap.createEl('span', { 
                text: `+${matchingTags.length - 2}`, 
                cls: 'hp-file-tag hp-file-tag-more' 
              });
              more.style.display = 'inline-flex';
              more.style.alignItems = 'center';
              more.style.padding = '0px 4px';
              more.style.borderRadius = '4px';
              more.style.fontSize = '0.6em';
              more.style.fontWeight = '500';
              more.style.background = 'var(--background-modifier-hover)';
              more.style.color = 'var(--text-muted)';
              more.style.border = '0.5px solid var(--background-modifier-border)';
              more.style.whiteSpace = 'nowrap';
              more.style.lineHeight = '1.4';
              more.style.opacity = '0.7';
            }
          }
        }

        projHeader.style.cursor = 'pointer';
        projHeader.addEventListener('click', (e) => {
          e.stopPropagation();
          li.classList.toggle('hp-project-expanded');
        });
      } else {
        projHeader.style.cursor = 'default';
      }
    }
  } else {
    projectsPanel.createEl('p', { 
      text: 'Žádné projekty', 
      cls: 'hp-projects-empty' 
    });
  }

  space.style.cursor = 'pointer';
  space.addEventListener('click', (e) => {
    if (e.target.closest('.hp-space-projects')) return;

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
const taskPill = pillGroup.createEl('button', { text: '[ ]', cls: 'hp-pill', attr: { title: 'Rychlý úkol' } });

const setMode = (mode) => {
  captureMode = mode;
  logPill.classList.remove('hp-pill-active');
  inboxPill.classList.remove('hp-pill-active');
  taskPill.classList.remove('hp-pill-active');
  if (mode === 'log') {
    logPill.classList.add('hp-pill-active');
    captureInput.placeholder = 'Zapsat do logu...';
  } else if (mode === 'inbox') {
    inboxPill.classList.add('hp-pill-active');
    captureInput.placeholder = 'Nová poznámka...';
  } else {
    taskPill.classList.add('hp-pill-active');
    captureInput.placeholder = 'Nový úkol...';
  }
};

logPill.addEventListener('click', () => setMode('log'));
inboxPill.addEventListener('click', () => setMode('inbox'));
taskPill.addEventListener('click', () => setMode('task'));

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
    const logPath = `Život/Log/${year}/${month}/${todayLog}.md`;

    let logFile = app.vault.getAbstractFileByPath(logPath);
    if (!logFile) {
      const paths = ['Život/Log', `Život/Log/${year}`, `Život/Log/${year}/${month}`];
      for (const p of paths) {
        if (!app.vault.getAbstractFileByPath(p)) await app.vault.createFolder(p);
      }
      await app.vault.create(logPath, `---
created: ${moment().format('YYYY-MM-DD')}
device: LevinskyJ Desktop
tags: [log, Život]
---

<div style="text-align: center; color: gray; font-size: 1.1em; margin-bottom: 20px; font-family: Courier New">
  ${moment().format('dd DD. MMMM YYYY')}
</div>

---

`);
      logFile = app.vault.getAbstractFileByPath(logPath);
    }

    const existing = await app.vault.read(logFile);
    const newContent = existing + `\n- ${text}\n`;
    await app.vault.modify(logFile, newContent);

    captureInput.value = '';
    new Notice('Zapsáno do logu');

  } else if (captureMode === 'task') {
    const todayLog = moment().format('DD.MM.YYYY');
    const year = moment().format('YYYY');
    const month = moment().format('MM');
    const logPath = `Život/Log/${year}/${month}/${todayLog}.md`;

    let logFile = app.vault.getAbstractFileByPath(logPath);
    if (!logFile) {
      const paths = ['Život/Log', `Život/Log/${year}`, `Život/Log/${year}/${month}`];
      for (const p of paths) {
        if (!app.vault.getAbstractFileByPath(p)) await app.vault.createFolder(p);
      }
      await app.vault.create(logPath, `---
created: ${moment().format('YYYY-MM-DD')}
device: LevinskyJ Desktop
tags: [log, Život]
---

<div style="text-align: center; color: gray; font-size: 1.1em; margin-bottom: 20px; font-family: Courier New">
  ${moment().format('dd DD. MMMM YYYY')}
</div>

---
`);
      logFile = app.vault.getAbstractFileByPath(logPath);
    }

    const existing = await app.vault.read(logFile);
    const newContent = existing + `\n- [ ] ${text}\n`;
    await app.vault.modify(logFile, newContent);

    captureInput.value = '';
    new Notice('Úkol přidán do logu');
    return;

  } else {
    const now = moment();
    const dateStamp = now.format('YYYY.MM.DD.');
    const timeStamp = now.format('HH-mm-ss');
    const fileName = `${dateStamp} - ${timeStamp}.md`;
    const filePath = `Inbox/${fileName}`;

    if (!app.vault.getAbstractFileByPath('Inbox')) {
      await app.vault.createFolder('Inbox');
    }

    // Auto-detect tags from text (e.g. #idea, #todo)
    const tagRegex = /#([a-zA-Z0-9_-]+)/g;
    const foundTags = [];
    let cleanText = text;
    let tagMatch;
    while ((tagMatch = tagRegex.exec(text)) !== null) {
      foundTags.push(tagMatch[1]);
      cleanText = cleanText.replace(tagMatch[0], '').trim();
    }
    const allTags = ['inbox', ...foundTags];
    const tagsYaml = allTags.map(t => `"${t}"`).join(', ');

    // Detect links
    const hasLink = /https?:\/\/|www\./.test(text);

    // Match Quick Drafts template format
    const fileContent = `---
created: ${now.format('YYYY-MM-DD HH:mm:ss')}
device: LevinskyJ Desktop
tags: [${tagsYaml}]
source: quick-capture
status: unread
has_link: ${hasLink}
---

${cleanText}
`;

    await app.vault.create(filePath, fileContent);

    captureInput.value = '';
    new Notice(`Vytvořeno ${fileName}`);
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

// Collapsed state
let collapsedWidgets = new Set();
try {
  const savedCollapsed = localStorage.getItem('homepage-collapsed-widgets');
  if (savedCollapsed) {
    collapsedWidgets = new Set(JSON.parse(savedCollapsed));
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

  const isCollapsed = collapsedWidgets.has(widgetId);

  const widgetEl = widgetGrid.createDiv({ 
    cls: `hp-widget ${isCollapsed ? 'hp-widget-collapsed' : ''}` 
  });
  widgetEl.setAttribute('data-widget-id', widgetId);
  widgetEl.setAttribute('draggable', 'true');

  const handle = widgetEl.createDiv({ cls: 'hp-widget-handle' });
  handle.createEl('span', { text: '⋮⋮', cls: 'hp-widget-handle-icon' });
  handle.createEl('span', { text: data.title, cls: 'hp-panel-title hp-widget-title' });

  // Collapse button
  const collapseBtn = handle.createEl('button', { 
    text: isCollapsed ? '▶' : '▼',
    cls: 'hp-widget-collapse-btn'
  });
  collapseBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    widgetEl.classList.toggle('hp-widget-collapsed');
    const isNowCollapsed = widgetEl.classList.contains('hp-widget-collapsed');
    collapseBtn.textContent = isNowCollapsed ? '▶' : '▼';

    if (isNowCollapsed) {
      collapsedWidgets.add(widgetId);
    } else {
      collapsedWidgets.delete(widgetId);
    }
    localStorage.setItem('homepage-collapsed-widgets', JSON.stringify([...collapsedWidgets]));
  });

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
      const dayMood = moodData.get(key);
      const moodInfo = dayMood ? getMoodInfo(dayMood) : null;
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

      if (moodInfo) {
        cell.createEl('span', { 
          text: moodInfo.emoji, 
          cls: 'hp-cal-widget-mood' 
        });
      }

      if (wordCount > 0) {
        cell.createDiv({ cls: 'hp-cal-widget-dot' });
        cell.setAttribute('title', `${dayMoment.format('DD.MM.YYYY')} — ${wordCount.toLocaleString('cs')} slov${dayMood ? ' — ' + moodInfo.label : ''}`);
      } else if (dayMood) {
        cell.setAttribute('title', `${dayMoment.format('DD.MM.YYYY')} — ${moodInfo.label}`);
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
    .limit(12);

  if (inboxFiles.length > 0) {
    const ul = container.createEl('ul', { cls: 'hp-list hp-inbox-list' });
    for (const f of inboxFiles) {
      const isUnread = f.status === 'unread';
      const hasLink = f.has_link === true;
      const source = f.source || 'unknown';

      const li = ul.createEl('li');
      li.classList.add('hp-inbox-item');
      if (isUnread) li.classList.add('hp-inbox-unread');

      const row = li.createDiv({ cls: 'hp-inbox-row' });

      // Unread dot
      if (isUnread) {
        row.createEl('span', { text: '●', cls: 'hp-inbox-unread-dot' });
      } else {
        row.createEl('span', { text: '○', cls: 'hp-inbox-read-dot' });
      }

      const link = row.createEl('a', {
        text: f.file.name,
        href: f.file.path,
        cls: 'internal-link hp-link'
      });
      link.addEventListener('click', async (e) => {
        e.preventDefault();
        // Mark as read on open
        if (isUnread) {
          try {
            const fileObj = app.vault.getAbstractFileByPath(f.file.path);
            if (fileObj) {
              const content = await app.vault.read(fileObj);
              const newContent = content.replace(/^status:\s*unread$/m, 'status: read');
              await app.vault.modify(fileObj, newContent);
            }
          } catch (err) {}
        }
        app.workspace.openLinkText(f.file.path, '');
      });

      // Tags — inside row
      const tags = f.file.tags || f.tags || [];
      const uniqueTags = [...new Set(tags)].filter(t => t && t !== '#quick-capture' && t !== '#inbox' && t !== '#quick-drafts');

      if (uniqueTags.length > 0) {
        for (const tag of uniqueTags.slice(0, 2)) {
          const cleanTag = tag.replace(/^#/, '');
          row.createEl('span', { text: cleanTag, cls: 'hp-inbox-tag-inline' });
        }
        if (uniqueTags.length > 2) {
          row.createEl('span', { text: `+${uniqueTags.length - 2}`, cls: 'hp-inbox-tag-inline hp-inbox-tag-more-inline' });
        }
      }

      // Link indicator
      if (hasLink) {
        row.createEl('span', { text: '🔗', cls: 'hp-inbox-link-icon' });
      }

      // Source indicator (mobile vs desktop) — ALWAYS LAST
      if (source === 'quick-drafts') {
        row.createEl('span', { text: '📱', cls: 'hp-inbox-source-icon', attr: { title: 'Quick Drafts' } });
      } else if (source === 'quick-capture') {
        row.createEl('span', { text: '💻', cls: 'hp-inbox-source-icon', attr: { title: 'Desktop' } });
      }
    }
  } else {
    container.createDiv({ cls: 'hp-empty' }).createEl('p', { text: 'Inbox je prázdný.' });
  }
}

// ═══════════════════════════════════════════
// NOW BAR — footer (dynamic, editable)
// ═══════════════════════════════════════════
const nowBar = container.createDiv({ cls: 'hp-now' });
nowBar.style.marginTop = '24px';
nowBar.style.paddingTop = '16px';
nowBar.style.borderTop = '1px solid var(--background-modifier-border)';
nowBar.style.opacity = '0.7';

nowBar.createEl('span', { cls: 'hp-now-label', text: 'NOW' });

const NOW_STORAGE_KEY = 'hp-now-items';
const DEFAULT_NOW_ITEMS = ['Hledání bytu Opava', 'Portfolio', 'Produkce'];

function loadNowItems() {
  try {
    const saved = localStorage.getItem(NOW_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) {}
  return [...DEFAULT_NOW_ITEMS];
}

function saveNowItems(items) {
  localStorage.setItem(NOW_STORAGE_KEY, JSON.stringify(items));
}

let nowItems = loadNowItems();

function renderNowBar() {
  // Remove everything after the label
  let el = nowBar.lastChild;
  while (el && el !== nowBar.firstChild) {
    const prev = el.previousSibling;
    nowBar.removeChild(el);
    el = prev;
  }

  nowItems.forEach((text, i) => {
    if (i > 0) nowBar.createEl('span', { cls: 'hp-now-sep', text: '·' });

    const itemEl = nowBar.createEl('span', { cls: 'hp-now-item', text });
    itemEl.style.cursor = 'pointer';
    itemEl.title = 'Klikni pro editaci, Esc=zrušit, smaž text pro smazání';

    itemEl.addEventListener('click', (e) => {
      e.stopPropagation();
      startEdit(itemEl, i);
    });
  });

  // Add button
  const addBtn = nowBar.createEl('span', { cls: 'hp-now-add', text: '+', title: 'Přidat položku' });
  addBtn.style.cssText = 'cursor:pointer;margin-left:8px;opacity:0.4;font-weight:700;font-size:1.1em';
  addBtn.addEventListener('mouseenter', () => addBtn.style.opacity = '1');
  addBtn.addEventListener('mouseleave', () => addBtn.style.opacity = '0.4');
  addBtn.addEventListener('click', () => {
    nowItems.push('');
    renderNowBar();
    // Auto-focus the last item (the new empty one)
    const spans = nowBar.querySelectorAll('.hp-now-item');
    const lastSpan = spans[spans.length - 1];
    if (lastSpan) lastSpan.click();
  });
}

function startEdit(span, index) {
  const input = document.createElement('input');
  input.type = 'text';
  input.value = nowItems[index];
  input.className = 'hp-now-input';
  input.style.cssText = `background:var(--background-modifier-hover);border:1px solid var(--interactive-accent);border-radius:4px;padding:2px 6px;font:inherit;color:inherit;width:${Math.max(80, input.value.length * 10 + 20)}px;outline:none`;

  input.addEventListener('input', () => {
    input.style.width = `${Math.max(80, input.value.length * 10 + 20)}px`;
  });

  const finish = () => {
    const val = input.value.trim();
    if (val) {
      nowItems[index] = val;
    } else {
      nowItems.splice(index, 1);
    }
    saveNowItems(nowItems);
    renderNowBar();
  };

  input.addEventListener('blur', finish);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { input.blur(); }
    if (e.key === 'Escape') { renderNowBar(); }
  });

  span.replaceWith(input);
  input.focus();
  input.select();
}

renderNowBar();