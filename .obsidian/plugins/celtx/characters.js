"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const obsidian_1 = require("obsidian");
const path_1 = tslib_1.__importDefault(require("path"));
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
    async loadLocations(locationListContainer) {
        const activeFile = this.app.workspace.getActiveFile();
        if (!activeFile) {
            new obsidian_1.Notice("NO FILE FOUND FOR THE CURRENT EDITOR.");
            return;
        }
        const filePath = activeFile.path;
        this.folderPath = path_1.default.dirname(filePath);
        let locationFiles = await this.pluginInstance.getLocationFiles(this.folderPath);
        // Filtrování otevřeného souboru
        locationFiles = locationFiles.filter((file) => file.path !== filePath);
        if (locationFiles.length > 0) {
            this.locationNames = locationFiles.map((file) => path_1.default.basename(file.path, '.md'));
            this.locationNames.forEach(location => {
                const locationItem = document.createElement('button');
                locationItem.textContent = location;
                locationItem.onclick = async () => {
                    await this.insertLocationText(location);
                };
                locationListContainer.appendChild(locationItem);
            });
        }
        else {
            const noItemsMessage = document.createElement('p');
            noItemsMessage.textContent = 'NO LOCATIONS AVAILABLE. CREATE ONE!';
            locationListContainer.appendChild(noItemsMessage);
        }
    }
    async insertLocationText(location) {
        const formattedLocationText = `[[${location}]]`;
        const text = `${formattedLocationText}\n`;
        this.editor.replaceRange(text, this.editor.getCursor());
    }
    async openNewLocationModal() {
        const newLocationModal = new NewLocationModal(this.app, this.pluginInstance, this.folderPath);
        newLocationModal.open();
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
    async loadCharacters(characterListContainer) {
        const activeFile = this.app.workspace.getActiveFile();
        if (!activeFile) {
            new obsidian_1.Notice("NO FILE FOUND FOR THE CURRENT EDITOR.");
            return;
        }
        const filePath = activeFile.path;
        this.folderPath = path_1.default.dirname(filePath);
        let characterFiles = await this.pluginInstance.getCharacterFiles(this.folderPath);
        // Filtrování otevřeného souboru
        characterFiles = characterFiles.filter((file) => file.path !== filePath);
        if (characterFiles.length > 0) {
            this.characterNames = characterFiles.map((file) => path_1.default.basename(file.path, '.md'));
            this.characterNames.forEach(character => {
                const characterItem = document.createElement('button');
                characterItem.textContent = character;
                characterItem.onclick = async () => {
                    await this.insertCharacterText(character);
                };
                characterListContainer.appendChild(characterItem);
            });
        }
        else {
            const noItemsMessage = document.createElement('p');
            noItemsMessage.textContent = 'NO CHARACTERS AVAILABLE. CREATE ONE!';
            characterListContainer.appendChild(noItemsMessage);
        }
    }
    async insertCharacterText(character) {
        const formattedCharacterText = `[[${character}]]`;
        const text = `${formattedCharacterText}\n`;
        this.editor.replaceRange(text, this.editor.getCursor());
    }
    async openNewCharacterModal() {
        const newCharacterModal = new NewCharacterModal(this.app, this.pluginInstance, this.folderPath);
        newCharacterModal.open();
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
        this.locationInput = contentEl.createEl('input', { type: 'text' }); // Inicializace
        this.locationInput.placeholder = 'Enter location name...';
        contentEl.appendChild(this.locationInput); // Přidání do DOM
        const createButton = contentEl.createEl('button', { text: 'Create Location' });
        createButton.onclick = async () => {
            const locationName = this.locationInput.value.trim();
            if (locationName) {
                await this.pluginInstance.createNewLocation(locationName, 'Location', this.folderPath);
                this.close();
            }
        };
    }
    onClose() {
        const { contentEl } = this;
        contentEl.empty();
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
        this.characterInput = contentEl.createEl('input', { type: 'text' });
        this.characterInput.placeholder = 'Enter character name...';
        const createButton = contentEl.createEl('button', { text: 'Create Character' });
        createButton.onclick = async () => {
            const characterName = this.characterInput.value.trim();
            if (characterName) {
                await this.pluginInstance.createNewCharacter(characterName, this.folderPath);
                this.close();
            }
        };
    }
    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }
}
