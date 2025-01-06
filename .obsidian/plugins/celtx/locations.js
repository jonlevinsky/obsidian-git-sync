"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LocationListModal = void 0;
exports.getLocationFiles = getLocationFiles;
exports.createNewLocation = createNewLocation;
const obsidian_1 = require("obsidian");
const path_1 = __importDefault(require("path"));
// Function to get location files from a specified folder
async function getLocationFiles(app, defaultLocationFolder, folderPath) {
    console.log(`Using default location folder: ${defaultLocationFolder}`);
    return app.vault.getFiles().filter((file) => file.path.startsWith(folderPath));
}
// Function to create a new location file
async function createNewLocation(app, // Pass 'app' as parameter
location, type, folderPath, autoCreateLocationFolder, defaultLocationFolder) {
    if (autoCreateLocationFolder) {
        const locationFolderPath = path_1.default.join(folderPath, defaultLocationFolder);
        try {
            const folderExists = await app.vault.adapter.exists(locationFolderPath);
            if (!folderExists) {
                await app.vault.createFolder(locationFolderPath);
                console.log(`Folder created at: ${locationFolderPath}`);
            }
        }
        catch (error) {
            console.error("Error creating folder:", error);
            throw error;
        }
    }
    const locationFileName = `${type}-${location}-${path_1.default.basename(folderPath)}`;
    const locationFilePath = path_1.default.join(folderPath, defaultLocationFolder, `${locationFileName}.md`);
    const file = await app.vault.create(locationFilePath, '# ' + locationFileName);
    return file;
}
// Modal to select or create a location
class LocationListModal extends obsidian_1.Modal {
    constructor(app, editor, pluginSettings) {
        super(app);
        this.locationNames = [];
        this.folderPath = '';
        this.editor = editor;
        this.pluginSettings = pluginSettings; // Pass pluginSettings here
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
        let locationFiles = await getLocationFiles(this.app, this.pluginSettings.defaultLocationFolder, this.folderPath);
        locationFiles = locationFiles.filter((file) => file.path !== filePath);
        if (locationFiles.length > 0) {
            this.locationNames = locationFiles.map((file) => path_1.default.basename(file.path, '.md'));
            this.locationNames.forEach(location => {
                const locationItem = document.createElement('button');
                locationItem.textContent = location;
                locationItem.onclick = async () => {
                    await this.openDayNightModal(location);
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
        const [type, locationNameAndDay] = location.split('-');
        const [locationName] = locationNameAndDay.split('-');
        const fileName = `${type.toUpperCase()}-${locationName.toUpperCase()}-${path_1.default.basename(this.folderPath)}`;
        const formattedLocationText = `# ${type.toUpperCase()}. [[${fileName}|${locationName.toUpperCase()}]] - ${dayNight.toUpperCase()}`;
        const text = `${formattedLocationText}\n`;
        this.editor.replaceRange(text, this.editor.getCursor());
    }
    async openNewLocationModal() {
        const newLocationModal = new NewLocationModal(this.app, this.pluginSettings, this.folderPath);
        newLocationModal.open();
    }
}
exports.LocationListModal = LocationListModal;
