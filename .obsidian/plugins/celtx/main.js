"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const obsidian_1 = require("obsidian");
class ScriptFormattingPlugin extends obsidian_1.Plugin {
    onload() {
        this.addToolbar();
    }
    addToolbar() {
        const activeLeaf = this.app.workspace.activeLeaf;
        if (!activeLeaf)
            return; // Kontrola, zda existuje activeLeaf
        const view = activeLeaf.view;
        let editor = null;
        // Zkontroluj, zda je view typu Markdown nebo jiný typ view
        if (view.getViewType() === 'markdown') {
            const markdownView = view; // Typování pro MarkdownView
            editor = markdownView.editor;
        }
        else {
            editor = view.editor;
        }
        if (!editor)
            return; // Kontrola, zda editor existuje
        const toolbar = document.createElement('div');
        toolbar.classList.add('script-toolbar');
        const buttons = [
            { label: 'Scene Heading', class: 'scene-heading', style: '.scene-heading { font-family: "Courier New", Courier, monospace; font-size: 12pt; text-transform: uppercase; background-color: #D3D3D3; color: #1e1e1e; padding: 0.2in 0; margin-bottom: 0.2in; text-align: left; letter-spacing: 1px; line-height: 1; }' },
            { label: 'Action', class: 'action', style: '.action { font-family: "Courier New", Courier, monospace; font-size: 12pt; line-height: 1; margin-bottom: 0.5in; text-align: justify; }' },
            { label: 'Character', class: 'character', style: '.character { font-family: "Courier New", Courier, monospace; font-size: 12pt; font-weight: bold; text-transform: uppercase; text-align: left; margin-left: 3.7in; margin-bottom: 0.2in; line-height: 1; }' },
            { label: 'Parenthetical', class: 'parenthetical', style: '.parenthetical { font-family: "Courier New", Courier, monospace; font-size: 12pt; font-style: italic; text-align: left; margin-left: 3.7in; margin-bottom: 0.2in; line-height: 1; }' },
            { label: 'Dialogue', class: 'dialogue', style: '.dialogue { font-family: "Courier New", Courier, monospace; font-size: 12pt; line-height: 1; text-align: left; margin-left: 2.5in; margin-right: 1in; margin-bottom: 0.5in; }' },
            { label: 'Transition', class: 'transition', style: '.transition { font-family: "Courier New", Courier, monospace; font-size: 12pt; font-weight: bold; text-transform: uppercase; margin-top: 0.5in; text-align: center; line-height: 1; }' },
            { label: 'Page Number', class: 'page-number', style: '.page-number { font-family: "Courier New", Courier, monospace; position: absolute; top: 0.5in; right: 1in; font-size: 10pt; text-align: right; line-height: 1; }' }
        ];
        buttons.forEach(button => {
            const btn = document.createElement('button');
            btn.classList.add('editor-toolbar-btn');
            btn.textContent = button.label;
            btn.addEventListener('click', () => this.applyStyle(editor, button.style));
            toolbar.appendChild(btn);
        });
        const workspaceLeaf = document.querySelector('.workspace-leaf');
        if (workspaceLeaf) {
            workspaceLeaf.appendChild(toolbar);
        }
    }
    applyStyle(editor, style) {
        const selectedText = editor.getSelection();
        if (selectedText) {
            const newText = `<span class="${style}">${selectedText}</span>`;
            editor.replaceSelection(newText);
        }
    }
}
exports.default = ScriptFormattingPlugin;
