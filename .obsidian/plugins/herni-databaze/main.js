const { Plugin, Modal, Setting, Notice, TFolder, TFile, requestUrl, PluginSettingTab } = require('obsidian');

const FOLDER = 'Databaze/Hry';

const SUPABASE_URL = 'https://bkgfohfmnbmascomaozv.supabase.co/rest/v1/games';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJrZ2ZvaGZtbmJtYXNjb21hb3p2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgzMzMwMzYsImV4cCI6MjEwMzkwOTAzNn0.RgxJDflLqIuBIH17imSvdLmbRjg8Fp3vDWK_O5u6w-c';

const DEFAULT_SETTINGS = {
  rawgApiKey: '6da16180684e4a93bf3a95c5003738ab'
};

// ─── SUPABASE SYNC ───

async function pushGameToSupabase(data) {
  const body = {
    title: data.title || '',
    platform: data.platform || 'PC',
    genre: data.genre || '',
    status: data.status || 'completed',
    my_rating: data.my_rating ? parseFloat(data.my_rating) : null,
    playtime_hours: data.playtime_hours ? parseInt(data.playtime_hours) : null,
    release_year: data.release_year ? parseInt(data.release_year) : null,
    cover_url: data.cover_url || '',
    notes: data.notes ? data.notes.replace(/\n/g, ' ') : ''
  };

  try {
    const resp = await requestUrl({
      url: SUPABASE_URL,
      method: 'POST',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });
    if (resp.status >= 200 && resp.status < 300) {
      new Notice('☁️ Hra byla synchronizována do Supabase Personal API!');
    }
  } catch (e) {
    console.error('Supabase Sync Error:', e);
  }
}

// ─── RAWG.IO API ───

async function searchRawg(apiKey, query) {
  if (!query || !apiKey) return [];
  const url = `https://api.rawg.io/api/games?key=${apiKey}&search=${encodeURIComponent(query)}&page_size=15`;
  try {
    const resp = await requestUrl({
      url,
      method: 'GET',
      headers: {
        'User-Agent': 'Obsidian-Herni-Databaze/1.0'
      }
    });

    if (resp.status === 200 && resp.json && Array.isArray(resp.json.results)) {
      return resp.json.results.map(g => {
        let year = '';
        if (g.released) {
          year = g.released.split('-')[0];
        }

        const genres = g.genres ? g.genres.map(x => x.name).join(', ') : '';
        const platforms = g.platforms ? g.platforms.map(x => x.platform.name).join(', ') : 'PC';
        const rating = g.rating ? (g.rating * 2).toFixed(1) : '';

        return {
          id: g.id,
          title: g.name || '',
          year,
          cover_url: g.background_image || '',
          genre: genres,
          platform: platforms,
          rawg_rating: rating,
          metacritic: g.metacritic ? g.metacritic.toString() : ''
        };
      });
    }
  } catch (e) {
    console.error('RAWG Search Error:', e);
  }
  return [];
}

async function getRawgDetails(apiKey, id) {
  if (!id || !apiKey) return null;
  const url = `https://api.rawg.io/api/games/${id}?key=${apiKey}`;
  try {
    const resp = await requestUrl({
      url,
      method: 'GET',
      headers: {
        'User-Agent': 'Obsidian-Herni-Databaze/1.0'
      }
    });

    if (resp.status === 200 && resp.json) {
      const d = resp.json;
      return {
        description: d.description_raw || d.description || '',
        website: d.website || '',
        playtime: d.playtime ? d.playtime.toString() : ''
      };
    }
  } catch (e) {
    console.error('RAWG Details Error:', e);
  }
  return null;
}

// ─── SEARCH MODAL ───

