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
        const files = this.app.vault.getFiles().filter((file) => file.path.startsWith(folderPath) &&
            !file.path.includes('LOCATION-') &&
            file.path !== this.app.workspace.getActiveFile()?.path // Nezobrazovat aktuální soubor
        );
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
        this.pluginInstance = pluginInstance;
    }
    onOpen() {
        const { contentEl } = this;
        contentEl.createEl('h2', { text: 'SELECT OR CREATE LOCATION' });
        const newLocationButton = contentEl.createEl('button', { text: '+ ADD NEW LOCATION' });
        newLocationButton.onclick = () => this.openNewLocationModal();
        const locationListContainer = document.createElement('div');
        locationListContainer.classList.add('location-list-container');
        locationListContainer.style.display = 'flex';
        locationListContainer.style.flexDirection = 'column';
        locationListContainer.style.marginTop = '10px';
        locationListContainer.style.padding = '10px';
        locationListContainer.style.backgroundColor = '#f9f9f9';
        locationListContainer.style.borderRadius = '8px';
        contentEl.appendChild(locationListContainer);
        this.loadLocations(locationListContainer);
    }
    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }
    async loadLocations(locationListContainer) {
        const activeFile = this.app.workspace.getActiveFile();
        if (!activeFile) {
            new Notice("NO FILE FOUND FOR THE CURRENT EDITOR.");
            return;
        }
        const filePath = activeFile.path;
        this.folderPath = path.dirname(filePath);
        let locationFiles = await this.pluginInstance.getLocationFiles(this.folderPath);
        this.locationNames = locationFiles.map((file) => path.basename(file.path, '.md'));
        if (this.locationNames.length > 0) {
            this.locationNames.forEach(location => {
                const locationItem = document.createElement('div');
                locationItem.classList.add('location-item');
                locationItem.style.padding = '12px';
                locationItem.style.marginBottom = '8px';
                locationItem.style.backgroundColor = '#444444';
                locationItem.style.borderRadius = '6px';
                locationItem.style.cursor = 'pointer';
                locationItem.style.transition = 'background-color 0.3s ease';
                locationItem.textContent = location;
                locationItem.onclick = async () => {
                    await this.openDayNightModal(location); // OPEN DAY/NIGHT MODAL
                };
                locationItem.onmouseenter = () => {
                    locationItem.style.backgroundColor = '#c0c0c0';
                };
                locationItem.onmouseleave = () => {
                    locationItem.style.backgroundColor = '#e0e0e0';
                };
                locationListContainer.appendChild(locationItem);
            });
        }
        else {
            const noLocationsMessage = document.createElement('p');
            noLocationsMessage.textContent = 'NO LOCATIONS AVAILABLE. CREATE ONE!';
            noLocationsMessage.style.color = '#888';
            locationListContainer.appendChild(noLocationsMessage);
        }
    }
    async openDayNightModal(location) {
        const dayNightModal = new DayNightModal(this.app, location, (dayNight) => {
            this.insertLocationText(location, dayNight);
        });
        dayNightModal.open();
    }
    async insertLocationText(location, dayNight) {
        // SPLIT FILE NAME INTO PARTS
        const [type, locationNameAndDay] = location.split('-');
        const [locationName] = locationNameAndDay.split('-');
        // FORMAT TEXT ACCORDING TO CELTX STYLE
        const formattedLocationText = `${type.toUpperCase()}. ${locationName.toUpperCase()} - ${dayNight.toUpperCase()}`;
        // INSERT TEXT INTO EDITOR
        const text = `${formattedLocationText}\n`;
        this.editor.replaceRange(text, this.editor.getCursor());
    }
    async openNewLocationModal() {
        const newLocationModal = new NewLocationModal(this.app, this.pluginInstance, this.folderPath);
        newLocationModal.open();
    }
}
class DayNightModal extends Modal {
    constructor(app, location, callback) {
        super(app);
        this.location = location;
        this.callback = callback;
    }
    onOpen() {
        const { contentEl } = this;
        contentEl.createEl('h2', { text: `SELECT TIME FOR LOCATION: ${this.location}` });
        const dayButton = contentEl.createEl('button', { text: 'DAY' });
        dayButton.onclick = () => this.selectDayNight('DAY');
        const nightButton = contentEl.createEl('button', { text: 'NIGHT' });
        nightButton.onclick = () => this.selectDayNight('NIGHT');
    }
    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }
    selectDayNight(dayNight) {
        this.callback(dayNight); // CALL THE CALLBACK TO INSERT TEXT INTO THE EDITOR
        this.close();
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
        contentEl.createEl('h2', { text: 'CREATE NEW LOCATION' });
        const typeSelect = contentEl.createEl('select');
        const optionInt = typeSelect.createEl('option', { text: 'INT' });
        const optionExt = typeSelect.createEl('option', { text: 'EXT' });
        const locationNameInput = contentEl.createEl('input');
        locationNameInput.placeholder = 'Enter location name';
        const createButton = contentEl.createEl('button', { text: 'CREATE' });
        createButton.onclick = async () => {
            const type = typeSelect.value;
            const locationName = locationNameInput.value.toUpperCase();
            await this.createLocationFile(type, locationName);
        };
    }
    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }
    async createLocationFile(type, locationName) {
        const locationFolderPath = path.join(this.folderPath, 'Lokace');
        try {
            const folderExists = await this.app.vault.adapter.exists(locationFolderPath);
            if (!folderExists) {
                await this.app.vault.createFolder(locationFolderPath);
            }
        }
        catch (error) {
            console.error("Error creating folder:", error);
        }
        const locationFileName = `${type}-${locationName}-${path.basename(this.folderPath)}`;
        const locationFilePath = path.join(locationFolderPath, `${locationFileName}.md`);
        const file = await this.app.vault.create(locationFilePath, '# ' + locationFileName);
        new Notice(`LOCATION CREATED: ${locationFileName}`);
        this.close();
    }
}
