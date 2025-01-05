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
    async getLocationFiles(folderPath) {
        const files = this.app.vault.getFiles().filter((file) => file.path.startsWith(folderPath));
        return files;
    }
    async createNewLocationFile(location, folderPath) {
        const newFilePath = path.join(folderPath, `${location}.md`);
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
        // Získání aktivního souboru z editoru
        const activeFile = this.app.workspace.getActiveFile();
        if (!activeFile) {
            new Notice("No file found for the current editor.");
            return;
        }
        const filePath = activeFile.path; // Získání cesty aktuálně otevřeného souboru
        const folderPath = path.join(path.dirname(filePath), 'Lokace'); // Cesta k složce 'Lokace' v rámci aktuálního souboru
        let locationFiles = await this.app.vault.getFiles().filter((file) => file.path.startsWith(folderPath));
        // Zkontrolujeme, jestli složka existuje
        if (locationFiles.length === 0) {
            try {
                // Pokud složka neexistuje, vytvoříme ji
                await this.app.vault.createFolder(folderPath);
                locationFiles = [];
            }
            catch (e) {
                // Ošetření chyby, že složka již existuje
                if (e instanceof Error && e.message.includes("Folder already exists")) {
                    // Pokud složka již existuje, pokračujeme bez chyby
                    console.log("Folder already exists, continuing...");
                }
                else {
                    new Notice('Error creating folder.');
                    console.error("Error creating folder: ", e);
                    return;
                }
            }
        }
        const locationNames = locationFiles.map((file) => path.basename(file.path, '.md'));
        const locationSelectionModal = new LocationSelectionModal(this.app, type, locationNames, this.editor, folderPath);
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
        const locationSelect = contentEl.createEl('select');
        this.locationNames.forEach(name => {
            const option = locationSelect.createEl('option', { text: name });
            option.value = name;
        });
        const newLocationOption = locationSelect.createEl('option', { text: 'New Location...' });
        newLocationOption.value = 'new';
        // Textové pole pro zadání nové lokace
        this.inputEl = contentEl.createEl('input', { type: 'text', placeholder: 'Enter new location name' });
        const selectButton = contentEl.createEl('button', { text: 'Select Location' });
        selectButton.onclick = async () => {
            const selectedLocation = locationSelect.value === 'new'
                ? this.inputEl?.value.trim()
                : locationSelect.value;
            if (selectedLocation) {
                // Pokud je vybrána nová lokace, vytvoříme ji, jinak použijeme vybranou.
                if (selectedLocation !== 'new' && !this.locationNames.includes(selectedLocation)) {
                    new Notice(`Location '${selectedLocation}' does not exist.`);
                    await this.createNewLocation(selectedLocation);
                }
                else {
                    await this.insertLocationText(selectedLocation);
                }
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
    async insertLocationText(location) {
        const text = `**${this.type}.** ${location}\n`;
        this.editor.replaceRange(text, this.editor.getCursor());
    }
    async createNewLocation(location) {
        const newFile = await this.app.vault.create(path.join(this.folderPath, `${location}.md`), `# ${location}\n`);
        await this.insertLocationText(location);
        new Notice(`Created new location: ${newFile.path}`);
    }
}
