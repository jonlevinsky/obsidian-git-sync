"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// main.js
const obsidian_1 = require("obsidian");
class ScreenplayStylePlugin extends obsidian_1.Plugin {
    async onload() {
        console.log("Screenplay Style Plugin loaded!");
        // Vložit CSS do dokumentu
        const styleContent = `
      /* Vložení tvého CSS */
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
      /* Další třídy podle zadaného CSS */
      .action, .character, .parenthetical, .dialogue, .transition, .page-number {
        /* Doplnění stylů */
      }
    `;
        const style = document.createElement("style");
        style.textContent = styleContent;
        document.head.appendChild(style);
        // Přidání příkazů pro tabování
        this.addCommand({
            id: "insert-scene-heading",
            name: "Scene Heading",
            editorCallback: (editor) => {
                editor.replaceSelection(`<div class="scene-heading">SCENE HEADING</div>\n`);
            },
        });
        this.addCommand({
            id: "insert-action",
            name: "Action",
            editorCallback: (editor) => {
                editor.replaceSelection(`<div class="action">Action description</div>\n`);
            },
        });
        this.addCommand({
            id: "insert-character",
            name: "Character",
            editorCallback: (editor) => {
                editor.replaceSelection(`<div class="character">CHARACTER NAME</div>\n`);
            },
        });
        this.addCommand({
            id: "insert-dialogue",
            name: "Dialogue",
            editorCallback: (editor) => {
                editor.replaceSelection(`<div class="dialogue">Dialogue text</div>\n`);
            },
        });
        this.addCommand({
            id: "insert-transition",
            name: "Transition",
            editorCallback: (editor) => {
                editor.replaceSelection(`<div class="transition">TRANSITION</div>\n`);
            },
        });
    }
    onunload() {
        console.log("Screenplay Style Plugin unloaded!");
    }
}
exports.default = ScreenplayStylePlugin;
