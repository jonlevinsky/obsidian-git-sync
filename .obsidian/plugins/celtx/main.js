"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const obsidian_1 = require("obsidian");
const locations_1 = require("./locations");
const characters_1 = require("./characters");
class MyPlugin extends obsidian_1.Plugin {
    onload() {
        console.log('Plugin loaded');
        (0, locations_1.handleLocations)(this.app); // Manipulace s lokacemi
        (0, characters_1.handleCharacters)(this.app); // Manipulace s postavami
    }
    onunload() {
        console.log('Plugin unloaded');
    }
}
exports.default = MyPlugin;
