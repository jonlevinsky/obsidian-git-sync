const { Plugin, PluginSettingTab, Setting, TFile } = require('obsidian');

const DEFAULT_SETTINGS = {
    targetNotePath: 'TODO Aggregator.md',
    includeCompleted: false,
    headingText: '## Seznam úkolů'
};

module.exports = class TodoAggregatorPlugin extends Plugin {
    async onload() {
        await this.loadSettings();
        this.addSettingTab(new TodoAggregatorSettingTab(this.app, this));

        // Spustit až bude vault připravený
        this.app.workspace.onLayoutReady(() => {
            this.scanVaultAndAggregate();
        });

        // Ribbon ikona
        this.addRibbonIcon('check-circle', 'Agregovat TODOs', () => {
            this.scanVaultAndAggregate();
        });

        // Příkazová paleta
        this.addCommand({
            id: 'scan-and-aggregate-todos',
            name: 'Nascanovat a agregovat TODOs',
            callback: () => this.scanVaultAndAggregate()
        });
    }

    async scanVaultAndAggregate() {
        const vault = this.app.vault;
        const markdownFiles = vault.getMarkdownFiles();
        const todos = [];

        for (const file of markdownFiles) {
            // Přeskočit cílový soubor
            if (file.path === this.settings.targetNotePath) continue;

            const content = await vault.read(file);
            const lines = content.split('\n');
            let modified = false;

            for (let i = 0; i < lines.length; i++) {
                const line = lines[i];
                // Detekce checkboxu: - [ ] / - [x] / * [ ] / * [x]
                const match = line.match(/^(\s*[-*]\s+\[([ x])\]\s+)(.*)$/);
                if (!match) continue;

                const isCompleted = match[2].toLowerCase() === 'x';
                if (!this.settings.includeCompleted && isCompleted) continue;

                // Získat nebo vygenerovat block ID
                let blockId = this.extractBlockId(line);
                let cleanText = match[3].replace(/\s*\^\w+$/, '').trim();

                if (!blockId) {
                    blockId = this.generateBlockId();
                    lines[i] = line + ' ^' + blockId;
                    modified = true;
                }

                todos.push({
                    filePath: file.path,
                    text: cleanText,
                    blockId: blockId,
                    isCompleted: isCompleted
                });
            }

            // Uložit změny (přidaná block ID) zpět do souboru
            if (modified) {
                await vault.modify(file, lines.join('\n'));
            }
        }

        // Sestavit obsah cílové poznámky
        const outputLines = [];
        outputLines.push(this.settings.headingText);
        outputLines.push('');

        if (todos.length === 0) {
            outputLines.push('*Žádné úkoly k zobrazení.*');
        } else {
            for (const todo of todos) {
                const status = todo.isCompleted ? '- [x]' : '- [ ]';
                // Embedded odkaz: ![[soubor#^blockId]]
                outputLines.push(status + ' ![[' + todo.filePath + '#^' + todo.blockId + ']]');
            }
        }

        outputLines.push('');
        outputLines.push('*Aktualizováno: ' + new Date().toLocaleString('cs-CZ') + '*');

        // Zapsat do cílového souboru
        const targetPath = this.settings.targetNotePath;
        const existingFile = vault.getAbstractFileByPath(targetPath);

        if (existingFile instanceof TFile) {
            await vault.modify(existingFile, outputLines.join('\n'));
        } else {
            await vault.create(targetPath, outputLines.join('\n'));
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
        // cleanup
    }

    async loadSettings() {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    }

    async saveSettings() {
        await this.saveData(this.settings);
    }
};

class TodoAggregatorSettingTab extends PluginSettingTab {
    constructor(app, plugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display() {
        const containerEl = this.containerEl;
        containerEl.empty();
        containerEl.createEl('h2', { text: 'Nastavení TODO Aggregatoru' });

        new Setting(containerEl)
            .setName('Cílová poznámka')
            .setDesc('Cesta k poznámce, do které se vloží agregované TODOs. Pokud neexistuje, bude vytvořena.')
            .addText(text => text
                .setPlaceholder('TODO Aggregator.md')
                .setValue(this.plugin.settings.targetNotePath)
                .onChange(async (value) => {
                    this.plugin.settings.targetNotePath = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('Zahrnout dokončené úkoly')
            .setDesc('Pokud je zapnuto, agreguje i zaškrtnuté [x] úkoly.')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.includeCompleted)
                .onChange(async (value) => {
                    this.plugin.settings.includeCompleted = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('Nadpis v cílové poznámce')
            .setDesc('Markdown nadpis, pod který se úkoly vloží.')
            .addText(text => text
                .setPlaceholder('## Seznam úkolů')
                .setValue(this.plugin.settings.headingText)
                .onChange(async (value) => {
                    this.plugin.settings.headingText = value;
                    await this.plugin.saveSettings();
                }));
    }
}