"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
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
            // Cesta k složce 'fotografie', která má být vyloučena
            const photoPath = path_1.default.join(folderPath, 'Fotografie');
            // Filtrace souborů, které začínají na folderPath, ale ne na photoPath
            return this.app.vault.getFiles().filter((file) => file.path.startsWith(folderPath) && !file.path.startsWith(photoPath));
        });
    }
    createNewLocation(location, type, folderPath) {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.settings.autoCreateLocationFolder) {
                const locationFolderPath = path_1.default.join(folderPath, this.settings.defaultLocationFolder);
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
            const locationFileName = `${type}-${location}-${path_1.default.basename(folderPath)}`;
            const locationFilePath = path_1.default.join(folderPath, this.settings.defaultLocationFolder, `${locationFileName}.md`);
            const file = yield this.app.vault.create(locationFilePath, '# ' + locationFileName);
            return file;
        });
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
            .onChange((value) => __awaiter(this, void 0, void 0, function* () {
            this.plugin.settings.defaultLocationFolder = value;
            yield this.plugin.saveSettings();
        })));
        new obsidian_1.Setting(containerEl)
            .setName('Auto-create Location Folder')
            .setDesc('Automatically create location folder if not found')
            .addToggle((toggle) => toggle
            .setValue(this.plugin.settings.autoCreateLocationFolder)
            .onChange((value) => __awaiter(this, void 0, void 0, function* () {
            this.plugin.settings.autoCreateLocationFolder = value;
            yield this.plugin.saveSettings();
        })));
        new obsidian_1.Setting(containerEl)
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
    loadLocations(locationListContainer) {
        return __awaiter(this, void 0, void 0, function* () {
            const activeFile = this.app.workspace.getActiveFile();
            if (!activeFile) {
                new obsidian_1.Notice("NO FILE FOUND FOR THE CURRENT EDITOR.");
                return;
            }
            const filePath = activeFile.path;
            this.folderPath = path_1.default.dirname(filePath);
            let locationFiles = yield this.pluginInstance.getLocationFiles(this.folderPath);
            // Filtrování otevřeného souboru, aby se nezobrazoval v seznamu
            locationFiles = locationFiles.filter((file) => file.path !== filePath);
            // Pokud jsou k dispozici lokace, zobrazíme je
            if (locationFiles.length > 0) {
                this.locationNames = locationFiles.map((file) => path_1.default.basename(file.path, '.md'));
                this.locationNames.forEach(location => {
                    const locationItem = document.createElement('button');
                    locationItem.textContent = location;
                    locationItem.onclick = () => __awaiter(this, void 0, void 0, function* () {
                        const dayNightModal = new DayNightModal(this.app, location, (dayNight) => {
                            this.insertLocationText(location, dayNight);
                        });
                        dayNightModal.open();
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
            const [type, locationName, folderPath] = location.split('-');
            const fileName = `${type.toUpperCase()}.${locationName.toUpperCase()}`;
            const formattedLocationText = `# ${type.toUpperCase()}. [[${type.toUpperCase()}-${locationName.toUpperCase()}-${path_1.default.basename(folderPath)}|${locationName.toUpperCase()}]] - ${dayNight.toUpperCase()}\n`;
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
        contentEl.createEl('h1', { text: 'Create New Location' });
        // Přidání stylování pro lepší vzhled
        contentEl.addClass('location-modal');
        // Lokace - Nadpis a formulář
        contentEl.createEl('h1', { text: 'Location information' });
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
            var _a;
            const file = (_a = event.target.files) === null || _a === void 0 ? void 0 : _a[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    var _a;
                    photoThumbnail.src = (_a = e.target) === null || _a === void 0 ? void 0 : _a.result;
                };
                reader.readAsDataURL(file);
            }
        });
        // Popis
        formEl.createEl('h1', { text: 'Description' });
        const descriptionInput = formEl.createEl('textarea', { attr: { placeholder: 'Enter location description' } });
        // Adresa
        formEl.createEl('h1', { text: 'Address' });
        const addressRow = formEl.createEl('div', { cls: 'address-row' });
        const addressInput = addressRow.createEl('input', { attr: { placeholder: 'Enter street name' } });
        const postalcodeInput = addressRow.createEl('input', { attr: { placeholder: 'Enter postal code' } });
        const cityInput = addressRow.createEl('input', { attr: { placeholder: 'Enter city' } });
        const countryInput = addressRow.createEl('input', { attr: { placeholder: 'Enter country' } });
        // Kontakt
        formEl.createEl('h1', { text: 'Contact' });
        const contactRow = formEl.createEl('div', { cls: 'contact-row' });
        const contactNameInput = contactRow.createEl('input', { attr: { placeholder: 'Enter contact name' } });
        const contactPhoneInput = contactRow.createEl('input', { attr: { placeholder: 'Enter phone number' } });
        const contactEmailInput = contactRow.createEl('input', { attr: { placeholder: 'Enter email' } });
        // Další informace
        formEl.createEl('h1', { text: 'Additional Information' });
        const selectedForInput = formEl.createEl('input', { attr: { placeholder: 'Selected for' } });
        const imagesInput = formEl.createEl('input', { attr: { placeholder: 'Images (optional)' } });
        const availabilityFromInput = formEl.createEl('input', { attr: { type: 'date' } });
        const availabilityToInput = formEl.createEl('input', { attr: { type: 'date' } });
        const rentalPriceInput = formEl.createEl('input', { attr: { placeholder: 'Rental price' } });
        const powerOptionInput = formEl.createEl('input', { attr: { placeholder: 'Power options' } });
        const noiseLevelInput = formEl.createEl('input', { attr: { placeholder: 'Noise level' } });
        const parkingInput = formEl.createEl('input', { attr: { placeholder: 'Parking availability' } });
        // Tlačítko pro vytvoření
        const createButton = formEl.createEl('button', { text: 'Create' });
        createButton.onclick = () => __awaiter(this, void 0, void 0, function* () {
            var _a;
            const type = typeSelect.value;
            const locationName = locationNameInput.value.toUpperCase();
            const description = descriptionInput.value;
            const photoFile = (_a = photoInput.files) === null || _a === void 0 ? void 0 : _a[0];
            const address = addressInput.value.toUpperCase();
            const postalcode = postalcodeInput.value;
            const city = cityInput.value.toUpperCase();
            const country = countryInput.value.toUpperCase();
            const contactName = contactNameInput.value.toUpperCase();
            const contactPhone = contactPhoneInput.value;
            const contactEmail = contactEmailInput.value;
            const selectedFor = selectedForInput.value;
            const images = imagesInput.value;
            const availabilityFrom = availabilityFromInput.value;
            const availabilityTo = availabilityToInput.value;
            const rentalPrice = rentalPriceInput.value;
            const powerOption = powerOptionInput.value;
            const noiseLevel = noiseLevelInput.value;
            const parking = parkingInput.value;
            yield this.createLocationFile(type, locationName, address, postalcode, city, country, description, contactName, contactPhone, contactEmail, photoFile, selectedFor, images, availabilityFrom, availabilityTo, rentalPrice, powerOption, noiseLevel, parking);
        });
    }
    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }
    createLocationFile(type, locationName, address, postalcode, city, country, description, contactName, contactPhone, contactEmail, photoFile, selectedFor, images, availabilityFrom, availabilityTo, rentalPrice, powerOption, noiseLevel, parking) {
        return __awaiter(this, void 0, void 0, function* () {
            const locationFileName = `${type}-${locationName}-${path_1.default.basename(this.folderPath)}`;
            const locationFolderPath = path_1.default.join(this.folderPath, this.pluginInstance.settings.defaultLocationFolder);
            const photoFolderPath = path_1.default.join(this.folderPath, this.pluginInstance.settings.defaultPhotoFolder);
            // Create folders if they don't exist
            try {
                const folderExists = yield this.app.vault.adapter.exists(locationFolderPath);
                if (!folderExists) {
                    yield this.app.vault.createFolder(locationFolderPath);
                }
            }
            catch (error) {
                console.error("Error creating folder:", error);
            }
            try {
                const photofolderExists = yield this.app.vault.adapter.exists(photoFolderPath);
                if (!photofolderExists) {
                    yield this.app.vault.createFolder(photoFolderPath);
                }
            }
            catch (error) {
                console.error("Error creating folder:", error);
            }
            const locationFilePath = path_1.default.join(locationFolderPath, `${locationFileName}.md`);
            // Construct content for the file
            let content = `| <h1>Lokace: | <h1>${locationName} |\n`;
            content += `| ------- | ------------------ |\n\n`;
            content += `| **Popis** | **Média** |\n`;
            content += `| --------- | --------- |\n`;
            if (photoFile) {
                const photoFileName = `${type}-${locationName}-${path_1.default.basename(this.folderPath)}-${photoFile.name}`;
                const photoFilePath = path_1.default.join(photoFolderPath, photoFileName);
                try {
                    const fileExists = yield this.app.vault.adapter.exists(photoFilePath);
                    if (!fileExists) {
                        const arrayBuffer = yield photoFile.arrayBuffer();
                        yield this.app.vault.createBinary(photoFilePath, arrayBuffer);
                    }
                    content += `| ${description} | <center>![[${photoFileName}\\|300]] |\n\n`;
                }
                catch (error) {
                    console.error("Error uploading photo:", error);
                }
            }
            else {
                content += `| ${description || '-'} | No photo available |\n\n`;
            }
            content += `| **Adresa** | **Kontaktní informace** |\n`;
            content += `| --------- | ----------------------- |\n`;
            content += `| ${address || '-'} | **Jméno:** ${contactName || '-'} |\n`;
            content += `| ${city || '-'} ${postalcode || '-'} | **Tel.:** ${contactPhone || '-'} |\n`;
            content += `| ${country || '-'} | **Email:** ${contactEmail || '-'} |\n\n`;
            content += `| **Vybráno pro obrazy** |  |\n`;
            content += `| --------------- | ------ |\n`;
            content += `| Vybráno | ${selectedFor || '-'} |\n\n`;
            content += `| **Dostupnost** | ${availabilityFrom} - ${availabilityTo} |\n`;
            content += `| -------------- | ------------------------ |\n`;
            content += `| **Cena pronájmu** | ${rentalPrice || '-'} Kč |\n`;
            content += `| **Možnost napájení** | ${powerOption || '-'} |\n`;
            content += `| **Hluk** | ${noiseLevel || '-'} |\n`;
            content += `| **Parkování** | ${parking || '-'} |\n`;
            content += `| **Výtah** | - |\n`;
            yield this.app.vault.create(locationFilePath, content);
            new obsidian_1.Notice(`Location created: ${locationFileName}`);
            this.close();
            // Create the file
            yield this.app.vault.create(locationFilePath, content);
            new obsidian_1.Notice(`Location created: ${locationFileName}`);
            this.close();
        });
    }
}
