"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const obsidian_1 = require("obsidian");
const path_1 = __importDefault(require("path"));
const DEFAULT_SETTINGS = {
    defaultCharacterFolder: 'Postavy',
    autoCreateCharacterFolder: true,
    hotkey: 'Mod+1', // Výchozí hodnota pro hotkey
};
class CharacterPlugin extends obsidian_1.Plugin {
    constructor() {
        super(...arguments);
        this.settings = DEFAULT_SETTINGS;
    }
    async onload() {
        console.log("CharacterPlugin loaded");
        // Načtení nastavení
        await this.loadSettings();
        // Přidání příkazů a nastavení UI
        this.addCommands();
        this.addSettingTab(new CharacterPluginSettingsTab(this.app, this));
    }
    onunload() {
        console.log("CharacterPlugin unloaded");
    }
    async loadSettings() {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    }
    async saveSettings() {
        await this.saveData(this.settings);
    }
    addCommands() {
        this.addCommand({
            id: "open-character-list",
            name: "Open Character List",
            editorCallback: (editor) => {
                new CharacterListModal(this.app, editor, this).open();
            },
            hotkeys: [{ modifiers: ["Mod"], key: this.settings.hotkey.split('+')[1] }], // Použití nastavené klávesové zkratky
        });
    }
    async getCharacterFiles(folderPath) {
        const characterFolder = this.settings.defaultCharacterFolder;
        console.log(`Using default character folder: ${characterFolder}`);
        return this.app.vault.getFiles().filter((file) => file.path.startsWith(folderPath));
    }
    async createNewCharacter(character, type, folderPath) {
        if (this.settings.autoCreateCharacterFolder) {
            const characterFolderPath = path_1.default.join(folderPath, this.settings.defaultCharacterFolder);
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
        const characterFileName = `${type}-${character}-${path_1.default.basename(folderPath)}`;
        const characterFilePath = path_1.default.join(folderPath, this.settings.defaultCharacterFolder, `${characterFileName}.md`);
        const file = await this.app.vault.create(characterFilePath, '# ' + characterFileName);
        return file;
    }
}
exports.default = CharacterPlugin;
class CharacterPluginSettingsTab extends obsidian_1.PluginSettingTab {
    constructor(app, plugin) {
        super(app, plugin);
        this.plugin = plugin;
    }
    display() {
        const { containerEl } = this;
        containerEl.empty();
        containerEl.createEl('h2', { text: 'Character Plugin Settings' });
        new obsidian_1.Setting(containerEl)
            .setName('Default Character Folder')
            .setDesc('Folder name for storing characters')
            .addText((text) => text
            .setPlaceholder('Enter folder name')
            .setValue(this.plugin.settings.defaultCharacterFolder)
            .onChange(async (value) => {
            this.plugin.settings.defaultCharacterFolder = value;
            await this.plugin.saveSettings();
        }));
        new obsidian_1.Setting(containerEl)
            .setName('Auto-create Character Folder')
            .setDesc('Automatically create character folder if not found')
            .addToggle((toggle) => toggle
            .setValue(this.plugin.settings.autoCreateCharacterFolder)
            .onChange(async (value) => {
            this.plugin.settings.autoCreateCharacterFolder = value;
            await this.plugin.saveSettings();
        }));
        new obsidian_1.Setting(containerEl)
            .setName('Hotkey')
            .setDesc('Set the hotkey for opening the character list.')
            .addText((text) => text
            .setValue(this.plugin.settings.hotkey)
            .onChange(async (value) => {
            this.plugin.settings.hotkey = value;
            await this.plugin.saveSettings();
        }));
    }
}
class CharacterListModal extends obsidian_1.Modal {
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
    async loadCharacters(characterListContainer) {
        const activeFile = this.app.workspace.getActiveFile();
        if (!activeFile) {
            new obsidian_1.Notice("NO FILE FOUND FOR THE CURRENT EDITOR.");
            return;
        }
        const filePath = activeFile.path;
        this.folderPath = path_1.default.dirname(filePath);
        let characterFiles = await this.pluginInstance.getCharacterFiles(this.folderPath);
        // Filtrování otevřeného souboru, aby se nezobrazoval v seznamu
        characterFiles = characterFiles.filter((file) => file.path !== filePath);
        // Pokud jsou k dispozici postavy, zobrazíme je
        if (characterFiles.length > 0) {
            this.characterNames = characterFiles.map((file) => path_1.default.basename(file.path, '.md'));
            this.characterNames.forEach(character => {
                const characterItem = document.createElement('button');
                characterItem.textContent = character;
                characterItem.onclick = async () => {
                    await this.openRoleModal(character);
                };
                characterListContainer.appendChild(characterItem);
            });
        }
        else {
            const noCharactersMessage = document.createElement('p');
            noCharactersMessage.textContent = 'NO CHARACTERS AVAILABLE. CREATE ONE!';
            characterListContainer.appendChild(noCharactersMessage);
        }
    }
    async openRoleModal(character) {
        const roleModal = new RoleModal(this.app, character, (role) => {
            this.insertCharacterText(character, role);
        });
        roleModal.open();
    }
    async insertCharacterText(character, role) {
        const [type, characterNameAndRole] = character.split('-');
        const [characterName] = characterNameAndRole.split('-');
        const fileName = `${type.toUpperCase()}-${characterName.toUpperCase()}-${path_1.default.basename(this.folderPath)}`;
        const formattedCharacterText = `# ${type.toUpperCase()}. [[${fileName}|${characterName.toUpperCase()}]] - ${role.toUpperCase()}`;
        const text = `${formattedCharacterText}\n`;
        this.editor.replaceRange(text, this.editor.getCursor());
    }
    async openNewCharacterModal() {
        const newCharacterModal = new NewCharacterModal(this.app, this.pluginInstance, this.folderPath);
        newCharacterModal.open();
    }
}
class RoleModal extends obsidian_1.Modal {
    constructor(app, character, callback) {
        super(app);
        this.character = character;
        this.callback = callback;
    }
    onOpen() {
        const { contentEl } = this;
        contentEl.createEl('h2', { text: `SELECT ROLE FOR CHARACTER: ${this.character}` });
        const heroButton = contentEl.createEl('button', { text: 'HERO' });
        heroButton.onclick = () => this.selectRole('HERO');
        const villainButton = contentEl.createEl('button', { text: 'VILLAIN' });
        villainButton.onclick = () => this.selectRole('VILLAIN');
    }
    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }
    selectRole(role) {
        this.callback(role); // CALLBACK TO INSERT TEXT INTO THE EDITOR
        this.close();
    }
}
class NewCharacterModal extends obsidian_1.Modal {
    constructor(app, pluginInstance, folderPath) {
        super(app);
        this.pluginInstance = pluginInstance;
        this.folderPath = folderPath;
    }
    onOpen() {
        const { contentEl } = this;
        contentEl.createEl('h2', { text: 'CREATE NEW CHARACTER' });
        const typeSelect = contentEl.createEl('select');
        const optionHero = typeSelect.createEl('option', { text: 'HERO' });
        const optionVillain = typeSelect.createEl('option', { text: 'VILLAIN' });
        const characterNameInput = contentEl.createEl('input');
        characterNameInput.placeholder = 'Enter character name';
        const createButton = contentEl.createEl('button', { text: 'CREATE' });
        createButton.onclick = async () => {
            const type = typeSelect.value;
            const characterName = characterNameInput.value.toUpperCase();
            await this.createCharacterFile(type, characterName);
        };
    }
    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }
    async createCharacterFile(type, characterName) {
        const characterFileName = `${type}-${characterName}-${path_1.default.basename(this.folderPath)}`;
        const characterFolderPath = path_1.default.join(this.folderPath, 'Postavy');
        try {
            const folderExists = await this.app.vault.adapter.exists(characterFolderPath);
            if (!folderExists) {
                await this.app.vault.createFolder(characterFolderPath);
            }
        }
        catch (error) {
            console.error("Error creating folder:", error);
        }
        const characterFilePath = path_1.default.join(characterFolderPath, `${characterFileName}.md`);
        await this.app.vault.create(characterFilePath, '# ' + characterFileName);
        new obsidian_1.Notice(`CHARACTER CREATED: ${characterFileName}`);
        this.close();
    }
}
