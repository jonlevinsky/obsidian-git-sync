import { Modal, Notice, MarkdownView } from 'obsidian';
import * as path from 'path';
export class LocationManager {
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
