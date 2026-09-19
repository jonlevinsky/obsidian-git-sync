const { Plugin, PluginSettingTab, Setting, ItemView, Notice, Platform, Modal, requestUrl } = require('obsidian');

const VIEW_TYPE = 'levinskyj-shopping-list-view';
const SUPABASE_URL = 'https://bkgfohfmnbmascomaozv.supabase.co/rest/v1';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJrZ2ZvaGZtbmJtYXNjb21hb3p2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgzMzMwMzYsImV4cCI6MjEwMzkwOTAzNn0.RgxJDflLqIuBIH17imSvdLmbRjg8Fp3vDWK_O5u6w-c';

const DEFAULT_SETTINGS = {
  folder: 'Život/Nákupy',
  file: 'Nákupní seznam',
  openOnStartup: true,
  openInMain: true,
  categories: ['Jídlo', 'Nápoje', 'Drogerie', 'Domácnost', 'Elektronika', 'Ostatní'],
  stores: ['Lidl', 'Tesco', 'Kaufland', 'Albert', 'DM', 'Billa', 'Alza', 'Ostatní'],
  frequentItems: [
    { name: 'Mléko', amount: '1 l', category: 'Nápoje', store: 'Lidl', price: 25 },
    { name: 'Chléb', amount: '1 ks', category: 'Jídlo', store: 'Albert', price: 39 },
    { name: 'Máslo', amount: '1 ks', category: 'Jídlo', store: 'Kaufland', price: 55 },
    { name: 'Vajíčka', amount: '10 ks', category: 'Jídlo', store: 'Tesco', price: 49 },
    { name: 'Káva', amount: '1 ks', category: 'Nápoje', store: 'Tesco', price: 149 },
    { name: 'Toaletní papír', amount: '1 bal', category: 'Drogerie', store: 'DM', price: 89 },
    { name: 'Jablka', amount: '1 kg', category: 'Jídlo', store: 'Lidl', price: 35 },
    { name: 'Banány', amount: '1 kg', category: 'Jídlo', store: 'Lidl', price: 32 }
  ],
  collapsed: [],
  groupBy: 'store',
  filterTab: 'all',

  // Propojení s Levinskyj Finance & Supabase Cloud
  useSupabase: true,
  autoLogToFinance: true,
  financeFolder: 'Život/Finance',
  financeVydajeFile: 'Výdaje',
  defaultPaymentMethod: 'karta',
  promptPriceIfZero: true
};

const STORE_COLORS = {
  lidl: '#0050aa',
  tesco: '#ee1c25',
  kaufland: '#e2001a',
  albert: '#00703c',
  dm: '#00205b',
  billa: '#ffcc00',
  alza: '#1e88e5',
  ostatni: '#78909c'
};

const CATEGORY_COLORS = {
  jidlo: '#e07b54',
  napoje: '#4fc3f7',
  drogerie: '#ab47bc',
  domacnost: '#c49a5a',
  elektronika: '#26a69a',
  ostatni: '#9aa7b5'
};

// ══════════════════════════════════════════════
//  SUPABASE HELPERS
// ══════════════════════════════════════════════
async function supabaseRequest(endpoint, options = {}) {
  const headers = {
    'apikey': SUPABASE_KEY,
    'Authorization': `Bearer ${SUPABASE_KEY}`,
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };
  if (options.preferReturn) {
    headers['Prefer'] = 'return=representation';
  }

  try {
    const res = await requestUrl({
      url: `${SUPABASE_URL}/${endpoint}`,
      method: options.method || 'GET',
      headers: headers,
      body: options.body ? JSON.stringify(options.body) : undefined,
      throwOnError: false
    });
    if (res.status >= 200 && res.status < 300) {
      if (res.status === 204 || !res.text || !res.text.trim()) {
        return [];
      }
      try {
        return res.json;
      } catch {
        return [];
      }
    }
  } catch (e) {
    console.error('Supabase error:', e);
  }
  return null;
}

// ══════════════════════════════════════════════
//  PRICE PROMPT MODAL
// ══════════════════════════════════════════════
class PricePromptModal extends Modal {
  constructor(app, itemName, storeName, onConfirm) {
    super(app);
    this.itemName = itemName;
    this.storeName = storeName;
    this.onConfirm = onConfirm;
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.createEl('h3', { text: `Zadejte cenu: ${this.itemName}` });
    contentEl.createEl('p', {
      text: 'Tato položka nemá zadanou cenu. Zadejte zaplacenou částku pro automatický zápis do Výdajů ve Financích:',
      cls: 'sl-modal-desc'
    });

    const input = contentEl.createEl('input', {
      type: 'number',
      cls: 'sl-input',
      placeholder: 'Cena v Kč (např. 45)'
    });
    input.style.width = '100%';
    input.style.marginBottom = '16px';
    setTimeout(() => input.focus(), 50);

    const btnRow = contentEl.createDiv({ style: 'display: flex; gap: 8px; justify-content: flex-end;' });

    const btnSkip = btnRow.createEl('button', { text: 'Nezapisovat do financí', cls: 'sl-btn sl-btn-outline' });
    btnSkip.onclick = () => {
      this.close();
      this.onConfirm(null);
    };

    const btnOk = btnRow.createEl('button', { text: 'Zapsat do Výdajů 💰', cls: 'sl-btn sl-btn-primary' });
    const submit = () => {
      const val = parseFloat(input.value) || 0;
      this.close();
      this.onConfirm(val);
    };
    btnOk.onclick = submit;
    input.onkeydown = (e) => { if (e.key === 'Enter') submit(); };
  }

  onClose() {
    this.contentEl.empty();
  }
}

// ══════════════════════════════════════════════
//  PLUGIN CLASS
// ══════════════════════════════════════════════
class ShoppingListPlugin extends Plugin {
  async onload() {
    await this.loadSettings();
    this.addSettingTab(new ShoppingListSettingTab(this.app, this));

    this.addCommand({
      id: 'open-shopping-list',
      name: 'Otevřít nákupní seznam',
      callback: () => this.activateView()
    });

    this.addCommand({
      id: 'quick-add-shopping-item',
      name: 'Rychlé přidání položky do nákupního seznamu',
      callback: () => this.promptQuickAdd()
    });

    this.addCommand({
      id: 'clear-completed-shopping-items',
      name: 'Vyčistit nakoupené položky',
      callback: async () => {
        const leaf = this.app.workspace.getLeavesOfType(VIEW_TYPE)[0];
        const view = leaf && leaf.view;
        if (view && view.clearCompleted) {
          await view.clearCompleted();
        }
      }
    });

    if (!Platform.isMobile) {
      this.addRibbonIcon('shopping-cart', 'Levinskyj Shopping List', () => this.activateView());
    }

    this.registerView(VIEW_TYPE, (leaf) => new ShoppingListView(leaf, this));

    this.app.workspace.onLayoutReady(async () => {
      await this.ensureFiles();
      if (this.settings.openOnStartup) {
        this.activateView();
      }
    });
  }

