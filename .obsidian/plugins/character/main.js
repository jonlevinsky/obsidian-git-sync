const { Modal, Notice, MarkdownView } = require ('obsidian');
import * as path from 'path';
export class CharacterManager {
    app;
    plugin;
    constructor(app, plugin) {
        this.app = app;
        this.plugin = plugin;
    }
    openCharacterList() {
        new CharacterListModal(this.app, this.plugin).open();
    }
    async getCharacterFiles(folderPath) {
        const characterFolder = this.plugin.settings.defaultCharacterFolder;
        return this.app.vault.getFiles().filter((file) => file.path.startsWith(path.join(folderPath, characterFolder)));
    }
    async createNewCharacter(character, folderPath) {
        if (this.plugin.settings.autoCreateFolders) {
            const characterFolderPath = path.join(folderPath, this.plugin.settings.defaultCharacterFolder);
            try {
                const folderExists = await this.app.vault.adapter.exists(characterFolderPath);
                if (!folderExists) {
                    await this.app.vault.createFolder(characterFolderPath);
                }
            }
            catch (error) {
                console.error("Error creating folder:", error);
                throw error;
            }
        }
        const characterFilePath = path.join(folderPath, this.plugin.settings.defaultCharacterFolder, `${character}.md`);
        const file = await this.app.vault.create(characterFilePath, `# ${character}`);
        return file;
    }
}
module.exports.CharacterManager = CharacterManager;
class CharacterListModal extends Modal {
    plugin;
    editor = null;
    characterNames = [];
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
        contentEl.createEl('h2', { text: 'SELECT OR CREATE CHARACTER' });
        const newCharacterButton = contentEl.createEl('button', { text: '+ ADD NEW CHARACTER' });
        newCharacterButton.onclick = () => this.openNewCharacterModal();
        const characterListContainer = contentEl.createEl('div', {
            cls: 'character-list-container'
        });
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
        this.folderPath = path.dirname(activeFile.path);
        let characterFiles = await this.plugin.characterManager.getCharacterFiles(this.folderPath);
        characterFiles = characterFiles.filter((file) => file.path !== activeFile.path);
        if (characterFiles.length > 0) {
            this.characterNames = characterFiles.map((file) => path.basename(file.path, '.md'));
            this.characterNames.forEach(character => {
                const characterItem = characterListContainer.createEl('button', { text: character });
                characterItem.onclick = async () => {
                    await this.insertCharacterText(character);
                };
            });
        }
        else {
            characterListContainer.createEl('p', { text: 'NO CHARACTERS AVAILABLE. CREATE ONE!' });
        }
    }
    async insertCharacterText(character) {
        const formattedCharacterText = `[[${character}]]`;
        const text = `### ${formattedCharacterText}\n`;
        if (this.editor) {
            this.editor.replaceRange(text, this.editor.getCursor());
        }
        this.close();
    }
    async openNewCharacterModal() {
        new NewCharacterModal(this.app, this.plugin, this.folderPath).open();
    }
}
class NewCharacterModal extends Modal {
    plugin;
    folderPath;
    characterInput = null;
    constructor(app, plugin, folderPath) {
        super(app);
        this.plugin = plugin;
        this.folderPath = folderPath;
    }
    onOpen() {
        const { contentEl } = this;
        contentEl.createEl('h2', { text: 'CREATE NEW CHARACTER' });
        this.characterInput = contentEl.createEl('input', { type: 'text', placeholder: 'Enter character name...' });
        const createButton = contentEl.createEl('button', { text: 'Create Character' });
        createButton.onclick = async () => {
            if (this.characterInput) {
                const characterName = this.characterInput.value.trim();
                if (characterName) {
                    await this.plugin.characterManager.createNewCharacter(characterName, this.folderPath);
                    this.close();
                    new Notice(`Character ${characterName} created successfully!`);
                }
            }
        };
    }
    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }
}
