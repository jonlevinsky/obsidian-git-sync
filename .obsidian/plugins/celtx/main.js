import { Plugin, Modal, Notice, PluginSettingTab, Setting, MarkdownView } from 'obsidian';
import path from 'path';
const DEFAULT_SETTINGS = {
    defaultLocationFolder: 'Lokace',
    defaultCharacterFolder: 'Postavy',
    autoCreateFolders: true,
    locationHotkey: 'Mod+Š',
    characterHotkey: 'Mod+É',
};
export default class CeltxLikePlugin extends Plugin {
    settings = DEFAULT_SETTINGS;
    async onload() {
        console.log("CeltxLikePlugin loaded");
        await this.loadSettings();
        this.loadCustomStyles();
        this.addCommands();
        this.addSettingTab(new CeltxLikePluginSettingsTab(this.app, this));
        // Add script formatting command
        this.addCommand({
            id: 'format-script',
            name: 'Format Script',
            callback: () => {
                this.formatScript();
            }
        });
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
            id: "open-location-list",
            name: "Open Location List",
            editorCallback: (editor) => {
                new LocationListModal(this.app, editor, this).open();
            },
            hotkeys: [{ modifiers: ["Mod"], key: this.settings.locationHotkey.split('+')[1] }],
        });
        this.addCommand({
            id: "open-character-list",
            name: "Open Character List",
            editorCallback: (editor) => {
                new CharacterListModal(this.app, editor, this).open();
            },
            hotkeys: [{ modifiers: ["Mod"], key: this.settings.characterHotkey.split('+')[1] }],
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
            const locationFolderPath = path.join(folderPath, this.settings.defaultLocationFolder);
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
        const locationFileName = `${type}-${location}-${path.basename(folderPath)}`;
        const locationFilePath = path.join(folderPath, this.settings.defaultLocationFolder, `${locationFileName}.md`);
        const file = await this.app.vault.create(locationFilePath, '# ' + locationFileName);
        return file;
    }
    async createNewCharacter(character, folderPath) {
        if (this.settings.autoCreateFolders) {
            const characterFolderPath = path.join(folderPath, this.settings.defaultCharacterFolder);
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
        const characterFilePath = path.join(folderPath, this.settings.defaultCharacterFolder, `${character}.md`);
        const file = await this.app.vault.create(characterFilePath, '# ' + character);
        return file;
    }
    loadCustomStyles() {
        const stylePath = path.join(this.app.vault.configDir, 'plugins', 'CeltxLikePlugin', 'styles.css');
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
    async formatScript() {
        const activeView = this.app.workspace.activeLeaf?.view;
        if (!(activeView instanceof MarkdownView))
            return;
        const activeFile = activeView.file;
        if (!activeFile)
            return;
        const fileContent = await this.app.vault.read(activeFile);
        if (this.hasStyleScriptTag(fileContent)) {
            const formattedContent = this.generateFormattedText(fileContent);
            await this.app.vault.modify(activeFile, formattedContent);
            this.applyStyleScript();
        }
    }
    hasStyleScriptTag(content) {
        return content.includes('style:script');
    }
    applyStyleScript() {
        const style = document.createElement('style');
        style.textContent = `
        /* Celkový styl pro scénář pro editor */
        @media print{
            * { 
                font-family: 'Courier New', Courier, monospace;
                color #000;
                background-color: transparent;
                font-size: 12px;
                line-height: 13px;
                padding: 0;
            }
        }
        
        .cm-s-obsidian body {
            font-size: 12px !important; 
            line-height: 13px !important;
        }
        
        /* Scene Heading (h1) - pro # */
        .cm-s-obsidian .cm-header-1 {
            font-family: 'Courier New', Courier, monospace;
            font-size: 12px;
            font-weight: bold;
            text-transform: uppercase;
            background-color: #D3D3D3;
            color: #1e1e1e;
            padding: 0.1in 0;
            text-align: left;
            letter-spacing: 1px;
            line-height: 13px;
        }
        
        /* Action (h2) - pro ## */
        .cm-s-obsidian .cm-header-2 {
            font-family: 'Courier New', Courier, monospace;
            font-size: 12px;
            line-height: 13px;
            text-align: justify;
        }
        
        /* Character (h3) - pro ### */
        .cm-s-obsidian .cm-header-3 {
            font-family: 'Courier New', Courier, monospace;
            font-size: 12px;
            font-weight: bold;
            text-transform: uppercase;
            text-align: left;
            margin-left: 3.7in;
            line-height: 13px;
        }
        
        /* Parentheticals (h4) - pro #### */
        .cm-s-obsidian .cm-header-4 {
            font-family: 'Courier New', Courier, monospace;
            font-size: 12px;
            font-style: italic;
            text-align: left;
            margin-left: 3.7in;
            line-height: 13px;
        }
        
        /* Dialogue (h5) - pro ##### */
        .cm-s-obsidian .cm-header-5 {
            font-family: 'Courier New', Courier, monospace;
            font-size: 12px;
            line-height: 13px;
            text-align: left;
            margin-left: 2.5in;
            margin-right: 1in;
        }
        
        /* Transition (h6) - pro ###### */
        .cm-s-obsidian .cm-header-6 {
            font-family: 'Courier New', Courier, monospace;
            font-size: 12px;
            font-weight: bold;
            text-transform: uppercase;
            text-align: center;
            line-height: 13px;
        }
        
        /* Styl pro režim čtení (Preview) */
        
        /* Celkový styl pro scénář pro preview */
        .markdown-preview-view body {
            font-size: 12px;
            line-height: 13px;
        }
        
        /* Scene Heading (h1) - pro # */
        .markdown-preview-view h1 {
            font-family: 'Courier New', Courier, monospace;
            font-size: 12px;
            font-weight: bold;
            text-transform: uppercase;
            background-color: #D3D3D3;
            color: #1e1e1e;
            padding: 0.1in 0;
            text-align: left;
            letter-spacing: 1px;
            line-height: 13px;
        }
        
        /* Action (h2) - pro ## */
        .markdown-preview-view h2 {
            font-family: 'Courier New', Courier, monospace;
            font-size: 12px;
            line-height: 13px;
            text-align: justify;
        }
        
        /* Character (h3) - pro ### */
        .markdown-preview-view h3 {
            font-family: 'Courier New', Courier, monospace;
            font-size: 12px;
            font-weight: bold;
            text-transform: uppercase;
            text-align: left;
            margin-left: 3.7in;
            line-height: 13px;
        }
        
        /* Parentheticals (h4) - pro #### */
        .markdown-preview-view h4 {
            font-family: 'Courier New', Courier, monospace;
            font-size: 12px;
            font-style: italic;
            text-align: left;
            margin-left: 3.7in;
            line-height: 13px;
        }
        
        /* Dialogue (h5) - pro ##### */
        .markdown-preview-view h5 {
            font-family: 'Courier New', Courier, monospace;
            font-size: 12px;
            line-height: 13px;
            text-align: left;
            margin-left: 2.5in;
            margin-right: 1in;
        }
        
        /* Transition (h6) - pro ###### */
        .markdown-preview-view h6 {
            font-family: 'Courier New', Courier, monospace;
            font-size: 12px;
            font-weight: bold;
            text-transform: uppercase;
            text-align: center;
            line-height: 13px;
        }
        `;
        document.head.appendChild(style);
    }
    generateFormattedText(input) {
        let output = input;
        output = output.replace(/# (.*)/, (match, p1) => `# ${p1}`);
        output = output.replace(/## (.*)/, (match, p1) => `## ${p1}`);
        output = output.replace(/### (.*)/, (match, p1) => `### ${p1}`);
        output = output.replace(/#### (.*)/, (match, p1) => {
            if (!p1.startsWith('(') && !p1.endsWith(')')) {
                return `#### (${p1})`;
            }
            return `#### ${p1}`;
        });
        output = output.replace(/##### (.*)/, (match, p1) => `##### ${p1}`);
        output = output.replace(/###### (.*)/, (match, p1) => `###### ${p1}`);
        return output;
    }
}
class CeltxLikePluginSettingsTab extends PluginSettingTab {
    plugin;
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
            .onChange(async (value) => {
            this.plugin.settings.defaultLocationFolder = value;
            await this.plugin.saveSettings();
        }));
        new Setting(containerEl)
            .setName('Default Character Folder')
            .setDesc('Folder name for storing characters')
            .addText((text) => text
            .setPlaceholder('Enter folder name')
            .setValue(this.plugin.settings.defaultCharacterFolder)
            .onChange(async (value) => {
            this.plugin.settings.defaultCharacterFolder = value;
            await this.plugin.saveSettings();
        }));
        new Setting(containerEl)
            .setName('Auto-create Folders')
            .setDesc('Automatically create location and character folders if not found')
            .addToggle((toggle) => toggle
            .setValue(this.plugin.settings.autoCreateFolders)
            .onChange(async (value) => {
            this.plugin.settings.autoCreateFolders = value;
            await this.plugin.saveSettings();
        }));
        new Setting(containerEl)
            .setName('Location Hotkey')
            .setDesc('Set the hotkey for opening the location list.')
            .addText((text) => text
            .setValue(this.plugin.settings.locationHotkey)
            .onChange(async (value) => {
            this.plugin.settings.locationHotkey = value;
            await this.plugin.saveSettings();
        }));
        new Setting(containerEl)
            .setName('Character Hotkey')
            .setDesc('Set the hotkey for opening the character list.')
            .addText((text) => text
            .setValue(this.plugin.settings.characterHotkey)
            .onChange(async (value) => {
            this.plugin.settings.characterHotkey = value;
            await this.plugin.saveSettings();
        }));
    }
}
class LocationListModal extends Modal {
    editor;
    locationNames = [];
    folderPath = '';
    pluginInstance;
    constructor(app, editor, pluginInstance) {
        super(app);
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
            new Notice("NO FILE FOUND FOR THE CURRENT EDITOR.");
            return;
        }
        const filePath = activeFile.path;
        this.folderPath = path.dirname(filePath);
        let locationFiles = await this.pluginInstance.getLocationFiles(this.folderPath);
        locationFiles = locationFiles.filter((file) => file.path !== filePath);
        if (locationFiles.length > 0) {
            this.locationNames = locationFiles.map((file) => path.basename(file.path, '.md'));
            this.locationNames.forEach(location => {
                const locationItem = document.createElement('button');
                locationItem.textContent = location;
                locationItem.onclick = async () => {
                    await this.insertLocationText(location);
                };
                locationListContainer.appendChild(locationItem);
            });
        }
        else {
            const noItemsMessage = document.createElement('p');
            noItemsMessage.textContent = 'NO LOCATIONS AVAILABLE. CREATE ONE!';
            locationListContainer.appendChild(noItemsMessage);
        }
    }
    async insertLocationText(location) {
        const formattedLocationText = `[[${location}]]`;
        const text = `${formattedLocationText}\n`;
        this.editor.replaceRange(text, this.editor.getCursor());
    }
    async openNewLocationModal() {
        const newLocationModal = new NewLocationModal(this.app, this.pluginInstance, this.folderPath);
        newLocationModal.open();
    }
}
class CharacterListModal extends Modal {
    editor;
    characterNames = [];
    folderPath = '';
    pluginInstance;
    constructor(app, editor, pluginInstance) {
        super(app);
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
    async loadCharacters(characterListContainer) {
        const activeFile = this.app.workspace.getActiveFile();
        if (!activeFile) {
            new Notice("NO FILE FOUND FOR THE CURRENT EDITOR.");
            return;
        }
        const filePath = activeFile.path;
        this.folderPath = path.dirname(filePath);
        let characterFiles = await this.pluginInstance.getCharacterFiles(this.folderPath);
        characterFiles = characterFiles.filter((file) => file.path !== filePath);
        if (characterFiles.length > 0) {
            this.characterNames = characterFiles.map((file) => path.basename(file.path, '.md'));
            this.characterNames.forEach(character => {
                const characterItem = document.createElement('button');
                characterItem.textContent = character;
                characterItem.onclick = async () => {
                    await this.insertCharacterText(character);
                };
                characterListContainer.appendChild(characterItem);
            });
        }
        else {
            const noItemsMessage = document.createElement('p');
            noItemsMessage.textContent = 'NO CHARACTERS AVAILABLE. CREATE ONE!';
            characterListContainer.appendChild(noItemsMessage);
        }
    }
    async insertCharacterText(character) {
        const formattedCharacterText = `[[${character}]]`;
        const text = `${formattedCharacterText}\n`;
        this.editor.replaceRange(text, this.editor.getCursor());
    }
    async openNewCharacterModal() {
        const newCharacterModal = new NewCharacterModal(this.app, this.pluginInstance, this.folderPath);
        newCharacterModal.open();
    }
}
class NewLocationModal extends Modal {
    pluginInstance;
    folderPath;
    locationInput;
    constructor(app, pluginInstance, folderPath) {
        super(app);
        this.pluginInstance = pluginInstance;
        this.folderPath = folderPath;
    }
    onOpen() {
        const { contentEl } = this;
        contentEl.createEl('h2', { text: 'CREATE NEW LOCATION' });
        this.locationInput = contentEl.createEl('input', { type: 'text' });
        this.locationInput.placeholder = 'Enter location name...';
        contentEl.appendChild(this.locationInput);
        const createButton = contentEl.createEl('button', { text: 'Create Location' });
        createButton.onclick = async () => {
            const locationName = this.locationInput.value.trim();
            if (locationName) {
                await this.pluginInstance.createNewLocation(locationName, 'Location', this.folderPath);
                this.close();
            }
        };
    }
    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }
}
class NewCharacterModal extends Modal {
    pluginInstance;
    folderPath;
    characterInput;
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
        createButton.onclick = async () => {
            const characterName = this.characterInput.value.trim();
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
