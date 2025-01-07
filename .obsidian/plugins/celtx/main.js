"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const obsidian_1 = require("obsidian");
class AutoFormatPlugin extends obsidian_1.Plugin {
    async onload() {
        console.log("Auto Format Plugin loaded!");
        // Vložit CSS do dokumentu
        const styleContent = `
      body {
        font-family: 'Courier New', Courier, monospace;
        font-size: 12pt;
        line-height: 1.15;
      }
      .scene-heading {
        font-family: 'Courier New', Courier, monospace;
        font-size: 12pt;
        font-weight: bold;
        text-transform: uppercase;
        background-color: #D3D3D3;
        color: #1e1e1e;
        padding: 0.2in 0;
        margin-bottom: 0.2in;
        text-align: left;
        letter-spacing: 1px;
        line-height: 1.15;
      }
    `;
        const style = document.createElement("style");
        style.textContent = styleContent;
        document.head.appendChild(style);
        // Přidání editorové rozšíření pro automatické formátování
        this.registerEditorExtension([
            {
                state: null,
                // Reakce na změny v editoru
                update: (update) => {
                    if (update.docChanged) {
                        const editor = update.view;
                        const doc = editor.state.doc;
                        const line = doc.lineAt(editor.state.selection.main.from).text;
                        // Kontrola klíčových slov a formátování
                        if (/^(INT\.|EXT\.|INT\/EXT\.)/i.test(line)) {
                            const from = doc.lineAt(editor.state.selection.main.from).from;
                            const to = doc.lineAt(editor.state.selection.main.from).to;
                            editor.dispatch({
                                changes: {
                                    from,
                                    to,
                                    insert: `<div class="scene-heading">${line}</div>`,
                                },
                            });
                        }
                    }
                },
            },
        ]);
    }
    onunload() {
        console.log("Auto Format Plugin unloaded!");
    }
}
exports.default = AutoFormatPlugin;
