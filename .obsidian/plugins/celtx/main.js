import { Plugin, PluginSettingTab, Setting, Modal, Notice, MarkdownView } from 'obsidian';
import * as path from 'path';
const DEFAULT_SETTINGS = {
    defaultCharacterFolder: 'Postavy',
    defaultLocationFolder: 'Lokace',
    autoCreateFolders: true,
    characterHotkey: 'Mod+É',
    locationHotkey: 'Mod+Š',
};
export default class ScriptWritingPlugin extends Plugin {
    settings;
    characterManager;
    locationManager;
    constructor(app, manifest) {
        super(app, manifest);
        this.settings = DEFAULT_SETTINGS;
        this.characterManager = new CharacterManager(app, this);
        this.locationManager = new LocationManager(app, this);
    }
    async onload() {
        await this.loadSettings();
        this.addSettingTab(new ScriptWritingPluginSettingTab(this.app, this));
        this.addCommand({
            id: 'open-character-list',
            name: 'Open Character List',
            hotkeys: [{ modifiers: ["Mod"], key: this.settings.characterHotkey.split('+')[1] }],
            callback: () => this.characterManager.openCharacterList(),
        });
        this.addCommand({
            id: 'open-location-list',
            name: 'Open Location List',
            hotkeys: [{ modifiers: ["Mod"], key: this.settings.locationHotkey.split('+')[1] }],
            callback: () => this.locationManager.openLocationList(),
        });
    }
    async loadSettings() {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    }
    async saveSettings() {
        await this.saveData(this.settings);
    }
}
class CharacterManager {
    app;
    plugin;
    constructor(app, plugin) {
        this.app = app;
        this.plugin = plugin;
    }
    openCharacterList() {
        new CharacterListModal(this.app, this.plugin).open();
    }
    async getCharacterFiles(folderPath) {
        const characterFolder = this.plugin.settings.defaultCharacterFolder;
        return this.app.vault.getFiles().filter((file) => file.path.startsWith(path.join(folderPath, characterFolder)));
    }
    async createNewCharacter(character, folderPath) {
        if (this.plugin.settings.autoCreateFolders) {
            const characterFolderPath = path.join(folderPath, this.plugin.settings.defaultCharacterFolder);
            try {
                const folderExists = await this.app.vault.adapter.exists(characterFolderPath);
                if (!folderExists) {
                    await this.app.vault.createFolder(characterFolderPath);
                }
            }
            catch (error) {
                console.error("Error creating folder:", error);
                throw error;
            }
        }
        const characterFilePath = path.join(folderPath, this.plugin.settings.defaultCharacterFolder, `${character}.md`);
        const file = await this.app.vault.create(characterFilePath, `# ${character}`);
        return file;
    }
}
class CharacterListModal extends Modal {
    plugin;
    editor = null;
    characterNames = [];
    folderPath = '';
    constructor(app, plugin) {
        super(app);
        this.plugin = plugin;
        const activeLeaf = this.app.workspace.activeLeaf;
        if (activeLeaf && activeLeaf.view instanceof MarkdownView) {
            this.editor = activeLeaf.view.editor;
        }
    }
    onOpen() {
        const { contentEl } = this;
        contentEl.createEl('h2', { text: 'SELECT OR CREATE CHARACTER' });
        const newCharacterButton = contentEl.createEl('button', { text: '+ ADD NEW CHARACTER' });
        newCharacterButton.onclick = () => this.openNewCharacterModal();
        const characterListContainer = contentEl.createEl('div', {
            cls: 'character-list-container'
        });
        this.loadCharacters(characterListContainer);
    }
    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }
    async loadCharacters(characterListContainer) {
        const activeFile = this.app.workspace.getActiveFile();
        if (!activeFile) {
            new Notice("NO FILE FOUND FOR THE CURRENT EDITOR.");
            return;
        }
        this.folderPath = path.dirname(activeFile.path);
        let characterFiles = await this.plugin.characterManager.getCharacterFiles(this.folderPath);
        characterFiles = characterFiles.filter((file) => file.path !== activeFile.path);
        if (characterFiles.length > 0) {
            this.characterNames = characterFiles.map((file) => path.basename(file.path, '.md'));
            this.characterNames.forEach(character => {
                const characterItem = characterListContainer.createEl('button', { text: character });
                characterItem.onclick = async () => {
                    await this.insertCharacterText(character);
                };
            });
        }
        else {
            characterListContainer.createEl('p', { text: 'NO CHARACTERS AVAILABLE. CREATE ONE!' });
        }
    }
    async insertCharacterText(character) {
        const formattedCharacterText = `[[${character}]]`;
        const text = `### ${formattedCharacterText}\n`;
        if (this.editor) {
            this.editor.replaceRange(text, this.editor.getCursor());
        }
        this.close();
    }
    async openNewCharacterModal() {
        new NewCharacterModal(this.app, this.plugin, this.folderPath).open();
    }
}
class NewCharacterModal extends Modal {
    plugin;
    folderPath;
    characterInput = null;
    constructor(app, plugin, folderPath) {
        super(app);
        this.plugin = plugin;
        this.folderPath = folderPath;
    }
    onOpen() {
        const { contentEl } = this;
        contentEl.createEl('h2', { text: 'CREATE NEW CHARACTER' });
        this.characterInput = contentEl.createEl('input', { type: 'text', placeholder: 'Enter character name...' });
        const createButton = contentEl.createEl('button', { text: 'Create Character' });
        createButton.onclick = async () => {
            if (this.characterInput) {
                const characterName = this.characterInput.value.trim();
                if (characterName) {
                    await this.plugin.characterManager.createNewCharacter(characterName, this.folderPath);
                    this.close();
                    new Notice(`Character ${characterName} created successfully!`);
                }
            }
        };
    }
    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }
}
class LocationManager {
    app;
    plugin;
    constructor(app, plugin) {
        this.app = app;
        this.plugin = plugin;
    }
    openLocationList() {
        new LocationListModal(this.app, this.plugin).open();
    }
    async getLocationFiles(folderPath) {
        const locationFolder = this.plugin.settings.defaultLocationFolder;
        return this.app.vault.getFiles().filter((file) => file.path.startsWith(path.join(folderPath, locationFolder)));
    }
    async createNewLocation(location, type, folderPath) {
        if (this.plugin.settings.autoCreateFolders) {
            const locationFolderPath = path.join(folderPath, this.plugin.settings.defaultLocationFolder);
            try {
                const folderExists = await this.app.vault.adapter.exists(locationFolderPath);
                if (!folderExists) {
                    await this.app.vault.createFolder(locationFolderPath);
                }
            }
            catch (error) {
                console.error("Error creating folder:", error);
                throw error;
            }
        }
        const locationFileName = `${type}-${location}-${path.basename(folderPath)}`;
        const locationFilePath = path.join(folderPath, this.plugin.settings.defaultLocationFolder, `${locationFileName}.md`);
        const file = await this.app.vault.create(locationFilePath, `# ${locationFileName}`);
        return file;
    }
}
class LocationListModal extends Modal {
    plugin;
    editor = null;
    locationNames = [];
    folderPath = '';
    constructor(app, plugin) {
        super(app);
        this.plugin = plugin;
        const activeLeaf = this.app.workspace.activeLeaf;
        if (activeLeaf && activeLeaf.view instanceof MarkdownView) {
            this.editor = activeLeaf.view.editor;
        }
    }
    onOpen() {
        const { contentEl } = this;
        contentEl.createEl('h2', { text: 'SELECT OR CREATE LOCATION' });
        const newLocationButton = contentEl.createEl('button', { text: '+ ADD NEW LOCATION' });
        newLocationButton.onclick = () => this.openNewLocationModal();
        const locationListContainer = contentEl.createEl('div', {
            cls: 'location-list-container'
        });
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
        this.folderPath = path.dirname(activeFile.path);
        let locationFiles = await this.plugin.locationManager.getLocationFiles(this.folderPath);
        locationFiles = locationFiles.filter((file) => file.path !== activeFile.path);
        if (locationFiles.length > 0) {
            this.locationNames = locationFiles.map((file) => path.basename(file.path, '.md'));
            this.locationNames.forEach(location => {
                const locationItem = locationListContainer.createEl('button', { text: location });
                locationItem.onclick = async () => {
                    await this.openDayNightModal(location);
                };
            });
        }
        else {
            locationListContainer.createEl('p', { text: 'NO LOCATIONS AVAILABLE. CREATE ONE!' });
        }
    }
    async openDayNightModal(location) {
        new DayNightModal(this.app, location, (dayNight) => {
            this.insertLocationText(location, dayNight);
        }).open();
    }
    async insertLocationText(location, dayNight) {
        const [type, locationNameAndDay] = location.split('-');
        const [locationName] = locationNameAndDay.split('-');
        const fileName = `${type.toUpperCase()}-${locationName.toUpperCase()}-${path.basename(this.folderPath)}`;
        const formattedLocationText = `# ${type.toUpperCase()}. [[${fileName}|${locationName.toUpperCase()}]] - ${dayNight.toUpperCase()}`;
        const text = `${formattedLocationText}\n`;
        if (this.editor) {
            this.editor.replaceRange(text, this.editor.getCursor());
        }
        this.close();
    }
    async openNewLocationModal() {
        new NewLocationModal(this.app, this.plugin, this.folderPath).open();
    }
}
class DayNightModal extends Modal {
    location;
    callback;
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
        this.callback(dayNight);
        this.close();
    }
}
class NewLocationModal extends Modal {
    plugin;
    folderPath;
    typeSelect = null;
    locationNameInput = null;
    constructor(app, plugin, folderPath) {
        super(app);
        this.plugin = plugin;
        this.folderPath = folderPath;
    }
    onOpen() {
        const { contentEl } = this;
        contentEl.createEl('h2', { text: 'CREATE NEW LOCATION' });
        this.typeSelect = contentEl.createEl('select');
        this.typeSelect.createEl('option', { text: 'INT', value: 'INT' });
        this.typeSelect.createEl('option', { text: 'EXT', value: 'EXT' });
        this.locationNameInput = contentEl.createEl('input', { type: 'text', placeholder: 'Enter location name' });
        const createButton = contentEl.createEl('button', { text: 'CREATE' });
        createButton.onclick = async () => {
            if (this.typeSelect && this.locationNameInput) {
                const type = this.typeSelect.value;
                const locationName = this.locationNameInput.value.trim().toUpperCase();
                if (locationName) {
                    await this.plugin.locationManager.createNewLocation(locationName, type, this.folderPath);
                    this.close();
                    new Notice(`Location ${type}-${locationName} created successfully!`);
                }
            }
        };
    }
    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }
}
class ScriptWritingPluginSettingTab extends PluginSettingTab {
    plugin;
    constructor(app, plugin) {
        super(app, plugin);
        this.plugin = plugin;
    }
    display() {
        const { containerEl } = this;
        containerEl.empty();
        containerEl.createEl('h2', { text: 'Script Writing Plugin Settings' });
        new Setting(containerEl)
            .setName('Default Character Folder')
            .setDesc('Folder name for storing characters')
            .addText(text => text
            .setPlaceholder('Enter folder name')
            .setValue(this.plugin.settings.defaultCharacterFolder)
            .onChange(async (value) => {
            this.plugin.settings.defaultCharacterFolder = value;
            await this.plugin.saveSettings();
        }));
        new Setting(containerEl)
            .setName('Default Location Folder')
            .setDesc('Folder name for storing locations')
            .addText(text => text
            .setPlaceholder('Enter folder name')
            .setValue(this.plugin.settings.defaultLocationFolder)
            .onChange(async (value) => {
            this.plugin.settings.defaultLocationFolder = value;
            await this.plugin.saveSettings();
        }));
        new Setting(containerEl)
            .setName('Auto-create Folders')
            .setDesc('Automatically create character and location folders if not found')
            .addToggle(toggle => toggle
            .setValue(this.plugin.settings.autoCreateFolders)
            .onChange(async (value) => {
            this.plugin.settings.autoCreateFolders = value;
            await this.plugin.saveSettings();
        }));
        new Setting(containerEl)
            .setName('Character Hotkey')
            .setDesc('Set the hotkey for opening the character list')
            .addText(text => text
            .setValue(this.plugin.settings.characterHotkey)
            .onChange(async (value) => {
            this.plugin.settings.characterHotkey = value;
            await this.plugin.saveSettings();
        }));
        new Setting(containerEl)
            .setName('Location Hotkey')
            .setDesc('Set the hotkey for opening the location list')
            .addText(text => text
            .setValue(this.plugin.settings.locationHotkey)
            .onChange(async (value) => {
            this.plugin.settings.locationHotkey = value;
            await this.plugin.saveSettings();
        }));
    }
}
