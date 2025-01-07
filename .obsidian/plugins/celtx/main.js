"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const obsidian_1 = require("obsidian");
const obsidian_2 = require("obsidian");
const view_1 = require("@codemirror/view");
class AutoFormatPlugin extends obsidian_1.Plugin {
    async onload() {
        console.log("Auto Format Plugin loaded!");
        // Vložit CSS pro stylování pouze při renderování v editoru
        const styleContent = `
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
        // Příkaz pro označení aktuálního řádku jako scene heading
        this.addCommand({
            id: "apply-scene-heading",
            name: "Apply Scene Heading",
            callback: () => this.applyStyleToLine("scene-heading"),
        });
        // Příkaz pro označení aktuálního řádku jako dialog
        this.addCommand({
            id: "apply-dialog",
            name: "Apply Dialog",
            callback: () => this.applyStyleToLine("dialog"),
        });
    }
    // Funkce pro aplikaci stylu na aktuální řádek
    applyStyleToLine(styleType) {
        const markdownView = this.app.workspace.getActiveViewOfType(obsidian_2.MarkdownView);
        if (!markdownView)
            return;
        const editor = markdownView.editor;
        const lineNumber = editor.getCursor().line;
        // Vytvoření dekorace pro řádek
        let decoration;
        if (styleType === "scene-heading") {
            decoration = view_1.Decoration.line({ class: "scene-heading" });
        }
        else if (styleType === "dialog") {
            decoration = view_1.Decoration.line({ class: "dialog" });
        }
        else {
            return;
        }
        // Použití getRange pro získání rozsahu řádku
        const lineText = editor.getRange({ line: lineNumber, ch: 0 }, { line: lineNumber + 1, ch: 0 });
        const lineRange = { from: 0, to: lineText.length };
        // Aplikování dekorace na řádek
        const decorations = view_1.Decoration.set([decoration.range(lineRange.from, lineRange.to)]);
        // Použití správného editoru pro aplikování dekorace
        const view = markdownView.editor.cm;
        const editorView = view?.view;
        if (editorView) {
            editorView.dispatch({
                effects: editorView.state.update({ effects: decorations }),
            });
        }
    }
    onunload() {
        console.log("Auto Format Plugin unloaded!");
    }
}
exports.default = AutoFormatPlugin;
