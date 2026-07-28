const { Plugin, MarkdownView, PluginSettingTab, Setting, Notice } = require('obsidian');

const DEFAULT_PATHS = [
  'Film & Foto/Film & Foto.md',
  'Databaze/Filmy/Filmy.md',
  'Databaze/Serialy/Serialy.md',
  'Databaze/Watchlist/Watchlist.md',
  'Produkce/Produkce.md',
  'Škola/Škola.md',
  'Život/Život.md',
  'Homepage.md',
  'System/Tasks/Tasks.md'
];

module.exports = class MocReadingViewPlugin extends Plugin {
  async onload() {
    await this.loadSettings();

    this.addCommand({
      id: 'add-current-to-moc-reading',
      name: 'Přidat aktuální soubor do MOC Reading View',
      callback: () => {
        const view = this.app.workspace.getActiveViewOfType(MarkdownView);
        if (!view || !view.file) {
          new Notice('Žádný otevřený soubor');
          return;
        }
        const path = view.file.path;
        if (this.settings.paths.includes(path)) {
          new Notice(`"${path}" už je v seznamu`);
          return;
        }
        this.settings.paths.push(path);
        this.saveSettings();
        new Notice(`"${path}" přidán do MOC Reading View`);
      }
    });

    this.addCommand({
      id: 'remove-current-from-moc-reading',
      name: 'Odebrat aktuální soubor z MOC Reading View',
      callback: () => {
        const view = this.app.workspace.getActiveViewOfType(MarkdownView);
        if (!view || !view.file) {
          new Notice('Žádný otevřený soubor');
          return;
        }
        const path = view.file.path;
        this.settings.paths = this.settings.paths.filter(p => p !== path);
        this.saveSettings();
        new Notice(`"${path}" odebrán z MOC Reading View`);
      }
    });

    this.addCommand({
      id: 'auto-detect-moc-files',
      name: 'Autodetekovat MOC soubory (cssclasses: homepage-dashboard)',
      callback: async () => {
        const files = this.app.vault.getMarkdownFiles();
        let added = 0;
        for (const file of files) {
          const cache = this.app.metadataCache.getFileCache(file);
          if (cache?.frontmatter?.cssclasses === 'homepage-dashboard' || cache?.frontmatter?.cssclasses?.includes?.('homepage-dashboard')) {
            if (!this.settings.paths.includes(file.path)) {
              this.settings.paths.push(file.path);
              added++;
            }
          }
        }
        await this.saveSettings();
        new Notice(`Přidáno ${added} souborů do MOC Reading View`);
      }
    });

    this.registerEvent(
      this.app.workspace.on('active-leaf-change', () => {
        setTimeout(() => {
          const view = this.app.workspace.getActiveViewOfType(MarkdownView);
          if (!view || !view.file) return;
          if (!this.settings.paths.includes(view.file.path)) return;
          const state = view.getState();
          if (state && state.mode !== 'preview') {
            state.mode = 'preview';
            state.source = false;
            view.setState(state, { history: false });
          }
        }, 200);
      })
    );

    this.addSettingTab(new MocReadingViewSettingTab(this.app, this));
  }

  async loadSettings() {
    const data = await this.loadData();
    this.settings = {
      paths: data?.paths?.length ? data.paths : [...DEFAULT_PATHS]
    };
  }

  async saveSettings() {
    await this.saveData({ paths: this.settings.paths });
  }
};

class MocReadingViewSettingTab extends PluginSettingTab {
  constructor(app, plugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display() {
    const { containerEl } = this;
    containerEl.empty();
    containerEl.createEl('h2', { text: '📖 MOC Reading View' });

    containerEl.createEl('p', {
      text: 'Soubory v seznamu se automaticky přepínají do Reading módu.',
      cls: 'setting-item-description'
    });

    new Setting(containerEl)
      .setName('Autodetekovat')
      .setDesc('Najde všechny soubory s cssclasses: homepage-dashboard a přidá je do seznamu')
      .addButton(btn => btn
        .setButtonText('🔍 Spustit autodetekci')
        .onClick(async () => {
          const files = this.app.vault.getMarkdownFiles();
          let added = 0;
          for (const file of files) {
            const cache = this.app.metadataCache.getFileCache(file);
            if (cache?.frontmatter?.cssclasses === 'homepage-dashboard' || cache?.frontmatter?.cssclasses?.includes?.('homepage-dashboard')) {
              if (!this.plugin.settings.paths.includes(file.path)) {
                this.plugin.settings.paths.push(file.path);
                added++;
              }
            }
          }
          await this.plugin.saveSettings();
          this.display();
          new Notice(`Přidáno ${added} souborů`);
        }));

    containerEl.createEl('h3', { text: `📂 Seznam souborů (${this.plugin.settings.paths.length})` });

    const list = containerEl.createDiv();
    list.style.cssText = 'display:flex;flex-direction:column;gap:4px;margin-top:8px;';

    for (const path of this.plugin.settings.paths) {
      const row = list.createDiv();
      row.style.cssText = 'display:flex;align-items:center;justify-content:space-between;padding:6px 8px;border-radius:6px;background:var(--background-primary-alt);font-size:0.85em;';

      const label = row.createEl('span', { text: path });
      label.style.cssText = 'flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;';

      const delBtn = row.createEl('button', { text: '✕' });
      delBtn.style.cssText = 'padding:2px 8px;border-radius:4px;background:color-mix(in srgb, #ef4444 15%,transparent);color:#ef4444;border:none;cursor:pointer;font-size:0.8em;flex-shrink:0;margin-left:8px;';
      delBtn.addEventListener('click', async () => {
        this.plugin.settings.paths = this.plugin.settings.paths.filter(p => p !== path);
        await this.plugin.saveSettings();
        this.display();
      });
    }

    if (this.plugin.settings.paths.length === 0) {
      list.createEl('p', { text: 'Seznam je prázdný. Použij autodetekci nebo přidej soubor commandem.', style: 'color:var(--text-muted);font-size:0.85em;' });
    }
  }
}