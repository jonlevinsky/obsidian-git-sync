const { Plugin, PluginSettingTab, Setting, TFile, Notice } = require('obsidian');

const DEFAULT_SETTINGS = {
    targetNotePath: 'Tasks/All Tasks.md',
    includeCompleted: false,
    groupBy: 'file', // 'file' | 'tag' | 'due' | 'none'
    sortBy: 'file',  // 'file' | 'due' | 'priority'
    twoWaySync: true,
    excludedFolders: '',
    includedTags: '',
    excludedTags: '',
};

// ====== HELPERS ======

const PRIORITY_MAP = {
    highest: 0, high: 1, medium: 2, low: 3, lowest: 4, none: 5
};

function parsePriority(text) {
    if (/\u{1F534}|\u{23EB}|priority::\s*highest/u.test(text)) return 'highest';
    if (/\u{1F7E0}|\u{1F53C}|priority::\s*high/u.test(text)) return 'high';
    if (/\u{1F535}|priority::\s*medium/u.test(text)) return 'medium';
    if (/\u{1F7E2}|\u{1F53D}|priority::\s*low/u.test(text)) return 'low';
    if (/\u{26AA}|\u{23EC}|priority::\s*lowest/u.test(text)) return 'lowest';
    return 'none';
}

function priorityEmoji(p) {
    return { highest: '\u{1F534}', high: '\u{1F7E0}', medium: '\u{1F535}', low: '\u{1F7E2}', lowest: '\u{26AA}', none: '' }[p] || '';
}

function parseDue(text) {
    const m = text.match(/\u{1F4C5}\s*(\d{4}-\d{2}-\d{2})|due::\s*(\d{4}-\d{2}-\d{2})/u);
    return m ? (m[1] || m[2]) : null;
}

