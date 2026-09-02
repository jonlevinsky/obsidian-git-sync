const { Plugin, PluginSettingTab, Setting, ItemView, Notice, Platform, requestUrl } = require('obsidian');

const VIEW_TYPE = 'levinskyj-finance-view';
const SUPABASE_URL = 'https://bkgfohfmnbmascomaozv.supabase.co/rest/v1';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJrZ2ZvaGZtbmJtYXNjb21hb3p2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgzMzMwMzYsImV4cCI6MjEwMzkwOTAzNn0.RgxJDflLqIuBIH17imSvdLmbRjg8Fp3vDWK_O5u6w-c';

async function supabaseFetchFinance(endpoint) {
  try {
    const res = await requestUrl({
      url: `${SUPABASE_URL}/${endpoint}`,
      method: 'GET',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json'
      },
      throwOnError: false
    });
    if (res.status >= 200 && res.status < 300) {
      return res.json;
    }
  } catch (e) {}
  return null;
}

const DEFAULT_SETTINGS = {
  folder: 'Život/Finance',
  prijmyFile: 'Příjmy',
  vydajeFile: 'Výdaje',
  investiceFile: 'Investice',
  openOnStartup: true,
  openInMain: true,
  useSupabase: true,
  startBank: 0,
  startCash: 0,
  lastPrices: {},
  collapsed: [],
  order: ['form', 'donut', 'incomes', 'summary', 'chart', 'expenses', 'invest']
};

const DEFAULT_ORDER = ['form', 'chart', 'donut', 'summary', 'incomes', 'expenses', 'invest'];

// ── Kategorie (klíče = názvy v markdown souborech) ──
const KAT_PRIJEM = ['mzda', 'prodej', 'kauce', 'vratka', 'ostatni'];
const KAT_VYDEJ = ['bydleni', 'jidlo', 'doprava', 'zabava', 'zdravi', 'ostatni'];
const CAT_COLOR = {
  bydleni: '#c49a5a', jidlo: '#e07b54', doprava: '#6fb7c9',
  zabava: '#b48ad9', zdravi: '#e06c6c', prodej: '#7cb87c', ostatni: '#9aa7b5'
};
const MONTHS = ['Leden','Únor','Březen','Duben','Květen','Červen','Červenec','Srpen','Září','Říjen','Listopad','Prosinec'];

