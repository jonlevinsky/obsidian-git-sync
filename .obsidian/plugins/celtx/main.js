"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const obsidian_1 = require("obsidian");
class ScriptFormattingPlugin extends obsidian_1.Plugin {
    async onload() {
        // Počkejte krátce před spuštěním funkce
        setTimeout(async () => {
            await this.formatScript();
        }, 500); // Počkejte 500 ms, než bude soubor připraven
        // Původní příkaz pro manuální spuštění
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
        style.textContent = `/* Celkový styl pro scénář pro editor */`;
        document.head.appendChild(style);
    }
    generateFormattedText(input) {
        let output = input;
        // Regex pro nahrazení tagů třídami podle předchozího kódu
        output = output.replace(/# (.*)/, (match, p1) => {
            return `# ${p1}`; // Udržení Markdownu s původními značkami
        });
        output = output.replace(/## (.*)/, (match, p1) => {
            return `## ${p1}`;
        });
        output = output.replace(/### (.*)/, (match, p1) => {
            return `### ${p1}`;
        });
        output = output.replace(/#### (.*)/, (match, p1) => {
            // Přidání závorek pouze pokud tam ještě nejsou
            if (!p1.startsWith('(') && !p1.endsWith(')')) {
                return `#### (${p1})`;
            }
            return `#### ${p1}`;
        });
        output = output.replace(/##### (.*)/, (match, p1) => {
            return `##### ${p1}`;
        });
        output = output.replace(/###### (.*)/, (match, p1) => {
            return `###### ${p1}`;
        });
        return output;
    }
}
exports.default = ScriptFormattingPlugin;
