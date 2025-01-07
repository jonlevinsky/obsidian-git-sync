import { Plugin, PluginSettingTab, Setting } from 'obsidian';
import { CharacterManager } from './characters';
import { LocationManager } from './locations';
import { ScriptFormatter } from './script-formatter';
const DEFAULT_SETTINGS = {
    defaultCharacterFolder: 'Postavy',
    defaultLocationFolder: 'Lokace',
    autoCreateFolders: true,
    characterHotkey: 'Mod+É',
    locationHotkey: 'Mod+Š',
};
export default class ScriptWritingPlugin extends Plugin {
    settings;
    characterManager;
    locationManager;
    scriptFormatter;
    constructor(app, manifest) {
        super(app, manifest);
        this.settings = DEFAULT_SETTINGS;
        this.characterManager = new CharacterManager(this.app, this);
        this.locationManager = new LocationManager(this.app, this);
        this.scriptFormatter = new ScriptFormatter(this.app, this);
    }
    async onload() {
        await this.loadSettings();
        this.addSettingTab(new ScriptWritingPluginSettingTab(this.app, this));
        this.addCommand({
            id: 'open-character-list',
            name: 'Open Character List',
            hotkeys: [{ modifiers: ["Mod"], key: this.settings.characterHotkey.split('+')[1] }],
            callback: () => this.characterManager.openCharacterList(),
        });
        this.addCommand({
            id: 'open-location-list',
            name: 'Open Location List',
            hotkeys: [{ modifiers: ["Mod"], key: this.settings.locationHotkey.split('+')[1] }],
            callback: () => this.locationManager.openLocationList(),
        });
        this.addCommand({
            id: 'format-script',
            name: 'Format Script',
            callback: () => this.scriptFormatter.formatScript(),
        });
    }
    async loadSettings() {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    }
    async saveSettings() {
        await this.saveData(this.settings);
    }
}
class ScriptWritingPluginSettingTab extends PluginSettingTab {
    plugin;
    constructor(app, plugin) {
        super(app, plugin);
        this.plugin = plugin;
    }
    display() {
        const { containerEl } = this;
        containerEl.empty();
        containerEl.createEl('h2', { text: 'Script Writing Plugin Settings' });
        new Setting(containerEl)
            .setName('Default Character Folder')
            .setDesc('Folder name for storing characters')
            .addText(text => text
            .setPlaceholder('Enter folder name')
            .setValue(this.plugin.settings.defaultCharacterFolder)
            .onChange(async (value) => {
            this.plugin.settings.defaultCharacterFolder = value;
            await this.plugin.saveSettings();
        }));
        new Setting(containerEl)
            .setName('Default Location Folder')
            .setDesc('Folder name for storing locations')
            .addText(text => text
            .setPlaceholder('Enter folder name')
            .setValue(this.plugin.settings.defaultLocationFolder)
            .onChange(async (value) => {
            this.plugin.settings.defaultLocationFolder = value;
            await this.plugin.saveSettings();
        }));
        new Setting(containerEl)
            .setName('Auto-create Folders')
            .setDesc('Automatically create character and location folders if not found')
            .addToggle(toggle => toggle
            .setValue(this.plugin.settings.autoCreateFolders)
            .onChange(async (value) => {
            this.plugin.settings.autoCreateFolders = value;
            await this.plugin.saveSettings();
        }));
        new Setting(containerEl)
            .setName('Character Hotkey')
            .setDesc('Set the hotkey for opening the character list')
            .addText(text => text
            .setValue(this.plugin.settings.characterHotkey)
            .onChange(async (value) => {
            this.plugin.settings.characterHotkey = value;
            await this.plugin.saveSettings();
        }));
        new Setting(containerEl)
            .setName('Location Hotkey')
            .setDesc('Set the hotkey for opening the location list')
            .addText(text => text
            .setValue(this.plugin.settings.locationHotkey)
            .onChange(async (value) => {
            this.plugin.settings.locationHotkey = value;
            await this.plugin.saveSettings();
        }));
    }
}