// ══════════════════════════════════════════════
class FinancePlugin extends Plugin {
  async onload() {
    await this.loadSettings();
    this.addSettingTab(new FinanceSettingTab(this.app, this));
    this.addCommand({ id: 'open-finance', name: 'Otevřít finance', callback: () => this.activateView() });
    this.addCommand({ id: 'refresh-finance', name: 'Obnovit finance', callback: async () => {
      const leaf = this.app.workspace.getLeavesOfType(VIEW_TYPE)[0];
      const view = leaf && leaf.view;
      if (view && view.reload) await view.reload();
    } });
    if (!Platform.isMobile) {
      this.addRibbonIcon('wallet', 'Levinskyj Finance', () => this.activateView());
    }
    this.registerView(VIEW_TYPE, (leaf) => new FinanceView(leaf, this));
    this.app.workspace.onLayoutReady(async () => {
      await this.ensureFiles();
      if (this.settings.openOnStartup) this.activateView();
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

  async loadSettings() { this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData()); }
  async saveSettings() { await this.saveData(this.settings); }

  get paths() {
    const f = this.settings.folder || DEFAULT_SETTINGS.folder;
    return {
      folder: f,
      prijmy: `${f}/${this.settings.prijmyFile || 'Příjmy'}.md`,
      vydaje: `${f}/${this.settings.vydajeFile || 'Výdaje'}.md`,
      invest: `${f}/${this.settings.investiceFile || 'Investice'}.md`
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
    const files = [
      { path: this.paths.prijmy, body: '| datum | popis | kategorie | zpusob | castka |\n| --- | --- | --- | --- | ---: |' },
      { path: this.paths.vydaje, body: '| datum | popis | kategorie | zpusob | castka |\n| --- | --- | --- | --- | ---: |' },
      { path: this.paths.invest, body: '---\nholdings:\n---' }
    ];
    for (const f of files) {
      if (!this.app.vault.getAbstractFileByPath(f.path)) {
        try { await this.app.vault.create(f.path, f.body + '\n'); }
        catch (e) { new Notice('Finance: nelze vytvořit ' + f.path + ' — ' + e.message); }
      }
    }
  }
}

// ══════════════════════════════════════════════
//  VIEW
// ══════════════════════════════════════════════
class FinanceView extends ItemView {
  constructor(leaf, plugin) {
    super(leaf);
    this.plugin = plugin;
    this.viewMonth = new Date();
    this.transactions = [];
    this.investments = [];
  }

  getViewType() { return VIEW_TYPE; }
  getDisplayText() { return 'Finance'; }
  getIcon() { return 'wallet'; }

  async onOpen() {
    try {
      await this.load();
      this.render();
    } catch (e) {
      this.contentEl.setText('Chyba při načítání finance: ' + e.message + '\n\n' + (e.stack || ''));
    }
    this.views = this.views || [];
    this.views.push(this.app.vault.on('modify', (f) => this.onFileChanged(f)));
    this.views.push(this.app.vault.on('delete', (f) => this.onFileChanged(f)));
  }
  async onClose() {
    clearTimeout(this._t);
    if (this.views) { for (const ref of this.views) this.app.vault.offref(ref); this.views = []; }
  }

  async reload() {
    await this.load();
    this.render();
  }

  onFileChanged(f) {
    const p = this.plugin.paths;
    if (!f || !f.path || ![p.prijmy, p.vydaje, p.invest].includes(f.path)) return;
    clearTimeout(this._t);
    this._t = setTimeout(() => this.reload(), 150);
  }

  // ══════════ Helpers ══════════
  n(v) { return parseFloat(String(v ?? '').replace(/[^0-9.,-]/g, '').replace(',', '.')) || 0; }
  cz(n) { return Number(n).toLocaleString('cs-CZ'); }
  ym(d) { const x = d || ''; return x ? x.slice(0, 7) : ''; }
  today() { return new Date().toISOString().slice(0, 10); }
  monthKey(d) { return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; }
  addMonth(d, n) { return new Date(d.getFullYear(), d.getMonth() + n, 1); }
  norm(s) { return String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim(); }
  catName(c) { return this.norm(c) || 'ostatni'; }
  monthTotals(key) {
    const tx = this.transactions.filter(t => this.ym(t.date) === key);
    const inc = tx.filter(t => t.type === 'prijem').reduce((s, t) => s + t.amount, 0);
    const out = tx.filter(t => t.type === 'vydej').reduce((s, t) => s + t.amount, 0);
    return { tx, inc, out };
  }

  // Absolutní stavy: počáteční stav (nastavení) + všechny transakce od začátku
  computeBalances() {
    let bank = this.plugin.settings.startBank || 0;
    let cash = this.plugin.settings.startCash || 0;
    for (const t of this.transactions) {
      const title = this.norm(t.title);
      const isVklad = /vklad hotovosti/.test(title);
      const isVyber = /vyber hotovosti/.test(title);
      if (isVklad) { bank += t.amount; cash -= t.amount; continue; }
      if (isVyber) { bank -= t.amount; cash += t.amount; continue; }
      if (t.type === 'prijem') bank += t.amount; else bank -= t.amount;
    }
    return { bank, cash };
  }

  // ══════════ NAČÍTÁNÍ Z MARKDOWN ══════════
  async readFile(p) {
    const f = this.app.vault.getAbstractFileByPath(p);
    if (!f) return '';
    try { return await this.app.vault.read(f); } catch (e) { return ''; }
  }

  // Přečte markdown tabulku → [ {hdrKey: value} ]
  parseTable(md) {
    const result = [];
    const lines = md.split('\n');
    let i = 0;
    while (i < lines.length && !lines[i].trim().startsWith('|')) i++;
    if (i >= lines.length) return result;
    const hdr = lines[i].split('|').slice(1, -1).map(h => this.norm(h));
    const find = (...keys) => hdr.findIndex(h => keys.includes(h));
    const iDate = find('datum', 'date');
    const iTitle = find('popis', 'title', 'nazev');
    const iAmt = find('castka', 'amount', 'cena', 'suma');
    const iCat = find('kategorie', 'category');
    const iMeth = find('zpusob', 'platba', 'metoda');
    if (iDate < 0) return result;
    for (let j = i + 1; j < lines.length; j++) {
      const t = lines[j].trim();
      if (!t.startsWith('|')) continue;
      const cells = lines[j].split('|').slice(1, -1).map(c => c.trim());
      if (cells.every(c => !c || /^:?-+:?$/.test(c))) continue;
      if (!/^\d{4}-\d{2}-\d{2}$/.test(cells[iDate] || '')) continue;
      result.push({
        datum: cells[iDate] || '',
        popis: (iTitle >= 0 ? cells[iTitle] : '') || '',
        castka: (iAmt >= 0 ? cells[iAmt] : '') || '',
        kategorie: (iCat >= 0 ? cells[iCat] : '') || '',
        zpusob: (iMeth >= 0 ? cells[iMeth] : '') || ''
      });
    }
    return result;
  }

  async load() {
    try {
      let prijmy = this.parseTable(await this.readFile(this.plugin.paths.prijmy));
      let vydaje = this.parseTable(await this.readFile(this.plugin.paths.vydaje));

      if (this.plugin.settings.useSupabase) {
        const cloudExpenses = await supabaseFetchFinance('expenses?select=*&order=date.desc');
        const cloudIncomes = await supabaseFetchFinance('incomes?select=*&order=date.desc');

        if (cloudExpenses && Array.isArray(cloudExpenses) && cloudExpenses.length > 0) {
          vydaje = cloudExpenses.map(r => ({ datum: r.date, popis: r.title, castka: String(r.amount), kategorie: r.category, zpusob: r.method }));
        }
        if (cloudIncomes && Array.isArray(cloudIncomes) && cloudIncomes.length > 0) {
          prijmy = cloudIncomes.map(r => ({ datum: r.date, popis: r.title, castka: String(r.amount), kategorie: r.category, zpusob: r.method }));
        }
      }

      this.transactions = [
        ...prijmy.map((r, i) => ({ id: 'p' + i, date: r.datum, type: 'prijem', title: r.popis, category: this.catName(r.kategorie) || 'ostatni', method: this.norm(r.zpusob) || 'karta', amount: this.n(r.castka) })),
        ...vydaje.map((r, i) => ({ id: 'v' + i, date: r.datum, type: 'vydej', title: r.popis, category: this.catName(r.kategorie), method: this.norm(r.zpusob) || 'karta', amount: this.n(r.castka) }))
      ];

      // Investice z YAML frontmatter — přímé čtení souboru
      this.investments = await this.loadInvestments();
    } catch (e) {
      new Notice('Finance chyba: ' + e.message);
    }
  }

  async loadInvestments() {
    const out = [];
    const raw = await this.readFile(this.plugin.paths.invest);
    // najdi blok frontmatter (mezi --- ---)
    const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---/);
    if (!m) return out;
    // jednoduchý YAML parser pro holdings list
    let cur = null;
    for (const line of m[1].split('\n')) {
      const t = line.trim();
      if (t === 'holdings:' || t.startsWith('holdings:')) { continue; }
      if (/^-\s/.test(t)) {
        cur = {};
        out.push(cur);
        const kv = t.match(/^-\s+([\w]+):\s*(.*)$/);
        if (kv) cur[kv[1]] = kv[2].replace(/^['"]|['"]$/g, '');
        continue;
      }
      const kv = t.match(/^([\w]+):\s*(.*)$/);
      if (kv && cur) {
        cur[kv[1]] = kv[2].replace(/^['"]|['"]$/g, '');
      }
    }
    const rawList = out.map((h) => ({
      name: h.nazev || h.ticker, ticker: (h.ticker || '').trim().toUpperCase(),
      investovano: this.n(h.investovano), nakup: h.nakup,
      nakupCena: this.n(h.nakup_cena), podily: this.n(h.podily), naposledy: this.n(h.naposledy)
    }));
    // sloučí pozice podle tickeru (více nákupů stejného ETF = jedna pozice)
    const byTicker = new Map();
    for (const r of rawList) {
      if (!r.ticker) continue;
      const g = byTicker.get(r.ticker) || { name: r.name, ticker: r.ticker, podily: 0, investovano: 0, nakupCena: 0, nakup: r.nakup || '', naposledy: r.naposledy };
      g.podily += r.podily;
      g.investovano += r.investovano;
      g.nakupCena = g.nakupCena || r.nakupCena;
      if (r.name) g.name = r.name;
      byTicker.set(r.ticker, g);
    }
    return Array.from(byTicker.values()).map((g, idx) => ({
      id: idx + 1, name: g.name || g.ticker, ticker: g.ticker,
      investovano: g.investovano, nakup: g.nakup,
      nakupCena: g.nakupCena, podily: g.podily, naposledy: g.naposledy
    }));
  }

  // Vloží řádek do tabulky (po posledním datovém řádku)
  async appendRow(path, cols) {
    const f = this.app.vault.getAbstractFileByPath(path);
    if (!f) { new Notice('Soubor nenalezen: ' + path); return; }
    let text = await this.app.vault.read(f);
    const row = '| ' + cols.join(' | ') + ' |';
    const lines = text.split('\n');
    // najdi poslední datový řádek
    let lastIdx = -1;
    for (let i = 0; i < lines.length; i++) {
      if (/^\| *\d{4}-\d{2}-\d{2} *\|/.test(lines[i])) lastIdx = i;
    }
    if (lastIdx >= 0) {
      lines.splice(lastIdx + 1, 0, row);
    } else {
      lines.push(row);
    }
    await this.app.vault.modify(f, lines.join('\n'));
  }

  // Vloží investici do YAML frontmatter souboru investic
  async appendInvestment(item) {
    const f = this.app.vault.getAbstractFileByPath(this.plugin.paths.invest);
    if (!f) { new Notice('Soubor investic nenalezen'); return; }
    let text = await this.app.vault.read(f);
    const block = [
      '- ticker: ' + item.ticker,
      item.name ? '  nazev: ' + item.name : '',
      item.invested ? '  investovano: ' + item.invested : '',
      item.buyDate ? '  nakup: ' + item.buyDate : '',
      item.shares ? '  podily: ' + item.shares : '',
      item.buyPrice ? '  nakup_cena: ' + item.buyPrice : ''
    ].filter(Boolean).join('\n');
    if (/^---/.test(text) && text.includes('\n---')) {
      const idx = text.indexOf('\n---');
      text = text.slice(0, idx) + '\n' + block + text.slice(idx);
    } else {
      text = '---\nholdings:\n' + block + '\n---\n' + text;
    }
    await this.app.vault.modify(f, text);
  }

  // Odstraní řádek z tabulky dle shody prvních n buněk
  async removeRow(path, date, title, amount, category, method) {
    const f = this.app.vault.getAbstractFileByPath(path);
    if (!f) return;
    let text = await this.app.vault.read(f);
    const lines = text.split('\n');
    const target = `| ${date} | ${title} | ${category || 'ostatni'} | ${method || 'karta'} | ${amount} |`;
    const key = this.norm(target);
    const next = lines.filter(l => this.norm(l) !== key);
    if (next.length !== lines.length) {
      await this.app.vault.modify(f, next.join('\n'));
    }
  }

  // ══════════ RENDER ══════════
  render() {
    const root = this.contentEl;
    root.empty();
    root.addClass('ft-root');
    this.injectStyle(root);

    const vm = this.monthKey(this.viewMonth);

    // ── Navigace ──
    const hdr = root.createEl('div', { cls: 'ft-hdr' });
    const prev = hdr.createEl('button', { text: '◀', cls: 'ft-nav' });
    prev.addEventListener('click', () => { this.viewMonth = this.addMonth(this.viewMonth, -1); this.render(); });
    hdr.createEl('span', { text: `${MONTHS[this.viewMonth.getMonth()]} ${this.viewMonth.getFullYear()}`, cls: 'ft-title' });
    const next = hdr.createEl('button', { text: '▶', cls: 'ft-nav' });
    next.addEventListener('click', () => { this.viewMonth = this.addMonth(this.viewMonth, 1); this.render(); });
    const refresh = hdr.createEl('button', { text: '↻', cls: 'ft-nav ft-refresh', attr: { title: 'Obnovit data' } });
    refresh.addEventListener('click', () => this.reload());

    // ── Bento grid ──
    const gridWrap = root.createEl('div', { cls: 'ft-gridwrap' });
    const grid = gridWrap.createEl('div', { cls: 'ft-grid' });

    const { tx: txM, inc, out } = this.monthTotals(vm);
    const bal = inc - out;
    const saveRate = inc > 0 ? Math.round((bal / inc) * 100) : 0;
    const pm = this.monthKey(this.addMonth(this.viewMonth, -1));
    const p = this.monthTotals(pm);
    const diff = (p, c) => p > 0 ? Math.round(((c - p) / p) * 100) : null;

    // Top: 3 samostatné karty – vycentrované a stejně velké
    const top = grid.createEl('div', { cls: 'ft-top ft-tile-full' });
    const mkTop = (label, icon, val, color) => {
      const c = top.createEl('div', { cls: 'ft-card ft-top-card' });
      c.createEl('div', { text: icon, cls: 'ft-top-ico' });
      const v = c.createEl('div', { text: val, cls: 'ft-top-val' });
      if (color) v.style.color = color;
      c.createEl('div', { text: label, cls: 'ft-top-lab' });
      return v;
    };
    mkTop('Příjmy', '📥', `${this.cz(inc)} Kč`, '#7cb87c');
    mkTop('Výdaje', '📤', `${this.cz(out)} Kč`, '#e06c6c');
    const balances = this.computeBalances();
    mkTop('Na účtě', '🏦', `${this.cz(balances.bank)} Kč`, balances.bank >= 0 ? '#7cb87c' : '#e06c6c');
    mkTop('Hotovost', '💵', `${this.cz(balances.cash)} Kč`, balances.cash >= 0 ? '#7cb87c' : '#e06c6c');

const build = {
      form: (g) => { const t = this.makeTile(g, 'form', 'ft-tile-full'); this.renderForm(t); },
      summary: (g) => { const t = this.makeTile(g, 'summary', ''); this.renderSummary(t, bal, saveRate, diff(p.inc, inc), diff(p.out, out)); },
      chart: (g) => { const t = this.makeTile(g, 'chart', 'ft-tile-full'); this.renderMonthlyChart(t); },
      donut: (g) => { const t = this.makeTile(g, 'donut', ''); this.renderDonut(t, vm); },
      incomes: (g) => { const t = this.makeTile(g, 'incomes', ''); this.renderList(t, '📥 Příjmy', txM.filter(x => x.type === 'prijem')); },
      expenses: (g) => { const t = this.makeTile(g, 'expenses', ''); this.renderList(t, '📤 Výdaje', txM.filter(x => x.type === 'vydej')); },
      invest: (g) => { const t = this.makeTile(g, 'invest', 'ft-tile-full'); this.renderInvest(t); }
    };

    const ids = (this.plugin.settings.order || []).filter(id => id && id !== 'cards');
    const done = new Set();
    for (const id of ids) { if (build[id]) { build[id](grid); done.add(id); } }
    for (const id of DEFAULT_ORDER) { if (!done.has(id) && build[id]) build[id](grid); }
    grid.querySelectorAll('.ft-scroll').forEach(el => this.setupScrollFade(el));
  }

  makeTile(grid, id, cls, draggable = true) {
    const attrs = { 'data-tile': id };
    if (draggable) attrs.draggable = 'true';
    const t = grid.createEl('div', { cls: 'ft-tile ft-card ' + cls, attr: { ...attrs, title: draggable ? 'Přetáhni pro přeuspořádání' : '' } });
    if (draggable) {
      const cb = t.createEl('button', { cls: 'ft-cbt', text: '–', attr: { title: 'Sbalit / rozbalit', type: 'button' } });
      cb.addEventListener('click', (e) => { e.stopPropagation(); this.toggleCollapse(id, t); });
      if (this.plugin.settings.collapsed && this.plugin.settings.collapsed.includes(id)) t.addClass('ft-collapsed');
      t.addEventListener('dragstart', (e) => { this._dragId = id; t.addClass('ft-dragging'); if (e.dataTransfer) e.dataTransfer.effectAllowed = 'move'; });
      t.addEventListener('dragend', () => { t.removeClass('ft-dragging'); this._dragId = null; });
      t.addEventListener('dragover', (e) => { if (e.preventDefault) e.preventDefault(); });
      t.addEventListener('drop', (e) => { if (e.preventDefault) e.preventDefault(); this.dropTile(id); });
    }
    return t;
  }

  toggleCollapse(id, el) {
    const arr = this.plugin.settings.collapsed || [];
    const present = arr.includes(id);
    const next = present ? arr.filter(x => x !== id) : [...arr, id];
    el.toggleClass('ft-collapsed', !present);
    const sc = el.classList.contains('ft-scroll') ? el : el.querySelector('.ft-scroll');
    if (sc) sc.classList.toggle('ft-scroll-more', !next.includes(id) && this.hasMoreBelow(sc));
    this.plugin.settings.collapsed = next;
    this.plugin.saveSettings();
  }

  setupScrollFade(el) {
    const check = () => el.classList.toggle('ft-scroll-more', this.hasMoreBelow(el));
    check();
    el.addEventListener('scroll', check, { passive: true });
  }

  hasMoreBelow(el) {
    if (el.classList.contains('ft-collapsed')) return false;
    return el.scrollHeight > el.clientHeight + 1 && el.scrollTop + el.clientHeight < el.scrollHeight - 4;
  }

  dropTile(targetId) {
    const from = this._dragId;
    const pinned = ['prijmy', 'vydaje', 'invest-top', 'cards'];
    if (!from || from === targetId || pinned.includes(from) || pinned.includes(targetId)) return;
    const grid = this.contentEl.querySelector('.ft-grid');
    const order = Array.from(grid.children).map(c => c.dataset.tile);
    const i = order.indexOf(from), j = order.indexOf(targetId);
    if (i < 0 || j < 0) return;
    order.splice(i, 1);
    order.splice(j, 0, from);
    order.forEach(id => { const el = grid.querySelector(`[data-tile="${id}"]`); if (el) grid.appendChild(el); });
    this.plugin.settings.order = order.filter(id => !['prijmy', 'vydaje', 'invest-top', 'cards'].includes(id));
    this.plugin.saveSettings();
  }

  renderSummary(card, bal, saveRate, diffInc, diffOut) {
    card.createEl('h3', { text: '📈 Souhrn měsíce' });
    this.addRow(card, 'Bilance', `${this.cz(bal)} Kč`, bal >= 0 ? 'ft-pos' : 'ft-neg');
    this.addRow(card, 'Úspornost', `${saveRate} %`, saveRate >= 0 ? 'ft-pos' : 'ft-neg');
    this.addRow(card, 'Příjmy oproti min. měs.', this.diffStr(diffInc));
    this.addRow(card, 'Výdaje oproti min. měs.', this.diffStr(diffOut));
  }

  addRow(card, label, value, cls) {
    const r = card.createEl('div', { cls: 'ft-row' });
    r.createEl('span', { text: label, cls: 'ft-rowl' });
    r.createEl('span', { text: value, cls: cls || '' });
  }
  diffStr(x) {
    if (x === null || x === undefined) return '—';
    return (x >= 0 ? '▲ +' : '▼ ') + Math.abs(x) + ' %';
  }

  renderMonthlyChart(card) {
    card.createEl('h3', { text: '📊 Příjmy vs výdaje' });
    const chart = card.createEl('div', { cls: 'ft-chart' });
    let maxV = 1;
    const cols = [];
    for (let i = 7; i >= 0; i--) {
      const m = this.addMonth(this.viewMonth, -i);
      const key = this.monthKey(m);
      const s = this.monthTotals(key);
      cols.push({ label: MONTHS[m.getMonth()].slice(0, 3), inc: s.inc, out: s.out });
      maxV = Math.max(maxV, s.inc, s.out);
    }
    cols.forEach(c => {
      const col = chart.createEl('div', { cls: 'ft-col' });
      const bars = col.createEl('div', { cls: 'ft-bars' });
      this.barEl(bars, 'in', c.inc, maxV);
      this.barEl(bars, 'out', c.out, maxV);
      col.createEl('div', { text: c.label, cls: 'ft-bl' });
    });
  }
  barEl(parent, cls, v, maxV) {
    const b = parent.createEl('div', { cls: `ft-b ft-b-${cls}` });
    b.style.height = Math.max(2, Math.round((v / maxV) * 130)) + 'px';
    b.title = this.cz(v) + ' Kč';
  }

  renderDonut(card, vm) {
    card.createEl('h3', { text: `🥧 Výdaje podle kategorií — ${MONTHS[this.viewMonth.getMonth()]}` });
    const byCat = {};
    this.transactions.filter(t => this.ym(t.date) === vm && t.type === 'vydej')
      .forEach(t => { const c = this.catName(t.category); byCat[c] = (byCat[c] || 0) + t.amount; });
    const sum = Object.values(byCat).reduce((s, v) => s + v, 0);
    if (sum <= 0) { card.createEl('div', { text: 'Žádné výdaje v tomto měsíci.', cls: 'ft-note' }); return; }

    const wrap = card.createEl('div', { cls: 'ft-donutwrap' });
    let acc = 0; const segs = [];
    for (const cat of Object.keys(byCat)) {
      const fr = byCat[cat] / sum;
      segs.push(`${CAT_COLOR[cat] || '#9aa7b5'} ${(acc * 100).toFixed(1)}% ${((acc + fr) * 100).toFixed(1)}%`);
      acc += fr;
    }
    const circle = wrap.createEl('div', { cls: 'ft-donut', attr: { style: `background:conic-gradient(${segs.join(',')});` } });
    circle.createEl('div', { text: `${this.cz(sum)} Kč`, cls: 'ft-donuthole' });
    const leg = wrap.createEl('div', { cls: 'ft-legend' });
    Object.keys(byCat).sort((a, b) => byCat[b] - byCat[a]).forEach(cat => {
      const lt = leg.createEl('div', { cls: 'ft-legt' });
      lt.createEl('span', { text: ' ', cls: 'ft-legdot', attr: { style: `background:${CAT_COLOR[cat] || '#9aa7b5'};` } });
      lt.createEl('span', { text: `${this.catName(cat)} — ${this.cz(byCat[cat])} Kč (${Math.round(byCat[cat] / sum * 100)} %)` });
    });
  }

  // ══════════ Formulář ══════════
  renderForm(card) {
    card.createEl('h3', { text: '➕ Přidat transakci' });
    const bar = card.createEl('div', { cls: 'ft-form' });

    const selType = bar.createEl('select', { cls: 'ft-input' });
    selType.createEl('option', { value: 'vydej', text: '💸 Výdaj' });
    selType.createEl('option', { value: 'prijem', text: '💵 Příjem' });

    const iTitle = bar.createEl('input', { cls: 'ft-input', type: 'text', placeholder: 'Popis…' });
    iTitle.style.flex = '1';

    const iAmt = bar.createEl('input', { cls: 'ft-input', type: 'number', placeholder: 'Kč', attr: { style: 'width:110px;' } });

    const selCat = bar.createEl('select', { cls: 'ft-input' });
    this.fillCats(selCat, 'vydej');

    const iDate = bar.createEl('input', { cls: 'ft-input', type: 'date', value: this.today() });

    const selMethod = bar.createEl('select', { cls: 'ft-input' });
    selMethod.createEl('option', { value: 'karta', text: '💳 Karta' });
    selMethod.createEl('option', { value: 'hotovost', text: '💵 Hotovost' });

    selType.addEventListener('change', () => this.fillCats(selCat, selType.value));

    const btn = bar.createEl('button', { text: 'Přidat', cls: 'ft-btn' });
    btn.addEventListener('click', async () => {
      const title = iTitle.value.trim();
      const amount = this.n(iAmt.value);
      if (!title || amount <= 0) { new Notice('Vyplň popis a částku'); return; }
      const isP = selType.value === 'prijem';
      const cat = selCat.value;
      const date = iDate.value || this.today();
      const method = selMethod.value;
      // zapíšu do markdown
      if (isP) {
        await this.appendRow(this.plugin.paths.prijmy, [date, title, cat, method, String(amount)]);
      } else {
        await this.appendRow(this.plugin.paths.vydaje, [date, title, cat, method, String(amount)]);
      }
      await this.load();
      new Notice('Přidáno ✔');
      this.render();
    });
  }

  fillCats(sel, type) {
    sel.empty();
    const cats = type === 'prijem' ? KAT_PRIJEM : KAT_VYDEJ;
    cats.forEach(k => sel.createEl('option', { value: k, text: k }));
  }

  // ══════════ Seznamy ══════════
  renderList(card, title, rows) {
    card.createEl('h3', { text: title });
    if (!rows.length) { card.createEl('div', { text: 'Žádné záznamy v tomto měsíci.', cls: 'ft-note' }); return; }
    const wrap = card.createEl('div', { cls: 'ft-scroll' });
    const isP = rows[0].type === 'prijem';
    let sum = 0;
    rows.sort((a, b) => (b.date || '').localeCompare(a.date || '')).forEach(t => {
      const r = wrap.createEl('div', { cls: 'ft-row' });
      const met = t.method === 'hotovost' ? '💵' : '💳';
      const l = r.createEl('div', { text: `${met} ${t.date} — ${t.title} · ${this.catName(t.category)}`, cls: 'ft-rowl' });
      l.style.flex = '1';
      const v = r.createEl('span', { text: `${isP ? '+' : '-'}${this.cz(t.amount)} Kč`, cls: isP ? 'ft-pos' : 'ft-neg' });
      const del = r.createEl('button', { text: '✕', cls: 'ft-del' });
      del.addEventListener('click', async () => {
        const path = isP ? this.plugin.paths.prijmy : this.plugin.paths.vydaje;
        await this.removeRow(path, t.date, t.title, String(t.amount), t.category, t.method);
        await this.load();
        this.render();
      });
      sum += t.amount;
    });
    const f = wrap.createEl('div', { cls: 'ft-row ft-total' });
    f.createEl('span', { text: '∑ Celkem' });
    f.createEl('span', { text: `${this.cz(sum)} Kč` });
  }

  // ══════════ Investice ══════════
  renderInvest(card) {
    card.createEl('h3', { text: '📈 Investice' });
    this.renderInvestForm(card);
    const inv = this.investments;
    if (!inv.length) { card.createEl('div', { text: 'Zatím žádné investice.', cls: 'ft-note' }); return; }

    const yahoo = async (sym) => {
      const trySym = async (s) => {
        try {
          const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(s)}?interval=1d&range=5d`;
          const res = await requestUrl({ url, method: 'GET', headers: { 'User-Agent': 'Mozilla/5.0' } });
          const j = res.json;
          const meta = j.chart && j.chart.result && j.chart.result[0] && j.chart.result[0].meta;
          return (meta && meta.regularMarketPrice) ? meta.regularMarketPrice : null;
        } catch (e) { return null; }
      };
      // pro crypto zkus nejdřív -USD (ETH-USD…), jinak čistý ticker
      const usd = await trySym(sym + '-USD');
      if (usd) return usd;
      return trySym(sym);
    };
    const usd = async () => {
      try {
        const res = await requestUrl({ url: 'https://api.frankfurter.app/latest?from=USD&to=CZK', method: 'GET' });
        const j = res.json;
        return j.rates && j.rates.CZK ? j.rates.CZK : null;
      } catch (e) { return null; }
    };

    (async () => {
      const stored = this.plugin.settings.lastPrices || {};
      const [rate, prices] = await Promise.all([usd(), Promise.all(inv.map(i => yahoo(i.ticker)))]);
      const fresh = {};
      let totInv = 0, totAkt = 0, liveCount = 0;
      inv.forEach((i, idx) => {
        const live = (typeof prices[idx] === 'number' && prices[idx] > 0) ? prices[idx] : null;
        const last = live || stored[i.ticker] || (this.n(i.naposledy) || null);
        if (live) { fresh[i.ticker] = live; liveCount++; }
        const nakl = this.n(i.investovano);
        const basis = nakl > 0 ? nakl : (i.nakupCena > 0 ? (this.n(i.podily) * i.nakupCena) * (rate || 20) : 0);
        const akt = basis > 0 && last ? (this.n(i.podily) * last) * (rate || 0) : 0;
        const pc = (basis > 0 && akt) ? Math.round(((akt - basis) / basis) * 1000) / 10 : null;
        totInv += basis; totAkt += akt;
        const implied = basis > 0 && i.podily > 0 && rate ? basis / (i.podily * rate) : null;
        const warn = implied && i.nakupCena > 0 && Math.abs(implied - i.nakupCena) / i.nakupCena > 0.15;
        const r = card.createEl('div', { cls: 'ft-row' });
        const l = r.createEl('div');
        l.createEl('div', { text: `${i.name} · ${i.ticker} · ${this.n(i.podily)} ks`, cls: 'ft-rowl' });
        l.createEl('div', { text: `vloženo ${this.cz(basis)} Kč${last ? ` · cena $${last.toFixed(2)}` : ''}${warn ? ' · ⚠️ kontrola údajů' : ''}`, cls: 'ft-note' });
        const v = r.createEl('div', { cls: 'ft-inv' });
        if (last && rate) {
          v.createEl('div', { text: `${this.cz(akt)} Kč`, cls: 'ft-rowl' });
          v.createEl('div', { text: pc !== null ? `${pc >= 0 ? '+' : ''}${pc} %` : '—', cls: pc >= 0 ? 'ft-pos' : 'ft-neg' });
        } else {
          v.createEl('div', { text: `${this.cz(basis)} Kč`, cls: 'ft-rowl' });
          v.createEl('div', { text: 'bez ceny — zadej nákup. cenu nebo počkej na připojení', cls: 'ft-note' });
        }
      });
      if (inv.length > 0) {
        const t = card.createEl('div', { cls: 'ft-row ft-total' });
        t.createEl('span', { text: `∑ Celkem (${liveCount === inv.length ? 'živě' : liveCount > 0 ? 'částečně' : 'odhad'})` });
        const pcT = (totInv > 0 && totAkt) ? Math.round(((totAkt - totInv) / totInv) * 1000) / 10 : null;
        t.createEl('span', { text: `${this.cz(totInv)} Kč → ${this.cz(totAkt)} Kč${pcT !== null ? ` · ${pcT >= 0 ? '+' : ''}${pcT} %` : ''}`, cls: pcT !== null && pcT >= 0 ? 'ft-pos' : 'ft-neg' });
      }
      if (Object.keys(fresh).length) {
        this.plugin.settings.lastPrices = { ...stored, ...fresh };
        await this.plugin.saveSettings();
      }
    })();
  }

  // ══════════ Formulář investice ══════════
  renderInvestForm(card) {
    const bar = card.createEl('div', { cls: 'ft-form' });

    const iTicker = bar.createEl('input', { cls: 'ft-input', type: 'text', placeholder: 'Ticker (SPY)…', attr: { style: 'width:100px;' } });
    const iName = bar.createEl('input', { cls: 'ft-input', type: 'text', placeholder: 'Název…' });
    iName.style.flex = '1';
    const iInv = bar.createEl('input', { cls: 'ft-input', type: 'number', placeholder: 'Vloženo Kč', attr: { style: 'width:110px;' } });
    const iShares = bar.createEl('input', { cls: 'ft-input', type: 'number', placeholder: 'Podíly', attr: { style: 'width:80px;' } });
    const iBuyC = bar.createEl('input', { cls: 'ft-input', type: 'number', placeholder: 'Nákup $', attr: { style: 'width:90px;' } });
    const iDate = bar.createEl('input', { cls: 'ft-input', type: 'date', value: this.today() });

    const btn = bar.createEl('button', { text: 'Přidat', cls: 'ft-btn' });
    btn.addEventListener('click', async () => {
      const ticker = iTicker.value.trim().toUpperCase();
      if (!ticker) { new Notice('Zadej ticker'); return; }
      const invested = this.n(iInv.value);
      const shares = this.n(iShares.value);
      const buyP = this.n(iBuyC.value);
      if (invested <= 0 && !(shares > 0 && buyP > 0)) {
        new Notice('Zadej buď vloženou částku (Kč), nebo podíly + nákupní cenu $'); return;
      }
      if (invested > 0 && shares > 0 && buyP > 0) {
        const approx = shares * buyP * 20.5;
        if (Math.abs(invested - approx) / approx > 0.5) {
          new Notice(`⚠️ ${shares} ks × $${buyP} ≈ ${this.cz(approx)} Kč, ale uvádíš ${this.cz(invested)} Kč. Zkontroluj čísla.`);
        }
      }
      await this.appendInvestment({
        ticker,
        name: iName.value.trim(),
        invested: invested > 0 ? String(invested) : '',
        shares: shares > 0 ? String(shares) : '',
        buyPrice: buyP > 0 ? String(buyP) : '',
        buyDate: iDate.value || this.today()
      });
      await this.load();
      new Notice('Investice přidána ✔');
      this.render();
    });
  }

  // ══════════ CSS ══════════
  injectStyle(root) {
    const css = `
      .ft-root { padding: var(--size-4-5); display: flex; flex-direction: column; gap: 14px; font-family: var(--font-interface); }
      .ft-hdr { display: flex; align-items: center; gap: 8px; padding: 4px 0; }
      .ft-title { font-family: var(--font-heading, "Bricolage Grotesque"), Georgia, serif; font-size: 1.6em; font-weight: 700; flex: 1; text-align: center; letter-spacing: .5px; color: var(--text-normal); }
      .ft-nav { cursor: pointer; border: 1px solid var(--background-modifier-border); background: var(--background-secondary); color: var(--text-normal); border-radius: 50%; width: 34px; height: 34px; font-size: 1.05em; display: flex; align-items: center; justify-content: center; box-shadow: 0 1px 2px rgba(0,0,0,.1); transition: background .15s, transform .15s; }
      .ft-nav:hover { background: var(--background-modifier-hover); transform: translateY(-1px); }
      .ft-nav:active { transform: scale(.94); }
      .ft-refresh { font-size: 1.15em; }
      .ft-refresh:hover { animation: ft-spin .6s linear; }
      @keyframes ft-spin { to { transform: rotate(360deg); } }
      .ft-card { background: linear-gradient(170deg, color-mix(in srgb, var(--background-primary) 35%, var(--background-secondary)), var(--background-secondary)); border: 1px solid var(--background-modifier-border); border-radius: 14px; padding: 16px 18px; box-shadow: 0 1px 3px rgba(0,0,0,.05); transition: box-shadow .15s, transform .15s, border-color .15s; }
      .ft-card:hover { box-shadow: 0 6px 16px rgba(0,0,0,.14); transform: translateY(-2px); border-color: var(--interactive-accent); }
      .ft-card h3 { margin: 0 0 10px; font-size: .95em; color: var(--text-muted); text-transform: uppercase; letter-spacing: 1px; font-weight: 600; }
      .ft-card .ft-ico { font-size: 1.5em; margin-bottom: 6px; }
      .ft-card .ft-val { font-size: 1.45em; font-weight: 800; margin: 2px 0; font-variant-numeric: tabular-nums; color: var(--text-normal); }
      .ft-card .ft-lab { font-size: .8em; color: var(--text-muted); }
      .ft-gridwrap { container-type: inline-size; width: 100%; }
      .ft-grid { display: flex; flex-wrap: wrap; gap: 12px; align-items: stretch; }
      .ft-tile { position: relative; cursor: grab; flex: 1 1 230px; min-width: 0; }
      .ft-tile::before { content: '⠿'; position: absolute; top: 6px; right: 34px; font-size: 13px; line-height: 1; opacity: .18; pointer-events: none; }
      .ft-cbt { position: absolute; top: 5px; right: 7px; z-index: 3; width: 22px; height: 22px; cursor: pointer; border: none; background: var(--background-modifier-hover); color: var(--text-muted); border-radius: 6px; font-size: 14px; line-height: 1; display: flex; align-items: center; justify-content: center; opacity: .75; transition: opacity .12s, background .12s, color .12s; }
      .ft-cbt:hover { opacity: 1; color: var(--text-normal); background: var(--background-modifier-border); }
      .ft-tile.ft-collapsed > :not(.ft-cbt):not(h3) { display: none; }
      .ft-tile.dragging { opacity: .45; cursor: grabbing; border-color: var(--interactive-accent); }
      .ft-scroll { max-height: 340px; overflow-y: auto; scrollbar-width: thin; scrollbar-color: var(--background-modifier-border-hover) transparent; }
      .ft-scroll::-webkit-scrollbar { width: 6px; }
      .ft-scroll::-webkit-scrollbar-thumb { background: var(--background-modifier-border-hover); border-radius: 3px; }
      .ft-scroll.ft-scroll-more {
        -webkit-mask-image: linear-gradient(to bottom, #000 0%, #000 72%, rgba(0,0,0,0) 96%);
        mask-image: linear-gradient(to bottom, #000 0%, #000 72%, rgba(0,0,0,0) 96%);
      }
      .ft-tile-full { flex: 0 0 100%; }
      .ft-top { flex: 0 0 100%; display: flex; gap: 12px; flex-wrap: wrap; align-items: stretch; }
      .ft-top .ft-top-card { flex: 1 1 0; min-width: 0; text-align: center; }
      .ft-top .ft-top-ico { font-size: 1.4em; }
      .ft-top .ft-top-val { font-size: 1.3em; font-weight: 800; margin: 4px 0; font-variant-numeric: tabular-nums; }
      .ft-top .ft-top-lab { font-size: .75em; color: var(--text-muted); text-transform: uppercase; letter-spacing: .08em; font-weight: 600; }
      @container (max-width: 560px) { .ft-top { flex-direction: column; align-items: stretch; } }
      @container (max-width: 560px) { .ft-top .ft-top-val { font-size: 1.15em; } }
      @container (max-width: 480px) { .ft-title { font-size: 1.3em; } .ft-hdr { gap: 4px; } .ft-root { padding: var(--size-4-3); } }
      @container (max-width: 380px) { .ft-form { flex-direction: column; align-items: stretch; } .ft-input, .ft-btn { width: 100% !important; flex: none !important; } }
      .ft-chart { display: flex; align-items: flex-end; gap: 8px; height: 160px; }
      .ft-col { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 6px; min-width: 0; }
      .ft-bars { display: flex; align-items: flex-end; gap: 4px; height: 142px; }
      .ft-b { width: 11px; border-radius: 4px 4px 0 0; transition: filter .15s; }
      .ft-b:hover { filter: brightness(1.15); }
      .ft-b-in { background: linear-gradient(180deg, #9ad19a, #7cb87c); }
      .ft-b-out { background: linear-gradient(180deg, #ef8f8f, #e06c6c); }
      .ft-bl { font-size: .65em; color: var(--text-muted); }
      .ft-row { display: flex; align-items: center; gap: 8px; padding: 6px 4px; border-bottom: 1px solid var(--background-modifier-border); font-size: .9em; border-radius: 6px; }
      .ft-row:hover { background: var(--background-primary-alt); }
      .ft-rowl { color: var(--text-normal); }
      .ft-pos { color: #7cb87c; font-weight: 700; }
      .ft-neg { color: #e06c6c; font-weight: 700; }
      .ft-total { font-weight: 800; border-bottom: none; border-top: 1px solid var(--background-modifier-border); margin-top: 6px; padding-top: 10px; }
      .ft-note { color: var(--text-muted); font-size: .8em; }
      .ft-form { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; }
      .ft-input, .ft-btn { padding: 8px 12px; border-radius: 10px; border: 1px solid var(--background-modifier-border); background: var(--background-primary); color: var(--text-normal); font-size: .9em; transition: border-color .12s, box-shadow .12s; }
      .ft-input:focus { border-color: var(--interactive-accent); box-shadow: 0 0 0 2px color-mix(in srgb, var(--interactive-accent) 40%, transparent); outline: none; }
      .ft-btn { cursor: pointer; font-weight: 600; background: linear-gradient(160deg, var(--interactive-accent), color-mix(in srgb, var(--interactive-accent) 85%, #000)); color: var(--text-on-accent, #fff); border: none; }
      .ft-btn:hover { filter: brightness(1.08); }
      .ft-btn:active { transform: scale(.97); }
      .ft-del { cursor: pointer; border: none; background: transparent; color: var(--text-muted); font-size: 1em; border-radius: 6px; padding: 2px 6px; }
      .ft-del:hover { color: #e06c6c; background: rgba(224,108,108,.12); }
      .ft-donutwrap { display: flex; align-items: center; gap: 18px; flex-wrap: wrap; }
      .ft-donut { width: 128px; height: 128px; border-radius: 50%; position: relative; flex-shrink: 0; box-shadow: 0 0 0 4px var(--background-primary), 0 4px 14px rgba(0,0,0,.15); }
      .ft-donuthole { position: absolute; inset: 24%; background: var(--background-secondary); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: .8em; color: var(--text-normal); }
      .ft-legend { display: flex; flex-direction: column; gap: 6px; flex: 1; min-width: 160px; font-size: .85em; }
      .ft-legt { display: flex; align-items: center; gap: 8px; padding: 2px 4px; border-radius: 6px; }
      .ft-legt:hover { background: var(--background-primary-alt); }
      .ft-legdot { width: 11px; height: 11px; border-radius: 4px; display: inline-block; }
      .ft-inv { text-align: right; }
    `;
    const el = document.createElement('style');
    el.textContent = css;
    document.head.appendChild(el);
  }
}

// ══════════════════════════════════════════════
//  SETTINGS
// ══════════════════════════════════════════════
class FinanceSettingTab extends PluginSettingTab {
  constructor(app, plugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display() {
    const { containerEl } = this;
    containerEl.empty();
    containerEl.createEl('h2', { text: 'Levinskyj Finance' });

    new Setting(containerEl)
      .setName('Složka')
      .setDesc('Cílová složka pro soubory Příjmy, Výdaje a Investice.')
      .addText(t => t
        .setValue(this.plugin.settings.folder)
        .setPlaceholder('Život/Finance')
        .onChange(async v => {
          this.plugin.settings.folder = v.trim();
          await this.plugin.saveSettings();
        }));

    new Setting(containerEl)
      .setName('Soubor příjmů')
      .setDesc('Název souboru (bez přípony) uvnitř složky.')
      .addText(t => t
        .setValue(this.plugin.settings.prijmyFile)
        .setPlaceholder('Příjmy')
        .onChange(async v => {
          this.plugin.settings.prijmyFile = v.trim() || 'Příjmy';
          await this.plugin.saveSettings();
        }));

    new Setting(containerEl)
      .setName('Soubor výdajů')
      .setDesc('Název souboru (bez přípony) uvnitř složky.')
      .addText(t => t
        .setValue(this.plugin.settings.vydajeFile)
        .setPlaceholder('Výdaje')
        .onChange(async v => {
          this.plugin.settings.vydajeFile = v.trim() || 'Výdaje';
          await this.plugin.saveSettings();
        }));

    new Setting(containerEl)
      .setName('Soubor investic')
      .setDesc('Název souboru (bez přípony) uvnitř složky.')
      .addText(t => t
        .setValue(this.plugin.settings.investiceFile)
        .setPlaceholder('Investice')
        .onChange(async v => {
          this.plugin.settings.investiceFile = v.trim() || 'Investice';
          await this.plugin.saveSettings();
        }));

    new Setting(containerEl)
      .setName('Počáteční stav – na účtě (Kč)')
      .setDesc('Stav účtu na začátku evidence; k němu se přičítají příjmy a odečítají výdaje.')
      .addText(t => t
        .setValue(String(this.plugin.settings.startBank || 0))
        .setPlaceholder('0')
        .onChange(async v => {
          this.plugin.settings.startBank = parseFloat(v.replace(',', '.')) || 0;
          await this.plugin.saveSettings();
        }));

    new Setting(containerEl)
      .setName('Počáteční stav – hotovost (Kč)')
      .setDesc('Stav hotovosti na začátku evidence; vklady hotovosti účtu ho snižují a výběry zvyšují.')
      .addText(t => t
        .setValue(String(this.plugin.settings.startCash || 0))
        .setPlaceholder('0')
        .onChange(async v => {
          this.plugin.settings.startCash = parseFloat(v.replace(',', '.')) || 0;
          await this.plugin.saveSettings();
        }));

    new Setting(containerEl)
      .setName('Otevřít při startu')
      .setDesc('Automaticky otevřít panel financí při startu Obsidianu.')
      .addToggle(t => t
        .setValue(this.plugin.settings.openOnStartup)
        .onChange(async v => {
          this.plugin.settings.openOnStartup = v;
          await this.plugin.saveSettings();
        }));

    new Setting(containerEl)
      .setName('Otevřít v hlavním okně')
      .setDesc('Otevřít panel financí jako záložku v hlavním editoru (místo bočního panelu).')
      .addToggle(t => t
        .setValue(this.plugin.settings.openInMain)
        .onChange(async v => {
          this.plugin.settings.openInMain = v;
          await this.plugin.saveSettings();
        }));

    new Setting(containerEl)
      .setName('Vytvořit soubory')
      .setDesc('Vytvoří chybějící složku a soubory dle výše uvedeného nastavení.')
      .addButton(b => b
        .setButtonText('Vytvořit')
        .onClick(async () => {
          await this.plugin.ensureFiles();
          new Notice('Finance: soubory jsou připravené.');
          this.display();
        }));
  }
}

module.exports = FinancePlugin;