class GameSearchModal extends Modal {
  constructor(app, plugin, onSelectGame) {
    super(app);
    this.plugin = plugin;
    this.onSelectGame = onSelectGame;
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.empty();

    contentEl.createEl('h2', { text: '🎮 Hledat hru na RAWG.io' });

    const searchBox = contentEl.createDiv({ cls: 'search-box-row' });
    searchBox.style.cssText = 'display:flex;gap:8px;margin-bottom:16px;';

    const input = searchBox.createEl('input', { type: 'text', placeholder: 'Zadejte název hry (např. Cyberpunk 2077, GTA V, Witcher)...' });
    input.style.cssText = 'flex:1;padding:10px 14px;border-radius:8px;border:1px solid var(--background-modifier-border);background:var(--background-primary);color:var(--text-normal);font-size:1em;';

    const searchBtn = searchBox.createEl('button', { text: 'Hledat na RAWG' });
    searchBtn.style.cssText = 'padding:10px 18px;border-radius:8px;background:var(--interactive-accent);color:var(--text-on-accent);font-weight:bold;cursor:pointer;';

    const resultsContainer = contentEl.createDiv();
    resultsContainer.style.cssText = 'display:flex;flex-direction:column;gap:10px;max-height:400px;overflow-y:auto;padding-right:4px;';

    const manualBtn = contentEl.createEl('button', { text: '➕ Přidat hru ručně (bez hledání)' });
    manualBtn.style.cssText = 'margin-top:16px;width:100%;padding:10px;border-radius:8px;background:color-mix(in srgb, var(--interactive-accent) 15%, transparent);color:var(--interactive-accent);border:1px solid var(--interactive-accent);font-weight:bold;cursor:pointer;';
    manualBtn.addEventListener('click', () => {
      this.close();
      this.onSelectGame(null);
    });

    const doSearch = async () => {
      const q = input.value.trim();
      if (!q) return;

      resultsContainer.empty();
      resultsContainer.createEl('div', { text: '⏳ Vyhledávám na RAWG.io...', style: 'color:var(--text-muted);padding:16px;text-align:center;' });

      const apiKey = this.plugin.settings.rawgApiKey || '6da16180684e4a93bf3a95c5003738ab';
      const results = await searchRawg(apiKey, q);

      resultsContainer.empty();

      if (!results || results.length === 0) {
        resultsContainer.createEl('div', { text: '❌ Žádná hra nebyla nalezena.', style: 'color:var(--text-muted);padding:16px;text-align:center;' });
        return;
      }

      for (const game of results) {
        const item = resultsContainer.createDiv({ cls: 'game-result-card' });
        item.style.cssText = 'display:flex;gap:12px;padding:10px;border-radius:8px;border:1px solid var(--background-modifier-border);background:var(--background-secondary);cursor:pointer;align-items:center;transition:background 0.2s;';
        item.addEventListener('mouseenter', () => item.style.background = 'var(--background-primary)');
        item.addEventListener('mouseleave', () => item.style.background = 'var(--background-secondary)');

        if (game.cover_url) {
          const img = item.createEl('img');
          img.src = game.cover_url;
          img.style.cssText = 'width:60px;height:75px;object-fit:cover;border-radius:6px;flex-shrink:0;';
        } else {
          const iconPlaceholder = item.createDiv();
          iconPlaceholder.style.cssText = 'width:60px;height:75px;background:var(--background-modifier-border);border-radius:6px;display:flex;align-items:center;justify-content:center;font-size:1.5em;';
          iconPlaceholder.textContent = '🎮';
        }

        const info = item.createDiv();
        info.style.cssText = 'display:flex;flex-direction:column;gap:4px;flex:1;';

        const titleRow = info.createDiv();
        titleRow.style.cssText = 'display:flex;gap:8px;align-items:center;';
        titleRow.createEl('span', { text: game.title, style: 'font-weight:bold;font-size:1.05em;color:var(--text-normal);' });
        if (game.year) {
          titleRow.createEl('span', { text: `(${game.year})`, style: 'font-size:0.85em;color:var(--text-muted);' });
        }

        const subRow = info.createDiv();
        subRow.style.cssText = 'font-size:0.8em;color:var(--text-muted);';
        const parts = [];
        if (game.platform) parts.push(`💻 ${game.platform}`);
        if (game.genre) parts.push(`🎭 ${game.genre}`);
        if (game.rawg_rating) parts.push(`⭐ RAWG: ${game.rawg_rating}/10`);
        subRow.textContent = parts.join(' • ');

        item.addEventListener('click', async () => {
          this.close();
          new Notice(`⏳ Načítám detaily hry "${game.title}"...`);
          const details = await getRawgDetails(apiKey, game.id);
          if (details) {
            game.summary = details.description;
            if (details.playtime && details.playtime !== '0') {
              game.playtime = details.playtime;
            }
          }
          this.onSelectGame(game);
        });
      }
    };

    searchBtn.addEventListener('click', doSearch);
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') doSearch();
    });

    setTimeout(() => input.focus(), 100);
  }

  onClose() {
    this.contentEl.empty();
  }
}

// ─── ADD/EDIT GAME MODAL ───

