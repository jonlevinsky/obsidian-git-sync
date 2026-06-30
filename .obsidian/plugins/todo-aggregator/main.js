const obsidian = require('obsidian');
const Plugin = obsidian.Plugin;
const PluginSettingTab = obsidian.PluginSettingTab;
const Setting = obsidian.Setting;
const TFile = obsidian.TFile;

const DEFAULT_SETTINGS = {
    targetNotePath: 'TODO Aggregator.md',
    includeCompleted: false,
    headingText: '## Seznam ukolu'
};

class TodoAggregatorPlugin extends Plugin {
    async onload() {
        await this.loadSettings();
        this.addSettingTab(new TodoAggregatorSettingTab(this.app, this));
        this.injectStyles();
        this.registerFileOpenHandler();
        this.registerAutoRefresh();

        this.app.workspace.onLayoutReady(() => {
            this.updateBodyClass();
            this.scanVaultAndAggregate();
        });

        this.addRibbonIcon('check-circle', 'Agregovat TODOs', () => {
            this.scanVaultAndAggregate();
        });

        this.addCommand({
            id: 'scan-and-aggregate-todos',
            name: 'Nascanovat a agregovat TODOs',
            callback: () => this.scanVaultAndAggregate()
        });

        console.log('TODO Aggregator loaded');
    }

    registerFileOpenHandler() {
        this.registerEvent(
            this.app.workspace.on('file-open', (file) => {
                this.updateBodyClass();
            })
        );
    }

    registerAutoRefresh() {
        this.registerEvent(
            this.app.vault.on('modify', (file) => {
                if (file.path === this.settings.targetNotePath) return;
                if (file.extension !== 'md') return;
                this.debouncedScan();
            })
        );
    }

    debouncedScan() {
        if (this.scanTimeout) clearTimeout(this.scanTimeout);
        this.scanTimeout = setTimeout(() => {
            this.scanVaultAndAggregate();
        }, 500);
    }

    updateBodyClass() {
        const activeFile = this.app.workspace.getActiveFile();
        const body = document.body;
        const targetPath = this.settings.targetNotePath;

        if (activeFile && activeFile.path === targetPath) {
            body.classList.add('todo-aggregator-target');
        } else {
            body.classList.remove('todo-aggregator-target');
        }
    }

    injectStyles() {
        const existing = document.getElementById('todo-aggregator-styles');
        if (existing) existing.remove();

        const style = document.createElement('style');
        style.id = 'todo-aggregator-styles';
        style.textContent = `
            .todo-aggregator-target .markdown-embed,
            .todo-aggregator-target .markdown-embed .markdown-embed-content {
                border: none !important;
                background: transparent !important;
                padding: 0 !important;
                margin: 0 !important;
                box-shadow: none !important;
                border-radius: 0 !important;
            }
            .todo-aggregator-target .markdown-embed .embed-title,
            .todo-aggregator-target .markdown-embed .markdown-embed-link {
                display: none !important;
            }
            .todo-aggregator-target .markdown-embed .markdown-preview-view {
                padding: 0 !important;
            }
            .todo-aggregator-target .markdown-embed .markdown-embed-content > .markdown-preview-view > .markdown-preview-sizer {
                padding: 0 !important;
                min-height: auto !important;
            }
            .todo-aggregator-target .markdown-embed .markdown-preview-sizer > div {
                margin: 0 !important;
                padding: 0 !important;
            }
            .todo-aggregator-target .markdown-embed p {
                margin: 0 !important;
                padding: 0 !important;
                line-height: 1.4 !important;
            }
            .todo-aggregator-target .markdown-embed .task-list-item {
                margin: 0 !important;
                padding: 0 !important;
                min-height: auto !important;
            }
            .todo-aggregator-target .markdown-embed .task-list-item-checkbox {
                margin: 0 6px 0 0 !important;
                vertical-align: middle !important;
            }
            .todo-aggregator-target .internal-embed {
                display: block !important;
                margin: 2px 0 !important;
            }
        `;
        document.head.appendChild(style);
    }

