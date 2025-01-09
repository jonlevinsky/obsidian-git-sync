"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs = require("fs");
const path = require("path");
const { Plugin } = require("obsidian");
class CustomTextStylePlugin extends Plugin {
    constructor() {
        super(...arguments);
        this.styleElement = null;
    }
    async onload() {
        console.log("CustomTextStylePlugin loaded");
        this.loadStyles();
    }
    onunload() {
        console.log("CustomTextStylePlugin unloaded");
        if (this.styleElement) {
            this.styleElement.remove();
        }
    }
    loadStyles() {
        const cssPath = this.app.vault.adapter.getBasePath() + "/.obsidian/plugins/LevinskyJ/style.css";
        const css = fs.readFileSync(cssPath, "utf-8");
        this.styleElement = document.createElement("style");
        this.styleElement.id = "custom-styles-plugin";
        this.styleElement.textContent = css;
        document.head.appendChild(this.styleElement);
    }
}
exports.default = CustomTextStylePlugin;
