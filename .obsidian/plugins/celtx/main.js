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
    hotkey: 'Mod+1', // Výchozí hodnota pro hotkey
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
            id: "open-location-character-list",
            name: "Open Location and Character List",
            editorCallback: (editor) => {
                new LocationCharacterListModal(this.app, editor, this).open();
            },
            hotkeys: [{ modifiers: ["Mod"], key: this.settings.hotkey.split('+')[1] }], // Použití nastavené klávesové zkratky
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
            .setName('Hotkey')
            .setDesc('Set the hotkey for opening the location and character list.')
            .addText((text) => text
            .setValue(this.plugin.settings.hotkey)
            .onChange(async (value) => {
            this.plugin.settings.hotkey = value;
            await this.plugin.saveSettings();
        }));
    }
}
class LocationCharacterListModal extends obsidian_1.Modal {
    constructor(app, editor, pluginInstance) {
        super(app);
        this.locationNames = [];
        this.characterNames = [];
        this.folderPath = '';
        this.editor = editor;
        this.pluginInstance = pluginInstance;
    }
    onOpen() {
        const { contentEl } = this;
        contentEl.createEl('h2', { text: 'SELECT OR CREATE LOCATION OR CHARACTER' });
        const newLocationButton = contentEl.createEl('button', { text: '+ ADD NEW LOCATION' });
        newLocationButton.onclick = () => this.openNewLocationModal();
        const newCharacterButton = contentEl.createEl('button', { text: '+ ADD NEW CHARACTER' });
        newCharacterButton.onclick = () => this.openNewCharacterModal();
        const locationCharacterListContainer = document.createElement('div');
        locationCharacterListContainer.style.display = 'flex';
        locationCharacterListContainer.style.flexDirection = 'column';
        locationCharacterListContainer.style.marginTop = '10px';
        contentEl.appendChild(locationCharacterListContainer);
        this.loadLocationsAndCharacters(locationCharacterListContainer);
    }
    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }
    async loadLocationsAndCharacters(locationCharacterListContainer) {
        const activeFile = this.app.workspace.getActiveFile();
        if (!activeFile) {
            new obsidian_1.Notice("NO FILE FOUND FOR THE CURRENT EDITOR.");
            return;
        }
        const filePath = activeFile.path;
        this.folderPath = path_1.default.dirname(filePath);
        let locationFiles = await this.pluginInstance.getLocationFiles(this.folderPath);
        let characterFiles = await this.pluginInstance.getCharacterFiles(this.folderPath);
        // Filtrování otevřeného souboru, aby se nezobrazoval v seznamu
        locationFiles = locationFiles.filter((file) => file.path !== filePath);
        characterFiles = characterFiles.filter((file) => file.path !== filePath);
        // Pokud jsou k dispozici lokace a postavy, zobrazíme je
        if (locationFiles.length > 0 || characterFiles.length > 0) {
            this.locationNames = locationFiles.map((file) => path_1.default.basename(file.path, '.md'));
            this.characterNames = characterFiles.map((file) => path_1.default.basename(file.path, '.md'));
            this.locationNames.forEach(location => {
                const locationItem = document.createElement('button');
                locationItem.textContent = location;
                locationItem.onclick = async () => {
                    await this.insertLocationText(location);
                };
                locationCharacterListContainer.appendChild(locationItem);
            });
            this.characterNames.forEach(character => {
                const characterItem = document.createElement('button');
                characterItem.textContent = character;
                characterItem.onclick = async () => {
                    await this.insertCharacterText(character);
                };
                locationCharacterListContainer.appendChild(characterItem);
            });
        }
        else {
            const noItemsMessage = document.createElement('p');
            noItemsMessage.textContent = 'NO LOCATIONS OR CHARACTERS AVAILABLE. CREATE ONE!';
            locationCharacterListContainer.appendChild(noItemsMessage);
        }
    }
    async insertLocationText(location) {
        const formattedLocationText = `[[${location}]]`;
        const text = `${formattedLocationText}\n`;
        this.editor.replaceRange(text, this.editor.getCursor());
    }
    async insertCharacterText(character) {
        const formattedCharacterText = `[[${character}]]`;
        const text = `${formattedCharacterText}\n`;
        this.editor.replaceRange(text, this.editor.getCursor());
    }
    async openNewLocationModal() {
        const newLocationModal = new NewLocationModal(this.app, this.pluginInstance, this.folderPath);
        newLocationModal.open();
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
        const locationNameInput = contentEl.createEl('input');
        locationNameInput.placeholder = 'Enter location name';
        const locationTypeInput = contentEl.createEl('input');
        locationTypeInput.placeholder = 'Enter location type';
        const createButton = contentEl.createEl('button', { text: 'CREATE LOCATION' });
        createButton.onclick = async () => {
            const locationName = locationNameInput.value.trim();
            const locationType = locationTypeInput.value.trim();
            if (locationName && locationType) {
                await this.pluginInstance.createNewLocation(locationName, locationType, this.folderPath);
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
        const characterNameInput = contentEl.createEl('input');
        characterNameInput.placeholder = 'Enter character name';
        const createButton = contentEl.createEl('button', { text: 'CREATE CHARACTER' });
        createButton.onclick = async () => {
            const characterName = characterNameInput.value.trim();
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
