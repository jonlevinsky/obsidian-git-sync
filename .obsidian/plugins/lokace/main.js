"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const obsidian_1 = require("obsidian");
const path_1 = __importDefault(require("path"));
const DEFAULT_SETTINGS = {
    defaultLocationFolder: 'Lokace',
    defaultPhotoFolder: 'Fotografie',
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
        const locationFolder = this.settings.defaultLocationFolder;
        console.log(`Using default location folder: ${locationFolder}`);
        // Cesta k složce 'fotografie', která má být vyloučena
        const photoPath = path_1.default.join(folderPath, 'Fotografie');
        // Filtrace souborů, které začínají na folderPath, ale ne na photoPath
        return this.app.vault.getFiles().filter((file) => file.path.startsWith(folderPath) && !file.path.startsWith(photoPath));
    }
    async createNewLocation(location, type, folderPath) {
        if (this.settings.autoCreateLocationFolder) {
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
        let locationFiles = await this.pluginInstance.getLocationFiles(this.folderPath);
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
        contentEl.createEl('h2', { text: 'Create New Location' });
        // Přidání stylování pro lepší vzhled
        contentEl.addClass('location-modal');
        const formEl = contentEl.createEl('div', { cls: 'location-form' });
        // Název lokace a typ (INT/EXT)
        const nameAndTypeRow = formEl.createEl('div', { cls: 'name-and-type-row' });
        const locationNameInput = nameAndTypeRow.createEl('input', { attr: { placeholder: 'Enter location name' } });
        const typeSelect = nameAndTypeRow.createEl('select');
        const optionInt = typeSelect.createEl('option', { text: 'INT' });
        const optionExt = typeSelect.createEl('option', { text: 'EXT' });
        const photoButton = nameAndTypeRow.createEl('button', { text: '+' });
        // Fotka a její miniatura
        const photoInput = formEl.createEl('input', { attr: { type: 'file', accept: 'image/*' } });
        const photoThumbnail = formEl.createEl('img', { cls: 'photo-thumbnail' });
        photoButton.onclick = () => photoInput.click();
        photoInput.addEventListener('change', (event) => {
            const file = event.target.files?.[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    photoThumbnail.src = e.target?.result;
                };
                reader.readAsDataURL(file);
            }
        });
        // Popis
        const descriptionInput = formEl.createEl('textarea', { attr: { placeholder: 'Enter location description' } });
        // Adresa
        const addressInput = formEl.createEl('input', { attr: { placeholder: 'Enter street name' } });
        const postalcodeInput = formEl.createEl('input', { attr: { placeholder: 'Enter postal code' } });
        const cityInput = formEl.createEl('input', { attr: { placeholder: 'Enter city' } });
        const countryInput = formEl.createEl('input', { attr: { placeholder: 'Enter country' } });
        // Kontakt
        const contactNameInput = formEl.createEl('input', { attr: { placeholder: 'Enter contact name' } });
        ;
        const contactPhoneInput = formEl.createEl('input', { attr: { placeholder: 'Enter phone number' } });
        const contactEmailInput = formEl.createEl('input', { attr: { placeholder: 'Enter email' } });
        // Bezpečnostní upozornění
        const safetyNotesInput = formEl.createEl('textarea', { attr: { placeholder: 'Enter safety notes' } });
        // Další poznámky
        const additionalNotesInput = formEl.createEl('textarea', { attr: { placeholder: 'Enter additional notes' } });
        // Tlačítko pro vytvoření
        const createButton = formEl.createEl('button', { text: 'Create' });
        createButton.onclick = async () => {
            const type = typeSelect.value;
            const locationName = locationNameInput.value.toUpperCase();
            const description = descriptionInput.value;
            const photoFile = photoInput.files?.[0];
            const address = addressInput.value;
            const postalcode = postalcodeInput.value;
            const city = cityInput.value;
            const country = countryInput.value;
            const contactName = contactNameInput.value;
            const contactPhone = contactPhoneInput.value;
            const contactEmail = contactEmailInput.value;
            await this.createLocationFile(type, locationName, address, postalcode, city, country, description, contactName, contactPhone, contactEmail, photoFile);
        };
    }
    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }
    async createLocationFile(type, locationName, address, postalcode, city, country, description, contactName, contactPhone, contactEmail, photoFile) {
        const locationFileName = `${type}-${locationName}-${path_1.default.basename(this.folderPath)}`;
        const locationFolderPath = path_1.default.join(this.folderPath, this.pluginInstance.settings.defaultLocationFolder); // Použití složky podle nastavení
        const photoFolderPath = path_1.default.join(this.folderPath, this.pluginInstance.settings.defaultPhotoFolder);
        try {
            const folderExists = await this.app.vault.adapter.exists(locationFolderPath);
            if (!folderExists) {
                await this.app.vault.createFolder(locationFolderPath);
            }
        }
        catch (error) {
            console.error("Error creating folder:", error);
        }
        try {
            const photofolderExists = await this.app.vault.adapter.exists(photoFolderPath);
            if (!photofolderExists) {
                await this.app.vault.createFolder(photoFolderPath);
            }
        }
        catch (error) {
            console.error("Error creating folder:", error);
        }
        const locationFilePath = path_1.default.join(locationFolderPath, `${locationFileName}.md`);
        // Formátování textu pro zápis do souboru
        let content = `# ${type.toUpperCase()}. ${locationName.toUpperCase()}\n\n` +
            `---\n\n` +
            `## Location information\n` +
            `**Description:**\n\n${description}\n\n`;
        // Uložení fotografie do Vaultu a přidání odkazu
        if (photoFile) {
            const photoFileName = `${type}-${locationName}-${path_1.default.basename(this.folderPath)}-${photoFile.name}`;
            const photoFilePath = path_1.default.join(photoFolderPath, photoFileName);
            try {
                const arrayBuffer = await photoFile.arrayBuffer();
                await this.app.vault.createBinary(photoFilePath, arrayBuffer);
                content += `![[${photoFileName}]]\n\n`; // Přidá foto přímo pod popis
            }
            catch (error) {
                console.error("Error uploading photo:", error);
            }
        }
        content += `## Street name:\n\n${address}\n\n` +
            `## Postal Code:\n\n${postalcode}\n\n` +
            `## City:\n\n${city}\n\n` +
            `## Country:\n\n${country}\n\n` +
            `---\n\n` +
            `## Contact information\n` +
            `**Name:** \n\n${contactName}\n\n` +
            `**Phone:** \n\n${contactPhone}\n\n` +
            `**Email:**\n\n${contactEmail}\n\n`;
        await this.app.vault.create(locationFilePath, content);
        new obsidian_1.Notice(`Location created: ${locationFileName}`);
        this.close();
    }
}
