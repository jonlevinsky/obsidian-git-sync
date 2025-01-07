"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const obsidian_1 = require("obsidian");
const view_1 = require("@codemirror/view");
class AutoFormatPlugin extends obsidian_1.Plugin {
    async onload() {
        console.log("Auto Format Plugin loaded!");
        // Vložit CSS do dokumentu pro změnu vzhledu
        const styleContent = `
      .cm-line {
        font-family: 'Courier New', Courier, monospace;
        font-size: 12pt;
        line-height: 1.15;
      }

      /* Vizuální styl pro scénové nadpisy */
      .cm-line::before {
        content: attr(data-scene-type);
        font-weight: bold;
        text-transform: uppercase;
        color: #D3D3D3;
        margin-right: 10px;
      }

      /* Styl pro text, který začíná "INT." nebo "EXT." */
      .cm-line[data-scene-type="INT"]::before,
      .cm-line[data-scene-type="EXT"]::before {
        color: #1e1e1e;
      }
    `;
        const style = document.createElement("style");
        style.textContent = styleContent;
        document.head.appendChild(style);
        // Registrace rozšíření pro editor
        const plugin = view_1.EditorView.updateListener.of((update) => {
            if (!update.docChanged)
                return;
            const editor = update.view;
            update.changes.iterChanges((fromA, toA, fromB, toB, inserted) => {
                const text = inserted.sliceString(0);
                if (/^(INT\.|EXT\.|INT\/EXT\.)\s/i.test(text)) {
                    // Přidání atributu pro detekovaný řádek
                    const line = editor.state.doc.lineAt(fromB);
                    editor.dispatch({
                        changes: [
                            {
                                from: line.from,
                                to: line.to,
                                insert: text.trim(),
                            },
                        ],
                    });
                }
            });
        });
        this.registerEditorExtension(plugin);
    }
    onunload() {
        console.log("Auto Format Plugin unloaded!");
    }
}
exports.default = AutoFormatPlugin;