    async scanVaultAndAggregate() {
        const vault = this.app.vault;
        const markdownFiles = vault.getMarkdownFiles();
        const todos = [];
        const targetPath = this.settings.targetNotePath;

        for (const file of markdownFiles) {
            if (file.path === targetPath) continue;

            const content = await vault.read(file);
            const lines = content.split(String.fromCharCode(10));
            let modified = false;

            for (let i = 0; i < lines.length; i++) {
                const line = lines[i];

                if (line.indexOf('![[') !== -1) continue;

                const trimmed = line.trim();
                if (!trimmed.startsWith('- [') && !trimmed.startsWith('* [')) continue;
                if (trimmed.length < 5) continue;
                const checkChar = trimmed[3];
                if (checkChar !== ' ' && checkChar !== 'x') continue;

                const isCompleted = checkChar === 'x';
                if (!this.settings.includeCompleted && isCompleted) continue;

                let blockId = this.extractBlockId(line);

                if (!blockId) {
                    blockId = this.generateBlockId();
                    lines[i] = line + ' ^' + blockId;
                    modified = true;
                }

                todos.push({
                    filePath: file.path,
                    blockId: blockId,
                    isCompleted: isCompleted
                });
            }

            if (modified) {
                await vault.modify(file, lines.join(String.fromCharCode(10)));
            }
        }

        const outputLines = [];

        if (todos.length === 0) {
            outputLines.push('*Nothing to see here!*');
        } else {
            // Group by file path
            const grouped = {};
            for (const todo of todos) {
                if (!grouped[todo.filePath]) grouped[todo.filePath] = [];
                grouped[todo.filePath].push(todo);
            }

            for (const filePath of Object.keys(grouped)) {
                const fileName = filePath.replace(/\.md$/i, '');
                outputLines.push('# ' + fileName);
                outputLines.push('');
                for (const todo of grouped[filePath]) {
                    outputLines.push('![[' + todo.filePath + '#^' + todo.blockId + ']]');
                }
                outputLines.push('');
            }
        }

        const existingFile = vault.getAbstractFileByPath(targetPath);

        if (existingFile instanceof TFile) {
            await vault.modify(existingFile, outputLines.join(String.fromCharCode(10)));
        } else {
            await vault.create(targetPath, outputLines.join(String.fromCharCode(10)));
        }
    }

    extractBlockId(line) {
        const match = line.match(/\s\^([\w-]+)$/);
        return match ? match[1] : null;
    }

    generateBlockId() {
        return 'todo-' + Math.random().toString(36).substring(2, 9);
    }

    onunload() {
        if (this.scanTimeout) clearTimeout(this.scanTimeout);
        const existing = document.getElementById('todo-aggregator-styles');
        if (existing) existing.remove();
        document.body.classList.remove('todo-aggregator-target');
    }

    async loadSettings() {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    }

    async saveSettings() {
        await this.saveData(this.settings);
        this.updateBodyClass();
    }
}

class TodoAggregatorSettingTab extends PluginSettingTab {
    constructor(app, plugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display() {
        const containerEl = this.containerEl;
        containerEl.empty();
        containerEl.createEl('h2', { text: 'Nastaveni TODO Aggregatoru' });

        new Setting(containerEl)
            .setName('Cilova poznamka')
            .setDesc('Cesta k poznamce, do ktere se vlozi agregovane TODOs.')
            .addText(text => text
                .setPlaceholder('TODO Aggregator.md')
                .setValue(this.plugin.settings.targetNotePath)
                .onChange(async (value) => {
                    this.plugin.settings.targetNotePath = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('Zahrnout dokoncene ukoly')
            .setDesc('Zapni pro agregaci i zaskrtnutych [x] ukolu.')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.includeCompleted)
                .onChange(async (value) => {
                    this.plugin.settings.includeCompleted = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('Nadpis v cilove poznamce')
            .setDesc('Markdown nadpis, pod ktery se ukoly vlozi.')
            .addText(text => text
                .setPlaceholder('## Seznam ukolu')
                .setValue(this.plugin.settings.headingText)
                .onChange(async (value) => {
                    this.plugin.settings.headingText = value;
                    await this.plugin.saveSettings();
                }));
    }
}

module.exports = TodoAggregatorPlugin;