"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const obsidian_1 = require("obsidian");
class CeltxLikePlugin extends obsidian_1.Plugin {
    async onload() {
        console.log("CeltxLikePlugin loaded");
        // Přidání klávesových zkratek a příkazů
        this.addCommands();
        // Přidání posluchače pro tab
        this.addTabListener();
    }
    onunload() {
        console.log("CeltxLikePlugin unloaded");
    }
    addCommands() {
        this.addCommand({
            id: "format-int-ext",
            name: "Format as INT/EXT",
            editorCallback: (editor) => {
                this.insertTextAtCursor(editor, "**INT.** ");
            },
            hotkeys: [{ modifiers: ["Mod"], key: "1" }],
        });
        this.addCommand({
            id: "format-action",
            name: "Format as Action",
            editorCallback: (editor) => {
                this.insertTextAtCursor(editor, "**[ACTION]**\n");
            },
            hotkeys: [{ modifiers: ["Mod"], key: "2" }],
        });
        this.addCommand({
            id: "format-dialogue",
            name: "Format as Dialogue",
            editorCallback: (editor) => {
                this.insertTextAtCursor(editor, "> **Character Name**\nText of the dialogue...\n");
            },
            hotkeys: [{ modifiers: ["Mod"], key: "3" }],
        });
    }
    addTabListener() {
        this.registerEvent(this.app.workspace.on("editor-change", (editor, ev) => {
            // Detekujeme stisknutí tabulátoru
            if (ev.key === "Tab") {
                const cursor = editor.getCursor();
                const line = editor.getLine(cursor.line);
                // Pokud začíná řádek na nějaký klíčový text, automaticky doplníme
                if (line.trim().startsWith("INT")) {
                    this.insertTextAtCursor(editor, "EXT. ");
                }
                else if (line.trim().startsWith("ACTION")) {
                    this.insertTextAtCursor(editor, "[ACTION CONTINUES]");
                }
            }
        }));
    }
    insertTextAtCursor(editor, text) {
        const cursor = editor.getCursor(); // Získání aktuální pozice kurzoru
        editor.replaceRange(text, cursor); // Vložení textu na aktuální pozici
    }
}
exports.default = CeltxLikePlugin;