function parseTags(text) {
    return Array.from(text.matchAll(/#([\w\-/]+)/g)).map(m => m[1]);
}

function isOverdue(d) {
    return d && new Date(d) < new Date(new Date().setHours(0,0,0,0));
}
function isToday(d) {
    return d === new Date().toISOString().split('T')[0];
}

function formatDue(d) {
    if (!d) return '';
    if (isToday(d)) return '\u{1F4C5} **Dnes**';
    if (isOverdue(d)) return `\u{1F4C5} ~~${d}~~ \u{1F525}`;
    return `\u{1F4C5} ${d}`;
}

function progressBar(done, total, width = 20) {
    if (total === 0) return '\u{2591}'.repeat(width);
    const filled = Math.round((done / total) * width);
    return '\u{2588}'.repeat(filled) + '\u{2591}'.repeat(width - filled);
}

// ====== PLUGIN ======

class TaskAggregatorPlugin extends Plugin {
    async onload() {
        await this.loadSettings();
        this._isGenerating = false;
        this._isSyncing = false;
        this._taskCache = new Map();

        // Ribbon
        this.addRibbonIcon('check-circle', 'Seskupit tasky', () => this.aggregate());

        // Commands
        this.addCommand({ id: 'aggregate', name: 'Seskupit vsechny tasky', callback: () => this.aggregate() });
        this.addCommand({ id: 'force-refresh', name: 'Force refresh', callback: () => { this._taskCache.clear(); this.aggregate(); } });

        // Auto-refresh when target note opens
        this.registerEvent(this.app.workspace.on('file-open', (file) => {
            if (file && file.path === this.settings.targetNotePath) {
                this.aggregate();
            }
        }));

        // Refresh when source files change (if target is open)
        this.registerEvent(this.app.vault.on('modify', (file) => {
            if (!(file instanceof TFile)) return;
            if (file.path === this.settings.targetNotePath) return;
            this._taskCache.delete(file.path);
            const active = this.app.workspace.getActiveFile();
            if (active && active.path === this.settings.targetNotePath) {
                this.aggregate();
            }
        }));

        // Two-way sync: changes IN target note → update source files
        this.registerEvent(this.app.vault.on('modify', (file) => {
            if (!this.settings.twoWaySync) return;
            if (!(file instanceof TFile)) return;
            if (file.path !== this.settings.targetNotePath) return;
            if (this._isGenerating) return; // ignore our own writes
            this.syncFromTarget(file);
        }));

        // Visual enhancements in preview
        this.registerMarkdownPostProcessor((el) => {
            for (const li of el.querySelectorAll('li[data-task]')) {
                const text = li.textContent;
                if (text.includes('\u{1F534}')) li.style.cssText = 'border-left:3px solid #ff4444;padding-left:8px;';
                else if (text.includes('\u{1F7E0}')) li.style.cssText = 'border-left:3px solid #ff8800;padding-left:8px;';
                else if (text.includes('\u{1F535}')) li.style.cssText = 'border-left:3px solid #4488ff;padding-left:8px;';
                if (text.includes('\u{1F525}')) li.style.backgroundColor = 'rgba(255,0,0,0.05)';
                if (text.includes('Dnes')) li.style.backgroundColor = 'rgba(255,200,0,0.05)';
            }
        });

        this.addSettingTab(new SettingTab(this.app, this));
    }

    async loadSettings() {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    }
    async saveSettings() {
        await this.saveData(this.settings);
    }

    // ====== SCAN ======
    async scan() {
        const { vault } = this.app;
        const files = vault.getMarkdownFiles();
        const exFolders = this.settings.excludedFolders.split(',').map(s => s.trim()).filter(Boolean);
        const incTags = this.settings.includedTags.split(',').map(s => s.trim().replace(/^#/,'')).filter(Boolean);
        const exTags = this.settings.excludedTags.split(',').map(s => s.trim().replace(/^#/,'')).filter(Boolean);

        let tasks = [];

        for (const file of files) {
            if (file.path === this.settings.targetNotePath) continue;
            if (exFolders.some(f => file.path.startsWith(f))) continue;

            const cached = this._taskCache.get(file.path);
            if (cached) { tasks.push(...cached); continue; }

            const content = await vault.read(file);
            const lines = content.split('\n');
            const fileTasks = [];
            let heading = '';

            for (let i = 0; i < lines.length; i++) {
                const line = lines[i];

                const hm = line.match(/^(#{1,6})\s+(.*)$/);
                if (hm) heading = hm[2].trim();

                const tm = line.match(/^(\s*)[-*+]\s+\[([ xX])\]\s+(.*)$/);
                if (!tm) continue;

                const completed = tm[2].toLowerCase() === 'x';
                if (!this.settings.includeCompleted && completed) continue;

                let text = tm[3].trim();
                const tags = parseTags(text);

                if (incTags.length && !incTags.some(t => tags.includes(t))) continue;
                if (exTags.length && exTags.some(t => tags.includes(t))) continue;

                // strip existing block id for clean text
                text = text.replace(/\s*\^[a-zA-Z0-9-]+$/, '').trim();

                fileTasks.push({
                    file, line: i, text, heading,
                    completed, priority: parsePriority(text),
                    due: parseDue(text), tags,
                });
            }

            this._taskCache.set(file.path, fileTasks);
            tasks.push(...fileTasks);
        }

        return tasks;
    }

    // ====== SORT ======
    sort(tasks) {
        const { sortBy } = this.settings;
        tasks.sort((a, b) => {
            switch (sortBy) {
                case 'due':
                    if (!a.due && !b.due) return 0;
                    if (!a.due) return 1;
                    if (!b.due) return -1;
                    return a.due.localeCompare(b.due);
                case 'priority':
                    return PRIORITY_MAP[a.priority] - PRIORITY_MAP[b.priority];
                default:
                    if (a.file.path !== b.file.path) return a.file.path.localeCompare(b.file.path);
                    return a.line - b.line;
            }
        });
        return tasks;
    }

    // ====== GROUP ======
    group(tasks) {
        const { groupBy } = this.settings;
        const g = new Map();
        for (const t of tasks) {
            let key;
            if (groupBy === 'due' && t.due) {
                key = isOverdue(t.due) ? '\u{1F525} Po terminu' : isToday(t.due) ? '\u{1F4C5} Dnes' : `\u{1F4C5} ${t.due}`;
            } else if (groupBy === 'tag' && t.tags.length) {
                key = `\u{1F3F7} ${t.tags[0]}`;
            } else if (groupBy === 'file') {
                key = `\u{1F4C4} ${t.file.basename}`;
            } else {
                key = 'Vsechny tasky';
            }
            if (!g.has(key)) g.set(key, []);
            g.get(key).push(t);
        }
        return g;
    }

    // ====== GENERATE ======
    generate(tasks) {
        const now = new Date().toLocaleString('cs-CZ');
        const total = tasks.length;
        const done = tasks.filter(t => t.completed).length;
        const remaining = total - done;

        const lines = [];
        lines.push('---');
        lines.push('cssclass: task-aggregator');
        lines.push('---');
        lines.push('');
        lines.push('# \u{1F4CB} Seskupene tasky');
        lines.push(`> Aktualizovano: **${now}** | Celkem: **${total}** | Splneno: **${done}** | Zbyva: **${remaining}**`);
        lines.push('');

        // Progress bar
        const pct = total ? Math.round((done / total) * 100) : 0;
        lines.push(`> \u{1F4CA} **${pct}%** ${progressBar(done, total)} (${done}/${total})`);
        lines.push('');

        // Tag-aware mini progress
        const byTag = {};
        for (const t of tasks) {
            const tag = t.tags[0] || 'bez tagu';
            if (!byTag[tag]) byTag[tag] = { total: 0, done: 0 };
            byTag[tag].total++;
            if (t.completed) byTag[tag].done++;
        }
        for (const [tag, s] of Object.entries(byTag)) {
            const tp = s.total ? Math.round((s.done / s.total) * 100) : 0;
            lines.push(`> &nbsp;&nbsp;${tag}: ${progressBar(s.done, s.total, 10)} **${tp}%** (${s.done}/${s.total})`);
        }
        lines.push('');

        // Stats
        const prios = { highest: 0, high: 0, medium: 0, low: 0, lowest: 0, none: 0 };
        const dues = { overdue: 0, today: 0, future: 0, none: 0 };
        for (const t of tasks) {
            if (!t.completed) {
                prios[t.priority]++;
                if (isOverdue(t.due)) dues.overdue++;
                else if (isToday(t.due)) dues.today++;
                else if (t.due) dues.future++;
                else dues.none++;
            }
        }
        lines.push('> \u{1F4C8} **Zbyva:** ' +
            Object.entries(prios).filter(([,c]) => c).map(([p,c]) => `${priorityEmoji(p)}${c}`).join(' | ') +
            (dues.overdue ? ` | \u{1F525}${dues.overdue}` : '') +
            (dues.today ? ` | \u{1F4C5}${dues.today}` : '')
        );
        lines.push('');

        // Tasks
        const grouped = this.group(tasks);
        for (const [name, groupTasks] of grouped) {
            lines.push(`## ${name}`);
            lines.push('');
            for (const t of groupTasks) {
                const pe = priorityEmoji(t.priority);
                const due = formatDue(t.due);
                const tags = t.tags.length ? t.tags.map(tag => `#${tag}`).join(' ') : '';
                const link = `[[${t.file.path}|${t.file.basename}]]`;
                const check = t.completed ? '[x]' : '[ ]';
                const txt = t.completed ? `~~${t.text}~~` : t.text;
                lines.push(`- ${check} ${pe} ${txt} ${due} ${tags} — ${link}`);
            }
            lines.push('');
        }

        lines.push('---');
        lines.push('');
        lines.push('> \u{26A1} *Auto-refresh pri otevreni. Zaskrtni task pro dvousmernou synchronizaci.*');

        return lines.join('\n');
    }

    // ====== WRITE ======
    async aggregate() {
        let tasks = await this.scan();
        tasks = this.sort(tasks);
        const content = this.generate(tasks);

        this._isGenerating = true;
        try {
            const { vault } = this.app;
            const path = this.settings.targetNotePath;
            const file = vault.getAbstractFileByPath(path);

            if (file instanceof TFile) {
                await vault.modify(file, content);
            } else {
                const slash = path.lastIndexOf('/');
                if (slash > 0) {
                    const dir = path.slice(0, slash);
                    if (!vault.getAbstractFileByPath(dir)) await vault.createFolder(dir);
                }
                await vault.create(path, content);
            }
        } finally {
            // clear flag after a short delay so the modify event from our write doesn't trigger sync
            setTimeout(() => { this._isGenerating = false; }, 1000);
        }
    }

    // ====== TWO-WAY SYNC ======
    async syncFromTarget(file) {
        if (this._isSyncing) return;
        this._isSyncing = true;

        try {
            const content = await this.app.vault.read(file);
            const lines = content.split('\n');
            const { vault } = this.app;

            // Map: sourcePath -> [{ taskText, wantChecked }]
            const changes = new Map();

            for (const line of lines) {
                // Match: - [x] ... — [[Source File.md]]
                const m = line.match(/^\s*[-*+]\s+\[([ xX])\]\s+.*—\s+\[\[([^\]]+)\]\]$/);
                if (!m) continue;

                const wantChecked = m[1].toLowerCase() === 'x';
                const srcPath = m[2];

                // Extract task text (between checkbox and due/link)
                // Format: - [ ] 🔴 text 📅 ... — [[link]]
                const textMatch = line.match(/^\s*[-*+]\s+\[[ xX]\]\s+(?:[\u{1F534}\u{1F7E0}\u{1F535}\u{1F7E2}\u{26AA}]\s+)?(.*?)\s+(?:\u{1F4C5}|—)/u);
                if (!textMatch) continue;
                const taskText = textMatch[1].trim().replace(/~~/g, ''); // strip strikethrough

                if (!changes.has(srcPath)) changes.set(srcPath, []);
                changes.get(srcPath).push({ taskText, wantChecked });
            }

            // Apply to source files
            for (const [srcPath, mods] of changes) {
                const srcFile = vault.getAbstractFileByPath(srcPath);
                if (!(srcFile instanceof TFile)) continue;

                const srcContent = await vault.read(srcFile);
                const srcLines = srcContent.split('\n');
                let modified = false;

                for (const mod of mods) {
                    for (let i = 0; i < srcLines.length; i++) {
                        const sl = srcLines[i];
                        const sm = sl.match(/^\s*[-*+]\s+\[([ xX])\]\s+(.*)$/);
                        if (!sm) continue;

                        const srcText = sm[2].trim().replace(/\s*\^[a-zA-Z0-9-]+$/, '').trim();
                        if (srcText !== mod.taskText) continue;

                        const isChecked = sm[1].toLowerCase() === 'x';
                        if (isChecked !== mod.wantChecked) {
                            const newBox = mod.wantChecked ? '[x]' : '[ ]';
                            srcLines[i] = sl.replace(/^\s*([-*+])\s+\[[ xX]\]/, `$1 ${newBox}`);
                            modified = true;
                        }
                        break;
                    }
                }

                if (modified) {
                    await vault.modify(srcFile, srcLines.join('\n'));
                    this._taskCache.delete(srcPath);
                }
            }
        } catch (err) {
            console.error('Sync error:', err);
        } finally {
            this._isSyncing = false;
        }
    }
}

// ====== SETTINGS ======
class SettingTab extends PluginSettingTab {
    constructor(app, plugin) {
        super(app, plugin);
        this.plugin = plugin;
    }
    display() {
        const { containerEl } = this;
        containerEl.empty();
        const s = this.plugin.settings;

        containerEl.createEl('h2', { text: '\u{2699}\u{FE0F} Task Aggregator' });

        new Setting(containerEl)
            .setName('Cilova poznamka')
            .addText(t => t.setPlaceholder('Tasks/All Tasks.md').setValue(s.targetNotePath)
                .onChange(async v => { s.targetNotePath = v; await this.plugin.saveSettings(); }));

        new Setting(containerEl)
            .setName('Dvousmerna synchronizace')
            .setDesc('Zaskrtnuti v souhrnne poznamce zaskrtne i original')
            .addToggle(t => t.setValue(s.twoWaySync)
                .onChange(async v => { s.twoWaySync = v; await this.plugin.saveSettings(); }));

        new Setting(containerEl)
            .setName('Zahrnout splnene')
            .addToggle(t => t.setValue(s.includeCompleted)
                .onChange(async v => { s.includeCompleted = v; await this.plugin.saveSettings(); }));

        new Setting(containerEl)
            .setName('Seskupit podle')
            .addDropdown(d => d
                .addOption('file', 'Soubor')
                .addOption('tag', 'Tag')
                .addOption('due', 'Termin')
                .addOption('none', 'Nic')
                .setValue(s.groupBy)
                .onChange(async v => { s.groupBy = v; await this.plugin.saveSettings(); }));

        new Setting(containerEl)
            .setName('Seradit podle')
            .addDropdown(d => d
                .addOption('file', 'Soubor')
                .addOption('due', 'Termin')
                .addOption('priority', 'Priorita')
                .setValue(s.sortBy)
                .onChange(async v => { s.sortBy = v; await this.plugin.saveSettings(); }));

        new Setting(containerEl)
            .setName('Vyloucene slozky')
            .setDesc('Carkou oddelene')
            .addText(t => t.setPlaceholder('Templates, Archive').setValue(s.excludedFolders)
                .onChange(async v => { s.excludedFolders = v; await this.plugin.saveSettings(); }));

        new Setting(containerEl)
            .setName('Povinne tagy')
            .setDesc('Jen tasky s temito tagy (prazdne = vse)')
            .addText(t => t.setPlaceholder('todo, work').setValue(s.includedTags)
                .onChange(async v => { s.includedTags = v; await this.plugin.saveSettings(); }));

        new Setting(containerEl)
            .setName('Vyloucene tagy')
            .addText(t => t.setPlaceholder('done, later').setValue(s.excludedTags)
                .onChange(async v => { s.excludedTags = v; await this.plugin.saveSettings(); }));
    }
}

module.exports = TaskAggregatorPlugin;