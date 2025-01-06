"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const locations_1 = __importDefault(require("./locations")); // Správný import z locations.ts
class MyPlugin extends Plugin {
    async onload() {
        console.log("MyPlugin loaded");
        // Inicializace a použití třídy z locations.ts
        this.pluginInstance = new locations_1.default(this.app);
        // Příklad použití metody z pluginu
        const folderPath = 'path/to/folder';
        const locationFiles = await this.pluginInstance.getLocationFiles(folderPath);
        console.log('Location files:', locationFiles);
        // Přidání dalších příkazů a logiky podle potřeby
    }
    onunload() {
        console.log("MyPlugin unloaded");
    }
}
exports.default = MyPlugin;
