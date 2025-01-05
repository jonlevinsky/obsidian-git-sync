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
class CeltxLikePlugin {
    constructor(app, plugin) {
        this.app = app;
        this.plugin = plugin;
        this.settings = {}; // Používáme výchozí hodnoty
    }
    // Metoda pro získání souborů lokací z určité složky
    async getLocationFiles(folderPath) {
        return this.app.vault.getFiles().filter(file => file.path.startsWith(folderPath) && file.path.endsWith('.md'));
    }
    // Metoda pro získání souborů postav z určité složky
    async getCharacterFiles(folderPath) {
        return this.app.vault.getFiles().filter(file => file.path.startsWith(folderPath) && file.path.endsWith('.md'));
    }
}
class CeltxLikePluginSettings {
    constructor() {
        this.folderPath = 'Scenes'; // Výchozí složka pro lokace
        this.charactersFolderPath = 'Characters'; // Výchozí složka pro postavy
    }
}
class SceneAndCharacterListModal extends obsidian_1.Modal {
    constructor(app, editor, pluginInstance) {
        super(app);
        this.locationNames = [];
        this.characterNames = [];
        this.folderPath = '';
        this.characterFolderPath = '';
        this.editor = editor;
        this.pluginInstance = pluginInstance;
    }
    onOpen() {
        const { contentEl } = this;
        contentEl.createEl('h2', { text: 'SELECT OR CREATE SCENE OR CHARACTER' });
        const newLocationButton = contentEl.createEl('button', { text: '+ ADD NEW SCENE' });
        newLocationButton.onclick = () => this.openNewLocationModal();
        const newCharacterButton = contentEl.createEl('button', { text: '+ ADD NEW CHARACTER' });
        newCharacterButton.onclick = () => this.openNewCharacterModal();
        const locationListContainer = document.createElement('div');
        locationListContainer.style.display = 'flex';
        locationListContainer.style.flexDirection = 'column';
        locationListContainer.style.marginTop = '10px';
        contentEl.appendChild(locationListContainer);
        const characterListContainer = document.createElement('div');
        characterListContainer.style.display = 'flex';
        characterListContainer.style.flexDirection = 'column';
        characterListContainer.style.marginTop = '10px';
        contentEl.appendChild(characterListContainer);
        this.loadLocations(locationListContainer);
        this.loadCharacters(characterListContainer);
    }
    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }
    async loadLocations(locationListContainer) {
        const activeFile = this.app.workspace.getActiveFile();
        if (!activeFile) {
            new obsidian_1.Notice("NO FILE FOUND FOR THE CURRENT EDITOR.");
            return;
        }
        const filePath = activeFile.path;
        this.folderPath = path.dirname(filePath);
        let locationFiles = await this.pluginInstance.getLocationFiles(this.folderPath);
        // Filtrování otevřeného souboru, aby se nezobrazoval v seznamu
        locationFiles = locationFiles.filter((file) => file.path !== filePath);
        // Pokud jsou k dispozici lokace, zobrazíme je
        if (locationFiles.length > 0) {
            this.locationNames = locationFiles.map((file) => path.basename(file.path, '.md'));
            this.locationNames.forEach(location => {
                const locationItem = document.createElement('button');
                locationItem.textContent = location;
                locationItem.onclick = async () => {
                    await this.openLocationDetailsModal(location);
                };
                locationListContainer.appendChild(locationItem);
            });
        }
        else {
            const noLocationsMessage = document.createElement('p');
            noLocationsMessage.textContent = 'NO LOCATIONS AVAILABLE. CREATE ONE!';
            locationListContainer.appendChild(noLocationsMessage);
        }
    }
    async loadCharacters(characterListContainer) {
        const activeFile = this.app.workspace.getActiveFile();
        if (!activeFile) {
            new obsidian_1.Notice("NO FILE FOUND FOR THE CURRENT EDITOR.");
            return;
        }
        const filePath = activeFile.path;
        this.characterFolderPath = path.dirname(filePath);
        let characterFiles = await this.pluginInstance.getCharacterFiles(this.characterFolderPath);
        // Filtrování otevřeného souboru, aby se nezobrazoval v seznamu
        characterFiles = characterFiles.filter((file) => file.path !== filePath);
        // Pokud jsou k dispozici postavy, zobrazíme je
        if (characterFiles.length > 0) {
            this.characterNames = characterFiles.map((file) => path.basename(file.path, '.md'));
            this.characterNames.forEach(character => {
                const characterItem = document.createElement('button');
                characterItem.textContent = character;
                characterItem.onclick = async () => {
                    await this.openCharacterDetailsModal(character);
                };
                characterListContainer.appendChild(characterItem);
            });
        }
        else {
            const noCharactersMessage = document.createElement('p');
            noCharactersMessage.textContent = 'NO CHARACTERS AVAILABLE. CREATE ONE!';
            characterListContainer.appendChild(noCharactersMessage);
        }
    }
    async openLocationDetailsModal(location) {
        const locationDetailModal = new LocationDetailModal(this.app, location, (details) => {
            this.insertLocationText(location, details);
        });
        locationDetailModal.open();
    }
    async openCharacterDetailsModal(character) {
        const characterDetailModal = new CharacterDetailModal(this.app, character, (details) => {
            this.insertCharacterText(character, details);
        });
        characterDetailModal.open();
    }
    async insertLocationText(location, details) {
        const formattedLocationText = `## ${location.toUpperCase()}\n\n${details}\n`;
        const text = formattedLocationText;
        this.editor.replaceRange(text, this.editor.getCursor());
    }
    async insertCharacterText(character, details) {
        const formattedCharacterText = `## ${character.toUpperCase()}\n\n${details}\n`;
        const text = formattedCharacterText;
        this.editor.replaceRange(text, this.editor.getCursor());
    }
    async openNewLocationModal() {
        const newLocationModal = new NewLocationModal(this.app, this.pluginInstance, this.folderPath);
        newLocationModal.open();
    }
    async openNewCharacterModal() {
        const newCharacterModal = new NewCharacterModal(this.app, this.pluginInstance, this.characterFolderPath);
        newCharacterModal.open();
    }
}
class LocationDetailModal extends obsidian_1.Modal {
    constructor(app, location, callback) {
        super(app);
        this.location = location;
        this.callback = callback;
    }
    onOpen() {
        const { contentEl } = this;
        contentEl.createEl('h2', { text: `SELECT DETAILS FOR LOCATION: ${this.location}` });
        const locationDetailsInput = contentEl.createEl('textarea');
        locationDetailsInput.placeholder = 'Enter details for the location here';
        const saveButton = contentEl.createEl('button', { text: 'SAVE DETAILS' });
        saveButton.onclick = () => this.saveLocationDetails(locationDetailsInput.value);
    }
    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }
    saveLocationDetails(details) {
        this.callback(details); // Zavoláme callback pro vložení textu do editoru
        this.close();
    }
}
class CharacterDetailModal extends obsidian_1.Modal {
    constructor(app, character, callback) {
        super(app);
        this.character = character;
        this.callback = callback;
    }
    onOpen() {
        const { contentEl } = this;
        contentEl.createEl('h2', { text: `SELECT DETAILS FOR CHARACTER: ${this.character}` });
        const characterDetailsInput = contentEl.createEl('textarea');
        characterDetailsInput.placeholder = 'Enter details for the character here';
        const saveButton = contentEl.createEl('button', { text: 'SAVE DETAILS' });
        saveButton.onclick = () => this.saveCharacterDetails(characterDetailsInput.value);
    }
    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }
    saveCharacterDetails(details) {
        this.callback(details); // Zavoláme callback pro vložení textu do editoru
        this.close();
    }
}
class NewLocationModal extends obsidian_1.Modal {
    constructor(app, pluginInstance, folderPath) {
        super(app);
        this.pluginInstance = pluginInstance;
        this.folderPath = folderPath;
    }
    onOpen() {
        const { contentEl } = this;
        contentEl.createEl('h2', { text: 'CREATE NEW LOCATION' });
        const locationNameInput = contentEl.createEl('input');
        locationNameInput.placeholder = 'Enter location name';
        const createButton = contentEl.createEl('button', { text: 'CREATE' });
        createButton.onclick = async () => {
            const locationName = locationNameInput.value.toUpperCase();
            await this.createLocationFile(locationName);
        };
    }
    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }
    async createLocationFile(locationName) {
        const locationFolderPath = path.join(this.folderPath, 'Scenes');
        try {
            const folderExists = await this.app.vault.adapter.exists(locationFolderPath);
            if (!folderExists) {
                await this.app.vault.createFolder(locationFolderPath);
            }
        }
        catch (error) {
            console.error("Error creating folder:", error);
        }
        const locationFileName = `${locationName}-${path.basename(this.folderPath)}`;
        const locationFilePath = path.join(locationFolderPath, `${locationFileName}.md`);
        const file = await this.app.vault.create(locationFilePath, `# ${locationName}\n\n`);
        new obsidian_1.Notice(`LOCATION CREATED: ${locationFileName}`);
        this.close();
    }
}
class NewCharacterModal extends obsidian_1.Modal {
    constructor(app, pluginInstance, folderPath) {
        super(app);
        this.pluginInstance = pluginInstance;
        this.folderPath = folderPath;
    }
    onOpen() {
        const { contentEl } = this;
        contentEl.createEl('h2', { text: 'CREATE NEW CHARACTER' });
        const characterNameInput = contentEl.createEl('input');
        characterNameInput.placeholder = 'Enter character name';
        const createButton = contentEl.createEl('button', { text: 'CREATE' });
        createButton.onclick = async () => {
            const characterName = characterNameInput.value.toUpperCase();
            await this.createCharacterFile(characterName);
        };
    }
    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }
    async createCharacterFile(characterName) {
        const characterFolderPath = path.join(this.folderPath, 'Characters');
        try {
            const folderExists = await this.app.vault.adapter.exists(characterFolderPath);
            if (!folderExists) {
                await this.app.vault.createFolder(characterFolderPath);
            }
        }
        catch (error) {
            console.error("Error creating folder:", error);
        }
        const characterFileName = `${characterName}-${path.basename(this.folderPath)}`;
        const characterFilePath = path.join(characterFolderPath, `${characterFileName}.md`);
        const file = await this.app.vault.create(characterFilePath, `# ${characterName}\n\n`);
        new obsidian_1.Notice(`CHARACTER CREATED: ${characterFileName}`);
        this.close();
    }
}
