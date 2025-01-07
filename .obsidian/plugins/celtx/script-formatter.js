"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ScriptFormatter = void 0;
const obsidian_1 = require("obsidian");
class ScriptFormatter {
    constructor(app, plugin) {
        this.app = app;
        this.plugin = plugin;
    }
    async formatScript() {
        const activeView = this.app.workspace.getActiveViewOfType(obsidian_1.MarkdownView);
        if (!activeView)
            return;
        const editor = activeView.editor;
        const content = editor.getValue();
        if (this.hasStyleScriptTag(content)) {
            const formattedContent = this.generateFormattedText(content);
            editor.setValue(formattedContent);
            this.applyStyleScript();
        }
    }
    hasStyleScriptTag(content) {
        return content.includes('style:script');
    }
    applyStyleScript() {
        const style = document.createElement('style');
        style.id = 'script-formatting-style';
        style.textContent = `
            /* Celkový styl pro scénář */
            .cm-s-obsidian .HyperMD-header-1,
            .cm-s-obsidian .HyperMD-header-2,
            .cm-s-obsidian .HyperMD-header-3,
            .cm-s-obsidian .HyperMD-header-4,
            .cm-s-obsidian .HyperMD-header-5,
            .cm-s-obsidian .HyperMD-header-6 {
                font-family: 'Courier New', Courier, monospace;
                font-size: 12px;
                line-height: 13px;
            }

            /* Scene Heading (h1) */
            .cm-s-obsidian .HyperMD-header-1 {
                font-weight: bold;
                text-transform: uppercase;
                background-color: #D3D3D3;
                color: #1e1e1e;
                padding: 0.1in 0;
                text-align: left;
                letter-spacing: 1px;
            }

            /* Action (h2) */
            .cm-s-obsidian .HyperMD-header-2 {
                text-align: justify;
            }

            /* Character (h3) */
            .cm-s-obsidian .HyperMD-header-3 {
                font-weight: bold;
                text-transform: uppercase;
                text-align: left;
                margin-left: 3.7in;
            }

            /* Parentheticals (h4) */
            .cm-s-obsidian .HyperMD-header-4 {
                font-style: italic;
                text-align: left;
                margin-left: 3.7in;
            }

            /* Dialogue (h5) */
            .cm-s-obsidian .HyperMD-header-5 {
                text-align: left;
                margin-left: 2.5in;
                margin-right: 1in;
            }

            /* Transition (h6) */
            .cm-s-obsidian .HyperMD-header-6 {
                font-weight: bold;
                text-transform: uppercase;
                text-align: center;
            }
        `;
        document.head.appendChild(style);
    }
    generateFormattedText(input) {
        let output = input;
        // Regex pro nahrazení tagů třídami podle předchozího kódu
        output = output.replace(/# (.*)/, (match, p1) => `# ${p1}`);
        output = output.replace(/## (.*)/, (match, p1) => `## ${p1}`);
        output = output.replace(/### (.*)/, (match, p1) => `### ${p1}`);
        output = output.replace(/#### (.*)/, (match, p1) => {
            if (!p1.startsWith('(') && !p1.endsWith(')')) {
                return `#### (${p1})`;
            }
            return `#### ${p1}`;
        });
        output = output.replace(/##### (.*)/, (match, p1) => `##### ${p1}`);
        output = output.replace(/###### (.*)/, (match, p1) => `###### ${p1}`);
        return output;
    }
}
exports.ScriptFormatter = ScriptFormatter;
