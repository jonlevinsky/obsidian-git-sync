const { Plugin, PluginSettingTab, Setting, ItemView, Modal, Notice, Platform, requestUrl, moment } = require('obsidian');

const VIEW_TYPE = 'levinskyj-homepage-view';
const VIEW_TYPE_CALENDAR = 'levinskyj-calendar-view';

const DEFAULT_SETTINGS = {
  openOnStartup: true,
  openInMain: true
};

const SUPABASE_URL = 'https://bkgfohfmnbmascomaozv.supabase.co/rest/v1';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJrZ2ZvaGZtbmJtYXNjb21hb3p2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgzMzMwMzYsImV4cCI6MjEwMzkwOTAzNn0.RgxJDflLqIuBIH17imSvdLmbRjg8Fp3vDWK_O5u6w-c';

async function syncQuickNotes(app, notify = false) {
  try {
    if (!app.vault.getAbstractFileByPath('Inbox')) {
      await app.vault.createFolder('Inbox');
    }

    const existingRemoteIds = new Set();
    const inboxFiles = app.vault.getMarkdownFiles().filter(f => f.path.startsWith('Inbox/'));

    for (const file of inboxFiles) {
      const cache = app.metadataCache.getFileCache(file);
      if (cache && cache.frontmatter && cache.frontmatter.remote_id !== undefined && cache.frontmatter.remote_id !== null) {
        existingRemoteIds.add(String(cache.frontmatter.remote_id));
      }
    }

    const res = await requestUrl({
      url: `${SUPABASE_URL}/quick_notes?select=*&order=id.asc`,
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`
      }
    });

    if (res.status !== 200 || !res.json || !Array.isArray(res.json)) {
      return 0;
    }

    const notes = res.json;
    let importedCount = 0;

    for (const note of notes) {
      if (!note.id || existingRemoteIds.has(String(note.id))) {
        continue;
      }

      const noteContent = (note.content || '').trim();
      if (!noteContent) continue;

      let noteMoment = moment();
      if (note.date) {
        const timePart = note.time ? ` ${note.time}` : '';
        const parsed = moment(`${note.date}${timePart}`, ['YYYY-MM-DD HH:mm:ss', 'YYYY-MM-DD HH:mm', 'YYYY-MM-DD']);
        if (parsed.isValid()) {
          noteMoment = parsed;
        }
      }

      const datePrefix = noteMoment.format('YYYY.MM.DD.');
      const timePrefix = noteMoment.format('HH-mm-ss');
      let baseName = `${datePrefix} - ${timePrefix}`;
      let filePath = `Inbox/${baseName}.md`;
      let counter = 1;

      while (app.vault.getAbstractFileByPath(filePath)) {
        filePath = `Inbox/${baseName} - ${note.id || counter}.md`;
        counter++;
      }

      const tagRegex = /#([a-zA-Z0-9_\u00C0-\u017F-]+)/g;
      const foundTags = [];
      let cleanText = noteContent;
      let tagMatch;
      while ((tagMatch = tagRegex.exec(noteContent)) !== null) {
        foundTags.push(tagMatch[1]);
        cleanText = cleanText.replace(tagMatch[0], '').trim();
      }

      if (note.tag && typeof note.tag === 'string') {
        const customTag = note.tag.trim().replace(/^#/, '');
        if (customTag && !foundTags.includes(customTag) && customTag.toLowerCase() !== 'log') {
          foundTags.push(customTag);
        }
      }

      const allTags = ['inbox', ...foundTags];
      const tagsYaml = allTags.map(t => JSON.stringify(t)).join(', ');
      const hasLink = /https?:\/\/|www\./.test(noteContent);
      const createdStr = noteMoment.format('YYYY-MM-DD HH:mm:ss');
      const safeRemoteId = JSON.stringify(String(note.id));

      const fileContent = `---\ncreated: ${createdStr}\ndevice: LevinskyJ Hub Android\ntags: [${tagsYaml}]\nsource: quick-capture\nstatus: unread\nhas_link: ${hasLink}\nremote_id: ${safeRemoteId}\n---\n\n${cleanText || noteContent}\n`;

      await app.vault.create(filePath, fileContent);
      existingRemoteIds.add(String(note.id));
      importedCount++;
    }

    if (importedCount > 0 && notify) {
      new Notice(`📥 Staženo ${importedCount} nových poznámek z mobilu`);
    }

    return importedCount;
  } catch (err) {
    console.error('Chyba při synchronizaci quick_notes:', err);
    return 0;
  }
}

// Weather Config
const WEATHER_CACHE_KEY = 'hp-weather-cache';
const WEATHER_CACHE_TTL = 10 * 60 * 1000;
const LOC = { lat: 50.08, lon: 14.43 };

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

const moodConfig = {
  good:   { emoji: '😁', label: 'Skvěle', color: '#7cb87c' },
  ok:     { emoji: '😊', label: 'Dobře', color: '#b8b87c' },
  normal: { emoji: '🫤', label: 'Normálně', color: '#b8a07c' },
  tired:  { emoji: '🥱', label: 'Unaveně', color: '#b88c7c' },
  bad:    { emoji: '😟', label: 'Špatně', color: '#b87c7c' }
};

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

const NOW_STORAGE_KEY = 'hp-now-items';
const DEFAULT_NOW_ITEMS = ['Hledání bytu Opava', 'Portfolio', 'Produkce'];

async function fetchWeather() {
  try {
    const cached = localStorage.getItem(WEATHER_CACHE_KEY);
    if (cached) {
      const { data, timestamp } = JSON.parse(cached);
      if (Date.now() - timestamp < WEATHER_CACHE_TTL) {
        return data;
      }
    }

    const res = await requestUrl({
      url: `https://api.open-meteo.com/v1/forecast?latitude=${LOC.lat}&longitude=${LOC.lon}&current=temperature_2m,weather_code&timezone=Europe/Prague&forecast_days=1`
    });

    if (res.status === 200 && res.json) {
      const data = res.json;
      localStorage.setItem(WEATHER_CACHE_KEY, JSON.stringify({
        data, timestamp: Date.now()
      }));
      return data;
    }
  } catch (e) {
    const cached = localStorage.getItem(WEATHER_CACHE_KEY);
    if (cached) return JSON.parse(cached).data;
  }
  return null;
}

class HomepageView extends ItemView {
  constructor(leaf, plugin) {
    super(leaf);
    this.plugin = plugin;
    this.clockInterval = null;
  }

  getViewType() { return VIEW_TYPE; }
  getDisplayText() { return 'Homepage'; }
  getIcon() { return 'layout-dashboard'; }

