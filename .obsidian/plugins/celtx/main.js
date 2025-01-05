"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs = require("fs");
const path = require("path");
const { Plugin, Editor } = require("obsidian");
class CeltxLikePlugin extends Plugin {
    async onload() {
        console.log("CeltxLikePlugin loaded");
        // Přidání klávesových zkratek a příkazů
        this.addCommands();
    }
    onunload() {
        console.log("CeltxLikePlugin unloaded");
    }
    addCommands() {
        this.addCommand({
            id: "format-int-ext",
            name: "Format as INT/EXT",
            editorCallback: (editor) => {
                this.insertTextAtCursor(editor, "INT. ");
            },
            hotkeys: [{ modifiers: ["Mod"], key: "1" }],
        });
        this.addCommand({
            id: "format-action",
            name: "Format as Action",
            editorCallback: (editor) => {
                this.insertTextAtCursor(editor, "[ACTION]\n");
            },
            hotkeys: [{ modifiers: ["Mod"], key: "2" }],
        });
        this.addCommand({
            id: "format-dialogue",
            name: "Format as Dialogue",
            editorCallback: (editor) => {
                this.insertTextAtCursor(editor, "[DIALOGUE]\n");
            },
            hotkeys: [{ modifiers: ["Mod"], key: "3" }],
        });
    }
    insertTextAtCursor(editor, text) {
        const cursor = editor.getCursor(); // Získání aktuální pozice kurzoru
        editor.replaceRange(text, cursor); // Vložení textu na aktuální pozici
    }
}
exports.default = CeltxLikePlugin;
