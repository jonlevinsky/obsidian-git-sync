const { Plugin, PluginSettingTab, Setting, TFile, Notice } = require('obsidian');

const DEFAULT_SETTINGS = {
    targetNotePath: 'Tasks/All Tasks.md',
    includeCompleted: false,
    groupBy: 'file',
    sortBy: 'file',
    excludedFolders: '',
    includedTags: '',
    excludedTags: '',
};

const PRIORITY = { highest: 0, high: 1, medium: 2, low: 3, lowest: 4, none: 5 };
const PEMOJI = { highest: '\u{1F534}', high: '\u{1F7E0}', medium: '\u{1F535}', low: '\u{1F7E2}', lowest: '\u{26AA}', none: '' };

function parsePriority(t) {
    if (/\u{1F534}|\u{23EB}|priority::\s*highest/u.test(t)) return 'highest';
    if (/\u{1F7E0}|\u{1F53C}|priority::\s*high/u.test(t)) return 'high';
    if (/\u{1F535}|priority::\s*medium/u.test(t)) return 'medium';
    if (/\u{1F7E2}|\u{1F53D}|priority::\s*low/u.test(t)) return 'low';
    if (/\u{26AA}|\u{23EC}|priority::\s*lowest/u.test(t)) return 'lowest';
    return 'none';
}

function parseDue(t) {
    const m = t.match(/\u{1F4C5}\s*(\d{4}-\d{2}-\d{2})|due::\s*(\d{4}-\d{2}-\d{2})/u);
    return m ? (m[1] || m[2]) : null;
}

