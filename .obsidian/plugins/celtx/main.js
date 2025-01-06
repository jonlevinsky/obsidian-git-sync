"use strict";
// main.ts
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const obsidian_1 = require("obsidian");
const characters_1 = __importDefault(require("./characters")); // Výchozí import
const locations_1 = __importDefault(require("./locations")); // Výchozí import
// Výchozí nastavení pluginu
const DEFAULT_SETTINGS = {
    settingExample: 'Default'
};
// Hlavní třída pluginu
class MyPlugin extends obsidian_1.Plugin {
    constructor() {
        super(...arguments);
        this.settings = DEFAULT_SETTINGS; // Inicializace
    }
    async onload() {
        console.log('Načítám plugin');
        // Načíst nastavení
        await this.loadSettings();
        // Přidat příkaz
        this.addCommand({
            id: 'show-characters-and-locations',
            name: 'Zobraz postavy a lokace',
            callback: () => this.showData()
        });
        // Přidat nastavení
        this.addSettingTab(new MyPluginSettingTab(this.app, this));
    }
    onunload() {
        console.log('Plugin se vypíná');
    }
    async loadSettings() {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    }
    async saveSettings() {
        await this.saveData(this.settings);
    }
    showData() {
        // Předání App a manifestu do konstruktorů
        const characters = new characters_1.default(this.app, this.manifest);
        const locations = new locations_1.default(this.app, this.manifest);
        // Získat data z metod (použijte správné metody nebo vlastnosti dle implementace `characters.ts` a `locations.ts`)
        const charactersList = characters.getAll(); // Příklad: metoda getAll (zkontrolujte implementaci)
        const locationsList = locations.getAll();
        // Zobrazit data v konzoli
        console.log('Postavy:', charactersList);
        console.log('Lokace:', locationsList);
        // Zde můžete implementovat další logiku, např. zobrazení dat v modálním okně
    }
}
exports.default = MyPlugin;
// Třída pro nastavení
class MyPluginSettingTab extends obsidian_1.PluginSettingTab {
    constructor(app, plugin) {
        super(app, plugin);
        this.plugin = plugin;
    }
    display() {
        const { containerEl } = this;
        containerEl.empty();
        containerEl.createEl('h2', { text: 'Nastavení mého pluginu' });
        new obsidian_1.Setting(containerEl)
            .setName('Příklad nastavení')
            .setDesc('Popis příkladu nastavení')
            .addText(text => text
            .setPlaceholder('Zadej hodnotu')
            .setValue(this.plugin.settings.settingExample)
            .onChange(async (value) => {
            console.log('Nová hodnota nastavení:', value);
            this.plugin.settings.settingExample = value;
            await this.plugin.saveSettings();
        }));
    }
}
