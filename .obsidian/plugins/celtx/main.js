"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const { Plugin, Modal, Notice, Editor, TFile } = require('obsidian');
const path = require('path');
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
                new FormatIntExtModal(this.app, editor, this).open(); // Předání instance pluginu
            },
            hotkeys: [{ modifiers: ["Mod"], key: "1" }],
        });
    }
    insertTextAtCursor(editor, text) {
        const cursor = editor.getCursor(); // Získání aktuální pozice kurzoru
        editor.replaceRange(text, cursor); // Vložení textu na aktuální pozici
    }
    // Změněno na public pro přístup v modalu
    async getLocationFiles() {
        const activeFile = this.app.workspace.getActiveFile();
        if (!activeFile) {
            new Notice("No active file found.");
            return [];
        }
        // Získání názvu složky z cesty k aktivnímu souboru
        const folderPath = path.dirname(activeFile.path);
        // Získání souborů z této složky
        const files = await this.app.vault.getFiles();
        const locationFiles = files.filter((file) => {
            const fileName = path.basename(file.path);
            return fileName.match(/^INT|EXT-.+/); // Hledání souborů podle názvu (INT/EXT-{název lokace}-...)
        });
        console.log("Location files:", locationFiles.map((file) => file.path)); // Ladicí log pro kontrolu souborů
        return locationFiles;
    }
    async createNewLocation(location, type) {
        const activeFile = this.app.workspace.getActiveFile();
        if (!activeFile) {
            new Notice("No active file found.");
            return;
        }
        // Získání názvu složky z cesty k aktivnímu souboru
        const folderPath = path.dirname(activeFile.path);
        // Vytvoření názvu souboru podle formátu
        const newLocationFilePath = path.join(folderPath, `${type}-${location}-${path.basename(folderPath)}lokace.md`);
        // Vytvoření souboru s novou lokací
        const newLocationFile = await this.app.vault.create(newLocationFilePath, `# ${location}\n`);
        console.log(`Created new location file: ${newLocationFile.path}`);
        return newLocationFile;
    }
}
exports.default = CeltxLikePlugin;
class FormatIntExtModal extends Modal {
    constructor(app, editor, pluginInstance) {
        super(app);
        this.locationNames = [];
        this.folderPath = '';
        this.type = '';
        this.editor = editor;
        this.pluginInstance = pluginInstance; // Uložení instance pluginu
    }
    onOpen() {
        const { contentEl } = this;
        contentEl.createEl('h2', { text: 'Select INT or EXT' });
        const intButton = contentEl.createEl('button', { text: 'INT' });
        intButton.onclick = () => this.handleTypeSelection('INT');
        const extButton = contentEl.createEl('button', { text: 'EXT' });
        extButton.onclick = () => this.handleTypeSelection('EXT');
    }
    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }
    async handleTypeSelection(type) {
        this.type = type;
        this.close(); // Zavřít první část modalu
        // Získání aktivního souboru z editoru
        const activeFile = this.app.workspace.getActiveFile();
        if (!activeFile) {
            new Notice("No file found for the current editor.");
            return;
        }
        const filePath = activeFile.path;
        this.folderPath = path.dirname(filePath);
        // Získání existujících lokací ve složce
        let locationFiles = await this.pluginInstance.getLocationFiles(); // Použití instance pluginu
        // Seznam existujících lokací
        this.locationNames = locationFiles.map((file) => path.basename(file.path, '.md'));
        console.log("Existing locations:", this.locationNames); // Ladicí log pro zjištění existujících lokací
        // Otevření nového okna pro zadání lokace
        const locationSelectionModal = new LocationSelectionModal(this.app, this.type, this.locationNames, this.editor, this.folderPath);
        locationSelectionModal.open();
    }
}
class LocationSelectionModal extends Modal {
    constructor(app, type, locationNames, editor, folderPath) {
        super(app);
        this.type = type;
        this.locationNames = locationNames;
        this.editor = editor;
        this.folderPath = folderPath;
    }
    onOpen() {
        const { contentEl } = this;
        contentEl.createEl('h2', { text: `Select or create a location for ${this.type}` });
        // Výběr mezi INT/EXT
        contentEl.createEl('strong', { text: `${this.type} selected` });
        // Možnost zadání nové lokace
        this.inputEl = contentEl.createEl('input', { type: 'text', placeholder: 'Enter new location name' });
        const newLocationButton = contentEl.createEl('button', { text: 'Create New Location' });
        newLocationButton.onclick = async () => {
            const newLocation = this.inputEl?.value.trim();
            if (newLocation) {
                await this.createNewLocation(newLocation);
            }
            else {
                new Notice('Please enter a valid location name.');
            }
        };
        // Seznam existujících lokací
        if (this.locationNames.length > 0) {
            const locationList = contentEl.createEl('ul');
            this.locationNames.forEach(name => {
                const listItem = locationList.createEl('li', { text: name });
                listItem.onclick = async () => {
                    await this.insertLocationText(name);
                };
            });
        }
        else {
            contentEl.createEl('p', { text: 'No existing locations. Create a new one.' });
        }
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
        const activeFile = this.app.workspace.getActiveFile();
        if (!activeFile) {
            new Notice("No active file found.");
            return;
        }
        // Získání názvu složky z cesty k aktivnímu souboru
        const folderPath = path.dirname(activeFile.path);
        // Vytvoření názvu souboru podle formátu
        const newLocationFilePath = path.join(folderPath, `${this.type}-${location}-${path.basename(folderPath)}lokace.md`);
        // Vytvoření souboru s novou lokací
        const newLocationFile = await this.app.vault.create(newLocationFilePath, `# ${location}\n`);
        console.log(`Created new location file: ${newLocationFile.path}`);
        await this.insertLocationText(location);
        new Notice(`Created new location: ${newLocationFile.path}`);
    }
}