function parseTags(t) {
    return Array.from(t.matchAll(/#([\w\-/]+)/g)).map(m => m[1]);
}

function isOverdue(d) { return d && new Date(d) < new Date(new Date().setHours(0,0,0,0)); }
function isToday(d) { return d === new Date().toISOString().split('T')[0]; }
function fmtDue(d) {
    if (!d) return '';
    if (isToday(d)) return '\u{1F4C5} **Dnes**';
    if (isOverdue(d)) return `\u{1F4C5} ~~${d}~~ \u{1F525}`;
    return `\u{1F4C5} ${d}`;
}

function pbar(done, total, w = 20) {
    if (!total) return '\u{2591}'.repeat(w);
    const f = Math.round((done / total) * w);
    return '\u{2588}'.repeat(f) + '\u{2591}'.repeat(w - f);
}

class TaskAggregatorPlugin extends Plugin {
    async onload() {
        await this.loadSettings();
        this._cache = new Map();

        this.addRibbonIcon('check-circle', 'Seskupit tasky', () => this.aggregate());
        this.addCommand({ id: 'aggregate', name: 'Seskupit vsechny tasky', callback: () => this.aggregate() });
        this.addCommand({ id: 'refresh', name: 'Force refresh', callback: () => { this._cache.clear(); this.aggregate(); } });

        this.registerEvent(this.app.workspace.on('file-open', (f) => {
            if (f && f.path === this.settings.targetNotePath) this.aggregate();
        }));

        this.registerEvent(this.app.vault.on('modify', (f) => {
            if (!(f instanceof TFile) || f.path === this.settings.targetNotePath) return;
            this._cache.delete(f.path);
            const a = this.app.workspace.getActiveFile();
            if (a && a.path === this.settings.targetNotePath) this.aggregate();
        }));

        this.addSettingTab(new SettingTab(this.app, this));
    }

    async loadSettings() { this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData()); }
    async saveSettings() { await this.saveData(this.settings); }

    async scan() {
        const { vault } = this.app;
        const files = vault.getMarkdownFiles();
        const exF = this.settings.excludedFolders.split(',').map(s => s.trim()).filter(Boolean);
        const incT = this.settings.includedTags.split(',').map(s => s.trim().replace(/^#/,'')).filter(Boolean);
        const exT = this.settings.excludedTags.split(',').map(s => s.trim().replace(/^#/,'')).filter(Boolean);

        let tasks = [];
        for (const file of files) {
            if (file.path === this.settings.targetNotePath) continue;
            if (exF.some(f => file.path.startsWith(f))) continue;

            const c = this._cache.get(file.path);
            if (c) { tasks.push(...c); continue; }

            const content = await vault.read(file);
            const lines = content.split('\n');
            const ft = [];
            let heading = '';

            for (let i = 0; i < lines.length; i++) {
                const line = lines[i];
                const hm = line.match(/^(#{1,6})\s+(.*)$/);
                if (hm) heading = hm[2].trim();

                const tm = line.match(/^(\s*)[-*+]\s+\[([ xX])\]\s+(.*)$/);
                if (!tm) continue;

                const completed = tm[2].toLowerCase() === 'x';
                if (!this.settings.includeCompleted && completed) continue;

                let text = tm[3].trim().replace(/\s*\^[a-zA-Z0-9-]+$/, '').trim();
                const tags = parseTags(text);
                if (incT.length && !incT.some(t => tags.includes(t))) continue;
                if (exT.length && exT.some(t => tags.includes(t))) continue;

                ft.push({ file, line: i, text, heading, completed, priority: parsePriority(text), due: parseDue(text), tags });
            }
            this._cache.set(file.path, ft);
            tasks.push(...ft);
        }
        return tasks;
    }

    sort(tasks) {
        const { sortBy } = this.settings;
        tasks.sort((a, b) => {
            if (sortBy === 'due') {
                if (!a.due && !b.due) return 0;
                if (!a.due) return 1; if (!b.due) return -1;
                return a.due.localeCompare(b.due);
            }
            if (sortBy === 'priority') return PRIORITY[a.priority] - PRIORITY[b.priority];
            if (a.file.path !== b.file.path) return a.file.path.localeCompare(b.file.path);
            return a.line - b.line;
        });
        return tasks;
    }

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

    generate(tasks) {
        const now = new Date().toLocaleString('cs-CZ');
        const total = tasks.length;
        const done = tasks.filter(t => t.completed).length;
        const remaining = total - done;
        const pct = total ? Math.round((done / total) * 100) : 0;
        const lines = [];

        lines.push('---');
        lines.push('cssclass: task-aggregator');
        lines.push('---');
        lines.push('');
        lines.push('# \u{1F4CB} Seskupene tasky');
        lines.push(`> Aktualizovano: **${now}** | Celkem: **${total}** | Splneno: **${done}** | Zbyva: **${remaining}**`);
        lines.push('');

        lines.push(`> \u{1F4CA} **${pct}%** ${pbar(done, total)} (${done}/${total})`);

        const byTag = {};
        for (const t of tasks) {
            const tag = t.tags[0] || 'bez tagu';
            if (!byTag[tag]) byTag[tag] = { total: 0, done: 0 };
            byTag[tag].total++; if (t.completed) byTag[tag].done++;
        }
        for (const [tag, s] of Object.entries(byTag)) {
            const tp = s.total ? Math.round((s.done / s.total) * 100) : 0;
            lines.push(`> &nbsp;&nbsp;${tag}: ${pbar(s.done, s.total, 10)} **${tp}%** (${s.done}/${s.total})`);
        }
        lines.push('');

        const prios = { highest: 0, high: 0, medium: 0, low: 0, lowest: 0, none: 0 };
        const dues = { overdue: 0, today: 0, future: 0, none: 0 };
        for (const t of tasks) {
            if (t.completed) continue;
            prios[t.priority]++;
            if (isOverdue(t.due)) dues.overdue++;
            else if (isToday(t.due)) dues.today++;
            else if (t.due) dues.future++;
            else dues.none++;
        }
        const statParts = Object.entries(prios).filter(([,c]) => c).map(([p,c]) => `${PEMOJI[p]}${c}`);
        if (dues.overdue) statParts.push(`\u{1F525}${dues.overdue}`);
        if (dues.today) statParts.push(`\u{1F4C5}${dues.today}`);
        lines.push(`> \u{1F4C8} **Zbyva:** ${statParts.join(' | ')}`);
        lines.push('');

        const grouped = this.group(tasks);
        for (const [name, gt] of grouped) {
            lines.push(`## ${name}`);
            lines.push('');
            for (const t of gt) {
                const pe = PEMOJI[t.priority];
                const due = fmtDue(t.due);
                const tags = t.tags.length ? t.tags.map(x => `#${x}`).join(' ') : '';
                const link = `[[${t.file.path}|${t.file.basename}]]`;
                const check = t.completed ? '[x]' : '[ ]';
                lines.push(`- ${check} ${pe} ${t.text} ${due} ${tags} — ${link}`);
            }
            lines.push('');
        }

        lines.push('---');
        lines.push('');
        lines.push('> \u{26A1} *Auto-refresh pri otevreni. Uprav task ve zdrojove poznamce a otevri znovu pro aktualizaci.*');

        return lines.join('\n');
    }

    async aggregate() {
        let tasks;
        try {
            tasks = await this.scan();
        } catch (e) {
            new Notice('\u{274C} Chyba pri skenovani: ' + e.message);
            return;
        }

        tasks = this.sort(tasks);
        const content = this.generate(tasks);

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
            new Notice(`\u{2705} ${tasks.length} tasku aktualizovano`);
        } catch (e) {
            new Notice('\u{274C} Chyba pri zapisu: ' + e.message);
        }
    }
}

class SettingTab extends PluginSettingTab {
    constructor(app, plugin) { super(app, plugin); this.plugin = plugin; }
    display() {
        const { containerEl } = this;
        containerEl.empty();
        const s = this.plugin.settings;

        containerEl.createEl('h2', { text: '\u{2699}\u{FE0F} Task Aggregator' });

        new Setting(containerEl).setName('Cilova poznamka').addText(t =>
            t.setPlaceholder('Tasks/All Tasks.md').setValue(s.targetNotePath)
                .onChange(async v => { s.targetNotePath = v; await this.plugin.saveSettings(); }));

        new Setting(containerEl).setName('Zahrnout splnene').addToggle(t =>
            t.setValue(s.includeCompleted).onChange(async v => { s.includeCompleted = v; await this.plugin.saveSettings(); }));

        new Setting(containerEl).setName('Seskupit podle').addDropdown(d => d
            .addOption('file', 'Soubor').addOption('tag', 'Tag').addOption('due', 'Termin').addOption('none', 'Nic')
            .setValue(s.groupBy).onChange(async v => { s.groupBy = v; await this.plugin.saveSettings(); }));

        new Setting(containerEl).setName('Seradit podle').addDropdown(d => d
            .addOption('file', 'Soubor').addOption('due', 'Termin').addOption('priority', 'Priorita')
            .setValue(s.sortBy).onChange(async v => { s.sortBy = v; await this.plugin.saveSettings(); }));

        new Setting(containerEl).setName('Vyloucene slozky').setDesc('Carkou oddelene')
            .addText(t => t.setPlaceholder('Templates, Archive').setValue(s.excludedFolders)
                .onChange(async v => { s.excludedFolders = v; await this.plugin.saveSettings(); }));

        new Setting(containerEl).setName('Povinne tagy').setDesc('Jen tasky s temito tagy (prazdne = vse)')
            .addText(t => t.setPlaceholder('todo, work').setValue(s.includedTags)
                .onChange(async v => { s.includedTags = v; await this.plugin.saveSettings(); }));

        new Setting(containerEl).setName('Vyloucene tagy').addText(t =>
            t.setPlaceholder('done, later').setValue(s.excludedTags)
                .onChange(async v => { s.excludedTags = v; await this.plugin.saveSettings(); }));
    }
}

module.exports = TaskAggregatorPlugin;