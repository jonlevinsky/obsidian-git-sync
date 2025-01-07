"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const obsidian_1 = require("obsidian");
class SceneScriptPlugin extends obsidian_1.Plugin {
    onload() {
        this.addCommand({
            id: 'apply-script-style',
            name: 'Apply Script Style',
            callback: () => this.applyScriptStyle(),
        });
    }
    applyScriptStyle() {
        const activeView = this.app.workspace.activeLeaf?.view;
        const activeFile = activeView instanceof obsidian_1.MarkdownView ? activeView.file : null;
        if (activeFile && activeFile.extension === 'md') {
            this.applyStyleToFile(activeFile);
        }
        else {
            new obsidian_1.Notice('No active Markdown file to modify.');
        }
    }
    applyStyleToFile(file) {
        // Zkontrolujte, zda soubor obsahuje tag "style:script"
        this.app.vault.read(file).then(content => {
            if (content.includes('style:script')) {
                // Přidání CSS souboru pouze pro tento soubor
                this.applyCssToEditor();
            }
            else {
                new obsidian_1.Notice('File does not have the style:script tag.');
            }
        });
    }
    applyCssToEditor() {
        const styleLink = document.createElement('link');
        styleLink.rel = 'stylesheet';
        styleLink.href = './script.css';
        document.head.appendChild(styleLink);
        new obsidian_1.Notice('Applied script style to the file.');
    }
}
exports.default = SceneScriptPlugin;
