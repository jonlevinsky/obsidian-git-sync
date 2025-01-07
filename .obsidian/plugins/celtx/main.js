"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const obsidian_1 = require("obsidian");
class ScriptFormattingPlugin extends obsidian_1.Plugin {
    async onload() {
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
        // Zkontrolujeme, zda soubor obsahuje tag 'style:script'
        if (this.hasStyleScriptTag(fileContent)) {
            const formattedContent = this.generateFormattedText(fileContent);
            // Automatické přepsání souboru novým formátovaným obsahem
            await this.app.vault.modify(activeFile, formattedContent);
            // Přidání specifického stylu pouze pro tento soubor
            this.applyStyleScript();
        }
    }
    // Funkce pro detekci tagu 'style:script'
    hasStyleScriptTag(content) {
        return content.includes('style:script'); // Hledání tagu 'style:script'
    }
    // Funkce pro aplikaci stylu na soubor s tagem 'style:script'
    applyStyleScript() {
        const style = document.createElement('style');
        style.textContent = `
    /* Celkový styl pro scénář pro editor */
    @media print{
        * { 
            font-family: 'Courier New', Courier, monospace;
            color #000;
            background-color: transparent;
            font-size: 12px;
            line-height: 13px;
            padding: 0;
        }
    }
    
    .cm-s-obsidian body {
        font-size: 12px !important; 
        line-height: 13px !important;
    }
    
    /* Scene Heading (h1) - pro # */
    .cm-s-obsidian .cm-header-1 {
        font-family: 'Courier New', Courier, monospace;
        font-size: 12px;
        font-weight: bold;
        text-transform: uppercase;
        background-color: #D3D3D3;
        color: #1e1e1e;
        padding: 0.1in 0;
        text-align: left;
        letter-spacing: 1px;
        line-height: 13px;
    }
    
    /* Action (h2) - pro ## */
    .cm-s-obsidian .cm-header-2 {
        font-family: 'Courier New', Courier, monospace;
        font-size: 12px;
        line-height: 13px;
        text-align: justify;
    }
    
    /* Character (h3) - pro ### */
    .cm-s-obsidian .cm-header-3 {
        font-family: 'Courier New', Courier, monospace;
        font-size: 12px;
        font-weight: bold;
        text-transform: uppercase;
        text-align: left;
        margin-left: 3.7in;
        line-height: 13px;
    }
    
    /* Parentheticals (h4) - pro #### */
    .cm-s-obsidian .cm-header-4 {
        font-family: 'Courier New', Courier, monospace;
        font-size: 12px;
        font-style: italic;
        text-align: left;
        margin-left: 3.7in;
        line-height: 13px;
    }
    
    /* Dialogue (h5) - pro ##### */
    .cm-s-obsidian .cm-header-5 {
        font-family: 'Courier New', Courier, monospace;
        font-size: 12px;
        line-height: 13px;
        text-align: left;
        margin-left: 2.5in;
        margin-right: 1in;
    }
    
    /* Transition (h6) - pro ###### */
    .cm-s-obsidian .cm-header-6 {
        font-family: 'Courier New', Courier, monospace;
        font-size: 12px;
        font-weight: bold;
        text-transform: uppercase;
        text-align: center;
        line-height: 13px;
    }
    
    /* Styl pro režim čtení (Preview) */
    
    /* Celkový styl pro scénář pro preview */
    .markdown-preview-view body {
        font-size: 12px;
        line-height: 13px;
    }
    
    /* Scene Heading (h1) - pro # */
    .markdown-preview-view h1 {
        font-family: 'Courier New', Courier, monospace;
        font-size: 12px;
        font-weight: bold;
        text-transform: uppercase;
        background-color: #D3D3D3;
        color: #1e1e1e;
        padding: 0.1in 0;
        text-align: left;
        letter-spacing: 1px;
        line-height: 13px;
    }
    
    /* Action (h2) - pro ## */
    .markdown-preview-view h2 {
        font-family: 'Courier New', Courier, monospace;
        font-size: 12px;
        line-height: 13px;
        text-align: justify;
    }
    
    /* Character (h3) - pro ### */
    .markdown-preview-view h3 {
        font-family: 'Courier New', Courier, monospace;
        font-size: 12px;
        font-weight: bold;
        text-transform: uppercase;
        text-align: left;
        margin-left: 3.7in;
        line-height: 13px;
    }
    
    /* Parentheticals (h4) - pro #### */
    .markdown-preview-view h4 {
        font-family: 'Courier New', Courier, monospace;
        font-size: 12px;
        font-style: italic;
        text-align: left;
        margin-left: 3.7in;
        line-height: 13px;
    }
    
    /* Dialogue (h5) - pro ##### */
    .markdown-preview-view h5 {
        font-family: 'Courier New', Courier, monospace;
        font-size: 12px;
        line-height: 13px;
        text-align: left;
        margin-left: 2.5in;
        margin-right: 1in;
    }
    
    /* Transition (h6) - pro ###### */
    .markdown-preview-view h6 {
        font-family: 'Courier New', Courier, monospace;
        font-size: 12px;
        font-weight: bold;
        text-transform: uppercase;
        text-align: center;
        line-height: 13px;
    }
    `;
        document.head.appendChild(style);
    }
    generateFormattedText(input) {
        let output = input;
        // Opravené regexy pro odstranění prázdných řádků mezi hlavičkami
        output = output.replace(/^(# .*)\n+/gm, (match, p1) => {
            return `# ${p1}\n`; // Udržení hlavičky s novým řádkem
        });
        output = output.replace(/^(## .*)\n+/gm, (match, p1) => {
            return `## ${p1}\n`;
        });
        output = output.replace(/^(### .*)\n+/gm, (match, p1) => {
            return `### ${p1}\n`;
        });
        output = output.replace(/^(#### .*)\n+/gm, (match, p1) => {
            return `#### ${p1}\n`; // Odstranění prázdného řádku mezi hlavičkami
        });
        output = output.replace(/^(##### .*)\n+/gm, (match, p1) => {
            return `##### ${p1}\n`;
        });
        output = output.replace(/^(###### .*)\n+/gm, (match, p1) => {
            return `###### ${p1}\n`;
        });
        return output;
    }
}
exports.default = ScriptFormattingPlugin;
