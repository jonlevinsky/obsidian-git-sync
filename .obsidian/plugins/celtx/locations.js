"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.LocationManager = void 0;
const obsidian_1 = require("obsidian");
const path = __importStar(require("path"));
class LocationManager {
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
exports.LocationManager = LocationManager;
class LocationListModal extends obsidian_1.Modal {
    constructor(app, plugin) {
        super(app);
        this.plugin = plugin;
        this.editor = null;
        this.locationNames = [];
        this.folderPath = '';
        const activeLeaf = this.app.workspace.activeLeaf;
        if (activeLeaf && activeLeaf.view instanceof obsidian_1.MarkdownView) {
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
            new obsidian_1.Notice("NO FILE FOUND FOR THE CURRENT EDITOR.");
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
        this.callback(dayNight);
        this.close();
    }
}
class NewLocationModal extends obsidian_1.Modal {
    constructor(app, plugin, folderPath) {
        super(app);
        this.plugin = plugin;
        this.folderPath = folderPath;
        this.typeSelect = null;
        this.locationNameInput = null;
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
                    new obsidian_1.Notice(`Location ${type}-${locationName} created successfully!`);
                }
            }
        };
    }
    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }
}
