"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const obsidian_1 = require("obsidian");
const view_1 = require("@codemirror/view");
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
        // Registrace rozšíření pro editor
        const plugin = view_1.EditorView.updateListener.of((update) => {
            if (!update.docChanged)
                return;
            const editor = update.view;
            const changes = [];
            update.changes.iterChanges((fromA, toA, fromB, toB, inserted) => {
                const text = inserted.sliceString(0);
                if (/^(INT\.|EXT\.|INT\/EXT\.)\s/i.test(text)) {
                    changes.push({
                        from: fromB,
                        to: toB,
                        insert: `<div class="scene-heading">${text.trim()}</div>`,
                    });
                }
            });
            if (changes.length > 0) {
                editor.dispatch({
                    changes,
                });
            }
        });
        this.registerEditorExtension(plugin);
    }
    onunload() {
        console.log("Auto Format Plugin unloaded!");
    }
}
exports.default = AutoFormatPlugin;
