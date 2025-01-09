"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const obsidian_1 = require("obsidian");
const path_1 = __importDefault(require("path"));
const DEFAULT_SETTINGS = {
    defaultLocationFolder: 'Lokace',
    autoCreateLocationFolder: true,
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
        // Přidání příkazů a nastavení UI
        this.addCommands();
        this.addSettingTab(new CeltxLikePluginSettingsTab(this.app, this));
    }
    onunload() {
        console.log("CeltxLikePlugin unloaded");
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
            hotkeys: [{ modifiers: ["Mod"], key: this.settings.hotkey.split('+')[1] }], // Použití nastavené klávesové zkratky
        });
    }
    async getLocationFiles(folderPath) {
        // Cesta k složce "Lokace" ve složce aktuálního souboru
        const locationFolderPath = path_1.default.join(folderPath, this.settings.defaultLocationFolder);
        // Kontrola, zda složka existuje
        try {
            const folderExists = await this.app.vault.adapter.exists(locationFolderPath);
            if (!folderExists) {
                console.log(`Folder "${this.settings.defaultLocationFolder}" does not exist at: ${locationFolderPath}`);
                return [];
            }
        }
        catch (error) {
            console.error("Error checking folder existence:", error);
            return [];
        }
        // Načítání souborů, které začínají cestou k "Lokace"
        return this.app.vault.getFiles().filter((file) => file.path.startsWith(locationFolderPath));
    }
    async createNewLocation(location, type, folderPath) {
        // Získání cesty k složce "Lokace" ve složce aktuálního souboru
        const locationFolderPath = path_1.default.join(folderPath, this.settings.defaultLocationFolder);
        // Vytvoření složky "Lokace" v podadresáři aktuálního souboru
        try {
            const folderExists = await this.app.vault.adapter.exists(locationFolderPath);
            if (!folderExists) {
                // Vytvoření složky "Lokace" ve složce, kde je aktuálně otevřený soubor
                await this.app.vault.createFolder(locationFolderPath);
                console.log(`Folder created at: ${locationFolderPath}`);
            }
        }
        catch (error) {
            console.error("Error creating folder:", error);
            throw error;
        }
        // Vytvoření souboru pro novou lokaci
        const locationFileName = `${type}-${location}-${path_1.default.basename(folderPath)}`;
        const locationFilePath = path_1.default.join(locationFolderPath, `${locationFileName}.md`);
        const file = await this.app.vault.create(locationFilePath, '# ' + locationFileName);
        new obsidian_1.Notice(`LOCATION CREATED: ${locationFileName}`);
        return file;
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
            .setName('Auto-create Location Folder')
            .setDesc('Automatically create location folder if not found')
            .addToggle((toggle) => toggle
            .setValue(this.plugin.settings.autoCreateLocationFolder)
            .onChange(async (value) => {
            this.plugin.settings.autoCreateLocationFolder = value;
            await this.plugin.saveSettings();
        }));
        new obsidian_1.Setting(containerEl)
            .setName('Hotkey')
            .setDesc('Set the hotkey for opening the location list.')
            .addText((text) => text
            .setValue(this.plugin.settings.hotkey)
            .onChange(async (value) => {
            this.plugin.settings.hotkey = value;
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
        // Získání souborů z "Lokace"
        const locationFolderPath = path_1.default.join(this.folderPath, this.pluginInstance.settings.defaultLocationFolder);
        let locationFiles = [];
        try {
            const folderExists = await this.app.vault.adapter.exists(locationFolderPath);
            if (folderExists) {
                locationFiles = this.app.vault.getFiles().filter((file) => file.path.startsWith(locationFolderPath));
            }
        }
        catch (error) {
            console.error("Error checking folder existence:", error);
        }
        // Filtrování otevřeného souboru, aby se nezobrazoval v seznamu
        locationFiles = locationFiles.filter((file) => file.path !== filePath);
        // Pokud jsou k dispozici lokace, zobrazíme je
        if (locationFiles.length > 0) {
            this.locationNames = locationFiles.map((file) => path_1.default.basename(file.path, '.md'));
            this.locationNames.forEach(location => {
                const locationItem = document.createElement('button');
                locationItem.textContent = location;
                locationItem.onclick = async () => {
                    const dayNightModal = new DayNightModal(this.app, location, (dayNight) => {
                        this.insertLocationText(location, dayNight);
                    });
                    dayNightModal.open();
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
    async openDayNightModal(location) {
        const dayNightModal = new DayNightModal(this.app, location, (dayNight) => {
            this.insertLocationText(location, dayNight);
        });
        dayNightModal.open();
    }
    async insertLocationText(location, dayNight) {
        const [type, locationName, folderPath] = location.split('-');
        const fileName = `${type.toUpperCase()}.${locationName.toUpperCase()}`;
        const formattedLocationText = `# ${type.toUpperCase()}. [[${type.toUpperCase()}-${locationName.toUpperCase()}-${path_1.default.basename(folderPath)}|${locationName.toUpperCase()}]] - ${dayNight.toUpperCase()}\n`;
        const text = `${formattedLocationText}\n`;
        this.editor.replaceRange(text, this.editor.getCursor());
    }
    async openNewLocationModal() {
        const newLocationModal = new NewLocationModal(this.app, this.pluginInstance, this.folderPath);
        newLocationModal.open();
    }
}
class DayNightModal extends obsidian_1.Modal {
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
class NewLocationModal extends obsidian_1.Modal {
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
        const locationFileName = `${type}-${locationName}-${path_1.default.basename(this.folderPath)}`;
        const locationFolderPath = path_1.default.join(this.folderPath, 'Lokace');
        try {
            const folderExists = await this.app.vault.adapter.exists(locationFolderPath);
            if (!folderExists) {
                await this.app.vault.createFolder(locationFolderPath);
            }
        }
        catch (error) {
            console.error("Error creating folder:", error);
        }
        const locationFilePath = path_1.default.join(locationFolderPath, `${locationFileName}.md`);
        await this.app.vault.create(locationFilePath, '# ' + locationFileName);
        new obsidian_1.Notice(`LOCATION CREATED: ${locationFileName}`);
        this.close();
    }
}
