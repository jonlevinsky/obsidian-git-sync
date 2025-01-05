"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs = require("fs");
const path = require("path");
const { Plugin } = require("obsidian");
class CeltxLikePlugin extends Plugin {
    constructor() {
        super(...arguments);
        this.styleElement = null;
    }
    async onload() {
        console.log("CeltxLikePlugin loaded");
        this.loadStyles();
        this.addCommands();
    }
    onunload() {
        console.log("CeltxLikePlugin unloaded");
        if (this.styleElement) {
            this.styleElement.remove();
        }
    }
    loadStyles() {
        const cssPath = this.app.vault.adapter.getBasePath() + "/.obsidian/plugins/LevinskyJ/style.css";
        const css = fs.readFileSync(cssPath, "utf-8");
        this.styleElement = document.createElement("style");
        this.styleElement.id = "celtx-like-plugin-styles";
        this.styleElement.textContent = css;
        document.head.appendChild(this.styleElement);
    }
    addCommands() {
        this.addCommand({
            id: "create-scene",
            name: "Create Scene",
            callback: () => this.createScene(),
        });
        this.addCommand({
            id: "add-character",
            name: "Add Character",
            callback: () => this.addCharacter(),
        });
    }
    createScene() {
        const fileName = `Scene-${new Date().toISOString()}.md`;
        const filePath = path.join(this.app.vault.getRoot().path, fileName);
        const content = `# Scene\n\n**Description:**\n\n**Dialogue:**\n`;
        this.app.vault.create(filePath, content).then(() => {
            new Notice(`Scene created: ${fileName}`);
        }).catch((err) => {
            console.error("Error creating scene:", err);
        });
    }
    addCharacter() {
        const fileName = `Characters.md`;
        const filePath = path.join(this.app.vault.getRoot().path, fileName);
        const characterTemplate = `\n## New Character\n- **Name:**\n- **Description:**\n- **Role in Story:**\n`;
        this.app.vault.adapter.read(filePath).then((content) => {
            const updatedContent = content + characterTemplate;
            this.app.vault.adapter.write(filePath, updatedContent).then(() => {
                new Notice("Character added.");
            }).catch((err) => {
                console.error("Error adding character:", err);
            });
        }).catch(() => {
            // Create file if it doesn't exist
            this.app.vault.create(filePath, characterTemplate).then(() => {
                new Notice("Characters file created and character added.");
            }).catch((err) => {
                console.error("Error creating Characters file:", err);
            });
        });
    }
}
exports.default = CeltxLikePlugin;
