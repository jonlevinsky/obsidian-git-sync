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
            callback: () => this.insertStyledText('.scene-heading'),
            hotkeys: [{ modifiers: ['Ctrl', 'Shift'], key: 'S' }], // Hotkey pro "/scene"
        });
        this.addCommand({
            id: 'insert-action',
            name: 'Insert Action',
            callback: () => this.insertStyledText('.action'),
            hotkeys: [{ modifiers: ['Ctrl', 'Shift'], key: 'A' }], // Hotkey pro "/action"
        });
        this.addCommand({
            id: 'insert-character',
            name: 'Insert Character',
            callback: () => this.insertStyledText('.character'),
            hotkeys: [{ modifiers: ['Ctrl', 'Shift'], key: 'C' }], // Hotkey pro "/character"
        });
        this.addCommand({
            id: 'insert-parenthetical',
            name: 'Insert Parenthetical',
            callback: () => this.insertStyledText('.parenthetical'),
            hotkeys: [{ modifiers: ['Ctrl', 'Shift'], key: 'P' }], // Hotkey pro "/parenthetical"
        });
        this.addCommand({
            id: 'insert-dialogue',
            name: 'Insert Dialogue',
            callback: () => this.insertStyledText('.dialogue'),
            hotkeys: [{ modifiers: ['Ctrl', 'Shift'], key: 'D' }], // Hotkey pro "/dialogue"
        });
        this.addCommand({
            id: 'insert-transition',
            name: 'Insert Transition',
            callback: () => this.insertStyledText('.transition'),
            hotkeys: [{ modifiers: ['Ctrl', 'Shift'], key: 'T' }], // Hotkey pro "/transition"
        });
        this.addCommand({
            id: 'insert-page-number',
            name: 'Insert Page Number',
            callback: () => this.insertStyledText('.page-number'),
            hotkeys: [{ modifiers: ['Ctrl', 'Shift'], key: 'N' }], // Hotkey pro "/page-number"
        });
    }
    insertStyledText(style) {
        const activeView = this.app.workspace.activeLeaf.view;
        if (!activeView)
            return;
        const editor = activeView.editor;
        if (!editor)
            return;
        const cursor = editor.getCursor();
        const line = editor.getLine(cursor.line);
        if (line.trim() === '')
            return; // Pokud je řádek prázdný, nic neformátujeme
        const formattedText = `<span class="${style}">${line}</span>`;
        editor.replaceRange(formattedText, { line: cursor.line, ch: 0 }, { line: cursor.line, ch: line.length });
        editor.setCursor(cursor.line, cursor.ch + formattedText.length);
    }
}
exports.default = ScriptFormattingPlugin;
