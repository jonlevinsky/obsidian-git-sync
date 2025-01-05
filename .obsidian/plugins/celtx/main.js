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
                new FormatIntExtModal(this.app, editor, this).open(); // Předání instance pluginu
            },
            hotkeys: [{ modifiers: ["Mod"], key: "1" }], // Klávesová zkratka pro otevření formátování
        });
    }
    insertTextAtCursor(editor, text) {
        const cursor = editor.getCursor(); // Získání aktuální pozice kurzoru
        editor.replaceRange(text, cursor); // Vložení textu na aktuální pozici
    }
    async getLocationFiles(folderPath) {
        const files = this.app.vault.getFiles().filter((file) => file.path.startsWith(folderPath));
        console.log(`Files in folder "${folderPath}":`, files.map((file) => file.path)); // Ladicí log pro zjištění souborů
        return files;
    }
    async createNewLocation(location, type, folderPath) {
        const locationFolderPath = path.join(folderPath, 'Lokace');
        // Pokusíme se vytvořit složku Lokace, pokud ještě neexistuje
        try {
            const folderExists = await this.app.vault.adapter.exists(locationFolderPath);
            if (!folderExists) {
                await this.app.vault.createFolder(locationFolderPath);
                console.log(`Folder created at: ${locationFolderPath}`);
            }
        }
        catch (error) {
            console.error("Error creating folder:", error);
            throw error;
        }
        const newFilePath = path.join(locationFolderPath, `${type}-${location}-${path.basename(folderPath)}.md`);
        console.log(`Creating new location file at: ${newFilePath}`);
        // Vytvoření souboru
        try {
            const newFile = await this.app.vault.create(newFilePath, `# ${location}\n\n`);
            console.log(`Created new location file: ${newFile.path}`);
            return newFile;
        }
        catch (error) {
            console.error("Error creating location file:", error);
            throw error;
        }
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
        this.pluginInstance = pluginInstance; // Přiřazení instance pluginu
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
        this.folderPath = path.dirname(filePath); // Cesta k nadřazené složce souboru
        // Získání existujících lokací ve složce, ale bez aktuálně otevřeného souboru
        let locationFiles = await this.app.vault.getFiles()
            .filter((file) => file.path.startsWith(this.folderPath) && file.path !== filePath); // Filtrace aktuálního souboru
        // Seznam existujících lokací
        this.locationNames = locationFiles.map((file) => path.basename(file.path, '.md'));
        // Otevření nového okna pro výběr lokace
        const locationSelectionModal = new LocationSelectionModal(this.app, this.type, this.locationNames, this.editor, this.pluginInstance, this.folderPath);
        locationSelectionModal.open();
    }
}
class LocationSelectionModal extends Modal {
    constructor(app, type, locationNames, editor, pluginInstance, folderPath) {
        super(app);
        this.type = type;
        this.locationNames = locationNames;
        this.editor = editor;
        this.pluginInstance = pluginInstance; // Uložení instance pluginu
        this.folderPath = folderPath;
    }
    onOpen() {
        const { contentEl } = this;
        contentEl.createEl('h2', { text: `Select or create a location for ${this.type}` });
        // Výběr mezi INT/EXT
        contentEl.createEl('strong', { text: `${this.type} selected` });
        // Scrollovatelný seznam existujících lokací
        if (this.locationNames.length > 0) {
            const locationList = contentEl.createEl('ul');
            locationList.style.maxHeight = '300px'; // Nastavení maximální výšky pro scrollování
            locationList.style.overflowY = 'auto'; // Povolení vertikálního scrollování
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
        // Tlačítko pro přidání nové lokace
        const newLocationButton = contentEl.createEl('button', { text: '+ Add new location' });
        newLocationButton.onclick = () => this.openNewLocationModal();
    }
    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }
    async insertLocationText(location) {
        const text = `**${this.type}.** ${location}\n`;
        this.editor.replaceRange(text, this.editor.getCursor());
    }
    async openNewLocationModal() {
        const newLocationModal = new NewLocationModal(this.app, this.pluginInstance, this.folderPath, this.type);
        newLocationModal.open();
    }
}
class NewLocationModal extends Modal {
    constructor(app, pluginInstance, folderPath, type) {
        super(app);
        this.pluginInstance = pluginInstance;
        this.folderPath = folderPath;
        this.type = type;
    }
    onOpen() {
        const { contentEl } = this;
        contentEl.createEl('h2', { text: `Create new location for ${this.type}` });
        // Vytvoření inputu pro název lokace
        const inputEl = contentEl.createEl('input', { type: 'text', placeholder: 'Enter location name' });
        // Tlačítko pro vytvoření lokace
        const createButton = contentEl.createEl('button', { text: 'Create Location' });
        createButton.onclick = async () => {
            const locationName = inputEl.value.trim().toUpperCase(); // Uloží název lokace v uppercase
            if (locationName) {
                await this.createNewLocation(locationName);
                this.close(); // Zavřít modal po vytvoření lokace
            }
            else {
                new Notice('Please enter a valid location name.');
            }
        };
    }
    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }
    async createNewLocation(location) {
        try {
            const newFile = await this.pluginInstance.createNewLocation(location, this.type, this.folderPath); // Použití instance pluginu
            new Notice(`Created new location: ${newFile.path}`);
        }
        catch (error) {
            new Notice('Error creating location.');
            console.error(error);
        }
    }
}
