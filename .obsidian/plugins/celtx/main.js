"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const obsidian_1 = require("obsidian");
class ScriptFormattingPlugin extends obsidian_1.Plugin {
    onload() {
        this.addCommands();
    }
    addCommands() {
        // Příkazy pro různé formáty
        this.addCommand({
            id: 'insert-scene-heading',
            name: 'Insert Scene Heading',
            callback: () => this.insertStyledText('scene-heading'),
            hotkeys: [{ modifiers: ['Ctrl', 'Shift'], key: 'S' }], // Hotkey pro "/scene"
        });
        this.addCommand({
            id: 'insert-action',
            name: 'Insert Action',
            callback: () => this.insertStyledText('action'),
            hotkeys: [{ modifiers: ['Ctrl', 'Shift'], key: 'A' }], // Hotkey pro "/action"
        });
        this.addCommand({
            id: 'insert-character',
            name: 'Insert Character',
            callback: () => this.insertStyledText('character'),
            hotkeys: [{ modifiers: ['Ctrl', 'Shift'], key: 'C' }], // Hotkey pro "/character"
        });
        this.addCommand({
            id: 'insert-parenthetical',
            name: 'Insert Parenthetical',
            callback: () => this.insertStyledText('parenthetical'),
            hotkeys: [{ modifiers: ['Ctrl', 'Shift'], key: 'P' }], // Hotkey pro "/parenthetical"
        });
        this.addCommand({
            id: 'insert-dialogue',
            name: 'Insert Dialogue',
            callback: () => this.insertStyledText('dialogue'),
            hotkeys: [{ modifiers: ['Ctrl', 'Shift'], key: 'D' }], // Hotkey pro "/dialogue"
        });
        this.addCommand({
            id: 'insert-transition',
            name: 'Insert Transition',
            callback: () => this.insertStyledText('transition'),
            hotkeys: [{ modifiers: ['Ctrl', 'Shift'], key: 'T' }], // Hotkey pro "/transition"
        });
        this.addCommand({
            id: 'insert-page-number',
            name: 'Insert Page Number',
            callback: () => this.insertStyledText('page-number'),
            hotkeys: [{ modifiers: ['Ctrl', 'Shift'], key: 'N' }], // Hotkey pro "/page-number"
        });
    }
    insertStyledText(style) {
        const activeLeaf = this.app.workspace.activeLeaf;
        if (!activeLeaf)
            return;
        const activeView = activeLeaf.view;
        if (!activeView)
            return;
        // Zkontrolujeme, jestli je to MarkdownView
        const markdownView = activeView; // Předpokládáme, že jde o MarkdownView
        if (!markdownView || !markdownView.editor)
            return;
        const editor = markdownView.editor;
        const cursor = editor.getCursor();
        const line = editor.getLine(cursor.line);
        if (line.trim() === '')
            return; // Pokud je řádek prázdný, nic neformátujeme
        const formattedText = `<span class="${style}">${line}</span>`;
        const startPos = { line: cursor.line, ch: 0 };
        const endPos = { line: cursor.line, ch: line.length };
        // Ujistíme se, že pozice je v rámci dokumentu
        if (cursor.line < 0 || cursor.line >= editor.lineCount())
            return;
        editor.replaceRange(formattedText, startPos, endPos);
        // Opraveno nastavení kurzoru
        const newCursorPos = cursor.ch + formattedText.length;
        if (newCursorPos <= editor.getLine(cursor.line).length) {
            editor.setCursor(cursor.line, newCursorPos);
        }
        else {
            editor.setCursor(cursor.line + 1, 0);
        }
    }
}
exports.default = ScriptFormattingPlugin;
