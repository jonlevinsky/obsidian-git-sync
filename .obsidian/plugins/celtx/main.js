"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const obsidian_1 = require("obsidian");
const path = __importStar(require("path"));
class CeltxLikePlugin extends obsidian_1.Plugin {
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
                new FormatIntExtModal(this.app, editor).open();
            },
            hotkeys: [{ modifiers: ["Mod"], key: "1" }],
        });
    }
    insertTextAtCursor(editor, text) {
        const cursor = editor.getCursor(); // Získání aktuální pozice kurzoru
        editor.replaceRange(text, cursor); // Vložení textu na aktuální pozici
    }
    async getLocationFiles() {
        const editor = this.app.workspace.getActiveFile();
        if (!editor)
            return [];
        const folderPath = path.dirname(editor.path); // Získání cesty k složce upravovaného souboru
        const locationFolderPath = path.join(folderPath, 'lokace'); // Cesta k složce 'lokace'
        // Zkontrolujeme, jestli složka 'lokace' existuje, pokud ne, vytvoříme ji
        await this.createLocationFolder(locationFolderPath);
        // Načteme soubory v této složce
        const files = this.app.vault.getFiles().filter((file) => file.path.startsWith(locationFolderPath));
        return files;
    }
    async createLocationFolder(locationFolderPath) {
        const folderExists = await this.app.vault.adapter.exists(locationFolderPath);
        if (!folderExists) {
            await this.app.vault.createFolder(locationFolderPath); // Vytvoření složky
        }
    }
    async createNewLocationFile(location) {
        const editor = this.app.workspace.getActiveFile();
        if (!editor)
            return;
        const folderPath = path.dirname(editor.path); // Získání cesty k aktuálnímu souboru
        const locationFolderPath = path.join(folderPath, 'lokace'); // Cesta k složce 'lokace'
        // Vytvoření složky, pokud ještě neexistuje
        await this.createLocationFolder(locationFolderPath);
        // Vytvoření nového souboru v této složce
        const newFilePath = path.join(locationFolderPath, `${location}.md`);
        const newFile = await this.app.vault.create(newFilePath, `# ${location}\n\n`);
        return newFile;
    }
}
exports.default = CeltxLikePlugin;
class FormatIntExtModal extends obsidian_1.Modal {
    constructor(app, editor) {
        super(app);
        this.editor = editor;
    }
    onOpen() {
        const { contentEl } = this;
        contentEl.createEl('h2', { text: 'Select INT or EXT' });
        const intButton = contentEl.createEl('button', { text: 'INT' });
        intButton.onclick = async () => {
            this.close();
            await this.selectLocation('INT');
        };
        const extButton = contentEl.createEl('button', { text: 'EXT' });
        extButton.onclick = async () => {
            this.close();
            await this.selectLocation('EXT');
        };
    }
    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }
    async selectLocation(type) {
        const locationFiles = await this.app.plugins.plugins['obsidian-core'].getLocationFiles();
        const locationNames = locationFiles.map((file) => path.basename(file.path, '.md'));
        const locationSelectionModal = new LocationSelectionModal(this.app, type, locationNames, this.editor);
        locationSelectionModal.open();
    }
}
class LocationSelectionModal extends obsidian_1.Modal {
    constructor(app, type, locationNames, editor) {
        super(app);
        this.type = type;
        this.locationNames = locationNames;
        this.editor = editor;
    }
    onOpen() {
        const { contentEl } = this;
        contentEl.createEl('h2', { text: `Select or create a location for ${this.type}` });
        const locationSelect = contentEl.createEl('select');
        this.locationNames.forEach(name => {
            const option = locationSelect.createEl('option', { text: name });
            option.value = name;
        });
        const newLocationOption = locationSelect.createEl('option', { text: 'New Location...' });
        newLocationOption.value = 'new';
        this.inputEl = contentEl.createEl('input', { type: 'text', placeholder: 'Enter new location name' });
        const selectButton = contentEl.createEl('button', { text: 'Select Location' });
        selectButton.onclick = async () => {
            const selectedLocation = locationSelect.value === 'new' ? this.inputEl?.value : locationSelect.value;
            if (selectedLocation && !this.locationNames.includes(selectedLocation)) {
                await this.createNewLocation(selectedLocation);
            }
            else {
                await this.insertLocationText(selectedLocation);
            }
        };
    }
    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }
    async insertLocationText(location) {
        const text = `**${this.type}.** ${location}\n`;
        this.editor.replaceRange(text, this.editor.getCursor());
    }
    async createNewLocation(location) {
        const newFile = await this.app.plugins.plugins['obsidian-core'].createNewLocationFile(location);
        await this.insertLocationText(location);
        new obsidian_1.Notice(`Created new location: ${newFile.path}`);
    }
}
