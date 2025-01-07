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
            font-size: 12pt;
            line-height: 1; /* Mírně zvýšené řádkování pro lepší čitelnost */
        }

        /* Scene Heading (slug line) */
        .scene-heading {
            font-family: 'Courier New', Courier, monospace;
            font-size: 12pt;
            font-weight: bold;
            text-transform: uppercase;
            background-color: #D3D3D3; /* světle šedá */
            color: #1e1e1e;
            padding: 0.2in 0;
            margin-bottom: 0.2in;
            text-align: left;
            letter-spacing: 1px;
            line-height: 1; /* Mírně zvýšené řádkování */
        }

        /* Action */
        .action {
            font-family: 'Courier New', Courier, monospace;
            font-size: 12pt;
            line-height: 1; /* Mírně zvýšené řádkování */
            margin-bottom: 0.5in;
            text-align: justify;
        }

        /* Character name */
        .character {
            font-family: 'Courier New', Courier, monospace;
            font-size: 12pt;
            font-weight: bold;
            text-transform: uppercase;
            text-align: center;
            margin-bottom: 0.2in;
            line-height: 1; /* Mírně zvýšené řádkování */
        }

        /* Parentheticals */
        .parenthetical {
            font-family: 'Courier New', Courier, monospace;
            font-size: 12pt;
            font-style: italic;
            text-align: left;
            margin-left: 3.7in;
            margin-bottom: 0.2in;
            line-height: 1; /* Mírně zvýšené řádkování */
        }

        /* Dialogue */
        .dialogue {
            font-family: 'Courier New', Courier, monospace;
            font-size: 12pt;
            line-height: 1; /* Mírně zvýšené řádkování */
            text-align: left;
            margin-left: 2.5in; /* Odsazení pro dialog */
            margin-right: 1in; /* Pravý okraj */
            margin-bottom: 0.5in;
        }

        /* Transition */
        .transition {
            font-family: 'Courier New', Courier, monospace;
            font-size: 12pt;
            font-weight: bold;
            text-transform: uppercase;
            margin-top: 0.5in;
            text-align: center;
            line-height: 1; /* Mírně zvýšené řádkování */
        }

        /* Nastavení pro page number */
        .page-number {
            font-family: 'Courier New', Courier, monospace;
            position: absolute;
            top: 0.5in;
            right: 1in;
            font-size: 10pt;
            text-align: right;
            line-height: 1; /* Mírně zvýšené řádkování */
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
