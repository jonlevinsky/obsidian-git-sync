"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const obsidian_1 = require("obsidian");
class SceneFormattingPlugin extends obsidian_1.Plugin {
    async onload() {
        console.log("Scene Formatting Plugin loaded!");
        // Přidání tabulky pro nastavení
        this.addSettingTab(new SceneFormattingSettingTab(this.app, this));
    }
    // Funkce pro aplikaci formátu na text
    formatText(type) {
        const editor = this.app.workspace.getActiveViewOfType(obsidian_1.MarkdownView)?.editor;
        if (!editor) {
            console.error('No active editor found');
            return;
        }
        const selectedText = editor.getSelection();
        if (selectedText) {
            let formattedText = selectedText;
            if (type === 'sceneheading') {
                formattedText = `SCENE HEADING: ${selectedText.toUpperCase()}`;
            }
            else if (type === 'dialog') {
                formattedText = `"${selectedText}"`;
            }
            editor.replaceSelection(formattedText);
        }
    }
    onunload() {
        console.log("Scene Formatting Plugin unloaded!");
    }
}
exports.default = SceneFormattingPlugin;
// Vlastní třída pro nastavení pluginu
class SceneFormattingSettingTab extends obsidian_1.PluginSettingTab {
    constructor(app, plugin) {
        super(app, plugin);
        this.plugin = plugin;
    }
    display() {
        let { containerEl } = this;
        containerEl.empty();
        // Přidání nastavení
        new obsidian_1.Setting(containerEl)
            .setName('Scene Heading')
            .setDesc('Formát pro scénu')
            .addButton((button) => button.setButtonText('Scene Heading').onClick(() => this.plugin.formatText('sceneheading')));
        new obsidian_1.Setting(containerEl)
            .setName('Dialog')
            .setDesc('Formát pro dialog')
            .addButton((button) => button.setButtonText('Dialog').onClick(() => this.plugin.formatText('dialog')));
    }
}