  onunload() {
    this.app.workspace.detachLeavesOfType(VIEW_TYPE);
  }

  async activateView() {
    const { workspace } = this.app;
    let leaf = workspace.getLeavesOfType(VIEW_TYPE)[0];
    if (!leaf) {
      if (this.settings.openInMain) {
        leaf = workspace.getLeaf('tab');
      } else {
        leaf = workspace.getRightLeaf(false);
      }
      await leaf.setViewState({ type: VIEW_TYPE, active: true });
    }
    workspace.revealLeaf(leaf);
  }

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }

  get paths() {
    const f = this.settings.folder || DEFAULT_SETTINGS.folder;
    const file = this.settings.file || DEFAULT_SETTINGS.file;
    return {
      folder: f,
      file: `${f}/${file}.md`
    };
  }

  async ensureFolder(path) {
    if (!path) return;
    const parts = path.split('/');
    let cur = '';
    for (const part of parts) {
      if (!part) continue;
      cur = cur ? cur + '/' + part : part;
      if (!this.app.vault.getAbstractFileByPath(cur)) {
        try { await this.app.vault.createFolder(cur); } catch (e) { /* už existuje */ }
      }
    }
  }

  async ensureFiles() {
    await this.ensureFolder(this.paths.folder);
    const p = this.paths.file;
    if (!this.app.vault.getAbstractFileByPath(p)) {
      const initialContent =
        '# Nákupní seznam\n\n' +
        '| stav | položka | množství | kategorie | obchod | cena | priorita | poznámka |\n' +
        '| --- | --- | --- | --- | --- | ---: | --- | --- |\n' +
        '| [ ] | Mléko | 1 l | Nápoje | Lidl | 25 | Normální | Trvanlivé 3.5% |\n' +
        '| [ ] | Chléb | 1 ks | Jídlo | Albert | 39 | Vysoká | Šumava |\n' +
        '| [x] | Máslo | 1 ks | Jídlo | Kaufland | 55 | Normální | čerstvé |\n';
      try {
        await this.app.vault.create(p, initialContent);
      } catch (e) {
        new Notice('Shopping List: nelze vytvořit ' + p + ' — ' + e.message);
      }
    }
  }

  promptQuickAdd() {
    const leaf = this.app.workspace.getLeavesOfType(VIEW_TYPE)[0];
    if (leaf && leaf.view && leaf.view.focusQuickAdd) {
      this.activateView();
      leaf.view.focusQuickAdd();
    } else {
      this.activateView().then(() => {
        const l = this.app.workspace.getLeavesOfType(VIEW_TYPE)[0];
        if (l && l.view && l.view.focusQuickAdd) l.view.focusQuickAdd();
      });
    }
  }
}

// ══════════════════════════════════════════════
//  VIEW CLASS
// ══════════════════════════════════════════════
class ShoppingListView extends ItemView {
  constructor(leaf, plugin) {
    super(leaf);
    this.plugin = plugin;
    this.items = [];
    this.searchQuery = '';
    this.showDetailedForm = false;
    this.views = [];
  }

  getViewType() { return VIEW_TYPE; }
  getDisplayText() { return 'Nákupní seznam'; }
  getIcon() { return 'shopping-cart'; }

  async onOpen() {
    this.injectStyle();
    try {
      await this.load();
      this.render();
    } catch (e) {
      this.contentEl.setText('Chyba při načítání nákupního seznamu: ' + e.message);
    }
    this.views.push(this.app.vault.on('modify', (f) => this.onFileChanged(f)));
    this.views.push(this.app.vault.on('delete', (f) => this.onFileChanged(f)));
  }

  async onClose() {
    clearTimeout(this._t);
    for (const ref of this.views) this.app.vault.offref(ref);
    this.views = [];
  }

  onFileChanged(f) {
    if (!f || f.path !== this.plugin.paths.file) return;
    clearTimeout(this._t);
    this._t = setTimeout(() => this.reload(), 150);
  }

  async reload() {
    await this.load();
    this.render();
  }

  norm(s) {
    return String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
  }

  parseTable(md) {
    const items = [];
    const lines = md.split('\n');
    let i = 0;
    while (i < lines.length && !lines[i].trim().startsWith('|')) i++;
    if (i >= lines.length) return items;

    const hdr = lines[i].split('|').slice(1, -1).map(h => this.norm(h));
    const find = (...keys) => hdr.findIndex(h => keys.includes(h));

    const iStatus = find('stav', 'status', 'check', 'done');
    const iName = find('polozka', 'nazev', 'item', 'name');
    const iQty = find('mnozstvi', 'qty', 'amount');
    const iCat = find('kategorie', 'category');
    const iStore = find('obchod', 'store', 'prodejna');
    const iPrice = find('cena', 'price', 'castka');
    const iPrio = find('priorita', 'priority');
    const iNote = find('poznamka', 'note', 'desc');

    for (let j = i + 1; j < lines.length; j++) {
      const line = lines[j].trim();
      if (!line.startsWith('|')) continue;
      const cells = line.split('|').slice(1, -1).map(c => c.trim());
      if (cells.every(c => !c || /^:?-+:?$/.test(c))) continue;

      const rawStatus = (iStatus >= 0 ? cells[iStatus] : '').toLowerCase();
      const completed = rawStatus.includes('[x]') || rawStatus.includes('x') || rawStatus === 'ano';
      const name = (iName >= 0 ? cells[iName] : '') || cells[0] || '';
      if (!name) continue;

      const amount = (iQty >= 0 ? cells[iQty] : '') || '';
      const category = (iCat >= 0 ? cells[iCat] : '') || 'Ostatní';
      const store = (iStore >= 0 ? cells[iStore] : '') || 'Ostatní';
      const rawPrice = (iPrice >= 0 ? cells[iPrice] : '').replace(',', '.');
      const price = parseFloat(rawPrice.replace(/[^0-9.]/g, '')) || 0;
      const priority = (iPrio >= 0 ? cells[iPrio] : '') || 'Normální';
      const note = (iNote >= 0 ? cells[iNote] : '') || '';

      items.push({ id: j, completed, name, amount, category, store, price, priority, note });
    }
    return items;
  }

  generateTable(items) {
    let md = '# Nákupní seznam\n\n';
    md += '| stav | položka | množství | kategorie | obchod | cena | priorita | poznámka |\n';
    md += '| --- | --- | --- | --- | --- | ---: | --- | --- |\n';

    for (const item of items) {
      const st = item.completed ? '[x]' : '[ ]';
      const priceStr = item.price ? String(item.price) : '';
      md += `| ${st} | ${item.name} | ${item.amount || ''} | ${item.category || 'Ostatní'} | ${item.store || 'Ostatní'} | ${priceStr} | ${item.priority || 'Normální'} | ${item.note || ''} |\n`;
    }
    return md;
  }

