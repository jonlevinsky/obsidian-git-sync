"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const obsidian_1 = require("obsidian");
class ScriptFormattingPlugin extends obsidian_1.Plugin {
    onload() {
        this.addCommand({
            id: 'add-script-style-to-file',
            name: 'Add Script Style to Current File',
            callback: () => this.addScriptStyleToFile(),
        });
    }
    // Funkce pro přidání stylu do aktuálního souboru
    async addScriptStyleToFile() {
        const activeLeaf = this.app.workspace.activeLeaf;
        if (!activeLeaf) {
            new obsidian_1.Notice('No active leaf found.');
            return;
        }
        const activeView = activeLeaf.view;
        if (!activeView) {
            new obsidian_1.Notice('No active view found.');
            return;
        }
        const activeFile = this.getActiveFile(activeView);
        if (activeFile && activeFile instanceof obsidian_1.TFile) {
            // Načteme obsah souboru
            const fileContent = await this.app.vault.read(activeFile);
            // Zkontrolujeme, jestli soubor již obsahuje styl "script"
            if (fileContent.includes('style: script')) {
                new obsidian_1.Notice('File already has the script style.');
                return;
            }
            // Přidáme do YAML frontmatter styl "script" (nebo další specifikace)
            const newContent = this.addStyleToFrontmatter(fileContent);
            // Uložíme změny do souboru
            await this.app.vault.modify(activeFile, newContent);
            new obsidian_1.Notice('Added script style to the file.');
        }
        else {
            new obsidian_1.Notice('No active file to modify.');
        }
    }
    // Funkce pro získání souboru z view
    getActiveFile(view) {
        if (view instanceof obsidian_1.MarkdownView) {
            return view.file;
        }
        return null;
    }
    // Funkce pro přidání stylu do YAML frontmatter souboru
    addStyleToFrontmatter(content) {
        const frontmatterRegex = /^---\s*[\r\n](.*?)\s*[\r\n]---/s;
        const frontmatterMatch = content.match(frontmatterRegex);
        // Pokud soubor nemá frontmatter, přidáme ho
        if (!frontmatterMatch) {
            return `---
style: script
---
${content}`;
        }
        // Pokud frontmatter existuje, přidáme styl "script" nebo upravíme existující
        const frontmatter = frontmatterMatch[1];
        const newFrontmatter = frontmatter.includes('style: script')
            ? frontmatter
            : `${frontmatter}\nstyle: script`;
        // Nahrazení starého frontmatter novým
        return content.replace(frontmatterRegex, `---\n${newFrontmatter}\n---`);
    }
}
exports.default = ScriptFormattingPlugin;
