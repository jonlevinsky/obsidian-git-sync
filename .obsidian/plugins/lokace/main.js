var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { Plugin, Modal, Notice, PluginSettingTab, Setting } from 'obsidian';
import path from 'path';
const DEFAULT_SETTINGS = {
    defaultLocationFolder: 'Lokace',
    autoCreateLocationFolder: true,
    hotkey: 'Mod+1', // Výchozí hodnota pro hotkey
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
            // Přidání příkazů a nastavení UI
            this.addCommands();
            this.addSettingTab(new CeltxLikePluginSettingsTab(this.app, this));
        });
    }
    onunload() {
        console.log("CeltxLikePlugin unloaded");
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
            hotkeys: [{ modifiers: ["Mod"], key: this.settings.hotkey.split('+')[1] }], // Použití nastavené klávesové zkratky
        });
    }
    getLocationFiles(folderPath) {
        return __awaiter(this, void 0, void 0, function* () {
            const locationFolder = this.settings.defaultLocationFolder;
            console.log(`Using default location folder: ${locationFolder}`);
            return this.app.vault.getFiles().filter((file) => file.path.startsWith(folderPath));
        });
    }
    createNewLocation(location, type, folderPath) {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.settings.autoCreateLocationFolder) {
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
            .setName('Auto-create Location Folder')
            .setDesc('Automatically create location folder if not found')
            .addToggle((toggle) => toggle
            .setValue(this.plugin.settings.autoCreateLocationFolder)
            .onChange((value) => __awaiter(this, void 0, void 0, function* () {
            this.plugin.settings.autoCreateLocationFolder = value;
            yield this.plugin.saveSettings();
        })));
        new Setting(containerEl)
            .setName('Hotkey')
            .setDesc('Set the hotkey for opening the location list.')
            .addText((text) => text
            .setValue(this.plugin.settings.hotkey)
            .onChange((value) => __awaiter(this, void 0, void 0, function* () {
            this.plugin.settings.hotkey = value;
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
            // Filtrování otevřeného souboru, aby se nezobrazoval v seznamu
            locationFiles = locationFiles.filter((file) => file.path !== filePath);
            // Pokud jsou k dispozici lokace, zobrazíme je
            if (locationFiles.length > 0) {
                this.locationNames = locationFiles.map((file) => path.basename(file.path, '.md'));
                this.locationNames.forEach(location => {
                    const locationItem = document.createElement('button');
                    locationItem.textContent = location;
                    locationItem.onclick = () => __awaiter(this, void 0, void 0, function* () {
                        yield this.openDayNightModal(location);
                    });
                    locationListContainer.appendChild(locationItem);
                });
            }
            else {
                const noLocationsMessage = document.createElement('p');
                noLocationsMessage.textContent = 'NO LOCATIONS AVAILABLE. CREATE ONE!';
                locationListContainer.appendChild(noLocationsMessage);
            }
        });
    }
    openDayNightModal(location) {
        return __awaiter(this, void 0, void 0, function* () {
            const dayNightModal = new DayNightModal(this.app, location, (dayNight) => {
                this.insertLocationText(location, dayNight);
            });
            dayNightModal.open();
        });
    }
    insertLocationText(location, dayNight) {
        return __awaiter(this, void 0, void 0, function* () {
            const [type, locationNameAndDay] = location.split('-');
            const [locationName] = locationNameAndDay.split('-');
            const fileName = `${type.toUpperCase()}-${locationName.toUpperCase()}-${path.basename(this.folderPath)}`;
            const formattedLocationText = `# ${type.toUpperCase()}. [[${fileName}|${locationName.toUpperCase()}]] - ${dayNight.toUpperCase()}`;
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
        this.callback(dayNight); // CALLBACK TO INSERT TEXT INTO THE EDITOR
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
        createButton.onclick = () => __awaiter(this, void 0, void 0, function* () {
            const type = typeSelect.value;
            const locationName = locationNameInput.value.toUpperCase();
            yield this.createLocationFile(type, locationName);
        });
    }
    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }
    createLocationFile(type, locationName) {
        return __awaiter(this, void 0, void 0, function* () {
            const locationFileName = `${type}-${locationName}-${path.basename(this.folderPath)}`;
            const locationFolderPath = path.join(this.folderPath, 'Lokace');
            try {
                const folderExists = yield this.app.vault.adapter.exists(locationFolderPath);
                if (!folderExists) {
                    yield this.app.vault.createFolder(locationFolderPath);
                }
            }
            catch (error) {
                console.error("Error creating folder:", error);
            }
            const locationFilePath = path.join(locationFolderPath, `${locationFileName}.md`);
            yield this.app.vault.create(locationFilePath, '# ' + locationFileName);
            new Notice(`LOCATION CREATED: ${locationFileName}`);
            this.close();
        });
    }
}