class AddGameModal extends Modal {
  constructor(app, initialData, onSubmit) {
    super(app);
    this.onSubmit = onSubmit;
    this.gameData = {
      title: initialData ? initialData.title : '',
      platform: initialData && initialData.platform ? initialData.platform : 'PC',
      genre: initialData ? initialData.genre : 'RPG',
      status: 'completed',
      my_rating: initialData && initialData.rawg_rating ? Math.round(Number(initialData.rawg_rating)).toString() : '9',
      playtime_hours: initialData && initialData.playtime ? initialData.playtime : '40',
      release_year: initialData ? initialData.year : new Date().getFullYear().toString(),
      cover_url: initialData ? initialData.cover_url : '',
      notes: initialData && initialData.summary ? initialData.summary.substring(0, 500) : ''
    };
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.createEl('h2', { text: '🎮 Uložení hry do databáze' });

    new Setting(contentEl)
      .setName('Název hry')
      .addText(text => text.setValue(this.gameData.title).onChange(val => this.gameData.title = val));

    new Setting(contentEl)
      .setName('Platforma')
      .addDropdown(dd => dd
        .addOption('PC', 'PC')
        .addOption('PlayStation 5', 'PlayStation 5')
        .addOption('Xbox', 'Xbox')
        .addOption('Nintendo Switch', 'Nintendo Switch')
        .addOption('Mobil', 'Mobil')
        .setValue(this.gameData.platform)
        .onChange(val => this.gameData.platform = val));

    new Setting(contentEl)
      .setName('Žánr')
      .addText(text => text.setValue(this.gameData.genre).onChange(val => this.gameData.genre = val));

    new Setting(contentEl)
      .setName('Stav dohrání')
      .addDropdown(dd => dd
        .addOption('completed', '✅ Dohráno')
        .addOption('playing', '🎮 Hráno')
        .addOption('backlog', '📋 Chci si zahrát')
        .addOption('dropped', '❌ Nedohráno')
        .setValue(this.gameData.status)
        .onChange(val => this.gameData.status = val));

    new Setting(contentEl)
      .setName('Moje hodnocení (1 - 10)')
      .addText(text => text.setValue(this.gameData.my_rating).onChange(val => this.gameData.my_rating = val));

    new Setting(contentEl)
      .setName('Odehrané hodiny')
      .addText(text => text.setValue(this.gameData.playtime_hours).onChange(val => this.gameData.playtime_hours = val));

    new Setting(contentEl)
      .setName('Rok vydání')
      .addText(text => text.setValue(this.gameData.release_year).onChange(val => this.gameData.release_year = val));

    new Setting(contentEl)
      .setName('URL obalu / Posteru')
      .addText(text => text.setValue(this.gameData.cover_url).onChange(val => this.gameData.cover_url = val));

    new Setting(contentEl)
      .setName('Poznámky / Popis')
      .addTextArea(ta => ta.setValue(this.gameData.notes).onChange(val => this.gameData.notes = val));

    new Setting(contentEl)
      .addButton(btn => btn
        .setButtonText('Uložit hru do databáze')
        .setCta()
        .onClick(() => {
          if (!this.gameData.title.trim()) {
            new Notice('Zadejte prosím název hry');
            return;
          }
          this.close();
          this.onSubmit(this.gameData);
        }));
  }

  onClose() {
    this.contentEl.empty();
  }
}

// ─── SETTINGS TAB ───