  async onOpen() {
    const container = this.contentEl;
    container.empty();
    container.classList.add('homepage-dashboard', 'homepage-root');

    // ── Log Data Scan ──
    const logFiles = this.app.vault.getMarkdownFiles().filter(f => f.path.startsWith('Život/Log/'));
    const logData = new Map();
    const moodData = new Map();

    for (const file of logFiles) {
      const match = file.path.match(/(\d{2})\.(\d{2})\.(\d{4})\.md$/);
      if (match) {
        const key = `${match[3]}-${match[2]}-${match[1]}`;
        const size = file.stat.size || 0;
        const wordCount = Math.max(0, Math.round((size - 200) / 5));
        logData.set(key, wordCount);

        const cache = this.app.metadataCache.getFileCache(file);
        if (cache && cache.frontmatter && cache.frontmatter.mood) {
          moodData.set(key, String(cache.frontmatter.mood).toLowerCase().trim());
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

    const getMoodInfo = (moodStr) => {
      const normalized = String(moodStr).toLowerCase().trim();
      return moodConfig[normalized] || null;
    };

    const getTodayMood = () => {
      const todayKey = moment().format('YYYY-MM-DD');
      return moodData.get(todayKey) || null;
    };

    // ── HEADER ──
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

    // Mood bubble
    const moodEl = meta.createDiv({ cls: 'hp-meta-bubble hp-mood-bubble' });
    const todayMood = getTodayMood();
    const todayMoodInfo = todayMood ? getMoodInfo(todayMood) : null;

    const moodDisplay = moodEl.createDiv({ cls: 'hp-mood-display' });
    const moodEmojiSpan = moodDisplay.createEl('span', { 
      cls: 'hp-mood-emoji', 
      text: todayMoodInfo ? todayMoodInfo.emoji : '🫥' 
    });
    moodDisplay.createEl('span', { cls: 'hp-mood-text', text: 'NÁLADA' });

    if (todayMoodInfo) {
      moodEl.style.borderColor = `color-mix(in srgb, ${todayMoodInfo.color} 30%, var(--border))`;
    }

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

        let logFile = this.app.vault.getAbstractFileByPath(logPath);

        if (!logFile) {
          const paths = ['Život/Log', `Život/Log/${year}`, `Život/Log/${year}/${month}`];
          for (const p of paths) {
            if (!this.app.vault.getAbstractFileByPath(p)) await this.app.vault.createFolder(p);
          }
          await this.app.vault.create(logPath, `---\ncreated: ${moment().format('YYYY-MM-DD')}\ndevice: LevinskyJ Desktop\ntags: [log, Život]\nmood: ${key}\n---\n\n<div style="text-align: center; color: gray; font-size: 1.1em; margin-bottom: 20px; font-family: Courier New">\n  ${moment().format('dd DD. MMMM YYYY')}\n</div>\n\n---\n\n`);
        } else {
          const content = await this.app.vault.read(logFile);
          let newContent;
          if (content.match(/^mood:\s*.+$/m)) {
            newContent = content.replace(/^mood:\s*.+$/m, `mood: ${key}`);
          } else {
            newContent = content.replace(/^(---\n)/, `$1mood: ${key}\n`);
          }
          await this.app.vault.modify(logFile, newContent);
        }

        moodEmojiSpan.textContent = info.emoji;
        moodEl.style.borderColor = `color-mix(in srgb, ${info.color} 30%, var(--border))`;
        moodEl.classList.remove('hp-mood-open');
        new Notice(`Nálada: ${info.label}`);
      });
    }

    moodEl.addEventListener('click', (e) => {
      if (e.target.closest('.hp-mood-picker-btn')) return;
      container.querySelectorAll('.hp-mood-open').forEach(el => {
        if (el !== moodEl) el.classList.remove('hp-mood-open');
      });
      moodEl.classList.toggle('hp-mood-open');
    });

    // Time bubble
    const timeEl = meta.createDiv({ cls: 'hp-meta-bubble' });
    timeEl.createEl('span', { cls: 'hp-meta-icon', text: '◷' });
    const timeValue = timeEl.createEl('span', { cls: 'hp-meta-value', text: '--:--' });
    timeEl.createEl('span', { cls: 'hp-meta-label', text: 'cest' });

    const updateClock = () => {
      timeValue.textContent = new Date().toLocaleTimeString('cs-CZ', {
        hour: '2-digit', minute: '2-digit', second: '2-digit'
      });
    };
    updateClock();
    if (this.clockInterval) clearInterval(this.clockInterval);
    this.clockInterval = setInterval(updateClock, 1000);

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

    container.addEventListener('click', (e) => {
      if (!e.target.closest('.hp-mood-bubble')) {
        container.querySelectorAll('.hp-mood-open').forEach(el => {
          el.classList.remove('hp-mood-open');
        });
      }
    });

    // ── SPACES ──
    const spaces = container.createDiv({ cls: 'hp-spaces' });
    const allVaultFiles = this.app.vault.getMarkdownFiles();

    const getAllFileTags = (file) => {
      const cache = this.app.metadataCache.getFileCache(file);
      const tags = new Set();
      if (cache && cache.frontmatter && cache.frontmatter.tags) {
        const fmTags = cache.frontmatter.tags;
        const arr = Array.isArray(fmTags) ? fmTags : String(fmTags).split(/[\s,]+/);
        for (const t of arr) {
          if (t) tags.add(String(t).replace(/^#/, '').toLowerCase().trim());
        }
      }
      if (cache && cache.tags) {
        for (const t of cache.tags) {
          if (t.tag) tags.add(String(t.tag).replace(/^#/, '').toLowerCase().trim());
        }
      }
      return Array.from(tags);
    };

    const fileMatchesProjectTags = (file, projectTags) => {
      let tags = [];
      if (projectTags) {
        if (Array.isArray(projectTags)) tags = projectTags;
        else if (typeof projectTags === 'string') tags = [projectTags];
      }
      if (tags.length === 0) return false;
      const fileTags = getAllFileTags(file);
      const fileTagSet = new Set(fileTags);
      return tags.some(tag => fileTagSet.has(String(tag).toLowerCase().trim()));
    };

    const getProjectProgress = (projFile, frontmatter) => {
      if (frontmatter && frontmatter.progress !== undefined && frontmatter.progress !== null) {
        return Math.min(100, Math.max(0, parseInt(frontmatter.progress) || 0));
      }
      const folderPath = projFile.parent ? projFile.parent.path : '';
      let total = 0;
      let completed = 0;
      const folderFiles = allVaultFiles.filter(f => f.path.startsWith(folderPath + '/'));
      for (const f of folderFiles) {
        const cache = this.app.metadataCache.getFileCache(f);
        if (cache && cache.listItems) {
          for (const item of cache.listItems) {
            if (item.task !== undefined) {
              total++;
              if (item.task === 'x' || item.task === 'X') completed++;
            }
          }
        }
      }
      if (total === 0) return null;
      return Math.round((completed / total) * 100);
    };

    for (const s of spaceData) {
      const labels = s.itemLabels || { one: 'projekt', few: 'projekty', many: 'projektů' };
      const sPathLower = s.path.toLowerCase();
      const spaceFiles = allVaultFiles.filter(f => {
        const pLower = f.path.toLowerCase();
        return pLower.startsWith(sPathLower + '/') || pLower.startsWith(sPathLower + '\\');
      });

      const projects = [];
      for (const f of spaceFiles) {
        const cache = this.app.metadataCache.getFileCache(f);
        const fm = cache ? cache.frontmatter : null;
        if (fm && fm.type === 'project') {
          projects.push({ file: f, fm });
        }
      }

      projects.sort((a, b) => {
        const pinA = a.fm.pin === true ? 1 : 0;
        const pinB = b.fm.pin === true ? 1 : 0;
        return (pinB * 1e15 + (b.file.stat.mtime || 0)) - (pinA * 1e15 + (a.file.stat.mtime || 0));
      });

      const activeProjects = projects.filter(p => p.fm.status === 'active');
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
        let projText = activeCount === 1 ? `1 aktivní ${labels.one}` : (activeCount >= 2 && activeCount <= 4 ? `${activeCount} aktivní ${labels.few}` : `${activeCount} aktivních ${labels.many}`);
        status.createEl('span', { cls: 'hp-space-status-text', text: projText });
      } else {
        status.createEl('span', { cls: 'hp-space-status-text', text: `Žádný aktivní ${labels.one}` });
      }

      space.createEl('span', { cls: 'hp-space-hint', text: 'klikni pro více' });

      const projectsPanel = space.createDiv({ cls: 'hp-space-projects' });

      if (projects.length > 0) {
        const projectsList = projectsPanel.createEl('ul', { cls: 'hp-projects-list' });

        for (const proj of projects) {
          const projStatus = proj.fm.status || 'unknown';
          const statusColor = statusColors[projStatus] || 'var(--text-muted)';
          const statusLabel = statusLabels[projStatus] || projStatus.toUpperCase();
          const projName = proj.fm.project || proj.file.basename;
          const progress = getProjectProgress(proj.file, proj.fm);

          let projectTags = [];
          if (proj.fm.project_tags) {
            if (Array.isArray(proj.fm.project_tags)) projectTags = proj.fm.project_tags;
            else if (typeof proj.fm.project_tags === 'string') projectTags = [proj.fm.project_tags];
          }

          const li = projectsList.createEl('li', { cls: 'hp-project-item' });
          const projHeader = li.createDiv({ cls: 'hp-project-header' });

          if (proj.fm.pin === true) {
            const pinIcon = projHeader.createEl('span', { text: '◈', cls: 'hp-project-pin' });
            pinIcon.style.marginRight = '6px';
            pinIcon.style.color = 'var(--space-accent)';
            pinIcon.style.fontSize = '0.85em';
            pinIcon.style.opacity = '0.9';
          }

          // Project Title - plain text title
          projHeader.createEl('span', {
            text: projName,
            cls: 'hp-project-name'
          });

          const badge = projHeader.createEl('span', { text: statusLabel, cls: 'hp-project-badge' });
          badge.style.setProperty('--badge-color', statusColor);

          if (projStatus === 'active' && progress !== null) {
            const progressWrap = li.createDiv({ cls: 'hp-project-progress' });
            const progressBar = progressWrap.createDiv({ cls: 'hp-project-progress-bar' });
            progressBar.style.width = `${progress}%`;
            progressBar.style.setProperty('--space-accent', s.accent);
          }

          // Search ALL VAULT FILES for notes connected to this project
          const projFolderPath = proj.file.parent ? proj.file.parent.path.toLowerCase() : '';

          // 1. Explicitly assigned notes (frontmatter `project: "ProjectName"`)
          const explicitFiles = allVaultFiles.filter(f => {
            if (f.path === proj.file.path) return false;
            const fm = (this.app.metadataCache.getFileCache(f) || {}).frontmatter;
            if (fm && fm.type === 'project') return false;
            return fm && fm.project && String(fm.project).toLowerCase().trim() === projName.toLowerCase().trim();
          });

          // 2. Subfolder notes (e.g. Produkce/LevinskyJ Hub/*)
          const folderFiles = (projFolderPath && projFolderPath !== sPathLower)
            ? allVaultFiles.filter(f => {
                if (f.path === proj.file.path) return false;
                const fm = (this.app.metadataCache.getFileCache(f) || {}).frontmatter;
                if (fm && fm.type === 'project') return false;
                const fPathLower = f.path.toLowerCase();
                return fPathLower.startsWith(projFolderPath + '/') || fPathLower.startsWith(projFolderPath + '\\');
              })
            : [];

          // 3. Vault-wide tagged notes matching `project_tags` (e.g. #levinskyj-hub, #dentlife, #fu)
          const taggedFiles = allVaultFiles.filter(f => {
            if (f.path === proj.file.path) return false;
            const fm = (this.app.metadataCache.getFileCache(f) || {}).frontmatter;
            if (fm && fm.type === 'project') return false;
            if (fm && fm.project && String(fm.project).toLowerCase().trim() === projName.toLowerCase().trim()) return false;
            return fileMatchesProjectTags(f, projectTags);
          });

          const fileMap = new Map();
          for (const f of explicitFiles) fileMap.set(f.path, f);
          for (const f of folderFiles) if (!fileMap.has(f.path)) fileMap.set(f.path, f);
          for (const f of taggedFiles) if (!fileMap.has(f.path)) fileMap.set(f.path, f);

          const projectFiles = Array.from(fileMap.values()).sort((a, b) => (b.stat.mtime || 0) - (a.stat.mtime || 0));

          const expandToggle = projHeader.createEl('span', {
            text: '▸',
            cls: 'hp-project-expand-toggle'
          });
          expandToggle.style.marginLeft = 'auto';
          expandToggle.style.fontSize = '0.8em';
          expandToggle.style.opacity = '0.6';
          expandToggle.style.transition = 'transform 0.2s ease';

          if (projectFiles.length > 0) {
            const filesWrap = li.createDiv({ cls: 'hp-project-files' });
            const filesList = filesWrap.createEl('ul', { cls: 'hp-files-list' });

            for (const f of projectFiles) {
              const fileLi = filesList.createEl('li');
              const fileRow = fileLi.createDiv({ cls: 'hp-file-row' });
              const fileLink = fileRow.createEl('a', { text: f.basename, href: f.path, cls: 'internal-link hp-file-name' });
              fileLink.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.app.workspace.openLinkText(f.path, '');
              });

              const fileTags = getAllFileTags(f);
              const matchingTags = projectTags.filter(pt => fileTags.includes(pt.toLowerCase().trim()));

              if (matchingTags.length > 0) {
                const tagWrap = fileRow.createDiv({ cls: 'hp-file-tag-wrap' });
                tagWrap.style.display = 'inline-flex';
                tagWrap.style.gap = '3px';
                tagWrap.style.marginLeft = '6px';
                tagWrap.style.flexShrink = '0';
                tagWrap.style.alignItems = 'center';

                for (const mt of matchingTags.slice(0, 2)) {
                  const pill = tagWrap.createEl('span', { text: `#${mt}`, cls: 'hp-file-tag' });
                  pill.style.display = 'inline-flex';
                  pill.style.alignItems = 'center';
                  pill.style.padding = '0px 5px';
                  pill.style.borderRadius = '4px';
                  pill.style.fontSize = '0.6em';
                  pill.style.fontWeight = '500';
                  pill.style.background = 'color-mix(in srgb, var(--space-accent) 12%, transparent)';
                  pill.style.color = 'var(--space-accent)';
                  pill.style.border = '0.5px solid color-mix(in srgb, var(--space-accent) 20%, transparent)';
                }
              }
            }

            projHeader.style.cursor = 'pointer';
            projHeader.addEventListener('click', (e) => {
              e.stopPropagation();
              li.classList.toggle('hp-project-expanded');
              const isExpanded = li.classList.contains('hp-project-expanded');
              expandToggle.style.transform = isExpanded ? 'rotate(90deg)' : 'none';
            });
          } else {
            expandToggle.style.display = 'none';
            projHeader.style.cursor = 'default';
          }
        }
      } else {
        projectsPanel.createEl('p', { text: 'Žádné projekty', cls: 'hp-projects-empty' });
      }

      space.style.cursor = 'pointer';
      space.addEventListener('click', (e) => {
        if (e.target.closest('.hp-space-projects')) return;
        container.querySelectorAll('.hp-space-expanded').forEach(el => {
          if (el !== space) el.classList.remove('hp-space-expanded');
        });
        space.classList.toggle('hp-space-expanded');
      });
    }

    // ── QUICK CAPTURE ──
    let captureMode = 'log';
    const captureBar = container.createDiv({ cls: 'hp-capture-bar' });
    const pillGroup = captureBar.createDiv({ cls: 'hp-pill-group' });
    const logPill = pillGroup.createEl('button', { text: 'LOG', cls: 'hp-pill hp-pill-active' });
    const inboxPill = pillGroup.createEl('button', { text: 'INBOX', cls: 'hp-pill' });
    const taskPill = pillGroup.createEl('button', { text: '[ ]', cls: 'hp-pill', attr: { title: 'Rychlý úkol' } });

    const captureInput = captureBar.createEl('input', { type: 'text', placeholder: 'Zapsat do logu...', cls: 'hp-capture-input' });
    const captureBtn = captureBar.createEl('button', { text: '→', cls: 'hp-capture-btn' });

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

    const doCapture = async () => {
      const text = captureInput.value.trim();
      if (!text) return;

      if (captureMode === 'log') {
        const todayLog = moment().format('DD.MM.YYYY');
        const year = moment().format('YYYY');
        const month = moment().format('MM');
        const logPath = `Život/Log/${year}/${month}/${todayLog}.md`;

        let logFile = this.app.vault.getAbstractFileByPath(logPath);
        if (!logFile) {
          const paths = ['Život/Log', `Život/Log/${year}`, `Život/Log/${year}/${month}`];
          for (const p of paths) {
            if (!this.app.vault.getAbstractFileByPath(p)) await this.app.vault.createFolder(p);
          }
          await this.app.vault.create(logPath, `---\ncreated: ${moment().format('YYYY-MM-DD')}\ndevice: LevinskyJ Desktop\ntags: [log, Život]\n---\n\n<div style="text-align: center; color: gray; font-size: 1.1em; margin-bottom: 20px; font-family: Courier New">\n  ${moment().format('dd DD. MMMM YYYY')}\n</div>\n\n---\n\n`);
          logFile = this.app.vault.getAbstractFileByPath(logPath);
        }

        const existing = await this.app.vault.read(logFile);
        await this.app.vault.modify(logFile, existing + `\n- ${text}\n`);
        captureInput.value = '';
        new Notice('Zapsáno do logu');

      } else if (captureMode === 'task') {
        try {
          await requestUrl({
            url: 'https://bkgfohfmnbmascomaozv.supabase.co/rest/v1/todos',
            method: 'POST',
            headers: {
              'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJrZ2ZvaGZtbmJtYXNjb21hb3p2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgzMzMwMzYsImV4cCI6MjEwMzkwOTAzNn0.RgxJDflLqIuBIH17imSvdLmbRjg8Fp3vDWK_O5u6w-c',
              'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJrZ2ZvaGZtbmJtYXNjb21hb3p2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgzMzMwMzYsImV4cCI6MjEwMzkwOTAzNn0.RgxJDflLqIuBIH17imSvdLmbRjg8Fp3vDWK_O5u6w-c',
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ text, completed: false, priority: 'low' })
          });
        } catch (e) {}

        const todayLog = moment().format('DD.MM.YYYY');
        const year = moment().format('YYYY');
        const month = moment().format('MM');
        const logPath = `Život/Log/${year}/${month}/${todayLog}.md`;

        let logFile = this.app.vault.getAbstractFileByPath(logPath);
        if (!logFile) {
          const paths = ['Život/Log', `Život/Log/${year}`, `Život/Log/${year}/${month}`];
          for (const p of paths) {
            if (!this.app.vault.getAbstractFileByPath(p)) await this.app.vault.createFolder(p);
          }
          await this.app.vault.create(logPath, `---\ncreated: ${moment().format('YYYY-MM-DD')}\ndevice: LevinskyJ Desktop\ntags: [log, Život]\n---\n\n<div style="text-align: center; color: gray; font-size: 1.1em; margin-bottom: 20px; font-family: Courier New">\n  ${moment().format('dd DD. MMMM YYYY')}\n</div>\n\n---\n`);
          logFile = this.app.vault.getAbstractFileByPath(logPath);
        }

        const existing = await this.app.vault.read(logFile);
        await this.app.vault.modify(logFile, existing + `\n- [ ] ${text}\n`);
        captureInput.value = '';
        new Notice('Úkol přidán do cloudu a logu');

      } else {
        const now = moment();
        const fileName = `${now.format('YYYY.MM.DD.')} - ${now.format('HH-mm-ss')}.md`;
        const filePath = `Inbox/${fileName}`;

        if (!this.app.vault.getAbstractFileByPath('Inbox')) {
          await this.app.vault.createFolder('Inbox');
        }

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
        const hasLink = /https?:\/\/|www\./.test(text);

        const fileContent = `---\ncreated: ${now.format('YYYY-MM-DD HH:mm:ss')}\ndevice: LevinskyJ Desktop\ntags: [${tagsYaml}]\nsource: quick-capture\nstatus: unread\nhas_link: ${hasLink}\n---\n\n${cleanText}\n`;
        await this.app.vault.create(filePath, fileContent);

        captureInput.value = '';
        new Notice(`Vytvořeno ${fileName}`);
      }
    };

    captureBtn.addEventListener('click', doCapture);
    captureInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') doCapture();
    });

    // ── WIDGET GRID ──
    const widgetGrid = container.createDiv({ cls: 'hp-widget-grid' });
    let widgetOrder = ['tasks', 'calendar', 'inbox'];
    try {
      const saved = localStorage.getItem('homepage-widget-order');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.every(w => ['tasks', 'calendar', 'inbox'].includes(w)) && parsed.length === 3) {
          widgetOrder = parsed;
        }
      }
    } catch (e) {}

    let collapsedWidgets = new Set();
    try {
      const savedCollapsed = localStorage.getItem('homepage-collapsed-widgets');
      if (savedCollapsed) collapsedWidgets = new Set(JSON.parse(savedCollapsed));
    } catch (e) {}

    const renderTasksWidget = async (wContainer) => {
      wContainer.empty();
      const SUPABASE_URL = 'https://bkgfohfmnbmascomaozv.supabase.co/rest/v1';
      const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJrZ2ZvaGZtbmJtYXNjb21hb3p2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgzMzMwMzYsImV4cCI6MjEwMzkwOTAzNn0.RgxJDflLqIuBIH17imSvdLmbRjg8Fp3vDWK_O5u6w-c';

      let tasks = [];
      let loadedFromCloud = false;

      try {
        const res = await requestUrl({
          url: `${SUPABASE_URL}/todos?select=*&completed=eq.false&order=id.desc&limit=8`,
          headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
        });
        if (res.status === 200 && res.json && Array.isArray(res.json)) {
          tasks = res.json.map(ct => ({
            id: ct.id,
            text: ct.text || ct.title || '',
            isCloud: true
          })).filter(t => t.text.trim() !== '');
          loadedFromCloud = true;
        }
      } catch (e) {}

      // Falls back to vault markdown files only if Cloud fetch failed
      if (!loadedFromCloud) {
        const vaultTasks = [];
        const markdownFiles = this.app.vault.getMarkdownFiles().sort((a, b) => b.stat.mtime - a.stat.mtime);
        for (const file of markdownFiles) {
          if (vaultTasks.length >= 8) break;
          const cache = this.app.metadataCache.getFileCache(file);
          if (!cache || !cache.listItems) continue;
          const uncompletedItems = cache.listItems.filter(item => item.task === ' ');
          if (uncompletedItems.length > 0) {
            const content = await this.app.vault.read(file);
            const lines = content.split('\n');
            for (const item of uncompletedItems) {
              if (vaultTasks.length >= 8) break;
              const lineText = lines[item.position.start.line];
              if (lineText) {
                const cleanText = lineText.replace(/^[\s>-]*-\s*\[ \]\s*/, '').trim();
                if (cleanText && !vaultTasks.some(v => v.text === cleanText)) {
                  vaultTasks.push({ text: cleanText, path: file.path, isCloud: false });
                }
              }
            }
          }
        }
        tasks = vaultTasks;
      }

      if (tasks.length > 0) {
        const ul = wContainer.createEl('ul', { cls: 'hp-task-list' });
        for (const task of tasks) {
          const li = ul.createEl('li', { cls: 'hp-task-item' });
          const checkbox = li.createEl('input', { type: 'checkbox', cls: 'hp-task-checkbox' });
          checkbox.checked = false;

          checkbox.addEventListener('change', async () => {
            if (task.isCloud) {
              try {
                await requestUrl({
                  url: `${SUPABASE_URL}/todos?id=eq.${task.id}`,
                  method: 'PATCH',
                  headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json' },
                  body: JSON.stringify({ completed: true })
                });
                new Notice('✅ Úkol dokončen');
                li.remove();
              } catch (err) { new Notice('Chyba při uložení'); }
            } else {
              try {
                const fileObj = this.app.vault.getAbstractFileByPath(task.path);
                if (fileObj) {
                  const content = await this.app.vault.read(fileObj);
                  const lines = content.split('\n');
                  for (let i = 0; i < lines.length; i++) {
                    if (lines[i].includes('- [ ]') && lines[i].includes(task.text.trim())) {
                      lines[i] = lines[i].replace('- [ ]', '- [x]');
                      break;
                    }
                  }
                  await this.app.vault.modify(fileObj, lines.join('\n'));
                  new Notice('✅ Úkol vyřízen');
                  li.remove();
                }
              } catch (err) {}
            }
          });

          const textSpan = li.createEl('span', { cls: 'hp-task-text' });
          textSpan.textContent = task.text.replace(/\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g, '$1');
        }
      } else {
        wContainer.createDiv({ cls: 'hp-empty' }).createEl('p', { text: 'Žádné nehotové úkoly.' });
      }
    };

    const renderCalendarWidget = async (wContainer) => {
      wContainer.empty();
      const calNav = wContainer.createDiv({ cls: 'hp-cal-widget-nav' });
      const prevBtn = calNav.createEl('button', { text: '←', cls: 'hp-cal-widget-btn' });
      const monthLabel = calNav.createEl('span', { text: '', cls: 'hp-cal-widget-month' });
      const nextBtn = calNav.createEl('button', { text: '→', cls: 'hp-cal-widget-btn' });
      const calGrid = wContainer.createDiv({ cls: 'hp-cal-widget' });

      let widgetMonth = moment().startOf('month');

      // Fetch Supabase events
      let supabaseEvents = [];
      const SUPABASE_URL = 'https://bkgfohfmnbmascomaozv.supabase.co/rest/v1';
      const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJrZ2ZvaGZtbmJtYXNjb21hb3p2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgzMzMwMzYsImV4cCI6MjEwMzkwOTAzNn0.RgxJDflLqIuBIH17imSvdLmbRjg8Fp3vDWK_O5u6w-c';

      try {
        const res = await requestUrl({
          url: `${SUPABASE_URL}/events?select=*&order=date.asc,time.asc`,
          headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
        });
        if (res.status === 200 && res.json && Array.isArray(res.json)) {
          supabaseEvents = res.json;
        }
      } catch (e) {
        console.error('Failed to fetch calendar events from Supabase:', e);
      }

      const getEventsForDay = (dayMoment) => {
        const dayStr = dayMoment.format('YYYY-MM-DD');
        const dayOfMonth = dayMoment.date();
        const monthDayStr = dayMoment.format('MM-DD');
        const dayOfWeek = dayMoment.day();

        return supabaseEvents.filter(ev => {
          if (!ev.date) return false;
          const evMoment = moment(ev.date, 'YYYY-MM-DD', true);
          if (!evMoment.isValid()) return false;

          // Event start date check
          if (dayMoment.isBefore(evMoment, 'day')) return false;

          if (ev.date === dayStr) return true;

          const rec = (ev.recurrence || '').toLowerCase().trim();
          if (rec === 'měsíčně' || rec === 'monthly') return evMoment.date() === dayOfMonth;
          if (rec === 'ročně' || rec === 'yearly') return evMoment.format('MM-DD') === monthDayStr;
          if (rec === 'týdně' || rec === 'weekly') return evMoment.day() === dayOfWeek;
          if (rec === 'denně' || rec === 'daily') return true;

          return false;
        });
      };

      const categoryColors = {
        'osobní': '#9b59b6',
        'škola': '#3b82f6',
        'práce': '#c4956a',
        'produkce': '#10b981',
        'rodina': '#e74c3c'
      };

      const renderWidgetCalendar = () => {
        monthLabel.textContent = widgetMonth.format('MMMM YYYY').toUpperCase();
        calGrid.innerHTML = '';

        const dayHeaders = ['P', 'Ú', 'S', 'Č', 'P', 'S', 'N'];
        for (const d of dayHeaders) calGrid.createEl('div', { text: d, cls: 'hp-cal-widget-day-header' });

        const year = widgetMonth.year();
        const month = widgetMonth.month();
        const daysInMonth = widgetMonth.daysInMonth();
        const firstDayOfMonth = moment([year, month, 1]).day();
        const daysFromMonday = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1;

        for (let i = 0; i < daysFromMonday; i++) calGrid.createDiv({ cls: 'hp-cal-widget-cell hp-cal-widget-cell-empty' });

        for (let d = 1; d <= daysInMonth; d++) {
          const dayMoment = moment([year, month, d]);
          const key = dayMoment.format('YYYY-MM-DD');
          const wordCount = logData.get(key) || 0;
          const dayMood = moodData.get(key);
          const moodInfo = dayMood ? getMoodInfo(dayMood) : null;
          const isToday = dayMoment.isSame(moment(), 'day');

          const dayEvents = getEventsForDay(dayMoment);

          let intensity = 0;
          if (wordCount > 0) {
            if (wordCount < 50) intensity = 1;
            else if (wordCount < 150) intensity = 2;
            else intensity = 3;
          }

          const cell = calGrid.createDiv({ cls: 'hp-cal-widget-cell' });
          if (isToday) cell.classList.add('hp-cal-widget-cell-today');
          if (intensity > 0) cell.classList.add(`hp-cal-widget-cell-log-${intensity}`);

          if (dayEvents.length > 0) {
            const primaryColor = dayEvents[0].color || categoryColors[(dayEvents[0].category || '').toLowerCase().trim()] || '#c4956a';
            cell.classList.add('hp-cal-widget-cell-has-event');
            cell.style.setProperty('--event-color', primaryColor);
            cell.style.borderColor = `color-mix(in srgb, ${primaryColor} 50%, var(--border))`;
            cell.style.boxShadow = `0 0 6px color-mix(in srgb, ${primaryColor} 25%, transparent)`;
          }

          cell.createEl('span', { text: `${d}`, cls: 'hp-cal-widget-day-num' });
          if (moodInfo) cell.createEl('span', { text: moodInfo.emoji, cls: 'hp-cal-widget-mood' });

          // Render event indicator dots
          if (dayEvents.length > 0) {
            const dotsContainer = cell.createDiv({ cls: 'hp-cal-events-dots' });
            for (const ev of dayEvents.slice(0, 3)) {
              const evColor = ev.color || categoryColors[(ev.category || '').toLowerCase().trim()] || '#c4956a';
              const dot = dotsContainer.createDiv({ cls: 'hp-cal-event-dot' });
              dot.style.backgroundColor = evColor;
              dot.style.boxShadow = `0 0 4px ${evColor}`;
            }
          } else if (wordCount > 0) {
            cell.createDiv({ cls: 'hp-cal-widget-dot' });
          }

          // Custom Floating Popover Tooltip on Hover
          let activeTooltipEl = null;

          const removeTooltip = () => {
            if (activeTooltipEl) {
              activeTooltipEl.remove();
              activeTooltipEl = null;
            }
          };

          cell.addEventListener('mouseenter', () => {
            removeTooltip();

            const tooltip = document.createElement('div');
            tooltip.className = 'hp-custom-cal-tooltip';

            // Header
            const header = document.createElement('div');
            header.className = 'hp-tooltip-header';

            const czechDays = ['Neděle', 'Pondělí', 'Úterý', 'Středa', 'Čtvrtek', 'Pátek', 'Sobota'];
            const czechMonths = ['ledna', 'února', 'března', 'dubna', 'května', 'června', 'července', 'srpna', 'září', 'října', 'listopadu', 'prosince'];

            const dayName = czechDays[dayMoment.day()];
            const monthName = czechMonths[dayMoment.month()];
            const formattedCzDate = `${dayName}, ${dayMoment.date()}. ${monthName}`;

            const dateSpan = document.createElement('span');
            dateSpan.className = 'hp-tooltip-date';
            dateSpan.textContent = formattedCzDate;
            header.appendChild(dateSpan);

            const badges = document.createElement('div');
            badges.className = 'hp-tooltip-badges';

            if (moodInfo) {
              const moodBadge = document.createElement('span');
              moodBadge.className = 'hp-tooltip-badge';
              moodBadge.textContent = `${moodInfo.emoji} ${moodInfo.label}`;
              badges.appendChild(moodBadge);
            }

            if (wordCount > 0) {
              const wordBadge = document.createElement('span');
              wordBadge.className = 'hp-tooltip-badge';
              wordBadge.textContent = `📝 ${wordCount.toLocaleString('cs')} slov`;
              badges.appendChild(wordBadge);
            }

            header.appendChild(badges);
            tooltip.appendChild(header);

            // Events Section
            if (dayEvents.length > 0) {
              const divider = document.createElement('div');
              divider.className = 'hp-tooltip-divider';
              tooltip.appendChild(divider);

              const eventsTitle = document.createElement('div');
              eventsTitle.className = 'hp-tooltip-events-title';
              eventsTitle.textContent = `UDÁLOSTI (${dayEvents.length})`;
              tooltip.appendChild(eventsTitle);

              for (const ev of dayEvents) {
                const evColor = ev.color || categoryColors[(ev.category || '').toLowerCase().trim()] || '#c4956a';
                const item = document.createElement('div');
                item.className = 'hp-tooltip-event-item';

                const bar = document.createElement('div');
                bar.className = 'hp-tooltip-event-bar';
                bar.style.backgroundColor = evColor;
                bar.style.boxShadow = `0 0 6px ${evColor}`;
                item.appendChild(bar);

                const content = document.createElement('div');
                content.className = 'hp-tooltip-event-content';

                const heading = document.createElement('div');
                heading.className = 'hp-tooltip-event-heading';

                const name = document.createElement('span');
                name.className = 'hp-tooltip-event-name';
                name.textContent = (ev.title || 'Událost').trim();
                heading.appendChild(name);

                if (ev.category) {
                  const cat = document.createElement('span');
                  cat.className = 'hp-tooltip-event-cat';
                  cat.style.setProperty('--ev-color', evColor);
                  cat.textContent = ev.category.trim();
                  heading.appendChild(cat);
                }

                content.appendChild(heading);

                const metaParts = [];
                if (ev.time) metaParts.push(`🕒 ${ev.time}`);
                else if (ev.is_all_day) metaParts.push(`⭐ Celý den`);

                if (ev.location) metaParts.push(`📍 ${ev.location.trim()}`);

                if (metaParts.length > 0) {
                  const meta = document.createElement('div');
                  meta.className = 'hp-tooltip-event-meta';
                  meta.textContent = metaParts.join(' • ');
                  content.appendChild(meta);
                }

                if (ev.description) {
                  const desc = document.createElement('div');
                  desc.className = 'hp-tooltip-event-desc';
                  desc.textContent = ev.description.trim();
                  content.appendChild(desc);
                }

                item.appendChild(content);
                tooltip.appendChild(item);
              }
            }

            document.body.appendChild(tooltip);
            activeTooltipEl = tooltip;

            // Position calculation
            const rect = cell.getBoundingClientRect();
            const tooltipRect = tooltip.getBoundingClientRect();

            let left = rect.left + rect.width / 2 - tooltipRect.width / 2;
            left = Math.max(12, Math.min(window.innerWidth - tooltipRect.width - 12, left));

            let top = rect.top - tooltipRect.height - 8;
            if (top < 10) {
              top = rect.bottom + 8;
            }

            tooltip.style.left = `${left}px`;
            tooltip.style.top = `${top}px`;

            requestAnimationFrame(() => {
              tooltip.classList.add('hp-tooltip-visible');
            });
          });

          cell.addEventListener('mouseleave', () => {
            removeTooltip();
          });

          cell.addEventListener('click', () => {
            const logPath = `Život/Log/${dayMoment.format('YYYY')}/${dayMoment.format('MM')}/${dayMoment.format('DD.MM.YYYY')}.md`;
            this.app.workspace.openLinkText(logPath, '');
          });
        }

        const totalCells = daysFromMonday + daysInMonth;
        const remaining = (7 - (totalCells % 7)) % 7;
        for (let i = 0; i < remaining; i++) calGrid.createDiv({ cls: 'hp-cal-widget-cell hp-cal-widget-cell-empty' });
      };

      renderWidgetCalendar();
      prevBtn.addEventListener('click', () => { widgetMonth.subtract(1, 'month'); renderWidgetCalendar(); });
      nextBtn.addEventListener('click', () => { widgetMonth.add(1, 'month'); renderWidgetCalendar(); });
    };

    const renderInboxWidget = async (wContainer) => {
      try {
        await syncQuickNotes(this.app, false);
      } catch (e) {}

      wContainer.empty();
      const inboxFiles = this.app.vault.getMarkdownFiles()
        .filter(f => f.path.startsWith('Inbox/'))
        .sort((a, b) => b.stat.mtime - a.stat.mtime)
        .slice(0, 12);

      if (inboxFiles.length > 0) {
        const ul = wContainer.createEl('ul', { cls: 'hp-list hp-inbox-list' });
        for (const f of inboxFiles) {
          const cache = this.app.metadataCache.getFileCache(f);
          const fm = cache ? cache.frontmatter : {};
          const isUnread = fm && fm.status === 'unread';
          const hasLink = fm && fm.has_link === true;
          const source = (fm && fm.source) || 'unknown';

          const li = ul.createEl('li', { cls: `hp-inbox-item ${isUnread ? 'hp-inbox-unread' : ''}` });
          const row = li.createDiv({ cls: 'hp-inbox-row' });

          row.createEl('span', { text: isUnread ? '●' : '○', cls: isUnread ? 'hp-inbox-unread-dot' : 'hp-inbox-read-dot' });

          const link = row.createEl('a', { text: f.basename, href: f.path, cls: 'internal-link hp-link' });
          link.addEventListener('click', async (e) => {
            e.preventDefault();
            if (isUnread) {
              try {
                const content = await this.app.vault.read(f);
                await this.app.vault.modify(f, content.replace(/^status:\s*unread$/m, 'status: read'));
              } catch (err) {}
            }
            this.app.workspace.openLinkText(f.path, '');
          });

          const tags = (fm && fm.tags) || (cache && cache.tags ? cache.tags.map(t => t.tag) : []);
          const uniqueTags = [...new Set(Array.isArray(tags) ? tags : [tags])].filter(t => t && t !== 'quick-capture' && t !== 'inbox' && t !== 'quick-drafts' && t !== '#inbox');

          if (uniqueTags.length > 0) {
            for (const tag of uniqueTags.slice(0, 2)) {
              row.createEl('span', { text: String(tag).replace(/^#/, ''), cls: 'hp-inbox-tag-inline' });
            }
            if (uniqueTags.length > 2) {
              row.createEl('span', { text: `+${uniqueTags.length - 2}`, cls: 'hp-inbox-tag-inline hp-inbox-tag-more-inline' });
            }
          }

          if (hasLink) row.createEl('span', { text: '🔗', cls: 'hp-inbox-link-icon' });
          if (source === 'quick-drafts' || (fm && fm.device && fm.device.toLowerCase().includes('android'))) {
            row.createEl('span', { text: '📱', cls: 'hp-inbox-source-icon', attr: { title: fm && fm.device ? fm.device : 'Android' } });
          } else if (source === 'quick-capture') {
            row.createEl('span', { text: '💻', cls: 'hp-inbox-source-icon', attr: { title: 'Desktop' } });
          }
        }
      } else {
        wContainer.createDiv({ cls: 'hp-empty' }).createEl('p', { text: 'Inbox je prázdný.' });
      }
    };

    const widgetData = {
      tasks: { title: 'AKTIVNÍ ÚKOLY', render: renderTasksWidget },
      calendar: { title: 'KALENDÁŘ', render: renderCalendarWidget },
      inbox: { title: 'INBOX', render: renderInboxWidget }
    };

    for (const widgetId of widgetOrder) {
      const data = widgetData[widgetId];
      if (!data) continue;
      const isCollapsed = collapsedWidgets.has(widgetId);

      const widgetEl = widgetGrid.createDiv({ cls: `hp-widget ${isCollapsed ? 'hp-widget-collapsed' : ''}` });
      widgetEl.setAttribute('data-widget-id', widgetId);
      widgetEl.setAttribute('draggable', 'true');

      const handle = widgetEl.createDiv({ cls: 'hp-widget-handle' });
      handle.createEl('span', { text: '⋮⋮', cls: 'hp-widget-handle-icon' });
      const widgetTitleSpan = handle.createEl('span', { text: data.title, cls: 'hp-panel-title hp-widget-title' });

      if (widgetId === 'calendar') {
        widgetTitleSpan.style.cursor = 'pointer';
        widgetTitleSpan.title = 'Otevřít velký kalendář ↗';
        widgetTitleSpan.classList.add('hp-widget-title-clickable');
        widgetTitleSpan.addEventListener('click', (e) => {
          e.stopPropagation();
          this.plugin.activateCalendarView();
        });
      }

      if (widgetId === 'inbox') {
        const syncBtn = handle.createEl('button', { text: '↻', cls: 'hp-widget-sync-btn', attr: { title: 'Synchronizovat rychlé poznámky z cloudu' } });
        syncBtn.style.cssText = 'background:transparent;border:none;color:var(--text-muted);cursor:pointer;font-size:1.1em;padding:2px 6px;margin-left:auto;line-height:1;transition:color 0.15s ease, transform 0.3s ease;';
        syncBtn.addEventListener('mouseenter', () => syncBtn.style.color = 'var(--bronze)');
        syncBtn.addEventListener('mouseleave', () => syncBtn.style.color = 'var(--text-muted)');
        syncBtn.addEventListener('click', async (e) => {
          e.stopPropagation();
          syncBtn.style.transform = 'rotate(180deg)';
          const count = await syncQuickNotes(this.app, true);
          if (count === 0) new Notice('Všechny poznámky jsou aktuální');
          if (this.refreshInboxWidget) this.refreshInboxWidget();
          setTimeout(() => syncBtn.style.transform = 'none', 300);
        });
      }

      const collapseBtn = handle.createEl('button', { text: isCollapsed ? '▶' : '▼', cls: 'hp-widget-collapse-btn' });
      collapseBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        widgetEl.classList.toggle('hp-widget-collapsed');
        const isNowCollapsed = widgetEl.classList.contains('hp-widget-collapsed');
        collapseBtn.textContent = isNowCollapsed ? '▶' : '▼';
        if (isNowCollapsed) collapsedWidgets.add(widgetId);
        else collapsedWidgets.delete(widgetId);
        localStorage.setItem('homepage-collapsed-widgets', JSON.stringify([...collapsedWidgets]));
      });

      const content = widgetEl.createDiv({ cls: 'hp-widget-content' });
      if (widgetId === 'tasks') this.refreshTasksWidget = () => renderTasksWidget(content);
      if (widgetId === 'calendar') this.refreshCalendarWidget = () => renderCalendarWidget(content);
      if (widgetId === 'inbox') this.refreshInboxWidget = () => renderInboxWidget(content);
      data.render(content);
    }

    // Smart targeted auto-update on vault changes (never touches captureInput or active typing)
    const handleVaultChange = (file) => {
      if (!file || !file.path) return;
      const path = file.path;

      if (path.startsWith('Inbox/')) {
        if (this.refreshInboxWidget) this.refreshInboxWidget();
      } else if (path.startsWith('Život/Log/')) {
        if (this.refreshCalendarWidget) this.refreshCalendarWidget();
      } else if (path.startsWith('Film & Foto/') || path.startsWith('Škola/') || path.startsWith('Produkce/') || path.startsWith('Život/')) {
        if (this.refreshSpaces) this.refreshSpaces();
      }
    };

    this.registerEvent(this.app.vault.on('modify', handleVaultChange));
    this.registerEvent(this.app.vault.on('create', handleVaultChange));
    this.registerEvent(this.app.vault.on('delete', handleVaultChange));
    this.registerEvent(this.app.metadataCache.on('changed', handleVaultChange));

    // Background 30s timer for cloud tasks & quick notes
    if (this.autoRefreshInterval) clearInterval(this.autoRefreshInterval);
    this.autoRefreshInterval = setInterval(async () => {
      if (this.refreshTasksWidget) this.refreshTasksWidget();
      try {
        const count = await syncQuickNotes(this.app, false);
        if (count > 0 && this.refreshInboxWidget) this.refreshInboxWidget();
      } catch (e) {}
    }, 30000);

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

    widgetGrid.addEventListener('dragend', () => {
      if (draggedEl) draggedEl.classList.remove('hp-widget-dragging');
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
      if (e.clientX < midpoint) widgetGrid.insertBefore(draggedEl, target);
      else widgetGrid.insertBefore(draggedEl, target.nextSibling);
    });

    // ── NOW BAR ──
    const nowBar = container.createDiv({ cls: 'hp-now' });
    nowBar.style.marginTop = '24px';
    nowBar.style.paddingTop = '16px';
    nowBar.style.borderTop = '1px solid var(--background-modifier-border)';
    nowBar.style.opacity = '0.7';

    nowBar.createEl('span', { cls: 'hp-now-label', text: 'NOW' });

    const loadNowItems = () => {
      try {
        const saved = localStorage.getItem(NOW_STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }
      } catch (e) {}
      return [...DEFAULT_NOW_ITEMS];
    };

    const saveNowItems = (items) => localStorage.setItem(NOW_STORAGE_KEY, JSON.stringify(items));
    let nowItems = loadNowItems();

    const renderNowBar = () => {
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

      const addBtn = nowBar.createEl('span', { cls: 'hp-now-add', text: '+', title: 'Přidat položku' });
      addBtn.style.cssText = 'cursor:pointer;margin-left:8px;opacity:0.4;font-weight:700;font-size:1.1em';
      addBtn.addEventListener('mouseenter', () => addBtn.style.opacity = '1');
      addBtn.addEventListener('mouseleave', () => addBtn.style.opacity = '0.4');
      addBtn.addEventListener('click', () => {
        nowItems.push('');
        renderNowBar();
        const spans = nowBar.querySelectorAll('.hp-now-item');
        const lastSpan = spans[spans.length - 1];
        if (lastSpan) lastSpan.click();
      });
    };

    const startEdit = (span, index) => {
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
        if (val) nowItems[index] = val;
        else nowItems.splice(index, 1);
        saveNowItems(nowItems);
        renderNowBar();
      };

      input.addEventListener('blur', finish);
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') input.blur();
        if (e.key === 'Escape') renderNowBar();
      });

      span.replaceWith(input);
      input.focus();
      input.select();
    };

    renderNowBar();
  }

  async onClose() {
    if (this.clockInterval) {
      clearInterval(this.clockInterval);
      this.clockInterval = null;
    }
    if (this.autoRefreshInterval) {
      clearInterval(this.autoRefreshInterval);
      this.autoRefreshInterval = null;
    }
  }
}

