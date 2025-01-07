"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const obsidian_1 = require("obsidian");
const obsidian_2 = require("obsidian");
class AutoFormatPlugin extends obsidian_1.Plugin {
    async onload() {
        console.log("Auto Format Plugin loaded!");
        // Příkaz pro aplikaci stylu podle počtu tabů
        this.addCommand({
            id: "apply-tab-styles",
            name: "Apply Tab Styles",
            callback: () => this.applyStyleBasedOnTabs(),
        });
    }
    // Funkce pro aplikaci stylu na základě počtu tabů
    applyStyleBasedOnTabs() {
        const markdownView = this.app.workspace.getActiveViewOfType(obsidian_2.MarkdownView);
        if (!markdownView)
            return;
        const editor = markdownView.editor;
        const lineNumber = editor.getCursor().line;
        const lineText = editor.getLine(lineNumber);
        // Počet tabulátorů na začátku řádku
        const tabCount = lineText.match(/^\t*/)?.[0].length || 0;
        // Určení stylu podle počtu tabulátorů
        let newLineText = lineText;
        if (tabCount === 1) {
            newLineText = `## Scene Heading: ${lineText.trim()}`;
        }
        else if (tabCount === 2) {
            newLineText = `> Dialog: ${lineText.trim()}`;
        }
        // Pokud se text změnil, aktualizuj řádek
        if (newLineText !== lineText) {
            editor.replaceRange(newLineText, { line: lineNumber, ch: 0 }, { line: lineNumber, ch: lineText.length });
        }
    }
    onunload() {
        console.log("Auto Format Plugin unloaded!");
    }
}
exports.default = AutoFormatPlugin;
