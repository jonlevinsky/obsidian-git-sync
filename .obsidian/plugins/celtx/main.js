"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const obsidian_1 = require("obsidian");
const view_1 = require("@codemirror/view");
class AutoFormatPlugin extends obsidian_1.Plugin {
    constructor() {
        super(...arguments);
        this.lineTypes = new Map();
        this.isDispatching = false; // Flag pro zamezení opakovaného dispatch
    }
    async onload() {
        console.log("Auto Format Plugin loaded!");
        // Vložit CSS pro stylování
        const styleContent = `
      .cm-line {
        font-family: 'Courier New', Courier, monospace;
        font-size: 12pt;
        line-height: 1.15;
      }

      .scene-heading {
        font-weight: bold;
        text-transform: uppercase;
        color: #1e1e1e;
        background-color: #D3D3D3;
      }

      .dialog {
        font-style: italic;
        color: #333;
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
                // Pokud text začíná "INT." nebo "EXT.", označíme to jako scénový nadpis
                if (/^(INT\.|EXT\.|INT\/EXT\.)\s/i.test(text)) {
                    this.lineTypes.set(fromB, "scene-heading");
                }
                // Pokud text odpovídá formátu dialogu, označíme to jako dialog
                else if (text.trim().length > 0) {
                    this.lineTypes.set(fromB, "dialog");
                }
            });
            // Aplikace stylu podle typu řádku
            if (!this.isDispatching) {
                this.isDispatching = true; // Zabráníme opětovným změnám
                this.applyLineStyles(editor);
                this.isDispatching = false; // Obnovíme flag po dokončení
            }
        });
        this.registerEditorExtension(plugin);
    }
    // Aplikování stylů na základě uložených typů řádků
    applyLineStyles(editor) {
        const lines = editor.state.doc.lines;
        // Kontrola, že dokument není prázdný
        if (lines <= 0)
            return;
        // Iterace přes všechny řádky dokumentu
        for (let i = 0; i < lines; i++) {
            const lineType = this.lineTypes.get(i + 1);
            // Získání řádku na pozici i + 1
            if (editor.state.doc.lineAt(i + 1)) {
                const line = editor.state.doc.lineAt(i + 1);
                if (lineType) {
                    // Přidání třídy pro stylování
                    editor.dispatch({
                        changes: [
                            {
                                from: line.from,
                                to: line.to,
                                insert: `${line.text}`,
                            },
                        ],
                    });
                }
            }
        }
    }
    onunload() {
        console.log("Auto Format Plugin unloaded!");
    }
}
exports.default = AutoFormatPlugin;