  async load() {
    if (this.plugin.settings.useSupabase) {
      const cloudItems = await supabaseRequest('shopping_items?select=*&order=id.desc');
      if (Array.isArray(cloudItems)) {
        this.items = cloudItems.map(item => ({
          id: item.id,
          completed: !!item.completed,
          name: item.name || '',
          amount: item.amount || '1 ks',
          category: item.category || 'Jídlo',
          store: item.store || 'Lidl',
          price: parseFloat(item.price) || 0,
          priority: item.priority || 'Normální',
          note: item.note || ''
        }));
        await this.saveVaultOnly();
        return;
      }
    }

    const file = this.app.vault.getAbstractFileByPath(this.plugin.paths.file);
    if (!file) {
      this.items = [];
      return;
    }
    const md = await this.app.vault.read(file);
    this.items = this.parseTable(md);
  }

  async saveVaultOnly() {
    await this.plugin.ensureFiles();
    const file = this.app.vault.getAbstractFileByPath(this.plugin.paths.file);
    if (file) {
      const md = this.generateTable(this.items);
      await this.app.vault.modify(file, md);
    }
  }

  async saveVault() {
    await this.saveVaultOnly();
  }

  async logToFinance(item, priceOverride) {
    const price = priceOverride !== undefined ? priceOverride : item.price;
    if (!price || price <= 0) return;

    const today = new Date().toISOString().slice(0, 10);
    const storeStr = item.store ? ` (${item.store})` : '';
    const desc = `Nákup: ${item.name}${storeStr}`;

    let cat = this.norm(item.category);
    if (cat.includes('napoje') || cat.includes('jidlo') || cat.includes('potraviny')) cat = 'jidlo';
    else if (cat.includes('drogerie') || cat.includes('domacnost')) cat = 'bydleni';
    else if (cat.includes('elektronika')) cat = 'zabava';
    else cat = 'ostatni';

    const method = this.plugin.settings.defaultPaymentMethod || 'karta';

    if (this.plugin.settings.useSupabase) {
      await supabaseRequest('expenses', {
        method: 'POST',
        body: { date: today, title: desc, category: cat, method: method, amount: price }
      });
    }

    const folder = this.plugin.settings.financeFolder || 'Život/Finance';
    const fileName = this.plugin.settings.financeVydajeFile || 'Výdaje';
    const path = `${folder}/${fileName}.md`;

    await this.plugin.ensureFolder(folder);
    let file = this.app.vault.getAbstractFileByPath(path);
    if (!file) {
      const header = '| datum | popis | kategorie | zpusob | castka |\n| --- | --- | --- | --- | ---: |\n';
      try {
        file = await this.app.vault.create(path, header);
      } catch (e) {
        new Notice('Shopping List: nelze vytvořit ' + path + ' — ' + e.message);
        return;
      }
    }

    const row = `| ${today} | ${desc} | ${cat} | ${method} | ${price} |\n`;
    try {
      const content = await this.app.vault.read(file);
      await this.app.vault.modify(file, content.trimEnd() + '\n' + row);
      new Notice(`💰 Zapsáno do Výdajů (Finance): ${item.name} — ${price} Kč`);
    } catch (e) {
      new Notice('Shopping List: Chyba při zápisu do Výdajů — ' + e.message);
    }
  }

