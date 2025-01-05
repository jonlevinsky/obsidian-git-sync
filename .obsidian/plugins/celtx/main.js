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
            id: "open-location-list",
            name: "Open Location List",
            editorCallback: (editor) => {
                new LocationListModal(this.app, editor, this).open(); // Předání instance pluginu
            },
            hotkeys: [{ modifiers: ["Mod"], key: "1" }], // Klávesová zkratka pro otevření seznamu lokací
        });
    }
    // Změna na public
    async getLocationFiles(folderPath) {
        const files = this.app.vault.getFiles().filter((file) => file.path.startsWith(folderPath) && !file.path.includes('LOCATION-'));
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
        const projectFolderName = path.basename(folderPath);
        const newFilePath = path.join(locationFolderPath, `${type}-${location}-${projectFolderName}.md`);
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
class LocationListModal extends Modal {
    constructor(app, editor, pluginInstance) {
        super(app);
        this.locationNames = [];
        this.folderPath = '';
        this.editor = editor;
        this.pluginInstance = pluginInstance; // Přiřazení instance pluginu
    }
    onOpen() {
        const { contentEl } = this;
        contentEl.createEl('h2', { text: 'Select or Create Location' });
        // Tlačítko pro přidání nové lokace
        const newLocationButton = contentEl.createEl('button', { text: '+ Add new location' });
        newLocationButton.onclick = () => this.openNewLocationModal();
        // Místo pro hezký seznam lokací
        const locationListContainer = document.createElement('div');
        locationListContainer.classList.add('location-list-container');
        locationListContainer.style.display = 'flex';
        locationListContainer.style.flexDirection = 'column';
        locationListContainer.style.marginTop = '10px';
        contentEl.appendChild(locationListContainer);
        // Načteme existující lokace
        this.loadLocations(locationListContainer);
    }
    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }
    async loadLocations(locationListContainer) {
        const activeFile = this.app.workspace.getActiveFile();
        if (!activeFile) {
            new Notice("No file found for the current editor.");
            return;
        }
        const filePath = activeFile.path;
        this.folderPath = path.dirname(filePath); // Cesta k nadřazené složce souboru
        // Načtení existujících lokací
        let locationFiles = await this.pluginInstance.getLocationFiles(this.folderPath);
        this.locationNames = locationFiles.map((file) => path.basename(file.path, '.md'));
        if (this.locationNames.length > 0) {
            this.locationNames.forEach(location => {
                const locationItem = document.createElement('div');
                locationItem.classList.add('location-item');
                locationItem.style.padding = '10px';
                locationItem.style.marginBottom = '5px';
                locationItem.style.backgroundColor = '#f0f0f0';
                locationItem.style.borderRadius = '5px';
                locationItem.style.cursor = 'pointer';
                locationItem.textContent = location;
                locationItem.onclick = async () => {
                    await this.insertLocationText(location);
                };
                locationListContainer.appendChild(locationItem);
            });
        }
        else {
            const noLocationsMessage = document.createElement('p');
            noLocationsMessage.textContent = 'No locations available. Create one!';
            locationListContainer.appendChild(noLocationsMessage);
        }
    }
    async insertLocationText(location) {
        const text = `**LOCATION.** ${location}\n`;
        this.editor.replaceRange(text, this.editor.getCursor());
    }
    async openNewLocationModal() {
        const newLocationModal = new NewLocationModal(this.app, this.pluginInstance, this.folderPath);
        newLocationModal.open();
    }
}
class NewLocationModal extends Modal {
    constructor(app, pluginInstance, folderPath) {
        super(app);
        this.pluginInstance = pluginInstance;
        this.folderPath = folderPath;
    }
    onOpen() {
        const { contentEl } = this;
        contentEl.createEl('h2', { text: `Create new location` });
        // Vytvoření výběru pro INT/EXT
        const locationTypeSelect = contentEl.createEl('select');
        const option1 = contentEl.createEl('option', { text: 'INT' });
        const option2 = contentEl.createEl('option', { text: 'EXT' });
        locationTypeSelect.appendChild(option1);
        locationTypeSelect.appendChild(option2);
        // Vytvoření inputu pro název lokace
        const inputEl = contentEl.createEl('input', { type: 'text', placeholder: 'Enter location name' });
        // Tlačítko pro vytvoření lokace
        const createButton = contentEl.createEl('button', { text: 'Create Location' });
        createButton.onclick = async () => {
            const locationType = locationTypeSelect.value;
            const locationName = inputEl.value.trim().toUpperCase(); // Uloží název lokace v uppercase
            if (locationName) {
                await this.createNewLocation(locationName, locationType);
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
    async createNewLocation(location, type) {
        try {
            const newFile = await this.pluginInstance.createNewLocation(location, type, this.folderPath); // Použití instance pluginu
            new Notice(`Created new location: ${newFile.path}`);
        }
        catch (error) {
            new Notice('Error creating location.');
            console.error(error);
        }
    }
}
