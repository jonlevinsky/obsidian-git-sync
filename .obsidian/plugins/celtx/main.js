"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const obsidian_1 = require("obsidian");
class ScriptFormattingPlugin extends obsidian_1.Plugin {
    onload() {
        this.addCommand({
            id: 'insert-styled-text-from-symbol',
            name: 'Insert Styled Text from Symbol',
            callback: () => this.insertStyledTextFromSymbol(),
        });
    }
    insertStyledTextFromSymbol() {
        const activeLeaf = this.app.workspace.activeLeaf;
        if (!activeLeaf)
            return;
        const activeView = activeLeaf.view;
        if (!activeView)
            return;
        // Kontrola, že jde o Markdown editor
        const markdownView = activeView;
        if (!markdownView || !markdownView.editor)
            return;
        const editor = markdownView.editor;
        const cursor = editor.getCursor();
        const line = editor.getLine(cursor.line).trim();
        if (line === '')
            return;
        // Rozpoznání symbolů a formátování
        let formattedText = '';
        if (line.startsWith('&')) {
            const sceneHeading = line.substring(1).trim();
            formattedText = sceneHeading.toUpperCase(); // Převod na velká písmena pro scene heading
        }
        else if (line.startsWith('*')) {
            const action = line.substring(1).trim();
            formattedText = action; // Akce zůstává beze změny, můžeš přidat další úpravy
        }
        else if (line.startsWith('@')) {
            const character = line.substring(1).trim();
            formattedText = `**${character}**`; // Tučný text pro postavu
        }
        // Přidat další symboly pro další formáty...
        if (formattedText) {
            const startPos = { line: cursor.line, ch: 0 };
            const endPos = { line: cursor.line, ch: line.length };
            editor.replaceRange(formattedText, startPos, endPos);
            editor.setCursor(cursor.line, formattedText.length);
        }
    }
}
exports.default = ScriptFormattingPlugin;
