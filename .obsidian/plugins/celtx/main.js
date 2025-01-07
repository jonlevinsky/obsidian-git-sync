"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const obsidian_1 = require("obsidian");
class SceneFormattingPlugin extends obsidian_1.Plugin {
    async onload() {
        console.log("Scene Formatting Plugin loaded!");
        // Přidání panelu pro formátování do editoru
        this.addFormattingToolbar();
    }
    // Funkce pro přidání panelu s tlačítky pro formátování
    addFormattingToolbar() {
        // Vytvoříme nastavení pro tlačítka
        new obsidian_1.Setting(this.app.workspace.layoutReady)
            .setName('Scene Heading')
            .setDesc('Formát pro scénu')
            .addButton((button) => button.setButtonText('Scene Heading').onClick(() => this.formatText('sceneheading')));
        new obsidian_1.Setting(this.app.workspace.layoutReady)
            .setName('Dialog')
            .setDesc('Formát pro dialog')
            .addButton((button) => button.setButtonText('Dialog').onClick(() => this.formatText('dialog')));
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
