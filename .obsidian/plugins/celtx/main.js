"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const obsidian_1 = require("obsidian");
const path_1 = __importDefault(require("path"));
const DEFAULT_SETTINGS = {
    defaultLocationFolder: 'Lokace',
    defaultCharacterFolder: 'Postavy',
    autoCreateFolders: true,
    locationHotkey: 'Mod+Š', // Výchozí hotkey pro lokace (např. Ctrl+š)
    characterHotkey: 'Mod+É', // Výchozí hotkey pro postavy (např. Ctrl+ě)
};
class CeltxLikePlugin extends obsidian_1.Plugin {
    constructor() {
        super(...arguments);
        this.settings = DEFAULT_SETTINGS;
    }
    async onload() {
        console.log("CeltxLikePlugin loaded");
        // Načtení nastavení
        await this.loadSettings();
        // Načítání CSS
        this.loadCustomStyles();
        // Přidání příkazů a nastavení UI
        this.addCommands();
        this.addSettingTab(new CeltxLikePluginSettingsTab(this.app, this));
    }
    onunload() {
        console.log("CeltxLikePlugin unloaded");
        this.removeCustomStyles();
    }
    async loadSettings() {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    }
    async saveSettings() {
        await this.saveData(this.settings);
    }
    addCommands() {
        this.addCommand({
            id: "open-location-list",
            name: "Open Location List",
            editorCallback: (editor) => {
                new LocationListModal(this.app, editor, this).open();
            },
            hotkeys: [{ modifiers: ["Mod"], key: this.settings.locationHotkey.split('+')[1] }], // Klávesová zkratka pro lokace
        });
        this.addCommand({
            id: "open-character-list",
            name: "Open Character List",
            editorCallback: (editor) => {
                new CharacterListModal(this.app, editor, this).open();
            },
            hotkeys: [{ modifiers: ["Mod"], key: this.settings.characterHotkey.split('+')[1] }], // Klávesová zkratka pro postavy
        });
    }
    async getLocationFiles(folderPath) {
        const locationFolder = this.settings.defaultLocationFolder;
        console.log(`Using default location folder: ${locationFolder}`);
        return this.app.vault.getFiles().filter((file) => file.path.startsWith(folderPath));
    }
    async getCharacterFiles(folderPath) {
        const characterFolder = this.settings.defaultCharacterFolder;
        console.log(`Using default character folder: ${characterFolder}`);
        return this.app.vault.getFiles().filter((file) => file.path.startsWith(folderPath));
    }
    async createNewLocation(location, type, folderPath) {
        if (this.settings.autoCreateFolders) {
            const locationFolderPath = path_1.default.join(folderPath, this.settings.defaultLocationFolder);
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
        }
        const locationFileName = `${type}-${location}-${path_1.default.basename(folderPath)}`;
        const locationFilePath = path_1.default.join(folderPath, this.settings.defaultLocationFolder, `${locationFileName}.md`);
        const file = await this.app.vault.create(locationFilePath, '# ' + locationFileName);
        return file;
    }
    async createNewCharacter(character, folderPath) {
        if (this.settings.autoCreateFolders) {
            const characterFolderPath = path_1.default.join(folderPath, this.settings.defaultCharacterFolder);
            try {
                const folderExists = await this.app.vault.adapter.exists(characterFolderPath);
                if (!folderExists) {
                    await this.app.vault.createFolder(characterFolderPath);
                    console.log(`Folder created at: ${characterFolderPath}`);
                }
            }
            catch (error) {
                console.error("Error creating folder:", error);
                throw error;
            }
        }
        const characterFilePath = path_1.default.join(folderPath, this.settings.defaultCharacterFolder, `${character}.md`);
        const file = await this.app.vault.create(characterFilePath, '# ' + character);
        return file;
    }
    loadCustomStyles() {
        const stylePath = path_1.default.join(this.app.vault.configDir, 'plugins', 'CeltxLikePlugin', 'styles.css');
        // Vytvoření tagu pro style
        const styleLink = document.createElement('link');
        styleLink.rel = 'stylesheet';
        styleLink.type = 'text/css';
        styleLink.href = stylePath;
        document.head.appendChild(styleLink);
    }
    removeCustomStyles() {
        const links = document.head.getElementsByTagName('link');
        for (let link of links) {
            if (link.href.includes('styles.css')) {
                document.head.removeChild(link);
            }
        }
    }
}
exports.default = CeltxLikePlugin;
class CeltxLikePluginSettingsTab extends obsidian_1.PluginSettingTab {
    constructor(app, plugin) {
        super(app, plugin);
        this.plugin = plugin;
    }
    display() {
        const { containerEl } = this;
        containerEl.empty();
        containerEl.createEl('h2', { text: 'CeltxLike Plugin Settings' });
        new obsidian_1.Setting(containerEl)
            .setName('Default Location Folder')
            .setDesc('Folder name for storing locations')
            .addText((text) => text
            .setPlaceholder('Enter folder name')
            .setValue(this.plugin.settings.defaultLocationFolder)
            .onChange(async (value) => {
            this.plugin.settings.defaultLocationFolder = value;
            await this.plugin.saveSettings();
        }));
        new obsidian_1.Setting(containerEl)
            .setName('Default Character Folder')
            .setDesc('Folder name for storing characters')
            .addText((text) => text
            .setPlaceholder('Enter folder name')
            .setValue(this.plugin.settings.defaultCharacterFolder)
            .onChange(async (value) => {
            this.plugin.settings.defaultCharacterFolder = value;
            await this.plugin.saveSettings();
        }));
        new obsidian_1.Setting(containerEl)
            .setName('Auto-create Folders')
            .setDesc('Automatically create location and character folders if not found')
            .addToggle((toggle) => toggle
            .setValue(this.plugin.settings.autoCreateFolders)
            .onChange(async (value) => {
            this.plugin.settings.autoCreateFolders = value;
            await this.plugin.saveSettings();
        }));
        new obsidian_1.Setting(containerEl)
            .setName('Location Hotkey')
            .setDesc('Set the hotkey for opening the location list.')
            .addText((text) => text
            .setValue(this.plugin.settings.locationHotkey)
            .onChange(async (value) => {
            this.plugin.settings.locationHotkey = value;
            await this.plugin.saveSettings();
        }));
        new obsidian_1.Setting(containerEl)
            .setName('Character Hotkey')
            .setDesc('Set the hotkey for opening the character list.')
            .addText((text) => text
            .setValue(this.plugin.settings.characterHotkey)
            .onChange(async (value) => {
            this.plugin.settings.characterHotkey = value;
            await this.plugin.saveSettings();
        }));
    }
}
class LocationListModal extends obsidian_1.Modal {
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
        locationListContainer.style.display = 'flex';
        locationListContainer.style.flexDirection = 'column';
        locationListContainer.style.marginTop = '10px';
        contentEl.appendChild(locationListContainer);
        this.loadLocations(locationListContainer);
    }
    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }
    async loadLocations(container) {
        const locationFiles = await this.pluginInstance.getLocationFiles(this.folderPath);
        this.locationNames = locationFiles.map(file => file.path); // Extrahuje cesty souborů jako řetězce
        if (this.locationNames.length > 0) {
            this.locationNames.forEach(location => {
                const locationButton = document.createElement('button');
                locationButton.textContent = location;
                locationButton.onclick = () => {
                    this.editor.replaceSelection(location);
                    this.close();
                };
                container.appendChild(locationButton);
            });
        }
    }
    async openNewLocationModal() {
        const locationType = await this.selectLocationType();
        const locationName = await this.getLocationName();
        if (locationName) {
            const locationFile = await this.pluginInstance.createNewLocation(locationName, locationType, this.folderPath);
            const fileLink = `[[${locationFile.path}]]`;
            this.editor.replaceSelection(fileLink);
            this.close();
        }
    }
    async selectLocationType() {
        const types = ['Interior', 'Exterior'];
        const selection = await this.chooseFromList('Select Location Type', types);
        return selection || 'Interior';
    }
    async getLocationName() {
        const name = await this.getInput('Enter Location Name');
        return name;
    }
    async chooseFromList(title, options) {
        const modal = new obsidian_1.Modal(this.app);
        modal.titleEl.setText(title);
        const list = modal.contentEl.createEl('ul');
        options.forEach(option => {
            const listItem = list.createEl('li');
            listItem.textContent = option;
            listItem.onclick = () => {
                modal.close();
                return option;
            };
        });
        modal.open();
        return new Promise(resolve => modal.onClose = () => resolve(null));
    }
    async getInput(prompt) {
        const modal = new obsidian_1.Modal(this.app);
        modal.titleEl.setText(prompt);
        const inputEl = modal.contentEl.createEl('input');
        inputEl.placeholder = prompt;
        modal.open();
        return new Promise(resolve => inputEl.addEventListener('change', () => resolve(inputEl.value)));
    }
}
class CharacterListModal extends obsidian_1.Modal {
    constructor(app, editor, pluginInstance) {
        super(app);
        this.characterNames = [];
        this.folderPath = '';
        this.editor = editor;
        this.pluginInstance = pluginInstance;
    }
    onOpen() {
        const { contentEl } = this;
        contentEl.createEl('h2', { text: 'SELECT OR CREATE CHARACTER' });
        const newCharacterButton = contentEl.createEl('button', { text: '+ ADD NEW CHARACTER' });
        newCharacterButton.onclick = () => this.openNewCharacterModal();
        const characterListContainer = document.createElement('div');
        characterListContainer.style.display = 'flex';
        characterListContainer.style.flexDirection = 'column';
        characterListContainer.style.marginTop = '10px';
        contentEl.appendChild(characterListContainer);
        this.loadCharacters(characterListContainer);
    }
    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }
    async loadCharacters(container) {
        const characterFiles = await this.pluginInstance.getCharacterFiles(this.folderPath);
        this.characterNames = characterFiles.map(file => file.path); // Extrahuje cesty souborů jako řetězce
        if (this.characterNames.length > 0) {
            this.characterNames.forEach(character => {
                const characterButton = document.createElement('button');
                characterButton.textContent = character;
                characterButton.onclick = () => {
                    this.editor.replaceSelection(character);
                    this.close();
                };
                container.appendChild(characterButton);
            });
        }
    }
    async openNewCharacterModal() {
        const characterName = await this.getCharacterName();
        if (characterName) {
            const characterFile = await this.pluginInstance.createNewCharacter(characterName, this.folderPath);
            const fileLink = `[[${characterFile.path}]]`;
            this.editor.replaceSelection(fileLink);
            this.close();
        }
    }
    async getCharacterName() {
        const name = await this.getInput('Enter Character Name');
        return name;
    }
    async getInput(prompt) {
        const modal = new obsidian_1.Modal(this.app);
        modal.titleEl.setText(prompt);
        const inputEl = modal.contentEl.createEl('input');
        inputEl.placeholder = prompt;
        modal.open();
        return new Promise(resolve => inputEl.addEventListener('change', () => resolve(inputEl.value)));
    }
}