class HerniDatabazeSettingTab extends PluginSettingTab {
  constructor(app, plugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display() {
    const { containerEl } = this;
    containerEl.empty();

    containerEl.createEl('h2', { text: '🎮 Herní Databáze — RAWG.io API Nastavení' });
    containerEl.createEl('p', { text: 'Zde můžete upravit váš API klíč pro vyhledávání her z databáze RAWG.io.' });

    new Setting(containerEl)
      .setName('RAWG API Key')
      .setDesc('Váš osobní API klíč z RAWG.io')
      .addText(text => text
        .setValue(this.plugin.settings.rawgApiKey)
        .onChange(async (val) => {
          this.plugin.settings.rawgApiKey = val.trim();
          await this.plugin.saveSettings();
        }));

    new Setting(containerEl)
      .addButton(btn => btn
        .setButtonText('Otestovat připojení k RAWG.io')
        .setCta()
        .onClick(async () => {
          new Notice('⏳ Testuji připojení k RAWG.io...');
          const results = await searchRawg(this.plugin.settings.rawgApiKey, 'Cyberpunk');
          if (results && results.length > 0) {
            new Notice('✅ RAWG.io API úspěšně připojeno a funkční!');
          } else {
            new Notice('❌ Nepodařilo se připojit k RAWG.io. Zkontrolujte váš API klíč.');
          }
        }));
  }
}

// ─── MAIN PLUGIN ───

module.exports = class HerniDatabazePlugin extends Plugin {
  async onload() {
    await this.loadSettings();

    this.addSettingTab(new HerniDatabazeSettingTab(this.app, this));

    this.addRibbonIcon('gamepad-2', 'Herní Databáze: Přidat hru', () => {
      this.startAddGameFlow();
    });

    this.addCommand({
      id: 'add-game',
      name: 'Přidat novou hru (vyhledat na RAWG.io)',
      callback: () => this.startAddGameFlow()
    });
  }

  startAddGameFlow() {
    new GameSearchModal(this.app, this, (selectedGame) => {
      new AddGameModal(this.app, selectedGame, async (data) => {
        await this.createGameNote(data);
      }).open();
    }).open();
  }

  async createGameNote(data) {
    const folder = this.app.vault.getAbstractFileByPath(FOLDER);
    if (!folder || !(folder instanceof TFolder)) {
      await this.app.vault.createFolder(FOLDER);
    }

    const safeTitle = data.title.replace(/[<>:"/\\|?*]/g, '').trim();
    const fileName = `${safeTitle}.md`;
    const filePath = `${FOLDER}/${fileName}`;

    const existing = this.app.vault.getAbstractFileByPath(filePath);
    if (existing instanceof TFile) {
      new Notice(`Hra "${data.title}" už v databázi existuje`);
      return existing;
    }

    const now = window.moment ? window.moment().format('DD.MM.YYYY') : '';
    const content = `---
cssclasses: homepage-dashboard
type: game
title: ${data.title || ''}
platform: ${data.platform || 'PC'}
genre: ${data.genre || ''}
status: ${data.status || 'completed'}
my_rating: ${data.my_rating || ''}
playtime_hours: ${data.playtime_hours || ''}
release_year: ${data.release_year || ''}
cover_url: ${data.cover_url || ''}
date_added: ${now}
tags: [hra]
notes: ${data.notes ? data.notes.replace(/\n/g, ' ') : ''}
---

\`\`\`dataviewjs
const ACCENT = '#c49a5a';
const container = dv.container;
container.classList.add('homepage-root');
container.style.setProperty('--moc-accent', ACCENT);

const page = dv.current();
const title = page.title || page.file.name;
const platform = page.platform || 'PC';
const genre = page.genre || '';
const status = page.status || 'completed';
const myRating = page.my_rating || '';
const playtime = page.playtime_hours || '';
const year = page.release_year || '';
const cover = page.cover_url || '';
const notes = page.notes || '';

const statusLabel = {
  completed: '✅ Dohráno',
  playing: '🎮 Hráno',
  backlog: '📋 Chci hrát',
  dropped: '❌ Nedohráno'
}[status] || status;

const header = container.createDiv({ cls: 'moc-header' });
const left = header.createDiv({ cls: 'moc-header-left' });
left.createEl('span', { text: '🎮', cls: 'moc-header-icon' });
left.createEl('h1', { text: title.toUpperCase() });

const card = container.createDiv({ cls: 'moc-card' });
card.style.cssText = 'padding:16px;display:flex;gap:16px;align-items:flex-start;margin-top:16px;';

if (cover) {
  const imgBox = card.createDiv();
  imgBox.style.cssText = 'width:140px;aspect-ratio:2/3;border-radius:8px;overflow:hidden;flex-shrink:0;';
  const img = imgBox.createEl('img');
  img.src = cover;
  img.style.cssText = 'width:100%;height:100%;object-fit:cover;';
}

const info = card.createDiv();
info.style.cssText = 'display:flex;flex-direction:column;gap:8px;flex:1;';

info.createEl('h2', { text: title, style: 'margin:0;color:var(--text-normal);' });

const metaRow = info.createDiv();
metaRow.style.cssText = 'display:flex;gap:8px;flex-wrap:wrap;font-size:0.85em;color:var(--text-muted);';

if (year) metaRow.createEl('span', { text: \`📅 \${year}\` });
if (platform) metaRow.createEl('span', { text: \`💻 \${platform}\` });
if (playtime) metaRow.createEl('span', { text: \`⏳ \${playtime}h\` });
metaRow.createEl('span', { text: statusLabel });

if (myRating) {
  const rat = info.createDiv();
  rat.style.cssText = 'font-weight:bold;color:var(--moc-accent);font-size:1.1em;';
  rat.textContent = \`★ \${myRating} / 10\`;
}

if (genre) {
  const g = info.createDiv();
  g.style.cssText = 'font-size:0.85em;color:var(--text-muted);';
  g.textContent = \`🎭 Žánr: \${genre}\`;
}

if (notes) {
  const n = info.createDiv();
  n.style.cssText = 'margin-top:8px;padding-top:8px;border-top:1px solid var(--background-modifier-border);font-size:0.9em;';
  n.textContent = notes;
}
\`\`\`
`;

    await this.app.vault.create(filePath, content);
    new Notice(`Hra "${data.title}" byla úspěšně přidána!`);
    await pushGameToSupabase(data);

    const newFile = this.app.vault.getAbstractFileByPath(filePath);
    if (newFile instanceof TFile) {
      this.app.workspace.openLinkText(newFile.path, '');
    }
  }

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }
};