class AddEventModal extends Modal {
  constructor(app, initialDate, onEventAdded) {
    super(app);
    this.initialDate = initialDate || moment().format('YYYY-MM-DD');
    this.onEventAdded = onEventAdded;
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.addClass('hp-add-event-modal');

    contentEl.createEl('h2', { text: '📅 Nová událost v kalendáři', cls: 'hp-modal-title' });

    const form = contentEl.createEl('form', { cls: 'hp-modal-form' });

    // Title
    const titleGroup = form.createDiv({ cls: 'hp-form-group' });
    titleGroup.createEl('label', { text: 'Název události *', cls: 'hp-form-label' });
    const titleInput = titleGroup.createEl('input', {
      type: 'text',
      placeholder: 'např. Schůzka, Nájem, Zkouška',
      cls: 'hp-form-input'
    });
    titleInput.required = true;

    // Date & Time Row
    const row1 = form.createDiv({ cls: 'hp-form-row' });

    const dateGroup = row1.createDiv({ cls: 'hp-form-group' });
    dateGroup.createEl('label', { text: 'Datum *', cls: 'hp-form-label' });
    const dateInput = dateGroup.createEl('input', {
      type: 'date',
      value: this.initialDate,
      cls: 'hp-form-input'
    });
    dateInput.required = true;

    const timeGroup = row1.createDiv({ cls: 'hp-form-group' });
    timeGroup.createEl('label', { text: 'Čas (volitelně)', cls: 'hp-form-label' });
    const timeInput = timeGroup.createEl('input', {
      type: 'time',
      cls: 'hp-form-input'
    });

    // Category & Color Row
    const row2 = form.createDiv({ cls: 'hp-form-row' });

    const catGroup = row2.createDiv({ cls: 'hp-form-group' });
    catGroup.createEl('label', { text: 'Kategorie', cls: 'hp-form-label' });
    const catSelect = catGroup.createEl('select', { cls: 'hp-form-select' });
    const defaultCats = ['Osobní', 'Škola', 'Práce', 'Produkce', 'Rodina'];
    defaultCats.forEach(cat => {
      catSelect.createEl('option', { value: cat, text: cat });
    });

    const categoryColors = {
      'Osobní': '#9b59b6',
      'Škola': '#3b82f6',
      'Práce': '#c4956a',
      'Produkce': '#10b981',
      'Rodina': '#e74c3c'
    };

    const colorGroup = row2.createDiv({ cls: 'hp-form-group' });
    colorGroup.createEl('label', { text: 'Barva', cls: 'hp-form-label' });
    const colorInput = colorGroup.createEl('input', {
      type: 'color',
      value: '#9b59b6',
      cls: 'hp-form-color'
    });

    catSelect.addEventListener('change', () => {
      if (categoryColors[catSelect.value]) {
        colorInput.value = categoryColors[catSelect.value];
      }
    });

    // Recurrence
    const recGroup = form.createDiv({ cls: 'hp-form-group' });
    recGroup.createEl('label', { text: 'Opakování', cls: 'hp-form-label' });
    const recSelect = recGroup.createEl('select', { cls: 'hp-form-select' });
    [
      { value: 'none', label: 'Jednorázová (Bez opakování)' },
      { value: 'Měsíčně', label: 'Měsíčně (Každý měsíc)' },
      { value: 'Ročně', label: 'Ročně (Každý rok)' },
      { value: 'Týdně', label: 'Týdně (Každý týden)' },
      { value: 'Denně', label: 'Denně (Každý den)' }
    ].forEach(opt => {
      recSelect.createEl('option', { value: opt.value, text: opt.label });
    });

    // Location
    const locGroup = form.createDiv({ cls: 'hp-form-group' });
    locGroup.createEl('label', { text: 'Místo (volitelně)', cls: 'hp-form-label' });
    const locInput = locGroup.createEl('input', {
      type: 'text',
      placeholder: 'např. Praha, Opava',
      cls: 'hp-form-input'
    });

    // Description
    const descGroup = form.createDiv({ cls: 'hp-form-group' });
    descGroup.createEl('label', { text: 'Popis (volitelně)', cls: 'hp-form-label' });
    const descInput = descGroup.createEl('input', {
      type: 'text',
      placeholder: 'Poznámka ke zkoušce nebo schůzce...',
      cls: 'hp-form-input'
    });

    // Submit Buttons
    const buttons = form.createDiv({ cls: 'hp-modal-buttons' });
    const cancelBtn = buttons.createEl('button', { type: 'button', text: 'Zrušit', cls: 'hp-modal-btn hp-btn-cancel' });
    const saveBtn = buttons.createEl('button', { type: 'submit', text: 'Uložit událost', cls: 'hp-modal-btn hp-btn-save' });

    cancelBtn.addEventListener('click', () => this.close());

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const title = titleInput.value.trim();
      if (!title) return;

      const payload = {
        title,
        date: dateInput.value,
        time: timeInput.value ? timeInput.value : null,
        category: catSelect.value,
        color: colorInput.value,
        recurrence: recSelect.value,
        location: locInput.value.trim() || null,
        description: descInput.value.trim() || null,
        is_all_day: !timeInput.value
      };

      const SUPABASE_URL = 'https://bkgfohfmnbmascomaozv.supabase.co/rest/v1';
      const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJrZ2ZvaGZtbmJtYXNjb21hb3p2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgzMzMwMzYsImV4cCI6MjEwMzkwOTAzNn0.RgxJDflLqIuBIH17imSvdLmbRjg8Fp3vDWK_O5u6w-c';

      try {
        const res = await requestUrl({
          url: `${SUPABASE_URL}/events`,
          method: 'POST',
          headers: {
            'apikey': SUPABASE_KEY,
            'Authorization': `Bearer ${SUPABASE_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload)
        });

        if (res.status === 200 || res.status === 201) {
          new Notice('✅ Událost byla přidána do kalendáře');
          if (this.onEventAdded) this.onEventAdded();
          this.close();
        } else {
          new Notice('Chyba při ukládání události');
        }
      } catch (err) {
        console.error(err);
        new Notice('Chyba při komunikaci se Supabase');
      }
    });
  }

  onClose() {
    const { contentEl } = this;
    contentEl.empty();
  }
}

class CalendarFullView extends ItemView {
  constructor(leaf, plugin) {
    super(leaf);
    this.plugin = plugin;
  }

  getViewType() { return VIEW_TYPE_CALENDAR; }
  getDisplayText() { return 'Kalendář'; }
  getIcon() { return 'calendar'; }

  async onOpen() {
    const container = this.contentEl;
    container.empty();
    container.classList.add('homepage-dashboard', 'homepage-root', 'hp-full-calendar-root');

    // Header
    const header = container.createDiv({ cls: 'hp-header hp-cal-full-header' });
    header.createEl('h1', { text: 'KALENDÁŘ', cls: 'hp-title' });

    const headerActions = header.createDiv({ cls: 'hp-header-meta' });
    const addEventBtn = headerActions.createEl('button', { cls: 'hp-capture-btn hp-add-event-header-btn', text: '+ Nová událost' });
    addEventBtn.style.cssText = 'width:auto;padding:0 16px;font-size:0.85em;height:36px;';
    addEventBtn.addEventListener('click', () => {
      new AddEventModal(this.app, moment().format('YYYY-MM-DD'), () => this.onOpen()).open();
    });

    // Main calendar container
    const calContainer = container.createDiv({ cls: 'hp-full-cal-container' });

    const calNav = calContainer.createDiv({ cls: 'hp-cal-widget-nav hp-full-cal-nav' });
    const prevBtn = calNav.createEl('button', { text: '← Předchozí', cls: 'hp-cal-widget-btn hp-full-cal-nav-btn' });
    const todayBtn = calNav.createEl('button', { text: 'Dnes', cls: 'hp-cal-widget-btn hp-full-cal-nav-btn' });
    const monthLabel = calNav.createEl('span', { text: '', cls: 'hp-cal-widget-month hp-full-cal-month-title' });
    const nextBtn = calNav.createEl('button', { text: 'Následující →', cls: 'hp-cal-widget-btn hp-full-cal-nav-btn' });

    const calGrid = calContainer.createDiv({ cls: 'hp-cal-widget hp-full-cal-grid' });

    let viewMonth = moment().startOf('month');

    // Fetch Supabase events
    let supabaseEvents = [];
    const SUPABASE_URL = 'https://bkgfohfmnbmascomaozv.supabase.co/rest/v1';
    const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJrZ2ZvaGZtbmJtYXNjb21hb3p2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgzMzMwMzYsImV4cCI6MjEwMzkwOTAzNn0.RgxJDflLqIuBIH17imSvdLmbRjg8Fp3vDWK_O5u6w-c';

    try {
      const res = await requestUrl({
        url: `${SUPABASE_URL}/events?select=*&order=date.asc,time.asc`,
        headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
      });
      if (res.status === 200 && res.json && Array.isArray(res.json)) {
        supabaseEvents = res.json;
      }
    } catch (e) {}

    const getEventsForDay = (dayMoment) => {
      const dayStr = dayMoment.format('YYYY-MM-DD');
      const dayOfMonth = dayMoment.date();
      const monthDayStr = dayMoment.format('MM-DD');
      const dayOfWeek = dayMoment.day();

      return supabaseEvents.filter(ev => {
        if (!ev.date) return false;
        const evMoment = moment(ev.date, 'YYYY-MM-DD', true);
        if (!evMoment.isValid()) return false;
        if (dayMoment.isBefore(evMoment, 'day')) return false;

        if (ev.date === dayStr) return true;

        const rec = (ev.recurrence || '').toLowerCase().trim();
        if (rec === 'měsíčně' || rec === 'monthly') return evMoment.date() === dayOfMonth;
        if (rec === 'ročně' || rec === 'yearly') return evMoment.format('MM-DD') === monthDayStr;
        if (rec === 'týdně' || rec === 'weekly') return evMoment.day() === dayOfWeek;
        if (rec === 'denně' || rec === 'daily') return true;

        return false;
      });
    };

    const categoryColors = {
      'osobní': '#9b59b6',
      'škola': '#3b82f6',
      'práce': '#c4956a',
      'produkce': '#10b981',
      'rodina': '#e74c3c'
    };

    const czechMonthsFull = ['LEDEN', 'ÚNOR', 'BŘEZEN', 'DUBEN', 'KVĚTEN', 'ČERVEN', 'ČERVENEC', 'SRPEN', 'ZÁŘÍ', 'ŘÍJEN', 'LISTOPAD', 'PROSINEC'];

    const renderGrid = () => {
      const year = viewMonth.year();
      const month = viewMonth.month();
      monthLabel.textContent = `${czechMonthsFull[month]} ${year}`;
      calGrid.innerHTML = '';

      const dayHeaders = ['PONDĚLÍ', 'ÚTERÝ', 'STŘEDA', 'ČTVRTEK', 'PÁTEK', 'SOBOTA', 'NEDĚLE'];
      for (const d of dayHeaders) calGrid.createEl('div', { text: d, cls: 'hp-cal-widget-day-header hp-full-cal-header-cell' });

      const daysInMonth = viewMonth.daysInMonth();
      const firstDay = moment([year, month, 1]).day();
      const daysFromMonday = firstDay === 0 ? 6 : firstDay - 1;

      for (let i = 0; i < daysFromMonday; i++) calGrid.createDiv({ cls: 'hp-cal-widget-cell hp-full-cal-cell hp-cal-widget-cell-empty' });

      for (let d = 1; d <= daysInMonth; d++) {
        const dayMoment = moment([year, month, d]);
        const isToday = dayMoment.isSame(moment(), 'day');
        const dayEvents = getEventsForDay(dayMoment);
        const dayStr = dayMoment.format('YYYY-MM-DD');

        const cell = calGrid.createDiv({ cls: 'hp-cal-widget-cell hp-full-cal-cell' });
        if (isToday) cell.classList.add('hp-cal-widget-cell-today');

        // Cell Top Header Bar
        const cellTop = cell.createDiv({ cls: 'hp-full-cal-cell-top' });
        cellTop.createEl('span', { text: `${d}`, cls: 'hp-cal-widget-day-num hp-full-cal-day-num' });

        const addBtn = cellTop.createEl('button', { text: '+', cls: 'hp-full-cal-add-btn', attr: { title: 'Přidat událost' } });
        addBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          new AddEventModal(this.app, dayStr, () => this.onOpen()).open();
        });

        // Event List Container inside cell
        const eventsWrap = cell.createDiv({ cls: 'hp-full-cal-events-wrap' });

        for (const ev of dayEvents) {
          const evColor = ev.color || categoryColors[(ev.category || '').toLowerCase().trim()] || '#c4956a';
          const card = eventsWrap.createDiv({ cls: 'hp-full-cal-event-card' });
          card.style.setProperty('--ev-color', evColor);
          card.style.borderLeftColor = evColor;

          card.createEl('span', { text: (ev.title || 'Událost').trim(), cls: 'hp-full-cal-event-title' });

          if (ev.time) {
            card.createEl('span', { text: ev.time, cls: 'hp-full-cal-event-time' });
          }
        }

        cell.addEventListener('click', (e) => {
          if (e.target.closest('.hp-full-cal-add-btn') || e.target.closest('.hp-full-cal-event-card')) return;
          // Clicking empty day cell opens modal with prefilled date
          new AddEventModal(this.app, dayStr, () => this.onOpen()).open();
        });
      }

      const totalCells = daysFromMonday + daysInMonth;
      const remaining = (7 - (totalCells % 7)) % 7;
      for (let i = 0; i < remaining; i++) calGrid.createDiv({ cls: 'hp-cal-widget-cell hp-full-cal-cell hp-cal-widget-cell-empty' });
    };

    renderGrid();

    prevBtn.addEventListener('click', () => { viewMonth.subtract(1, 'month'); renderGrid(); });
    nextBtn.addEventListener('click', () => { viewMonth.add(1, 'month'); renderGrid(); });
    todayBtn.addEventListener('click', () => { viewMonth = moment().startOf('month'); renderGrid(); });
  }

  async onClose() {}
}

class HomepageSettingTab extends PluginSettingTab {
  constructor(app, plugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display() {
    const { containerEl } = this;
    containerEl.empty();
    containerEl.createEl('h2', { text: 'Nastavení Levinskyj Homepage' });

    new Setting(containerEl)
      .setName('Otevřít při spuštění')
      .setDesc('Automaticky otevře záložku Homepage po spuštění Obsidianu.')
      .addToggle(toggle => toggle
        .setValue(this.plugin.settings.openOnStartup)
        .onChange(async (value) => {
          this.plugin.settings.openOnStartup = value;
          await this.plugin.saveSettings();
        }));

    new Setting(containerEl)
      .setName('Otevřít v hlavním panelu')
      .setDesc('Pokud je zapnuto, otvírá se jako nová záložka v hlavním editoru (jinak v pravém panelu).')
      .addToggle(toggle => toggle
        .setValue(this.plugin.settings.openInMain)
        .onChange(async (value) => {
          this.plugin.settings.openInMain = value;
          await this.plugin.saveSettings();
        }));
  }
}

class HomepagePlugin extends Plugin {
  async onload() {
    await this.loadSettings();
    this.addSettingTab(new HomepageSettingTab(this.app, this));

    this.registerView(VIEW_TYPE, (leaf) => new HomepageView(leaf, this));
    this.registerView(VIEW_TYPE_CALENDAR, (leaf) => new CalendarFullView(leaf, this));

    this.addCommand({
      id: 'open-homepage-view',
      name: 'Otevřít Homepage',
      callback: () => this.activateView()
    });

    this.addCommand({
      id: 'open-calendar-view',
      name: 'Otevřít Kalendář',
      callback: () => this.activateCalendarView()
    });

    this.addCommand({
      id: 'add-calendar-event',
      name: 'Přidat událost do Kalendáře',
      callback: () => {
        new AddEventModal(this.app, moment().format('YYYY-MM-DD')).open();
      }
    });

    this.addCommand({
      id: 'sync-quick-capture-notes',
      name: 'Synchronizovat rychlé poznámky (Quick Capture)',
      callback: async () => {
        const count = await syncQuickNotes(this.app, true);
        if (count === 0) new Notice('Všechny poznámky jsou aktuální');
        const leaves = this.app.workspace.getLeavesOfType(VIEW_TYPE);
        for (const leaf of leaves) {
          if (leaf.view && leaf.view.refreshInboxWidget) leaf.view.refreshInboxWidget();
        }
      }
    });

    if (!Platform.isMobile) {
      this.addRibbonIcon('layout-dashboard', 'Levinskyj Homepage', () => this.activateView());
      this.addRibbonIcon('calendar', 'Levinskyj Kalendář', () => this.activateCalendarView());
    }

    this.app.workspace.onLayoutReady(() => {
      syncQuickNotes(this.app, false);
      if (this.settings.openOnStartup) {
        setTimeout(() => {
          this.activateView();
        }, 100);
      }
    });
  }

  onunload() {
    this.app.workspace.detachLeavesOfType(VIEW_TYPE);
    this.app.workspace.detachLeavesOfType(VIEW_TYPE_CALENDAR);
  }

  async activateView() {
    const { workspace } = this.app;
    let leaf = workspace.getLeavesOfType(VIEW_TYPE)[0];
    if (!leaf) {
      if (this.settings.openInMain) {
        leaf = workspace.getLeaf('tab');
      } else {
        leaf = workspace.getRightLeaf(false);
      }
      await leaf.setViewState({ type: VIEW_TYPE, active: true });
    }
    leaf.setPinned(true);
    workspace.revealLeaf(leaf);
    workspace.setActiveLeaf(leaf, { focus: true });
  }

  async activateCalendarView() {
    const { workspace } = this.app;
    let leaf = workspace.getLeavesOfType(VIEW_TYPE_CALENDAR)[0];
    if (!leaf) {
      leaf = workspace.getLeaf('tab');
      await leaf.setViewState({ type: VIEW_TYPE_CALENDAR, active: true });
    }
    workspace.revealLeaf(leaf);
    workspace.setActiveLeaf(leaf, { focus: true });
  }

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }
}

module.exports = HomepagePlugin;