  smartParseInput(text) {
    let name = text.trim();
    let category = '';
    let store = '';
    let priority = 'Normální';
    let price = 0;
    let amount = '';

    const catMatch = name.match(/#([\wáeěíóúůýčďňřšťžÁEĚÍÓÚŮÝČĎŇŘŠŤŽ]+)/);
    if (catMatch) {
      category = catMatch[1];
      name = name.replace(catMatch[0], '');
    }

    const storeMatch = name.match(/@([\wáeěíóúůýčďňřšťžÁEĚÍÓÚŮÝČĎŇŘŠŤŽ]+)/);
    if (storeMatch) {
      store = storeMatch[1];
      name = name.replace(storeMatch[0], '');
    }

    if (/!(vysoka|vysoká|high|1)/i.test(name)) {
      priority = 'Vysoká';
      name = name.replace(/!(vysoka|vysoká|high|1)/i, '');
    } else if (/!(nizka|nízká|low|3)/i.test(name)) {
      priority = 'Nízká';
      name = name.replace(/!(nizka|nízká|low|3)/i, '');
    }

    const priceMatch = name.match(/(\d+(?:[.,]\d+)?)\s*(?:kč|czk)/i);
    if (priceMatch) {
      price = parseFloat(priceMatch[1].replace(',', '.'));
      name = name.replace(priceMatch[0], '');
    }

    const qtyMatch = name.match(/(\d+(?:[.,]\d+)?\s*(?:ks|g|kg|l|ml|bal|balení|pack))/i);
    if (qtyMatch) {
      amount = qtyMatch[1];
      name = name.replace(qtyMatch[0], '');
    }

    name = name.trim().replace(/\s+/g, ' ');

    if (!category) {
      const normName = this.norm(name);
      for (const c of this.plugin.settings.categories) {
        if (normName.includes(this.norm(c))) { category = c; break; }
      }
    }
    if (!store) {
      const normName = this.norm(name);
      for (const s of this.plugin.settings.stores) {
        if (normName.includes(this.norm(s))) { store = s; break; }
      }
    }

    return {
      name: name || text,
      amount: amount || '1 ks',
      category: category || this.plugin.settings.categories[0] || 'Jídlo',
      store: store || this.plugin.settings.stores[0] || 'Lidl',
      price: price || 0,
      priority: priority,
      note: ''
    };
  }

  // ══════════ RENDERING ══════════
  render() {
    const container = this.contentEl;
    container.empty();
    container.addClass('sl-container');

    this.renderHeaderStats(container);
    this.renderAddCard(container);
    this.renderFrequentCard(container);
    this.renderControls(container);
    this.renderItemsList(container);
  }

  renderHeaderStats(parent) {
    const total = this.items.length;
    const active = this.items.filter(i => !i.completed);
    const completed = this.items.filter(i => i.completed);

    const totalActiveCost = active.reduce((s, i) => s + (i.price || 0), 0);
    const totalCompletedCost = completed.reduce((s, i) => s + (i.price || 0), 0);

    const pct = total > 0 ? Math.round((completed.length / total) * 100) : 0;

    const card = parent.createDiv({ cls: 'sl-stats-card' });

    const metricsRow = card.createDiv({ cls: 'sl-stats-metrics' });

    const m1 = metricsRow.createDiv({ cls: 'sl-metric' });
    m1.createDiv({ cls: 'sl-metric-val', text: String(active.length) });
    m1.createDiv({ cls: 'sl-metric-lbl', text: 'K nákupu' });

    const m2 = metricsRow.createDiv({ cls: 'sl-metric' });
    m2.createDiv({ cls: 'sl-metric-val', text: `${totalActiveCost} Kč` });
    m2.createDiv({ cls: 'sl-metric-lbl', text: 'Odhadovaná cena' });

    const m3 = metricsRow.createDiv({ cls: 'sl-metric' });
    m3.createDiv({ cls: 'sl-metric-val', text: String(completed.length) });
    m3.createDiv({ cls: 'sl-metric-lbl', text: 'Nakoupeno' });

    const m4 = metricsRow.createDiv({ cls: 'sl-metric' });
    m4.createDiv({ cls: 'sl-metric-val', text: `${totalCompletedCost} Kč` });
    m4.createDiv({ cls: 'sl-metric-lbl', text: 'Utraceno' });

    const progressTrack = card.createDiv({ cls: 'sl-progress-track' });
    const progressBar = progressTrack.createDiv({ cls: 'sl-progress-fill' });
    progressBar.style.width = `${pct}%`;

    const progressLabel = card.createDiv({ cls: 'sl-progress-text' });
    progressLabel.setText(`Hotovo ${pct}% (${completed.length} z ${total} položek)`);

    const actionsRow = card.createDiv({ cls: 'sl-stats-actions' });

    const bClear = actionsRow.createEl('button', { cls: 'sl-btn sl-btn-secondary', text: 'Vyčistit nakoupené' });
    bClear.onclick = () => this.clearCompleted();

    const bCheckAll = actionsRow.createEl('button', { cls: 'sl-btn sl-btn-outline', text: 'Označit vše' });
    bCheckAll.onclick = async () => {
      for (const item of this.items) {
        if (!item.completed) {
          item.completed = true;
          if (this.plugin.settings.useSupabase) {
            await supabaseRequest(`shopping_items?id=eq.${item.id}`, {
              method: 'PATCH',
              body: { completed: true }
            });
          }
          if (this.plugin.settings.autoLogToFinance && item.price > 0) {
            await this.logToFinance(item);
          }
        }
      }
      await this.saveVault();
      this.render();
    };

    const bUncheckAll = actionsRow.createEl('button', { cls: 'sl-btn sl-btn-outline', text: 'Odznačit vše' });
    bUncheckAll.onclick = async () => {
      for (const item of this.items) {
        item.completed = false;
        if (this.plugin.settings.useSupabase) {
          await supabaseRequest(`shopping_items?id=eq.${item.id}`, {
            method: 'PATCH',
            body: { completed: false }
          });
        }
      }
      await this.saveVault();
      this.render();
    };
  }

  renderAddCard(parent) {
    const card = parent.createDiv({ cls: 'sl-add-card' });
    card.createEl('h3', { text: 'Přidat položku', cls: 'sl-card-title' });

    const quickRow = card.createDiv({ cls: 'sl-add-quick-row' });
    const inputEl = quickRow.createEl('input', {
      cls: 'sl-input sl-quick-input',
      placeholder: 'Název položky... (např. Šunka 200g #Jídlo @Lidl 49Kč !vysoká)'
    });
    this.quickInputEl = inputEl;

    const btnAdd = quickRow.createEl('button', { cls: 'sl-btn sl-btn-primary', text: 'Přidat' });

    const submitQuick = async () => {
      const val = inputEl.value.trim();
      if (!val) return;
      const parsed = this.smartParseInput(val);
      const newItem = {
        id: Date.now(),
        completed: false,
        name: parsed.name,
        amount: parsed.amount,
        category: parsed.category,
        store: parsed.store,
        price: parsed.price,
        priority: parsed.priority,
        note: parsed.note
      };

      if (this.plugin.settings.useSupabase) {
        await supabaseRequest('shopping_items', {
          method: 'POST',
          body: newItem
        });
      }

      this.items.unshift(newItem);
      inputEl.value = '';
      await this.saveVault();
      this.render();
    };

    btnAdd.onclick = submitQuick;
    inputEl.onkeydown = (e) => { if (e.key === 'Enter') submitQuick(); };
  }

  renderFrequentCard(parent) {
    const frequents = this.plugin.settings.frequentItems || [];
    if (frequents.length === 0) return;

    const card = parent.createDiv({ cls: 'sl-frequent-card' });
    card.createDiv({ cls: 'sl-frequent-title', text: 'Časté položky (1-klik přidání):' });

    const chipsDiv = card.createDiv({ cls: 'sl-chips-wrapper' });
    for (const f of frequents) {
      const chip = chipsDiv.createDiv({ cls: 'sl-chip' });
      chip.setText(`+ ${f.name} (${f.amount || '1 ks'})`);
      chip.onclick = async () => {
        const newItem = {
          id: Date.now(),
          completed: false,
          name: f.name,
          amount: f.amount || '1 ks',
          category: f.category || 'Jídlo',
          store: f.store || 'Lidl',
          price: f.price || 0,
          priority: f.priority || 'Normální',
          note: f.note || ''
        };

        if (this.plugin.settings.useSupabase) {
          await supabaseRequest('shopping_items', {
            method: 'POST',
            body: newItem
          });
        }

        this.items.unshift(newItem);
        await this.saveVault();
        this.render();
        new Notice(`Přidáno: ${f.name}`);
      };
    }
  }

  renderControls(parent) {
    const controls = parent.createDiv({ cls: 'sl-controls' });

    const searchWrapper = controls.createDiv({ cls: 'sl-search-wrapper' });
    const searchInput = searchWrapper.createEl('input', {
      cls: 'sl-input sl-search-input',
      placeholder: 'Hledat v seznamu...'
    });
    searchInput.value = this.searchQuery;
    searchInput.oninput = (e) => {
      this.searchQuery = e.target.value;
      this.renderItemsListOnly();
    };

    const filterTabs = controls.createDiv({ cls: 'sl-filter-tabs' });
    const tabs = [
      { id: 'all', label: 'Vše' },
      { id: 'active', label: 'K nákupu' },
      { id: 'completed', label: 'Nakoupeno' }
    ];
    for (const tab of tabs) {
      const btn = filterTabs.createEl('button', {
        cls: `sl-tab-btn ${this.plugin.settings.filterTab === tab.id ? 'active' : ''}`,
        text: tab.label
      });
      btn.onclick = async () => {
        this.plugin.settings.filterTab = tab.id;
        await this.plugin.saveSettings();
        this.render();
      };
    }

    const groupSwitcher = controls.createDiv({ cls: 'sl-group-switcher' });
    groupSwitcher.createEl('span', { text: 'Grupovat: ', cls: 'sl-group-lbl' });
    const groups = [
      { id: 'store', label: 'Obchod' },
      { id: 'category', label: 'Kategorie' },
      { id: 'none', label: 'Seznam' }
    ];
    for (const g of groups) {
      const btn = groupSwitcher.createEl('button', {
        cls: `sl-group-btn ${this.plugin.settings.groupBy === g.id ? 'active' : ''}`,
        text: g.label
      });
      btn.onclick = async () => {
        this.plugin.settings.groupBy = g.id;
        await this.plugin.saveSettings();
        this.render();
      };
    }
  }

  renderItemsList(parent) {
    let listContainer = parent.querySelector('.sl-items-container');
    if (!listContainer) {
      listContainer = parent.createDiv({ cls: 'sl-items-container' });
    } else {
      listContainer.empty();
    }

    let filtered = this.items;

    const tab = this.plugin.settings.filterTab;
    if (tab === 'active') filtered = filtered.filter(i => !i.completed);
    else if (tab === 'completed') filtered = filtered.filter(i => i.completed);

    if (this.searchQuery.trim()) {
      const q = this.norm(this.searchQuery);
      filtered = filtered.filter(i =>
        this.norm(i.name).includes(q) ||
        this.norm(i.store).includes(q) ||
        this.norm(i.category).includes(q) ||
        this.norm(i.note).includes(q)
      );
    }

    if (filtered.length === 0) {
      const emptyDiv = listContainer.createDiv({ cls: 'sl-empty-state' });
      emptyDiv.createEl('div', { cls: 'sl-empty-icon', text: '🛒' });
      emptyDiv.createEl('div', { cls: 'sl-empty-text', text: 'Žádné položky neodpovídají zobrazení.' });
      return;
    }

    const groupBy = this.plugin.settings.groupBy;

    if (groupBy === 'store' || groupBy === 'category') {
      const groups = {};
      for (const item of filtered) {
        const key = groupBy === 'store' ? (item.store || 'Ostatní') : (item.category || 'Ostatní');
        if (!groups[key]) groups[key] = [];
        groups[key].push(item);
      }

      for (const [groupName, groupItems] of Object.entries(groups)) {
        this.renderGroupCard(listContainer, groupName, groupItems, groupBy);
      }
    } else {
      const card = listContainer.createDiv({ cls: 'sl-group-card' });
      const ul = card.createEl('ul', { cls: 'sl-item-list' });
      for (const item of filtered) {
        this.renderItemRow(ul, item);
      }
    }
  }

  renderItemsListOnly() {
    const listContainer = this.contentEl.querySelector('.sl-items-container');
    if (listContainer) {
      this.renderItemsList(this.contentEl);
    } else {
      this.render();
    }
  }

  renderGroupCard(parent, groupName, items, groupType) {
    const groupCard = parent.createDiv({ cls: 'sl-group-card' });
    const isCollapsed = (this.plugin.settings.collapsed || []).includes(`${groupType}:${groupName}`);

    const header = groupCard.createDiv({ cls: 'sl-group-header' });
    const titleDiv = header.createDiv({ cls: 'sl-group-title' });

    const dot = titleDiv.createSpan({ cls: 'sl-color-dot' });
    const colorKey = this.norm(groupName);
    const colorMap = groupType === 'store' ? STORE_COLORS : CATEGORY_COLORS;
    dot.style.backgroundColor = colorMap[colorKey] || '#9aa7b5';

    titleDiv.createSpan({ text: groupName, cls: 'sl-group-name' });

    const totalCost = items.reduce((s, i) => s + (i.price || 0), 0);
    const activeCount = items.filter(i => !i.completed).length;

    const metaDiv = header.createDiv({ cls: 'sl-group-meta' });
    metaDiv.createSpan({ text: `${activeCount}/${items.length} ks`, cls: 'sl-group-count' });
    if (totalCost > 0) {
      metaDiv.createSpan({ text: `${totalCost} Kč`, cls: 'sl-group-cost' });
    }

    const collapseBtn = metaDiv.createEl('button', {
      cls: 'sl-btn-collapse',
      text: isCollapsed ? '►' : '▼'
    });

    collapseBtn.onclick = async (e) => {
      e.stopPropagation();
      const key = `${groupType}:${groupName}`;
      let collapsed = this.plugin.settings.collapsed || [];
      if (collapsed.includes(key)) {
        collapsed = collapsed.filter(k => k !== key);
      } else {
        collapsed.push(key);
      }
      this.plugin.settings.collapsed = collapsed;
      await this.plugin.saveSettings();
      this.render();
    };

    if (!isCollapsed) {
      const ul = groupCard.createEl('ul', { cls: 'sl-item-list' });
      for (const item of items) {
        this.renderItemRow(ul, item);
      }
    }
  }

  renderItemRow(parentUl, item) {
    const li = parentUl.createEl('li', { cls: `sl-item-row ${item.completed ? 'completed' : ''}` });

    const cbWrapper = li.createDiv({ cls: 'sl-cb-wrapper' });
    const cb = cbWrapper.createEl('input', { type: 'checkbox', cls: 'sl-checkbox' });
    cb.checked = item.completed;

    cb.onchange = async () => {
      const isChecking = cb.checked;
      item.completed = isChecking;

      if (this.plugin.settings.useSupabase) {
        await supabaseRequest(`shopping_items?id=eq.${item.id}`, {
          method: 'PATCH',
          body: { completed: isChecking }
        });
      }

      if (isChecking && this.plugin.settings.autoLogToFinance) {
        if (item.price > 0) {
          await this.logToFinance(item);
        } else if (this.plugin.settings.promptPriceIfZero) {
          new PricePromptModal(this.app, item.name, item.store, async (enteredPrice) => {
            if (enteredPrice !== null && enteredPrice > 0) {
              item.price = enteredPrice;
              if (this.plugin.settings.useSupabase) {
                await supabaseRequest(`shopping_items?id=eq.${item.id}`, {
                  method: 'PATCH',
                  body: { price: enteredPrice }
                });
              }
              await this.logToFinance(item, enteredPrice);
            }
            await this.saveVault();
            this.render();
          }).open();
          return;
        }
      }

      await this.saveVault();
      this.render();
    };

    const content = li.createDiv({ cls: 'sl-item-content' });

    const titleRow = content.createDiv({ cls: 'sl-item-title-row' });
    titleRow.createSpan({ text: item.name, cls: 'sl-item-name' });

    if (item.amount) {
      titleRow.createSpan({ text: item.amount, cls: 'sl-pill sl-pill-qty' });
    }

    if (item.price > 0) {
      titleRow.createSpan({ text: `${item.price} Kč`, cls: 'sl-pill sl-pill-price' });
    }

    if (item.priority === 'Vysoká') {
      titleRow.createSpan({ text: '🔥 Vysoká', cls: 'sl-pill sl-pill-prio-high' });
    }

    const subRow = content.createDiv({ cls: 'sl-item-sub-row' });

    if (item.store) {
      const sPill = subRow.createSpan({ text: `@${item.store}`, cls: 'sl-sub-tag sl-sub-store' });
      const storeKey = this.norm(item.store);
      if (STORE_COLORS[storeKey]) {
        sPill.style.color = STORE_COLORS[storeKey];
      }
    }

    if (item.category) {
      subRow.createSpan({ text: `#${item.category}`, cls: 'sl-sub-tag sl-sub-cat' });
    }

    if (item.note) {
      subRow.createSpan({ text: `💬 ${item.note}`, cls: 'sl-sub-tag sl-sub-note' });
    }

    const actions = li.createDiv({ cls: 'sl-item-actions' });
    const btnDel = actions.createEl('button', { cls: 'sl-btn-icon-del', text: '✕', title: 'Smazat položku' });

    btnDel.onclick = async () => {
      if (this.plugin.settings.useSupabase) {
        await supabaseRequest(`shopping_items?id=eq.${item.id}`, { method: 'DELETE' });
      }
      this.items = this.items.filter(i => i !== item);
      await this.saveVault();
      this.render();
      new Notice(`Smazáno: ${item.name}`);
    };
  }

  async clearCompleted() {
    const completedItems = this.items.filter(i => i.completed);
    if (completedItems.length === 0) {
      new Notice('Žádné nakoupené položky k vyčištění.');
      return;
    }
    for (const item of completedItems) {
      if (this.plugin.settings.useSupabase) {
        await supabaseRequest(`shopping_items?id=eq.${item.id}`, { method: 'DELETE' });
      }
    }
    this.items = this.items.filter(i => !i.completed);
    await this.saveVault();
    this.render();
    new Notice(`Vyčištěno ${completedItems.length} nakoupených položek.`);
  }

  focusQuickAdd() {
    if (this.quickInputEl) {
      this.quickInputEl.focus();
      this.quickInputEl.select();
    }
  }

  injectStyle() {
    if (document.getElementById('levinskyj-shopping-list-css')) return;
    const el = document.createElement('style');
    el.id = 'levinskyj-shopping-list-css';
    el.textContent = `
      /* ── Base ────────────────────────────────────────────── */
      .sl-container {
        padding: 16px;
        font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", "Bricolage Grotesque", sans-serif;
        color: #E0E0E0;
        max-width: 900px;
        margin: 0 auto;
        --sl-accent: #5B8DEF;
        --sl-accent-rgb: 91, 141, 239;
        --sl-surface: rgba(30, 30, 30, 0.55);
        --sl-surface-solid: #1E1E1E;
        --sl-surface-hover: rgba(255, 255, 255, 0.06);
        --sl-border: rgba(255, 255, 255, 0.08);
        --sl-border-hover: rgba(255, 255, 255, 0.15);
        --sl-text: #E0E0E0;
        --sl-text-muted: rgba(255, 255, 255, 0.45);
        --sl-radius: 14px;
        --sl-radius-sm: 10px;
        --sl-radius-pill: 100px;
        --sl-shadow: 0 8px 32px rgba(0, 0, 0, 0.35), 0 2px 8px rgba(0, 0, 0, 0.2);
        --sl-shadow-sm: 0 4px 16px rgba(0, 0, 0, 0.25);
        --sl-glass-blur: blur(24px) saturate(1.4);
        --sl-transition: 150ms ease-out;
      }

      /* ── Cards (Glass) ───────────────────────────────────── */
      .sl-stats-card, .sl-add-card, .sl-frequent-card, .sl-group-card {
        background: var(--sl-surface);
        backdrop-filter: var(--sl-glass-blur);
        -webkit-backdrop-filter: var(--sl-glass-blur);
        border: 1px solid var(--sl-border);
        border-radius: var(--sl-radius);
        padding: 18px;
        margin-bottom: 16px;
        box-shadow: var(--sl-shadow);
        transition: box-shadow var(--sl-transition), border-color var(--sl-transition);
      }
      .sl-stats-card:hover, .sl-add-card:hover, .sl-frequent-card:hover, .sl-group-card:hover {
        border-color: var(--sl-border-hover);
        box-shadow: var(--sl-shadow), 0 0 0 1px rgba(var(--sl-accent-rgb), 0.08);
      }
      .sl-card-title {
        margin: 0 0 14px 0;
        font-size: 1.1em;
        font-weight: 700;
        color: var(--sl-text);
        letter-spacing: -0.01em;
      }

      /* ── Stats Metrics ───────────────────────────────────── */
      .sl-stats-metrics {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(110px, 1fr));
        gap: 10px;
        margin-bottom: 16px;
      }
      .sl-metric {
        background: rgba(255, 255, 255, 0.04);
        border-radius: var(--sl-radius-sm);
        padding: 12px 10px;
        text-align: center;
        border: 1px solid var(--sl-border);
        transition: background var(--sl-transition), border-color var(--sl-transition);
      }
      .sl-metric:hover {
        background: rgba(var(--sl-accent-rgb), 0.06);
        border-color: rgba(var(--sl-accent-rgb), 0.2);
      }
      .sl-metric-val {
        font-size: 1.3em;
        font-weight: 800;
        color: var(--sl-accent);
        letter-spacing: -0.02em;
      }
      .sl-metric-lbl {
        font-size: 0.75em;
        color: var(--sl-text-muted);
        margin-top: 3px;
        text-transform: uppercase;
        letter-spacing: 0.04em;
      }

      /* ── Progress ────────────────────────────────────────── */
      .sl-progress-track {
        height: 6px;
        background: rgba(255, 255, 255, 0.06);
        border-radius: 3px;
        overflow: hidden;
        margin-bottom: 6px;
      }
      .sl-progress-fill {
        height: 100%;
        background: linear-gradient(90deg, var(--sl-accent), #A78BFA);
        border-radius: 3px;
        transition: width 300ms ease-out;
      }
      .sl-progress-text {
        font-size: 0.8em;
        color: var(--sl-text-muted);
        text-align: right;
        margin-bottom: 12px;
      }

      /* ── Buttons ─────────────────────────────────────────── */
      .sl-stats-actions {
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
      }
      .sl-btn {
        padding: 7px 16px;
        border-radius: var(--sl-radius-pill);
        font-weight: 600;
        font-size: 0.85em;
        cursor: pointer;
        border: none;
        font-family: inherit;
        transition: all var(--sl-transition);
        letter-spacing: -0.01em;
      }
      .sl-btn-primary {
        background: var(--sl-accent);
        color: #fff;
        box-shadow: 0 2px 12px rgba(var(--sl-accent-rgb), 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.12);
      }
      .sl-btn-primary:hover {
        background: #6E9AF5;
        box-shadow: 0 4px 20px rgba(var(--sl-accent-rgb), 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.15);
        transform: translateY(-1px);
      }
      .sl-btn-primary:active {
        transform: translateY(0);
      }
      .sl-btn-secondary {
        background: rgba(239, 68, 68, 0.85);
        color: #fff;
        box-shadow: 0 2px 10px rgba(239, 68, 68, 0.3);
      }
      .sl-btn-secondary:hover {
        background: rgba(239, 68, 68, 1);
        transform: translateY(-1px);
      }
      .sl-btn-outline {
        background: transparent;
        border: 1px solid var(--sl-border);
        color: var(--sl-text-muted);
      }
      .sl-btn-outline:hover {
        background: var(--sl-surface-hover);
        border-color: var(--sl-border-hover);
        color: var(--sl-text);
      }
      .sl-btn-icon {
        padding: 6px 10px;
        background: rgba(255, 255, 255, 0.04);
        border: 1px solid var(--sl-border);
        color: var(--sl-text-muted);
        border-radius: var(--sl-radius-sm);
      }
      .sl-btn-icon:hover {
        background: var(--sl-surface-hover);
        color: var(--sl-text);
        border-color: var(--sl-border-hover);
      }

      /* ── Quick Add Row ───────────────────────────────────── */
      .sl-add-quick-row {
        display: flex;
        gap: 8px;
      }
      .sl-input, .sl-select {
        padding: 9px 14px;
        border-radius: var(--sl-radius-sm);
        border: 1px solid var(--sl-border);
        background: rgba(255, 255, 255, 0.04);
        color: var(--sl-text);
        font-size: 0.9em;
        font-family: inherit;
        transition: border-color var(--sl-transition), background var(--sl-transition);
        outline: none;
      }
      .sl-input:focus, .sl-select:focus {
        border-color: rgba(var(--sl-accent-rgb), 0.5);
        background: rgba(255, 255, 255, 0.06);
        box-shadow: 0 0 0 3px rgba(var(--sl-accent-rgb), 0.1);
      }
      .sl-quick-input {
        flex: 1;
      }

      /* ── Chips / Frequent Items ──────────────────────────── */
      .sl-frequent-title {
        font-size: 0.82em;
        font-weight: 600;
        color: var(--sl-text-muted);
        margin-bottom: 8px;
        text-transform: uppercase;
        letter-spacing: 0.05em;
      }
      .sl-chips-wrapper {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
      }
      .sl-chip {
        padding: 5px 12px;
        background: var(--sl-surface);
        backdrop-filter: blur(12px);
        -webkit-backdrop-filter: blur(12px);
        border: 1px solid var(--sl-border);
        border-radius: var(--sl-radius-pill);
        font-size: 0.82em;
        font-weight: 500;
        cursor: pointer;
        color: var(--sl-text);
        transition: all var(--sl-transition);
        font-family: inherit;
      }
      .sl-chip:hover {
        background: rgba(var(--sl-accent-rgb), 0.12);
        border-color: rgba(var(--sl-accent-rgb), 0.35);
        color: var(--sl-accent);
        transform: translateY(-1px);
        box-shadow: 0 2px 8px rgba(var(--sl-accent-rgb), 0.15);
      }

      /* ── Controls Bar ────────────────────────────────────── */
      .sl-controls {
        display: flex;
        flex-wrap: wrap;
        gap: 12px;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 16px;
      }
      .sl-search-wrapper {
        flex: 1;
        min-width: 180px;
      }
      .sl-search-input {
        width: 100%;
      }

      /* ── Tabs / Group Switcher (Pills) ───────────────────── */
      .sl-filter-tabs, .sl-group-switcher {
        display: flex;
        gap: 4px;
        align-items: center;
        background: rgba(255, 255, 255, 0.03);
        border-radius: var(--sl-radius-pill);
        padding: 3px;
        border: 1px solid var(--sl-border);
      }
      .sl-tab-btn, .sl-group-btn {
        padding: 5px 12px;
        font-size: 0.8em;
        font-weight: 500;
        border-radius: var(--sl-radius-pill);
        background: transparent;
        border: none;
        color: var(--sl-text-muted);
        cursor: pointer;
        transition: all var(--sl-transition);
        font-family: inherit;
      }
      .sl-tab-btn:hover, .sl-group-btn:hover {
        color: var(--sl-text);
        background: rgba(255, 255, 255, 0.06);
      }
      .sl-tab-btn.active, .sl-group-btn.active {
        background: var(--sl-accent);
        color: #fff;
        box-shadow: 0 2px 8px rgba(var(--sl-accent-rgb), 0.3);
      }

      /* ── Group Header ────────────────────────────────────── */
      .sl-group-lbl {
        font-size: 0.8em;
        color: var(--sl-text-muted);
        margin-right: 2px;
      }
      .sl-group-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding-bottom: 10px;
        margin-bottom: 8px;
        border-bottom: 1px solid var(--sl-border);
      }
      .sl-group-title {
        display: flex;
        align-items: center;
        gap: 8px;
        font-weight: 700;
        font-size: 1.05em;
        color: var(--sl-text);
      }
      .sl-color-dot {
        width: 10px;
        height: 10px;
        border-radius: 50%;
        display: inline-block;
        box-shadow: 0 0 6px rgba(0, 0, 0, 0.3);
      }
      .sl-group-meta {
        display: flex;
        align-items: center;
        gap: 10px;
        font-size: 0.85em;
      }
      .sl-group-count {
        color: var(--sl-text-muted);
      }
      .sl-group-cost {
        font-weight: 700;
        color: var(--sl-accent);
      }
      .sl-btn-collapse {
        background: none;
        border: none;
        color: var(--sl-text-muted);
        cursor: pointer;
        padding: 3px 6px;
        transition: color var(--sl-transition);
      }
      .sl-btn-collapse:hover {
        color: var(--sl-text);
      }

      /* ── Item List ───────────────────────────────────────── */
      .sl-item-list {
        list-style: none;
        padding: 0;
        margin: 0;
      }
      .sl-item-row {
        display: flex;
        align-items: flex-start;
        gap: 10px;
        padding: 9px 8px;
        border-radius: var(--sl-radius-sm);
        border-bottom: 1px solid rgba(255, 255, 255, 0.04);
        transition: background var(--sl-transition);
      }
      .sl-item-row:last-child {
        border-bottom: none;
      }
      .sl-item-row:hover {
        background: rgba(var(--sl-accent-rgb), 0.05);
      }
      .sl-item-row.completed {
        opacity: 0.5;
      }
      .sl-item-row.completed .sl-item-name {
        text-decoration: line-through;
        color: var(--sl-text-muted);
      }

      /* ── Custom Round Checkbox ───────────────────────────── */
      .sl-cb-wrapper {
        padding-top: 2px;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .sl-checkbox {
        width: 18px;
        height: 18px;
        cursor: pointer;
        appearance: none;
        -webkit-appearance: none;
        border-radius: 50%;
        border: 2px solid rgba(255, 255, 255, 0.2);
        background: transparent;
        transition: all var(--sl-transition);
        position: relative;
        flex-shrink: 0;
      }
      .sl-checkbox:checked {
        background: var(--sl-accent);
        border-color: var(--sl-accent);
        box-shadow: 0 0 0 2px rgba(var(--sl-accent-rgb), 0.2);
      }
      .sl-checkbox:checked::after {
        content: '';
        position: absolute;
        top: 2px; left: 5px;
        width: 4px; height: 7px;
        border: solid #fff;
        border-width: 0 2px 2px 0;
        transform: rotate(45deg);
      }
      .sl-checkbox:hover {
        border-color: var(--sl-accent);
      }

      /* ── Item Content ────────────────────────────────────── */
      .sl-item-content {
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 3px;
      }
      .sl-item-title-row {
        display: flex;
        align-items: center;
        gap: 8px;
        flex-wrap: wrap;
      }
      .sl-item-name {
        font-weight: 600;
        font-size: 0.95em;
        color: var(--sl-text);
        transition: color var(--sl-transition);
      }

      /* ── Pills (qty, price, priority) ────────────────────── */
      .sl-pill {
        font-size: 0.72em;
        padding: 2px 8px;
        border-radius: var(--sl-radius-pill);
        font-weight: 600;
        letter-spacing: 0.01em;
      }
      .sl-pill-qty {
        background: rgba(255, 255, 255, 0.06);
        border: 1px solid var(--sl-border);
        color: var(--sl-text);
      }
      .sl-pill-price {
        background: rgba(52, 211, 153, 0.12);
        color: #34D399;
        font-weight: 700;
      }
      .sl-pill-prio-high {
        background: rgba(239, 68, 68, 0.12);
        color: #F87171;
        font-weight: 700;
      }

      /* ── Sub-row (tags, store) ───────────────────────────── */
      .sl-item-sub-row {
        display: flex;
        gap: 8px;
        font-size: 0.78em;
        color: var(--sl-text-muted);
        flex-wrap: wrap;
      }
      .sl-sub-tag {
        display: inline-block;
      }
      .sl-sub-store {
        font-weight: 600;
        color: rgba(var(--sl-accent-rgb), 0.7);
      }

      /* ── Item Actions ────────────────────────────────────── */
      .sl-item-actions {
        display: flex;
        align-items: center;
      }
      .sl-btn-icon-del {
        background: none;
        border: none;
        color: var(--sl-text-muted);
        cursor: pointer;
        padding: 3px 6px;
        font-size: 0.9em;
        border-radius: 6px;
        transition: all var(--sl-transition);
      }
      .sl-btn-icon-del:hover {
        color: #F87171;
        background: rgba(239, 68, 68, 0.1);
      }

      /* ── Empty State ─────────────────────────────────────── */
      .sl-empty-state {
        text-align: center;
        padding: 44px 16px;
        color: var(--sl-text-muted);
      }
      .sl-empty-icon {
        font-size: 2.5em;
        margin-bottom: 10px;
        opacity: 0.6;
      }
      .sl-modal-desc {
        font-size: 0.88em;
        color: var(--sl-text-muted);
        margin-bottom: 12px;
        line-height: 1.5;
      }
    `;
    document.head.appendChild(el);
  }
}

// ══════════════════════════════════════════════
//  SETTINGS TAB
// ══════════════════════════════════════════════
class ShoppingListSettingTab extends PluginSettingTab {
  constructor(app, plugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display() {
    const { containerEl } = this;
    containerEl.empty();
    containerEl.createEl('h2', { text: 'Levinskyj Shopping List' });

    new Setting(containerEl)
      .setName('Používat Supabase Cloud')
      .setDesc('Načítat a synchronizovat data přímo se Supabase cloud databází (sdíleno s Android aplikací).')
      .addToggle(t => t
        .setValue(this.plugin.settings.useSupabase)
        .onChange(async v => {
          this.plugin.settings.useSupabase = v;
          await this.plugin.saveSettings();
        }));

    new Setting(containerEl)
      .setName('Složka nákupů')
      .setDesc('Cílová složka pro lokální zálohu nákupního seznamu.')
      .addText(t => t
        .setValue(this.plugin.settings.folder)
        .setPlaceholder('Život/Nákupy')
        .onChange(async v => {
          this.plugin.settings.folder = v.trim();
          await this.plugin.saveSettings();
        }));

    new Setting(containerEl)
      .setName('Název souboru')
      .setDesc('Název souboru nákupního seznamu (bez .md).')
      .addText(t => t
        .setValue(this.plugin.settings.file)
        .setPlaceholder('Nákupní seznam')
        .onChange(async v => {
          this.plugin.settings.file = v.trim() || 'Nákupní seznam';
          await this.plugin.saveSettings();
        }));

    containerEl.createEl('h3', { text: '💰 Propojení s Levinskyj Finance' });

    new Setting(containerEl)
      .setName('Automaticky zapisovat do Výdajů')
      .setDesc('Při odškrtnutí položky jako nakoupené se automaticky zapiše řádek do Výdajů (Supabase + Markdown).')
      .addToggle(t => t
        .setValue(this.plugin.settings.autoLogToFinance)
        .onChange(async v => {
          this.plugin.settings.autoLogToFinance = v;
          await this.plugin.saveSettings();
        }));

    new Setting(containerEl)
      .setName('Složka financí')
      .setDesc('Cílová složka pro Levinskyj Finance (kde je Výdaje.md).')
      .addText(t => t
        .setValue(this.plugin.settings.financeFolder)
        .setPlaceholder('Život/Finance')
        .onChange(async v => {
          this.plugin.settings.financeFolder = v.trim();
          await this.plugin.saveSettings();
        }));

    new Setting(containerEl)
      .setName('Soubor výdajů')
      .setDesc('Název souboru výdajů bez .md extension.')
      .addText(t => t
        .setValue(this.plugin.settings.financeVydajeFile)
        .setPlaceholder('Výdaje')
        .onChange(async v => {
          this.plugin.settings.financeVydajeFile = v.trim() || 'Výdaje';
          await this.plugin.saveSettings();
        }));

    new Setting(containerEl)
      .setName('Zeptat se na cenu, pokud je 0 Kč')
      .setDesc('Pokud odškrtneš položku bez ceny, zobrazí se dialog pro rychlé zadání zaplacené částky.')
      .addToggle(t => t
        .setValue(this.plugin.settings.promptPriceIfZero)
        .onChange(async v => {
          this.plugin.settings.promptPriceIfZero = v;
          await this.plugin.saveSettings();
        }));
  }
}

module.exports = ShoppingListPlugin;
