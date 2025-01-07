import { __awaiter } from "tslib";
import { Plugin, Modal, Notice, PluginSettingTab, Setting } from 'obsidian';
import path from 'path';
const DEFAULT_SETTINGS = {
    defaultLocationFolder: 'Lokace',
    defaultCharacterFolder: 'Postavy',
    autoCreateFolders: true,
    locationHotkey: 'Mod+Š', // Výchozí hotkey pro lokace (např. Ctrl+š)
    characterHotkey: 'Mod+É', // Výchozí hotkey pro postavy (např. Ctrl+ě)
};
export default class CeltxLikePlugin extends Plugin {
    constructor() {
        super(...arguments);
        this.settings = DEFAULT_SETTINGS;
    }
    onload() {
        return __awaiter(this, void 0, void 0, function* () {
            console.log("CeltxLikePlugin loaded");
            // Načtení nastavení
            yield this.loadSettings();
            // Načítání CSS
            this.loadCustomStyles();
            // Přidání příkazů a nastavení UI
            this.addCommands();
            this.addSettingTab(new CeltxLikePluginSettingsTab(this.app, this));
        });
    }
    onunload() {
        console.log("CeltxLikePlugin unloaded");
        this.removeCustomStyles();
    }
    loadSettings() {
        return __awaiter(this, void 0, void 0, function* () {
            this.settings = Object.assign({}, DEFAULT_SETTINGS, yield this.loadData());
        });
    }
    saveSettings() {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.saveData(this.settings);
        });
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
    getLocationFiles(folderPath) {
        return __awaiter(this, void 0, void 0, function* () {
            const locationFolder = this.settings.defaultLocationFolder;
            console.log(`Using default location folder: ${locationFolder}`);
            return this.app.vault.getFiles().filter((file) => file.path.startsWith(folderPath));
        });
    }
    getCharacterFiles(folderPath) {
        return __awaiter(this, void 0, void 0, function* () {
            const characterFolder = this.settings.defaultCharacterFolder;
            console.log(`Using default character folder: ${characterFolder}`);
            return this.app.vault.getFiles().filter((file) => file.path.startsWith(folderPath));
        });
    }
    createNewLocation(location, type, folderPath) {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.settings.autoCreateFolders) {
                const locationFolderPath = path.join(folderPath, this.settings.defaultLocationFolder);
                try {
                    const folderExists = yield this.app.vault.adapter.exists(locationFolderPath);
                    if (!folderExists) {
                        yield this.app.vault.createFolder(locationFolderPath);
                        console.log(`Folder created at: ${locationFolderPath}`);
                    }
                }
                catch (error) {
                    console.error("Error creating folder:", error);
                    throw error;
                }
            }
            const locationFileName = `${type}-${location}-${path.basename(folderPath)}`;
            const locationFilePath = path.join(folderPath, this.settings.defaultLocationFolder, `${locationFileName}.md`);
            const file = yield this.app.vault.create(locationFilePath, '# ' + locationFileName);
            return file;
        });
    }
    createNewCharacter(character, folderPath) {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.settings.autoCreateFolders) {
                const characterFolderPath = path.join(folderPath, this.settings.defaultCharacterFolder);
                try {
                    const folderExists = yield this.app.vault.adapter.exists(characterFolderPath);
                    if (!folderExists) {
                        yield this.app.vault.createFolder(characterFolderPath);
                        console.log(`Folder created at: ${characterFolderPath}`);
                    }
                }
                catch (error) {
                    console.error("Error creating folder:", error);
                    throw error;
                }
            }
            const characterFilePath = path.join(folderPath, this.settings.defaultCharacterFolder, `${character}.md`);
            const file = yield this.app.vault.create(characterFilePath, '# ' + character);
            return file;
        });
    }
    loadCustomStyles() {
        const stylePath = path.join(this.app.vault.configDir, 'plugins', 'CeltxLikePlugin', 'styles.css');
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
class CeltxLikePluginSettingsTab extends PluginSettingTab {
    constructor(app, plugin) {
        super(app, plugin);
        this.plugin = plugin;
    }
    display() {
        const { containerEl } = this;
        containerEl.empty();
        containerEl.createEl('h2', { text: 'CeltxLike Plugin Settings' });
        new Setting(containerEl)
            .setName('Default Location Folder')
            .setDesc('Folder name for storing locations')
            .addText((text) => text
            .setPlaceholder('Enter folder name')
            .setValue(this.plugin.settings.defaultLocationFolder)
            .onChange((value) => __awaiter(this, void 0, void 0, function* () {
            this.plugin.settings.defaultLocationFolder = value;
            yield this.plugin.saveSettings();
        })));
        new Setting(containerEl)
            .setName('Default Character Folder')
            .setDesc('Folder name for storing characters')
            .addText((text) => text
            .setPlaceholder('Enter folder name')
            .setValue(this.plugin.settings.defaultCharacterFolder)
            .onChange((value) => __awaiter(this, void 0, void 0, function* () {
            this.plugin.settings.defaultCharacterFolder = value;
            yield this.plugin.saveSettings();
        })));
        new Setting(containerEl)
            .setName('Auto-create Folders')
            .setDesc('Automatically create location and character folders if not found')
            .addToggle((toggle) => toggle
            .setValue(this.plugin.settings.autoCreateFolders)
            .onChange((value) => __awaiter(this, void 0, void 0, function* () {
            this.plugin.settings.autoCreateFolders = value;
            yield this.plugin.saveSettings();
        })));
        new Setting(containerEl)
            .setName('Location Hotkey')
            .setDesc('Set the hotkey for opening the location list.')
            .addText((text) => text
            .setValue(this.plugin.settings.locationHotkey)
            .onChange((value) => __awaiter(this, void 0, void 0, function* () {
            this.plugin.settings.locationHotkey = value;
            yield this.plugin.saveSettings();
        })));
        new Setting(containerEl)
            .setName('Character Hotkey')
            .setDesc('Set the hotkey for opening the character list.')
            .addText((text) => text
            .setValue(this.plugin.settings.characterHotkey)
            .onChange((value) => __awaiter(this, void 0, void 0, function* () {
            this.plugin.settings.characterHotkey = value;
            yield this.plugin.saveSettings();
        })));
    }
}
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
    loadLocations(locationListContainer) {
        return __awaiter(this, void 0, void 0, function* () {
            const activeFile = this.app.workspace.getActiveFile();
            if (!activeFile) {
                new Notice("NO FILE FOUND FOR THE CURRENT EDITOR.");
                return;
            }
            const filePath = activeFile.path;
            this.folderPath = path.dirname(filePath);
            let locationFiles = yield this.pluginInstance.getLocationFiles(this.folderPath);
            // Filtrování otevřeného souboru
            locationFiles = locationFiles.filter((file) => file.path !== filePath);
            if (locationFiles.length > 0) {
                this.locationNames = locationFiles.map((file) => path.basename(file.path, '.md'));
                this.locationNames.forEach(location => {
                    const locationItem = document.createElement('button');
                    locationItem.textContent = location;
                    locationItem.onclick = () => __awaiter(this, void 0, void 0, function* () {
                        yield this.insertLocationText(location);
                    });
                    locationListContainer.appendChild(locationItem);
                });
            }
            else {
                const noItemsMessage = document.createElement('p');
                noItemsMessage.textContent = 'NO LOCATIONS AVAILABLE. CREATE ONE!';
                locationListContainer.appendChild(noItemsMessage);
            }
        });
    }
    insertLocationText(location) {
        return __awaiter(this, void 0, void 0, function* () {
            const formattedLocationText = `[[${location}]]`;
            const text = `${formattedLocationText}\n`;
            this.editor.replaceRange(text, this.editor.getCursor());
        });
    }
    openNewLocationModal() {
        return __awaiter(this, void 0, void 0, function* () {
            const newLocationModal = new NewLocationModal(this.app, this.pluginInstance, this.folderPath);
            newLocationModal.open();
        });
    }
}
class CharacterListModal extends Modal {
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
    loadCharacters(characterListContainer) {
        return __awaiter(this, void 0, void 0, function* () {
            const activeFile = this.app.workspace.getActiveFile();
            if (!activeFile) {
                new Notice("NO FILE FOUND FOR THE CURRENT EDITOR.");
                return;
            }
            const filePath = activeFile.path;
            this.folderPath = path.dirname(filePath);
            let characterFiles = yield this.pluginInstance.getCharacterFiles(this.folderPath);
            // Filtrování otevřeného souboru
            characterFiles = characterFiles.filter((file) => file.path !== filePath);
            if (characterFiles.length > 0) {
                this.characterNames = characterFiles.map((file) => path.basename(file.path, '.md'));
                this.characterNames.forEach(character => {
                    const characterItem = document.createElement('button');
                    characterItem.textContent = character;
                    characterItem.onclick = () => __awaiter(this, void 0, void 0, function* () {
                        yield this.insertCharacterText(character);
                    });
                    characterListContainer.appendChild(characterItem);
                });
            }
            else {
                const noItemsMessage = document.createElement('p');
                noItemsMessage.textContent = 'NO CHARACTERS AVAILABLE. CREATE ONE!';
                characterListContainer.appendChild(noItemsMessage);
            }
        });
    }
    insertCharacterText(character) {
        return __awaiter(this, void 0, void 0, function* () {
            const formattedCharacterText = `[[${character}]]`;
            const text = `${formattedCharacterText}\n`;
            this.editor.replaceRange(text, this.editor.getCursor());
        });
    }
    openNewCharacterModal() {
        return __awaiter(this, void 0, void 0, function* () {
            const newCharacterModal = new NewCharacterModal(this.app, this.pluginInstance, this.folderPath);
            newCharacterModal.open();
        });
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
        this.locationInput = contentEl.createEl('input', { type: 'text' }); // Inicializace
        this.locationInput.placeholder = 'Enter location name...';
        contentEl.appendChild(this.locationInput); // Přidání do DOM
        const createButton = contentEl.createEl('button', { text: 'Create Location' });
        createButton.onclick = () => __awaiter(this, void 0, void 0, function* () {
            const locationName = this.locationInput.value.trim();
            if (locationName) {
                yield this.pluginInstance.createNewLocation(locationName, 'Location', this.folderPath);
                this.close();
            }
        });
    }
    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }
}
class NewCharacterModal extends Modal {
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
        createButton.onclick = () => __awaiter(this, void 0, void 0, function* () {
            const characterName = this.characterInput.value.trim();
            if (characterName) {
                yield this.pluginInstance.createNewCharacter(characterName, this.folderPath);
                this.close();
            }
        });
    }
    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhcmFjdGVycy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uL29ic2lkaWFuIHBsdWdpbi9jZWx0eC9iYWNrdXAvY2hhcmFjdGVycy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUEsT0FBTyxFQUFFLE1BQU0sRUFBRSxLQUFLLEVBQUUsTUFBTSxFQUFxQyxnQkFBZ0IsRUFBRSxPQUFPLEVBQUUsTUFBTSxVQUFVLENBQUM7QUFFL0csT0FBTyxJQUFJLE1BQU0sTUFBTSxDQUFDO0FBV3hCLE1BQU0sZ0JBQWdCLEdBQTRCO0lBQzlDLHFCQUFxQixFQUFFLFFBQVE7SUFDL0Isc0JBQXNCLEVBQUUsU0FBUztJQUNqQyxpQkFBaUIsRUFBRSxJQUFJO0lBQ3ZCLGNBQWMsRUFBRSxPQUFPLEVBQUUsMkNBQTJDO0lBQ3BFLGVBQWUsRUFBRSxPQUFPLEVBQUUsNENBQTRDO0NBQ3pFLENBQUM7QUFFRixNQUFNLENBQUMsT0FBTyxPQUFPLGVBQWdCLFNBQVEsTUFBTTtJQUFuRDs7UUFDSSxhQUFRLEdBQTRCLGdCQUFnQixDQUFDO0lBNEh6RCxDQUFDO0lBMUhTLE1BQU07O1lBQ1IsT0FBTyxDQUFDLEdBQUcsQ0FBQyx3QkFBd0IsQ0FBQyxDQUFDO1lBRXRDLG9CQUFvQjtZQUNwQixNQUFNLElBQUksQ0FBQyxZQUFZLEVBQUUsQ0FBQztZQUUxQixlQUFlO1lBQ2YsSUFBSSxDQUFDLGdCQUFnQixFQUFFLENBQUM7WUFFeEIsaUNBQWlDO1lBQ2pDLElBQUksQ0FBQyxXQUFXLEVBQUUsQ0FBQztZQUNuQixJQUFJLENBQUMsYUFBYSxDQUFDLElBQUksMEJBQTBCLENBQUMsSUFBSSxDQUFDLEdBQUcsRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFDO1FBQ3ZFLENBQUM7S0FBQTtJQUVELFFBQVE7UUFDSixPQUFPLENBQUMsR0FBRyxDQUFDLDBCQUEwQixDQUFDLENBQUM7UUFDeEMsSUFBSSxDQUFDLGtCQUFrQixFQUFFLENBQUM7SUFD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LENBQUMsY0FBYyxDQUFDLEtBQUssQ0FBQyxJQUFJLEVBQUUsQ0FBQztZQUN2RCxJQUFJLGFBQWEsRUFBRSxDQUFDO2dCQUNoQixNQUFNLElBQUksQ0FBQyxjQUFjLENBQUMsa0JBQWtCLENBQUMsYUFBYSxFQUFFLElBQUksQ0FBQyxVQUFVLENBQUMsQ0FBQztnQkFDN0UsSUFBSSxDQUFDLEtBQUssRUFBRSxDQUFDO1lBQ2pCLENBQUM7UUFDTCxDQUFDLENBQUEsQ0FBQztJQUNOLENBQUM7SUFFRCxPQUFPO1FBQ0gsTUFBTSxFQUFFLFNBQVMsRUFBRSxHQUFHLElBQUksQ0FBQztRQUMzQixTQUFTLENBQUMsS0FBSyxFQUFFLENBQUM7SUFDdEIsQ0FBQztDQUNKIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgUGx1Z2luLCBNb2RhbCwgTm90aWNlLCBFZGl0b3IsIFRGaWxlLCBBcHAgYXMgT2JzaWRpYW5BcHAsIFBsdWdpblNldHRpbmdUYWIsIFNldHRpbmcgfSBmcm9tICdvYnNpZGlhbic7XHJcbmltcG9ydCBmcyBmcm9tICdmcyc7XHJcbmltcG9ydCBwYXRoIGZyb20gJ3BhdGgnO1xyXG5cclxuLy8gTmFzdGF2ZW7DrSBwbHVnaW51XHJcbmludGVyZmFjZSBDZWx0eExpa2VQbHVnaW5TZXR0aW5ncyB7XHJcbiAgICBkZWZhdWx0TG9jYXRpb25Gb2xkZXI6IHN0cmluZztcclxuICAgIGRlZmF1bHRDaGFyYWN0ZXJGb2xkZXI6IHN0cmluZztcclxuICAgIGF1dG9DcmVhdGVGb2xkZXJzOiBib29sZWFuO1xyXG4gICAgbG9jYXRpb25Ib3RrZXk6IHN0cmluZzsgLy8gS2zDoXZlc292w6EgemtyYXRrYSBwcm8gbG9rYWNlXHJcbiAgICBjaGFyYWN0ZXJIb3RrZXk6IHN0cmluZzsgLy8gS2zDoXZlc292w6EgemtyYXRrYSBwcm8gcG9zdGF2eVxyXG59XHJcblxyXG5jb25zdCBERUZBVUxUX1NFVFRJTkdTOiBDZWx0eExpa2VQbHVnaW5TZXR0aW5ncyA9IHtcclxuICAgIGRlZmF1bHRMb2NhdGlvbkZvbGRlcjogJ0xva2FjZScsXHJcbiAgICBkZWZhdWx0Q2hhcmFjdGVyRm9sZGVyOiAnUG9zdGF2eScsXHJcbiAgICBhdXRvQ3JlYXRlRm9sZGVyczogdHJ1ZSxcclxuICAgIGxvY2F0aW9uSG90a2V5OiAnTW9kK8WgJywgLy8gVsO9Y2hvesOtIGhvdGtleSBwcm8gbG9rYWNlIChuYXDFmS4gQ3RybCvFoSlcclxuICAgIGNoYXJhY3RlckhvdGtleTogJ01vZCvDiScsIC8vIFbDvWNob3rDrSBob3RrZXkgcHJvIHBvc3RhdnkgKG5hcMWZLiBDdHJsK8SbKVxyXG59O1xyXG5cclxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgQ2VsdHhMaWtlUGx1Z2luIGV4dGVuZHMgUGx1Z2luIHtcclxuICAgIHNldHRpbmdzOiBDZWx0eExpa2VQbHVnaW5TZXR0aW5ncyA9IERFRkFVTFRfU0VUVElOR1M7XHJcblxyXG4gICAgYXN5bmMgb25sb2FkKCkge1xyXG4gICAgICAgIGNvbnNvbGUubG9nKFwiQ2VsdHhMaWtlUGx1Z2luIGxvYWRlZFwiKTtcclxuXHJcbiAgICAgICAgLy8gTmHEjXRlbsOtIG5hc3RhdmVuw61cclxuICAgICAgICBhd2FpdCB0aGlzLmxvYWRTZXR0aW5ncygpO1xyXG5cclxuICAgICAgICAvLyBOYcSNw610w6Fuw60gQ1NTXHJcbiAgICAgICAgdGhpcy5sb2FkQ3VzdG9tU3R5bGVzKCk7XHJcblxyXG4gICAgICAgIC8vIFDFmWlkw6Fuw60gcMWZw61rYXrFryBhIG5hc3RhdmVuw60gVUlcclxuICAgICAgICB0aGlzLmFkZENvbW1hbmRzKCk7XHJcbiAgICAgICAgdGhpcy5hZGRTZXR0aW5nVGFiKG5ldyBDZWx0eExpa2VQbHVnaW5TZXR0aW5nc1RhYih0aGlzLmFwcCwgdGhpcykpO1xyXG4gICAgfVxyXG5cclxuICAgIG9udW5sb2FkKCkge1xyXG4gICAgICAgIGNvbnNvbGUubG9nKFwiQ2VsdHhMaWtlUGx1Z2luIHVubG9hZGVkXCIpO1xyXG4gICAgICAgIHRoaXMucmVtb3ZlQ3VzdG9tU3R5bGVzKCk7XHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBhc3luYyBsb2FkU2V0dGluZ3MoKSB7XHJcbiAgICAgICAgdGhpcy5zZXR0aW5ncyA9IE9iamVjdC5hc3NpZ24oe30sIERFRkFVTFRfU0VUVElOR1MsIGF3YWl0IHRoaXMubG9hZERhdGEoKSk7XHJcbiAgICB9XHJcblxyXG4gICAgcHVibGljIGFzeW5jIHNhdmVTZXR0aW5ncygpIHtcclxuICAgICAgICBhd2FpdCB0aGlzLnNhdmVEYXRhKHRoaXMuc2V0dGluZ3MpO1xyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgYWRkQ29tbWFuZHMoKSB7XHJcbiAgICAgICAgdGhpcy5hZGRDb21tYW5kKHtcclxuICAgICAgICAgICAgaWQ6IFwib3Blbi1sb2NhdGlvbi1saXN0XCIsXHJcbiAgICAgICAgICAgIG5hbWU6IFwiT3BlbiBMb2NhdGlvbiBMaXN0XCIsXHJcbiAgICAgICAgICAgIGVkaXRvckNhbGxiYWNrOiAoZWRpdG9yOiBFZGl0b3IpID0+IHtcclxuICAgICAgICAgICAgICAgIG5ldyBMb2NhdGlvbkxpc3RNb2RhbCh0aGlzLmFwcCwgZWRpdG9yLCB0aGlzKS5vcGVuKCk7XHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIGhvdGtleXM6IFt7IG1vZGlmaWVyczogW1wiTW9kXCJdLCBrZXk6IHRoaXMuc2V0dGluZ3MubG9jYXRpb25Ib3RrZXkuc3BsaXQoJysnKVsxXSB9XSwgLy8gS2zDoXZlc292w6EgemtyYXRrYSBwcm8gbG9rYWNlXHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgICAgIHRoaXMuYWRkQ29tbWFuZCh7XHJcbiAgICAgICAgICAgIGlkOiBcIm9wZW4tY2hhcmFjdGVyLWxpc3RcIixcclxuICAgICAgICAgICAgbmFtZTogXCJPcGVuIENoYXJhY3RlciBMaXN0XCIsXHJcbiAgICAgICAgICAgIGVkaXRvckNhbGxiYWNrOiAoZWRpdG9yOiBFZGl0b3IpID0+IHtcclxuICAgICAgICAgICAgICAgIG5ldyBDaGFyYWN0ZXJMaXN0TW9kYWwodGhpcy5hcHAsIGVkaXRvciwgdGhpcykub3BlbigpO1xyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICBob3RrZXlzOiBbeyBtb2RpZmllcnM6IFtcIk1vZFwiXSwga2V5OiB0aGlzLnNldHRpbmdzLmNoYXJhY3RlckhvdGtleS5zcGxpdCgnKycpWzFdIH1dLCAvLyBLbMOhdmVzb3bDoSB6a3JhdGthIHBybyBwb3N0YXZ5XHJcbiAgICAgICAgfSk7XHJcbiAgICB9XHJcblxyXG4gICAgcHVibGljIGFzeW5jIGdldExvY2F0aW9uRmlsZXMoZm9sZGVyUGF0aDogc3RyaW5nKTogUHJvbWlzZTxURmlsZVtdPiB7XHJcbiAgICAgICAgY29uc3QgbG9jYXRpb25Gb2xkZXIgPSB0aGlzLnNldHRpbmdzLmRlZmF1bHRMb2NhdGlvbkZvbGRlcjtcclxuICAgICAgICBjb25zb2xlLmxvZyhgVXNpbmcgZGVmYXVsdCBsb2NhdGlvbiBmb2xkZXI6ICR7bG9jYXRpb25Gb2xkZXJ9YCk7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMuYXBwLnZhdWx0LmdldEZpbGVzKCkuZmlsdGVyKChmaWxlOiBURmlsZSkgPT4gZmlsZS5wYXRoLnN0YXJ0c1dpdGgoZm9sZGVyUGF0aCkpO1xyXG4gICAgfVxyXG5cclxuICAgIHB1YmxpYyBhc3luYyBnZXRDaGFyYWN0ZXJGaWxlcyhmb2xkZXJQYXRoOiBzdHJpbmcpOiBQcm9taXNlPFRGaWxlW10+IHtcclxuICAgICAgICBjb25zdCBjaGFyYWN0ZXJGb2xkZXIgPSB0aGlzLnNldHRpbmdzLmRlZmF1bHRDaGFyYWN0ZXJGb2xkZXI7XHJcbiAgICAgICAgY29uc29sZS5sb2coYFVzaW5nIGRlZmF1bHQgY2hhcmFjdGVyIGZvbGRlcjogJHtjaGFyYWN0ZXJGb2xkZXJ9YCk7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMuYXBwLnZhdWx0LmdldEZpbGVzKCkuZmlsdGVyKChmaWxlOiBURmlsZSkgPT4gZmlsZS5wYXRoLnN0YXJ0c1dpdGgoZm9sZGVyUGF0aCkpO1xyXG4gICAgfVxyXG5cclxuICAgIHB1YmxpYyBhc3luYyBjcmVhdGVOZXdMb2NhdGlvbihsb2NhdGlvbjogc3RyaW5nLCB0eXBlOiBzdHJpbmcsIGZvbGRlclBhdGg6IHN0cmluZyk6IFByb21pc2U8VEZpbGU+IHtcclxuICAgICAgICBpZiAodGhpcy5zZXR0aW5ncy5hdXRvQ3JlYXRlRm9sZGVycykge1xyXG4gICAgICAgICAgICBjb25zdCBsb2NhdGlvbkZvbGRlclBhdGggPSBwYXRoLmpvaW4oZm9sZGVyUGF0aCwgdGhpcy5zZXR0aW5ncy5kZWZhdWx0TG9jYXRpb25Gb2xkZXIpO1xyXG4gICAgICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICAgICAgY29uc3QgZm9sZGVyRXhpc3RzID0gYXdhaXQgdGhpcy5hcHAudmF1bHQuYWRhcHRlci5leGlzdHMobG9jYXRpb25Gb2xkZXJQYXRoKTtcclxuICAgICAgICAgICAgICAgIGlmICghZm9sZGVyRXhpc3RzKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgYXdhaXQgdGhpcy5hcHAudmF1bHQuY3JlYXRlRm9sZGVyKGxvY2F0aW9uRm9sZGVyUGF0aCk7XHJcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coYEZvbGRlciBjcmVhdGVkIGF0OiAke2xvY2F0aW9uRm9sZGVyUGF0aH1gKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoXCJFcnJvciBjcmVhdGluZyBmb2xkZXI6XCIsIGVycm9yKTtcclxuICAgICAgICAgICAgICAgIHRocm93IGVycm9yO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBjb25zdCBsb2NhdGlvbkZpbGVOYW1lID0gYCR7dHlwZX0tJHtsb2NhdGlvbn0tJHtwYXRoLmJhc2VuYW1lKGZvbGRlclBhdGgpfWA7XHJcbiAgICAgICAgY29uc3QgbG9jYXRpb25GaWxlUGF0aCA9IHBhdGguam9pbihmb2xkZXJQYXRoLCB0aGlzLnNldHRpbmdzLmRlZmF1bHRMb2NhdGlvbkZvbGRlciwgYCR7bG9jYXRpb25GaWxlTmFtZX0ubWRgKTtcclxuXHJcbiAgICAgICAgY29uc3QgZmlsZSA9IGF3YWl0IHRoaXMuYXBwLnZhdWx0LmNyZWF0ZShsb2NhdGlvbkZpbGVQYXRoLCAnIyAnICsgbG9jYXRpb25GaWxlTmFtZSk7XHJcbiAgICAgICAgcmV0dXJuIGZpbGU7XHJcbiAgICB9XHJcblxyXG4gICAgcHVibGljIGFzeW5jIGNyZWF0ZU5ld0NoYXJhY3RlcihjaGFyYWN0ZXI6IHN0cmluZywgZm9sZGVyUGF0aDogc3RyaW5nKTogUHJvbWlzZTxURmlsZT4ge1xyXG4gICAgICAgIGlmICh0aGlzLnNldHRpbmdzLmF1dG9DcmVhdGVGb2xkZXJzKSB7XHJcbiAgICAgICAgICAgIGNvbnN0IGNoYXJhY3RlckZvbGRlclBhdGggPSBwYXRoLmpvaW4oZm9sZGVyUGF0aCwgdGhpcy5zZXR0aW5ncy5kZWZhdWx0Q2hhcmFjdGVyRm9sZGVyKTtcclxuICAgICAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgICAgIGNvbnN0IGZvbGRlckV4aXN0cyA9IGF3YWl0IHRoaXMuYXBwLnZhdWx0LmFkYXB0ZXIuZXhpc3RzKGNoYXJhY3RlckZvbGRlclBhdGgpO1xyXG4gICAgICAgICAgICAgICAgaWYgKCFmb2xkZXJFeGlzdHMpIHtcclxuICAgICAgICAgICAgICAgICAgICBhd2FpdCB0aGlzLmFwcC52YXVsdC5jcmVhdGVGb2xkZXIoY2hhcmFjdGVyRm9sZGVyUGF0aCk7XHJcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coYEZvbGRlciBjcmVhdGVkIGF0OiAke2NoYXJhY3RlckZvbGRlclBhdGh9YCk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XHJcbiAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKFwiRXJyb3IgY3JlYXRpbmcgZm9sZGVyOlwiLCBlcnJvcik7XHJcbiAgICAgICAgICAgICAgICB0aHJvdyBlcnJvcjtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgY29uc3QgY2hhcmFjdGVyRmlsZVBhdGggPSBwYXRoLmpvaW4oZm9sZGVyUGF0aCwgdGhpcy5zZXR0aW5ncy5kZWZhdWx0Q2hhcmFjdGVyRm9sZGVyLCBgJHtjaGFyYWN0ZXJ9Lm1kYCk7XHJcblxyXG4gICAgICAgIGNvbnN0IGZpbGUgPSBhd2FpdCB0aGlzLmFwcC52YXVsdC5jcmVhdGUoY2hhcmFjdGVyRmlsZVBhdGgsICcjICcgKyBjaGFyYWN0ZXIpO1xyXG4gICAgICAgIHJldHVybiBmaWxlO1xyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgbG9hZEN1c3RvbVN0eWxlcygpIHtcclxuICAgICAgICBjb25zdCBzdHlsZVBhdGggPSBwYXRoLmpvaW4odGhpcy5hcHAudmF1bHQuY29uZmlnRGlyLCAncGx1Z2lucycsICdDZWx0eExpa2VQbHVnaW4nLCAnc3R5bGVzLmNzcycpO1xyXG4gICAgICAgIFxyXG4gICAgICAgIC8vIFZ5dHZvxZllbsOtIHRhZ3UgcHJvIHN0eWxlXHJcbiAgICAgICAgY29uc3Qgc3R5bGVMaW5rID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnbGluaycpO1xyXG4gICAgICAgIHN0eWxlTGluay5yZWwgPSAnc3R5bGVzaGVldCc7XHJcbiAgICAgICAgc3R5bGVMaW5rLnR5cGUgPSAndGV4dC9jc3MnO1xyXG4gICAgICAgIHN0eWxlTGluay5ocmVmID0gc3R5bGVQYXRoO1xyXG5cclxuICAgICAgICBkb2N1bWVudC5oZWFkLmFwcGVuZENoaWxkKHN0eWxlTGluayk7XHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSByZW1vdmVDdXN0b21TdHlsZXMoKSB7XHJcbiAgICAgICAgY29uc3QgbGlua3MgPSBkb2N1bWVudC5oZWFkLmdldEVsZW1lbnRzQnlUYWdOYW1lKCdsaW5rJyk7XHJcbiAgICAgICAgZm9yIChsZXQgbGluayBvZiBsaW5rcykge1xyXG4gICAgICAgICAgICBpZiAobGluay5ocmVmLmluY2x1ZGVzKCdzdHlsZXMuY3NzJykpIHtcclxuICAgICAgICAgICAgICAgIGRvY3VtZW50LmhlYWQucmVtb3ZlQ2hpbGQobGluayk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICB9XHJcbn1cclxuXHJcbmNsYXNzIENlbHR4TGlrZVBsdWdpblNldHRpbmdzVGFiIGV4dGVuZHMgUGx1Z2luU2V0dGluZ1RhYiB7XHJcbiAgICBwbHVnaW46IENlbHR4TGlrZVBsdWdpbjtcclxuXHJcbiAgICBjb25zdHJ1Y3RvcihhcHA6IE9ic2lkaWFuQXBwLCBwbHVnaW46IENlbHR4TGlrZVBsdWdpbikge1xyXG4gICAgICAgIHN1cGVyKGFwcCwgcGx1Z2luKTtcclxuICAgICAgICB0aGlzLnBsdWdpbiA9IHBsdWdpbjtcclxuICAgIH1cclxuXHJcbiAgICBkaXNwbGF5KCk6IHZvaWQge1xyXG4gICAgICAgIGNvbnN0IHsgY29udGFpbmVyRWwgfSA9IHRoaXM7XHJcblxyXG4gICAgICAgIGNvbnRhaW5lckVsLmVtcHR5KCk7XHJcbiAgICAgICAgY29udGFpbmVyRWwuY3JlYXRlRWwoJ2gyJywgeyB0ZXh0OiAnQ2VsdHhMaWtlIFBsdWdpbiBTZXR0aW5ncycgfSk7XHJcblxyXG4gICAgICAgIG5ldyBTZXR0aW5nKGNvbnRhaW5lckVsKVxyXG4gICAgICAgICAgICAuc2V0TmFtZSgnRGVmYXVsdCBMb2NhdGlvbiBGb2xkZXInKVxyXG4gICAgICAgICAgICAuc2V0RGVzYygnRm9sZGVyIG5hbWUgZm9yIHN0b3JpbmcgbG9jYXRpb25zJylcclxuICAgICAgICAgICAgLmFkZFRleHQoKHRleHQ6IGFueSkgPT4gdGV4dFxyXG4gICAgICAgICAgICAgICAgLnNldFBsYWNlaG9sZGVyKCdFbnRlciBmb2xkZXIgbmFtZScpXHJcbiAgICAgICAgICAgICAgICAuc2V0VmFsdWUodGhpcy5wbHVnaW4uc2V0dGluZ3MuZGVmYXVsdExvY2F0aW9uRm9sZGVyKVxyXG4gICAgICAgICAgICAgICAgLm9uQ2hhbmdlKGFzeW5jICh2YWx1ZTogc3RyaW5nKSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5wbHVnaW4uc2V0dGluZ3MuZGVmYXVsdExvY2F0aW9uRm9sZGVyID0gdmFsdWU7XHJcbiAgICAgICAgICAgICAgICAgICAgYXdhaXQgdGhpcy5wbHVnaW4uc2F2ZVNldHRpbmdzKCk7XHJcbiAgICAgICAgICAgICAgICB9KSk7XHJcblxyXG4gICAgICAgIG5ldyBTZXR0aW5nKGNvbnRhaW5lckVsKVxyXG4gICAgICAgICAgICAuc2V0TmFtZSgnRGVmYXVsdCBDaGFyYWN0ZXIgRm9sZGVyJylcclxuICAgICAgICAgICAgLnNldERlc2MoJ0ZvbGRlciBuYW1lIGZvciBzdG9yaW5nIGNoYXJhY3RlcnMnKVxyXG4gICAgICAgICAgICAuYWRkVGV4dCgodGV4dDogYW55KSA9PiB0ZXh0XHJcbiAgICAgICAgICAgICAgICAuc2V0UGxhY2Vob2xkZXIoJ0VudGVyIGZvbGRlciBuYW1lJylcclxuICAgICAgICAgICAgICAgIC5zZXRWYWx1ZSh0aGlzLnBsdWdpbi5zZXR0aW5ncy5kZWZhdWx0Q2hhcmFjdGVyRm9sZGVyKVxyXG4gICAgICAgICAgICAgICAgLm9uQ2hhbmdlKGFzeW5jICh2YWx1ZTogc3RyaW5nKSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5wbHVnaW4uc2V0dGluZ3MuZGVmYXVsdENoYXJhY3RlckZvbGRlciA9IHZhbHVlO1xyXG4gICAgICAgICAgICAgICAgICAgIGF3YWl0IHRoaXMucGx1Z2luLnNhdmVTZXR0aW5ncygpO1xyXG4gICAgICAgICAgICAgICAgfSkpO1xyXG5cclxuICAgICAgICBuZXcgU2V0dGluZyhjb250YWluZXJFbClcclxuICAgICAgICAgICAgLnNldE5hbWUoJ0F1dG8tY3JlYXRlIEZvbGRlcnMnKVxyXG4gICAgICAgICAgICAuc2V0RGVzYygnQXV0b21hdGljYWxseSBjcmVhdGUgbG9jYXRpb24gYW5kIGNoYXJhY3RlciBmb2xkZXJzIGlmIG5vdCBmb3VuZCcpXHJcbiAgICAgICAgICAgIC5hZGRUb2dnbGUoKHRvZ2dsZTogYW55KSA9PiB0b2dnbGVcclxuICAgICAgICAgICAgICAgIC5zZXRWYWx1ZSh0aGlzLnBsdWdpbi5zZXR0aW5ncy5hdXRvQ3JlYXRlRm9sZGVycylcclxuICAgICAgICAgICAgICAgIC5vbkNoYW5nZShhc3luYyAodmFsdWU6IGJvb2xlYW4pID0+IHtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLnBsdWdpbi5zZXR0aW5ncy5hdXRvQ3JlYXRlRm9sZGVycyA9IHZhbHVlO1xyXG4gICAgICAgICAgICAgICAgICAgIGF3YWl0IHRoaXMucGx1Z2luLnNhdmVTZXR0aW5ncygpO1xyXG4gICAgICAgICAgICAgICAgfSkpO1xyXG5cclxuICAgICAgICBuZXcgU2V0dGluZyhjb250YWluZXJFbClcclxuICAgICAgICAgICAgLnNldE5hbWUoJ0xvY2F0aW9uIEhvdGtleScpXHJcbiAgICAgICAgICAgIC5zZXREZXNjKCdTZXQgdGhlIGhvdGtleSBmb3Igb3BlbmluZyB0aGUgbG9jYXRpb24gbGlzdC4nKVxyXG4gICAgICAgICAgICAuYWRkVGV4dCgodGV4dDogYW55KSA9PiB0ZXh0XHJcbiAgICAgICAgICAgICAgICAuc2V0VmFsdWUodGhpcy5wbHVnaW4uc2V0dGluZ3MubG9jYXRpb25Ib3RrZXkpXHJcbiAgICAgICAgICAgICAgICAub25DaGFuZ2UoYXN5bmMgKHZhbHVlOiBzdHJpbmcpID0+IHtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLnBsdWdpbi5zZXR0aW5ncy5sb2NhdGlvbkhvdGtleSA9IHZhbHVlO1xyXG4gICAgICAgICAgICAgICAgICAgIGF3YWl0IHRoaXMucGx1Z2luLnNhdmVTZXR0aW5ncygpO1xyXG4gICAgICAgICAgICAgICAgfSkpO1xyXG5cclxuICAgICAgICBuZXcgU2V0dGluZyhjb250YWluZXJFbClcclxuICAgICAgICAgICAgLnNldE5hbWUoJ0NoYXJhY3RlciBIb3RrZXknKVxyXG4gICAgICAgICAgICAuc2V0RGVzYygnU2V0IHRoZSBob3RrZXkgZm9yIG9wZW5pbmcgdGhlIGNoYXJhY3RlciBsaXN0LicpXHJcbiAgICAgICAgICAgIC5hZGRUZXh0KCh0ZXh0OiBhbnkpID0+IHRleHRcclxuICAgICAgICAgICAgICAgIC5zZXRWYWx1ZSh0aGlzLnBsdWdpbi5zZXR0aW5ncy5jaGFyYWN0ZXJIb3RrZXkpXHJcbiAgICAgICAgICAgICAgICAub25DaGFuZ2UoYXN5bmMgKHZhbHVlOiBzdHJpbmcpID0+IHtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLnBsdWdpbi5zZXR0aW5ncy5jaGFyYWN0ZXJIb3RrZXkgPSB2YWx1ZTtcclxuICAgICAgICAgICAgICAgICAgICBhd2FpdCB0aGlzLnBsdWdpbi5zYXZlU2V0dGluZ3MoKTtcclxuICAgICAgICAgICAgICAgIH0pKTtcclxuICAgIH1cclxufVxyXG5cclxuY2xhc3MgTG9jYXRpb25MaXN0TW9kYWwgZXh0ZW5kcyBNb2RhbCB7XHJcbiAgICBwcml2YXRlIGVkaXRvcjogRWRpdG9yO1xyXG4gICAgcHJpdmF0ZSBsb2NhdGlvbk5hbWVzOiBzdHJpbmdbXSA9IFtdO1xyXG4gICAgcHJpdmF0ZSBmb2xkZXJQYXRoOiBzdHJpbmcgPSAnJztcclxuICAgIHByaXZhdGUgcGx1Z2luSW5zdGFuY2U6IENlbHR4TGlrZVBsdWdpbjtcclxuXHJcbiAgICBjb25zdHJ1Y3RvcihhcHA6IGFueSwgZWRpdG9yOiBFZGl0b3IsIHBsdWdpbkluc3RhbmNlOiBDZWx0eExpa2VQbHVnaW4pIHtcclxuICAgICAgICBzdXBlcihhcHApO1xyXG4gICAgICAgIHRoaXMuZWRpdG9yID0gZWRpdG9yO1xyXG4gICAgICAgIHRoaXMucGx1Z2luSW5zdGFuY2UgPSBwbHVnaW5JbnN0YW5jZTtcclxuICAgIH1cclxuXHJcbiAgICBvbk9wZW4oKSB7XHJcbiAgICAgICAgY29uc3QgeyBjb250ZW50RWwgfSA9IHRoaXM7XHJcbiAgICAgICAgY29udGVudEVsLmNyZWF0ZUVsKCdoMicsIHsgdGV4dDogJ1NFTEVDVCBPUiBDUkVBVEUgTE9DQVRJT04nIH0pO1xyXG5cclxuICAgICAgICBjb25zdCBuZXdMb2NhdGlvbkJ1dHRvbiA9IGNvbnRlbnRFbC5jcmVhdGVFbCgnYnV0dG9uJywgeyB0ZXh0OiAnKyBBREQgTkVXIExPQ0FUSU9OJyB9KTtcclxuICAgICAgICBuZXdMb2NhdGlvbkJ1dHRvbi5vbmNsaWNrID0gKCkgPT4gdGhpcy5vcGVuTmV3TG9jYXRpb25Nb2RhbCgpO1xyXG5cclxuICAgICAgICBjb25zdCBsb2NhdGlvbkxpc3RDb250YWluZXIgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcclxuICAgICAgICBsb2NhdGlvbkxpc3RDb250YWluZXIuc3R5bGUuZGlzcGxheSA9ICdmbGV4JztcclxuICAgICAgICBsb2NhdGlvbkxpc3RDb250YWluZXIuc3R5bGUuZmxleERpcmVjdGlvbiA9ICdjb2x1bW4nO1xyXG4gICAgICAgIGxvY2F0aW9uTGlzdENvbnRhaW5lci5zdHlsZS5tYXJnaW5Ub3AgPSAnMTBweCc7XHJcbiAgICAgICAgY29udGVudEVsLmFwcGVuZENoaWxkKGxvY2F0aW9uTGlzdENvbnRhaW5lcik7XHJcblxyXG4gICAgICAgIHRoaXMubG9hZExvY2F0aW9ucyhsb2NhdGlvbkxpc3RDb250YWluZXIpO1xyXG4gICAgfVxyXG5cclxuICAgIG9uQ2xvc2UoKSB7XHJcbiAgICAgICAgY29uc3QgeyBjb250ZW50RWwgfSA9IHRoaXM7XHJcbiAgICAgICAgY29udGVudEVsLmVtcHR5KCk7XHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBhc3luYyBsb2FkTG9jYXRpb25zKGxvY2F0aW9uTGlzdENvbnRhaW5lcjogSFRNTEVsZW1lbnQpIHtcclxuICAgICAgICBjb25zdCBhY3RpdmVGaWxlID0gdGhpcy5hcHAud29ya3NwYWNlLmdldEFjdGl2ZUZpbGUoKTtcclxuICAgICAgICBpZiAoIWFjdGl2ZUZpbGUpIHtcclxuICAgICAgICAgICAgbmV3IE5vdGljZShcIk5PIEZJTEUgRk9VTkQgRk9SIFRIRSBDVVJSRU5UIEVESVRPUi5cIik7XHJcbiAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGNvbnN0IGZpbGVQYXRoID0gYWN0aXZlRmlsZS5wYXRoO1xyXG4gICAgICAgIHRoaXMuZm9sZGVyUGF0aCA9IHBhdGguZGlybmFtZShmaWxlUGF0aCk7XHJcblxyXG4gICAgICAgIGxldCBsb2NhdGlvbkZpbGVzID0gYXdhaXQgdGhpcy5wbHVnaW5JbnN0YW5jZS5nZXRMb2NhdGlvbkZpbGVzKHRoaXMuZm9sZGVyUGF0aCk7XHJcblxyXG4gICAgICAgIC8vIEZpbHRyb3bDoW7DrSBvdGV2xZllbsOpaG8gc291Ym9ydVxyXG4gICAgICAgIGxvY2F0aW9uRmlsZXMgPSBsb2NhdGlvbkZpbGVzLmZpbHRlcigoZmlsZTogVEZpbGUpID0+IGZpbGUucGF0aCAhPT0gZmlsZVBhdGgpO1xyXG5cclxuICAgICAgICBpZiAobG9jYXRpb25GaWxlcy5sZW5ndGggPiAwKSB7XHJcbiAgICAgICAgICAgIHRoaXMubG9jYXRpb25OYW1lcyA9IGxvY2F0aW9uRmlsZXMubWFwKChmaWxlOiBURmlsZSkgPT4gcGF0aC5iYXNlbmFtZShmaWxlLnBhdGgsICcubWQnKSk7XHJcblxyXG4gICAgICAgICAgICB0aGlzLmxvY2F0aW9uTmFtZXMuZm9yRWFjaChsb2NhdGlvbiA9PiB7XHJcbiAgICAgICAgICAgICAgICBjb25zdCBsb2NhdGlvbkl0ZW0gPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdidXR0b24nKTtcclxuICAgICAgICAgICAgICAgIGxvY2F0aW9uSXRlbS50ZXh0Q29udGVudCA9IGxvY2F0aW9uO1xyXG4gICAgICAgICAgICAgICAgbG9jYXRpb25JdGVtLm9uY2xpY2sgPSBhc3luYyAoKSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgYXdhaXQgdGhpcy5pbnNlcnRMb2NhdGlvblRleHQobG9jYXRpb24pO1xyXG4gICAgICAgICAgICAgICAgfTtcclxuICAgICAgICAgICAgICAgIGxvY2F0aW9uTGlzdENvbnRhaW5lci5hcHBlbmRDaGlsZChsb2NhdGlvbkl0ZW0pO1xyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICBjb25zdCBub0l0ZW1zTWVzc2FnZSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3AnKTtcclxuICAgICAgICAgICAgbm9JdGVtc01lc3NhZ2UudGV4dENvbnRlbnQgPSAnTk8gTE9DQVRJT05TIEFWQUlMQUJMRS4gQ1JFQVRFIE9ORSEnO1xyXG4gICAgICAgICAgICBsb2NhdGlvbkxpc3RDb250YWluZXIuYXBwZW5kQ2hpbGQobm9JdGVtc01lc3NhZ2UpO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGFzeW5jIGluc2VydExvY2F0aW9uVGV4dChsb2NhdGlvbjogc3RyaW5nKSB7XHJcbiAgICAgICAgY29uc3QgZm9ybWF0dGVkTG9jYXRpb25UZXh0ID0gYFtbJHtsb2NhdGlvbn1dXWA7XHJcbiAgICAgICAgY29uc3QgdGV4dCA9IGAke2Zvcm1hdHRlZExvY2F0aW9uVGV4dH1cXG5gO1xyXG4gICAgICAgIHRoaXMuZWRpdG9yLnJlcGxhY2VSYW5nZSh0ZXh0LCB0aGlzLmVkaXRvci5nZXRDdXJzb3IoKSk7XHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBhc3luYyBvcGVuTmV3TG9jYXRpb25Nb2RhbCgpIHtcclxuICAgICAgICBjb25zdCBuZXdMb2NhdGlvbk1vZGFsID0gbmV3IE5ld0xvY2F0aW9uTW9kYWwodGhpcy5hcHAsIHRoaXMucGx1Z2luSW5zdGFuY2UsIHRoaXMuZm9sZGVyUGF0aCk7XHJcbiAgICAgICAgbmV3TG9jYXRpb25Nb2RhbC5vcGVuKCk7XHJcbiAgICB9XHJcbn1cclxuXHJcbmNsYXNzIENoYXJhY3Rlckxpc3RNb2RhbCBleHRlbmRzIE1vZGFsIHtcclxuICAgIHByaXZhdGUgZWRpdG9yOiBFZGl0b3I7XHJcbiAgICBwcml2YXRlIGNoYXJhY3Rlck5hbWVzOiBzdHJpbmdbXSA9IFtdO1xyXG4gICAgcHJpdmF0ZSBmb2xkZXJQYXRoOiBzdHJpbmcgPSAnJztcclxuICAgIHByaXZhdGUgcGx1Z2luSW5zdGFuY2U6IENlbHR4TGlrZVBsdWdpbjtcclxuXHJcbiAgICBjb25zdHJ1Y3RvcihhcHA6IGFueSwgZWRpdG9yOiBFZGl0b3IsIHBsdWdpbkluc3RhbmNlOiBDZWx0eExpa2VQbHVnaW4pIHtcclxuICAgICAgICBzdXBlcihhcHApO1xyXG4gICAgICAgIHRoaXMuZWRpdG9yID0gZWRpdG9yO1xyXG4gICAgICAgIHRoaXMucGx1Z2luSW5zdGFuY2UgPSBwbHVnaW5JbnN0YW5jZTtcclxuICAgIH1cclxuXHJcbiAgICBvbk9wZW4oKSB7XHJcbiAgICAgICAgY29uc3QgeyBjb250ZW50RWwgfSA9IHRoaXM7XHJcbiAgICAgICAgY29udGVudEVsLmNyZWF0ZUVsKCdoMicsIHsgdGV4dDogJ1NFTEVDVCBPUiBDUkVBVEUgQ0hBUkFDVEVSJyB9KTtcclxuXHJcbiAgICAgICAgY29uc3QgbmV3Q2hhcmFjdGVyQnV0dG9uID0gY29udGVudEVsLmNyZWF0ZUVsKCdidXR0b24nLCB7IHRleHQ6ICcrIEFERCBORVcgQ0hBUkFDVEVSJyB9KTtcclxuICAgICAgICBuZXdDaGFyYWN0ZXJCdXR0b24ub25jbGljayA9ICgpID0+IHRoaXMub3Blbk5ld0NoYXJhY3Rlck1vZGFsKCk7XHJcblxyXG4gICAgICAgIGNvbnN0IGNoYXJhY3Rlckxpc3RDb250YWluZXIgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcclxuICAgICAgICBjaGFyYWN0ZXJMaXN0Q29udGFpbmVyLnN0eWxlLmRpc3BsYXkgPSAnZmxleCc7XHJcbiAgICAgICAgY2hhcmFjdGVyTGlzdENvbnRhaW5lci5zdHlsZS5mbGV4RGlyZWN0aW9uID0gJ2NvbHVtbic7XHJcbiAgICAgICAgY2hhcmFjdGVyTGlzdENvbnRhaW5lci5zdHlsZS5tYXJnaW5Ub3AgPSAnMTBweCc7XHJcbiAgICAgICAgY29udGVudEVsLmFwcGVuZENoaWxkKGNoYXJhY3Rlckxpc3RDb250YWluZXIpO1xyXG5cclxuICAgICAgICB0aGlzLmxvYWRDaGFyYWN0ZXJzKGNoYXJhY3Rlckxpc3RDb250YWluZXIpO1xyXG4gICAgfVxyXG5cclxuICAgIG9uQ2xvc2UoKSB7XHJcbiAgICAgICAgY29uc3QgeyBjb250ZW50RWwgfSA9IHRoaXM7XHJcbiAgICAgICAgY29udGVudEVsLmVtcHR5KCk7XHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBhc3luYyBsb2FkQ2hhcmFjdGVycyhjaGFyYWN0ZXJMaXN0Q29udGFpbmVyOiBIVE1MRWxlbWVudCkge1xyXG4gICAgICAgIGNvbnN0IGFjdGl2ZUZpbGUgPSB0aGlzLmFwcC53b3Jrc3BhY2UuZ2V0QWN0aXZlRmlsZSgpO1xyXG4gICAgICAgIGlmICghYWN0aXZlRmlsZSkge1xyXG4gICAgICAgICAgICBuZXcgTm90aWNlKFwiTk8gRklMRSBGT1VORCBGT1IgVEhFIENVUlJFTlQgRURJVE9SLlwiKTtcclxuICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgY29uc3QgZmlsZVBhdGggPSBhY3RpdmVGaWxlLnBhdGg7XHJcbiAgICAgICAgdGhpcy5mb2xkZXJQYXRoID0gcGF0aC5kaXJuYW1lKGZpbGVQYXRoKTtcclxuXHJcbiAgICAgICAgbGV0IGNoYXJhY3RlckZpbGVzID0gYXdhaXQgdGhpcy5wbHVnaW5JbnN0YW5jZS5nZXRDaGFyYWN0ZXJGaWxlcyh0aGlzLmZvbGRlclBhdGgpO1xyXG5cclxuICAgICAgICAvLyBGaWx0cm92w6Fuw60gb3RldsWZZW7DqWhvIHNvdWJvcnVcclxuICAgICAgICBjaGFyYWN0ZXJGaWxlcyA9IGNoYXJhY3RlckZpbGVzLmZpbHRlcigoZmlsZTogVEZpbGUpID0+IGZpbGUucGF0aCAhPT0gZmlsZVBhdGgpO1xyXG5cclxuICAgICAgICBpZiAoY2hhcmFjdGVyRmlsZXMubGVuZ3RoID4gMCkge1xyXG4gICAgICAgICAgICB0aGlzLmNoYXJhY3Rlck5hbWVzID0gY2hhcmFjdGVyRmlsZXMubWFwKChmaWxlOiBURmlsZSkgPT4gcGF0aC5iYXNlbmFtZShmaWxlLnBhdGgsICcubWQnKSk7XHJcblxyXG4gICAgICAgICAgICB0aGlzLmNoYXJhY3Rlck5hbWVzLmZvckVhY2goY2hhcmFjdGVyID0+IHtcclxuICAgICAgICAgICAgICAgIGNvbnN0IGNoYXJhY3Rlckl0ZW0gPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdidXR0b24nKTtcclxuICAgICAgICAgICAgICAgIGNoYXJhY3Rlckl0ZW0udGV4dENvbnRlbnQgPSBjaGFyYWN0ZXI7XHJcbiAgICAgICAgICAgICAgICBjaGFyYWN0ZXJJdGVtLm9uY2xpY2sgPSBhc3luYyAoKSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgYXdhaXQgdGhpcy5pbnNlcnRDaGFyYWN0ZXJUZXh0KGNoYXJhY3Rlcik7XHJcbiAgICAgICAgICAgICAgICB9O1xyXG4gICAgICAgICAgICAgICAgY2hhcmFjdGVyTGlzdENvbnRhaW5lci5hcHBlbmRDaGlsZChjaGFyYWN0ZXJJdGVtKTtcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgY29uc3Qgbm9JdGVtc01lc3NhZ2UgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdwJyk7XHJcbiAgICAgICAgICAgIG5vSXRlbXNNZXNzYWdlLnRleHRDb250ZW50ID0gJ05PIENIQVJBQ1RFUlMgQVZBSUxBQkxFLiBDUkVBVEUgT05FISc7XHJcbiAgICAgICAgICAgIGNoYXJhY3Rlckxpc3RDb250YWluZXIuYXBwZW5kQ2hpbGQobm9JdGVtc01lc3NhZ2UpO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGFzeW5jIGluc2VydENoYXJhY3RlclRleHQoY2hhcmFjdGVyOiBzdHJpbmcpIHtcclxuICAgICAgICBjb25zdCBmb3JtYXR0ZWRDaGFyYWN0ZXJUZXh0ID0gYFtbJHtjaGFyYWN0ZXJ9XV1gO1xyXG4gICAgICAgIGNvbnN0IHRleHQgPSBgJHtmb3JtYXR0ZWRDaGFyYWN0ZXJUZXh0fVxcbmA7XHJcbiAgICAgICAgdGhpcy5lZGl0b3IucmVwbGFjZVJhbmdlKHRleHQsIHRoaXMuZWRpdG9yLmdldEN1cnNvcigpKTtcclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGFzeW5jIG9wZW5OZXdDaGFyYWN0ZXJNb2RhbCgpIHtcclxuICAgICAgICBjb25zdCBuZXdDaGFyYWN0ZXJNb2RhbCA9IG5ldyBOZXdDaGFyYWN0ZXJNb2RhbCh0aGlzLmFwcCwgdGhpcy5wbHVnaW5JbnN0YW5jZSwgdGhpcy5mb2xkZXJQYXRoKTtcclxuICAgICAgICBuZXdDaGFyYWN0ZXJNb2RhbC5vcGVuKCk7XHJcbiAgICB9XHJcbn1cclxuXHJcbmNsYXNzIE5ld0xvY2F0aW9uTW9kYWwgZXh0ZW5kcyBNb2RhbCB7XHJcbiAgICBwcml2YXRlIHBsdWdpbkluc3RhbmNlOiBDZWx0eExpa2VQbHVnaW47XHJcbiAgICBwcml2YXRlIGZvbGRlclBhdGg6IHN0cmluZztcclxuICAgIHByaXZhdGUgbG9jYXRpb25JbnB1dCE6IEhUTUxJbnB1dEVsZW1lbnQ7IC8vIFBvdcW+aXTDrSBvcGVyw6F0b3J1IGAhYFxyXG5cclxuICAgIGNvbnN0cnVjdG9yKGFwcDogYW55LCBwbHVnaW5JbnN0YW5jZTogQ2VsdHhMaWtlUGx1Z2luLCBmb2xkZXJQYXRoOiBzdHJpbmcpIHtcclxuICAgICAgICBzdXBlcihhcHApO1xyXG4gICAgICAgIHRoaXMucGx1Z2luSW5zdGFuY2UgPSBwbHVnaW5JbnN0YW5jZTtcclxuICAgICAgICB0aGlzLmZvbGRlclBhdGggPSBmb2xkZXJQYXRoO1xyXG4gICAgfVxyXG5cclxuICAgIG9uT3BlbigpIHtcclxuICAgICAgICBjb25zdCB7IGNvbnRlbnRFbCB9ID0gdGhpcztcclxuXHJcbiAgICAgICAgY29udGVudEVsLmNyZWF0ZUVsKCdoMicsIHsgdGV4dDogJ0NSRUFURSBORVcgTE9DQVRJT04nIH0pO1xyXG4gICAgICAgIHRoaXMubG9jYXRpb25JbnB1dCA9IGNvbnRlbnRFbC5jcmVhdGVFbCgnaW5wdXQnLCB7IHR5cGU6ICd0ZXh0JyB9KSBhcyBIVE1MSW5wdXRFbGVtZW50OyAvLyBJbmljaWFsaXphY2VcclxuICAgICAgICB0aGlzLmxvY2F0aW9uSW5wdXQucGxhY2Vob2xkZXIgPSAnRW50ZXIgbG9jYXRpb24gbmFtZS4uLic7XHJcbiAgICAgICAgY29udGVudEVsLmFwcGVuZENoaWxkKHRoaXMubG9jYXRpb25JbnB1dCk7IC8vIFDFmWlkw6Fuw60gZG8gRE9NXHJcblxyXG4gICAgICAgIGNvbnN0IGNyZWF0ZUJ1dHRvbiA9IGNvbnRlbnRFbC5jcmVhdGVFbCgnYnV0dG9uJywgeyB0ZXh0OiAnQ3JlYXRlIExvY2F0aW9uJyB9KTtcclxuICAgICAgICBjcmVhdGVCdXR0b24ub25jbGljayA9IGFzeW5jICgpID0+IHtcclxuICAgICAgICAgICAgY29uc3QgbG9jYXRpb25OYW1lID0gdGhpcy5sb2NhdGlvbklucHV0LnZhbHVlLnRyaW0oKTtcclxuICAgICAgICAgICAgaWYgKGxvY2F0aW9uTmFtZSkge1xyXG4gICAgICAgICAgICAgICAgYXdhaXQgdGhpcy5wbHVnaW5JbnN0YW5jZS5jcmVhdGVOZXdMb2NhdGlvbihsb2NhdGlvbk5hbWUsICdMb2NhdGlvbicsIHRoaXMuZm9sZGVyUGF0aCk7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmNsb3NlKCk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9O1xyXG4gICAgfVxyXG5cclxuICAgIG9uQ2xvc2UoKSB7XHJcbiAgICAgICAgY29uc3QgeyBjb250ZW50RWwgfSA9IHRoaXM7XHJcbiAgICAgICAgY29udGVudEVsLmVtcHR5KCk7XHJcbiAgICB9XHJcbn1cclxuXHJcbmNsYXNzIE5ld0NoYXJhY3Rlck1vZGFsIGV4dGVuZHMgTW9kYWwge1xyXG4gICAgcHJpdmF0ZSBwbHVnaW5JbnN0YW5jZTogQ2VsdHhMaWtlUGx1Z2luO1xyXG4gICAgcHJpdmF0ZSBmb2xkZXJQYXRoOiBzdHJpbmc7XHJcbiAgICBwcml2YXRlIGNoYXJhY3RlcklucHV0ITogSFRNTElucHV0RWxlbWVudDtcclxuXHJcbiAgICBjb25zdHJ1Y3RvcihhcHA6IGFueSwgcGx1Z2luSW5zdGFuY2U6IENlbHR4TGlrZVBsdWdpbiwgZm9sZGVyUGF0aDogc3RyaW5nKSB7XHJcbiAgICAgICAgc3VwZXIoYXBwKTtcclxuICAgICAgICB0aGlzLnBsdWdpbkluc3RhbmNlID0gcGx1Z2luSW5zdGFuY2U7XHJcbiAgICAgICAgdGhpcy5mb2xkZXJQYXRoID0gZm9sZGVyUGF0aDtcclxuICAgIH1cclxuXHJcbiAgICBvbk9wZW4oKSB7XHJcbiAgICAgICAgY29uc3QgeyBjb250ZW50RWwgfSA9IHRoaXM7XHJcblxyXG4gICAgICAgIGNvbnRlbnRFbC5jcmVhdGVFbCgnaDInLCB7IHRleHQ6ICdDUkVBVEUgTkVXIENIQVJBQ1RFUicgfSk7XHJcbiAgICAgICAgdGhpcy5jaGFyYWN0ZXJJbnB1dCA9IGNvbnRlbnRFbC5jcmVhdGVFbCgnaW5wdXQnLCB7IHR5cGU6ICd0ZXh0JyB9KTtcclxuICAgICAgICB0aGlzLmNoYXJhY3RlcklucHV0LnBsYWNlaG9sZGVyID0gJ0VudGVyIGNoYXJhY3RlciBuYW1lLi4uJztcclxuXHJcbiAgICAgICAgY29uc3QgY3JlYXRlQnV0dG9uID0gY29udGVudEVsLmNyZWF0ZUVsKCdidXR0b24nLCB7IHRleHQ6ICdDcmVhdGUgQ2hhcmFjdGVyJyB9KTtcclxuICAgICAgICBjcmVhdGVCdXR0b24ub25jbGljayA9IGFzeW5jICgpID0+IHtcclxuICAgICAgICAgICAgY29uc3QgY2hhcmFjdGVyTmFtZSA9IHRoaXMuY2hhcmFjdGVySW5wdXQudmFsdWUudHJpbSgpO1xyXG4gICAgICAgICAgICBpZiAoY2hhcmFjdGVyTmFtZSkge1xyXG4gICAgICAgICAgICAgICAgYXdhaXQgdGhpcy5wbHVnaW5JbnN0YW5jZS5jcmVhdGVOZXdDaGFyYWN0ZXIoY2hhcmFjdGVyTmFtZSwgdGhpcy5mb2xkZXJQYXRoKTtcclxuICAgICAgICAgICAgICAgIHRoaXMuY2xvc2UoKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH07XHJcbiAgICB9XHJcblxyXG4gICAgb25DbG9zZSgpIHtcclxuICAgICAgICBjb25zdCB7IGNvbnRlbnRFbCB9ID0gdGhpcztcclxuICAgICAgICBjb250ZW50RWwuZW1wdHkoKTtcclxuICAgIH1cclxufVxyXG4iXX0=