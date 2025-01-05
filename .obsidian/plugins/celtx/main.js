"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const { Plugin, Modal, Notice, Editor, TFile } = require('obsidian');
const fs = require('fs');
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
                new FormatIntExtModal(this.app, editor).open();
            },
            hotkeys: [{ modifiers: ["Mod"], key: "1" }],
        });
    }
    insertTextAtCursor(editor, text) {
        const cursor = editor.getCursor(); // Získání aktuální pozice kurzoru
        editor.replaceRange(text, cursor); // Vložení textu na aktuální pozici
    }
    async getLocationFolder() {
        const activeFile = this.app.workspace.getActiveFile();
        if (!activeFile)
            return '';
        const folderPath = path.dirname(activeFile.path);
        const locationFolderPath = path.join(folderPath, 'Lokace');
        // Zkontrolovat, zda složka existuje, a vytvořit ji, pokud neexistuje
        try {
            const exists = await this.app.vault.adapter.exists(locationFolderPath);
            if (!exists) {
                await this.app.vault.createFolder(locationFolderPath);
                new Notice(`Folder 'Lokace' created in the current folder.`);
            }
        }
        catch (error) {
            console.error(error);
            new Notice("Error creating 'Lokace' folder.");
        }
        return locationFolderPath;
    }
    async getLocationFiles() {
        const locationFolderPath = await this.getLocationFolder();
        const files = this.app.vault.getFiles().filter((file) => file.path.startsWith(locationFolderPath));
        return files;
    }
    async createNewLocationFile(location) {
        const locationFolderPath = await this.getLocationFolder();
        const newFilePath = path.join(locationFolderPath, `${location}.md`);
        const newFile = await this.app.vault.create(newFilePath, `# ${location}\n\n`);
        return newFile;
    }
}
exports.default = CeltxLikePlugin;
class FormatIntExtModal extends Modal {
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
        const locationFiles = await this.app.plugins.plugins['celtx'].getLocationFiles();
        const locationNames = locationFiles.map((file) => path.basename(file.path, '.md'));
        const locationSelectionModal = new LocationSelectionModal(this.app, type, locationNames, this.editor);
        locationSelectionModal.open();
    }
}
class LocationSelectionModal extends Modal {
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
        const newFile = await this.app.plugins.plugins['celtx'].createNewLocationFile(location);
        await this.insertLocationText(location);
        new Notice(`Created new location: ${newFile.path}`);
    }
}
