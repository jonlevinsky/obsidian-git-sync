"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const obsidian_1 = require("obsidian");
const sceneHeadingRegex = /# (.*)/; // Pro # Scene Heading
const actionRegex = /## (.*)/; // Pro ## Action
const characterRegex = /### (.*)/; // Pro ### Character
const parentheticalsRegex = /#### (.*)/; // Pro #### Parentheticals
const dialogueRegex = /##### (.*)/; // Pro ##### Dialogue
const transitionRegex = /###### (.*)/; // Pro ###### Transition
class ScriptFormattingPlugin extends obsidian_1.Plugin {
    async onload() {
        this.addCSS('style.css');
        this.addCommand({
            id: 'format-script',
            name: 'Format Script',
            callback: () => {
                this.formatScript();
            }
        });
    }
    async formatScript() {
        const activeView = this.app.workspace.activeLeaf?.view;
        if (!(activeView instanceof obsidian_1.MarkdownView))
            return; // Zkontroluje, zda je aktivní pohled typu MarkdownView
        const activeFile = activeView.file; // Získá soubor z MarkdownView
        if (!activeFile)
            return;
        const fileContent = await this.app.vault.read(activeFile); // Čtení souboru asynchronně
        const formattedContent = this.generateFormattedText(fileContent);
        // Automatické přepsání souboru novým formátovaným obsahem
        await this.app.vault.modify(activeFile, formattedContent);
    }
    generateFormattedText(input) {
        let output = input;
        // Regex pro nahrazení tagů třídami podle předchozího kódu
        output = output.replace(sceneHeadingRegex, (match, p1) => {
            return `<div class="scene-heading">${p1}</div>`;
        });
        output = output.replace(actionRegex, (match, p1) => {
            return `<div class="action">${p1}</div>`;
        });
        output = output.replace(characterRegex, (match, p1) => {
            return `<div class="character">${p1}</div>`;
        });
        output = output.replace(parentheticalsRegex, (match, p1) => {
            return `<div class="parentheticals">${p1}</div>`;
        });
        output = output.replace(dialogueRegex, (match, p1) => {
            return `<div class="dialogue">${p1}</div>`;
        });
        output = output.replace(transitionRegex, (match, p1) => {
            return `<div class="transition">${p1}</div>`;
        });
        return output;
    }
}
exports.default = ScriptFormattingPlugin;
