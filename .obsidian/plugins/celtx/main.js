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
        console.log(`Files in folder "${folderPath}":`, files.map((file) => file.path)); // Ladicí log pro zjištění souborů
        return files;
    }
    async createNewLocationFile(location, folderPath) {
        const newFilePath = path.join(folderPath, `${location}.md`);
        console.log(`Creating new file at: ${newFilePath}`); // Ladicí log pro zjištění cesty souboru
        const newFile = await this.app.vault.create(newFilePath, `# ${location}\n\n`);
        console.log(`File created: ${newFile.path}`); // Ladicí log pro potvrzení vytvoření souboru
        return newFile;
    }
}
exports.default = CeltxLikePlugin;
class FormatIntExtModal extends Modal {
    constructor(app, editor) {
        super(app);
        this.locationNames = [];
        this.folderPath = '';
        this.type = '';
        this.editor = editor;
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
        this.folderPath = path.join(path.dirname(filePath), 'Lokace'); // Cesta k složce 'Lokace' ve stejné složce jako soubor
        // Získání existujících lokací ve složce
        let locationFiles = await this.app.vault.getFiles().filter((file) => file.path.startsWith(this.folderPath));
        console.log("Location files found:", locationFiles.map((file) => file.path)); // Ladicí log pro kontrolu souborů
        // Pokud složka "Lokace" neexistuje, vytvoříme ji
        if (locationFiles.length === 0) {
            try {
                const normalizedFolderPath = this.folderPath.replace(/\\/g, '/'); // Oprava cesty pro vytvoření složky
                console.log(`Creating folder at: ${normalizedFolderPath}`); // Ladicí log pro kontrolu cesty složky
                // Pokusíme se vytvořit složku
                await this.app.vault.createFolder(normalizedFolderPath);
                locationFiles = [];
            }
            catch (e) {
                if (e instanceof Error) {
                    console.error(`Error creating folder: ${e.message}`);
                }
                else {
                    console.error('An unknown error occurred while creating the folder.');
                }
                new Notice('Error creating folder.');
                return;
            }
        }
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
        const newFile = await this.app.vault.create(path.join(this.folderPath, `${location}.md`), `# ${location}\n`);
        console.log(`Created new location file: ${newFile.path}`); // Ladicí log pro vytvoření souboru
        await this.insertLocationText(location);
        new Notice(`Created new location: ${newFile.path}`);
    }
}
