const { Plugin, PluginSettingTab, Setting, ItemView, Notice, Platform, requestUrl } = require('obsidian');

const VIEW_TYPE = 'levinskyj-finance-view';

const DEFAULT_SETTINGS = {
  folder: 'Život/Finance',
  prijmyFile: 'Příjmy',
  vydajeFile: 'Výdaje',
  investiceFile: 'Investice',
  openOnStartup: true,
  lastPrices: {}
};

// ── Kategorie (klíče = názvy v markdown souborech) ──
const KAT_PRIJEM = ['prodej', 'ostatni'];
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
      leaf = workspace.getRightLeaf(false);
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
      { path: this.paths.prijmy, body: '| datum | popis | castka |\n| --- | --- | ---: |' },
      { path: this.paths.vydaje, body: '| datum | popis | kategorie | castka |\n| --- | --- | --- | ---: |' },
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
  }
  async onClose() { }

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
        kategorie: (iCat >= 0 ? cells[iCat] : '') || ''
      });
    }
    return result;
  }

  async load() {
    try {
      // Příjmy
      const prijmy = this.parseTable(await this.readFile(this.plugin.paths.prijmy));
      // Výdaje
      const vydaje = this.parseTable(await this.readFile(this.plugin.paths.vydaje));

      this.transactions = [
        ...prijmy.map((r, i) => ({ id: 'p' + i, date: r.datum, type: 'prijem', title: r.popis, category: 'prodej', amount: this.n(r.castka) })),
        ...vydaje.map((r, i) => ({ id: 'v' + i, date: r.datum, type: 'vydej', title: r.popis, category: this.catName(r.kategorie), amount: this.n(r.castka) }))
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
    return out.map((h, idx) => ({
      id: idx + 1, name: h.nazev || h.ticker, ticker: h.ticker,
      investovano: this.n(h.investovano), nakup: h.nakup,
      nakupCena: this.n(h.nakup_cena), podily: this.n(h.podily), naposledy: this.n(h.naposledy)
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
  async removeRow(path, date, title, amount, category) {
    const f = this.app.vault.getAbstractFileByPath(path);
    if (!f) return;
    let text = await this.app.vault.read(f);
    const lines = text.split('\n');
    const target = `| ${date} | ${title} |` + (category !== undefined ? ` ${category} | ${amount} |` : ` ${amount} |`);
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

    // ── Karty ──
    const { tx: txM, inc, out } = this.monthTotals(vm);
    const bal = inc - out;
    const saveRate = inc > 0 ? Math.round((bal / inc) * 100) : 0;

    const cards = root.createEl('div', { cls: 'ft-cards' });
    const mk = (icon, val, label, color) => {
      const c = cards.createEl('div', { cls: 'ft-card' });
      c.createEl('div', { text: icon, cls: 'ft-ico' });
      const v = c.createEl('div', { text: val, cls: 'ft-val' });
      if (color) v.style.color = color;
      c.createEl('div', { text: label, cls: 'ft-lab' });
    };
    mk('📥', `${this.cz(Math.round(inc))} Kč`, 'Příjmy');
    mk('📤', `${this.cz(Math.round(out))} Kč`, 'Výdaje');
    mk('💰', `${this.cz(Math.round(bal))} Kč`, 'Bilance', bal >= 0 ? '#7cb87c' : '#e06c6c');
    mk('🌱', `${saveRate} %`, 'Úspornost', saveRate >= 0 ? '#7cb87c' : '#e06c6c');

    // ── Porovnání s minulým měsícem ──
    const pm = this.monthKey(this.addMonth(this.viewMonth, -1));
    const p = this.monthTotals(pm);
    const incP = p.inc;
    const outP = p.out;
    const diff = (p, c) => p > 0 ? Math.round(((c - p) / p) * 100) : null;
    const cmp = root.createEl('div', { cls: 'ft-card' });
    cmp.createEl('h3', { text: '📈 Oproti minulému měsíci' });
    this.addRow(cmp, 'Příjmy', this.diffStr(diff(incP, inc)));
    this.addRow(cmp, 'Výdaje', this.diffStr(diff(outP, out)));

    // ── Graf ──
    this.renderMonthlyChart(root);
    // ── Donut ──
    this.renderDonut(root, vm);
    // ── Formulář ──
    this.renderForm(root, vm);
    // ── Seznamy ──
    this.renderList(root, '📥 Příjmy', txM.filter(t => t.type === 'prijem'));
    this.renderList(root, '📤 Výdaje', txM.filter(t => t.type === 'vydej'));
    // ── Investice ──
    this.renderInvest(root);
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

  renderMonthlyChart(root) {
    const card = root.createEl('div', { cls: 'ft-card' });
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
    b.title = this.cz(Math.round(v)) + ' Kč';
  }

  renderDonut(root, vm) {
    const card = root.createEl('div', { cls: 'ft-card' });
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
    circle.createEl('div', { text: `${this.cz(Math.round(sum))} Kč`, cls: 'ft-donuthole' });
    const leg = wrap.createEl('div', { cls: 'ft-legend' });
    Object.keys(byCat).sort((a, b) => byCat[b] - byCat[a]).forEach(cat => {
      const lt = leg.createEl('div', { cls: 'ft-legt' });
      lt.createEl('span', { text: ' ', cls: 'ft-legdot', attr: { style: `background:${CAT_COLOR[cat] || '#9aa7b5'};` } });
      lt.createEl('span', { text: `${this.catName(cat)} — ${this.cz(Math.round(byCat[cat]))} Kč (${Math.round(byCat[cat] / sum * 100)} %)` });
    });
  }

  // ══════════ Formulář ══════════
  renderForm(root, vm) {
    const card = root.createEl('div', { cls: 'ft-card' });
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

    selType.addEventListener('change', () => this.fillCats(selCat, selType.value));

    const btn = bar.createEl('button', { text: 'Přidat', cls: 'ft-btn' });
    btn.addEventListener('click', async () => {
      const title = iTitle.value.trim();
      const amount = this.n(iAmt.value);
      if (!title || amount <= 0) { new Notice('Vyplň popis a částku'); return; }
      const isP = selType.value === 'prijem';
      const cat = selCat.value;
      const date = iDate.value || this.today();
      // zapíšu do markdown
      if (isP) {
        await this.appendRow(this.plugin.paths.prijmy, [date, title, String(amount)]);
      } else {
        await this.appendRow(this.plugin.paths.vydaje, [date, title, cat, String(amount)]);
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
  renderList(root, title, rows) {
    const card = root.createEl('div', { cls: 'ft-card' });
    card.createEl('h3', { text: title });
    if (!rows.length) { card.createEl('div', { text: 'Žádné záznamy v tomto měsíci.', cls: 'ft-note' }); return; }
    const isP = rows[0].type === 'prijem';
    let sum = 0;
    rows.sort((a, b) => (b.date || '').localeCompare(a.date || '')).forEach(t => {
      const r = card.createEl('div', { cls: 'ft-row' });
      const l = r.createEl('div', { text: `${t.date} — ${t.title} · ${this.catName(t.category)}`, cls: 'ft-rowl' });
      l.style.flex = '1';
      const v = r.createEl('span', { text: `${isP ? '+' : '-'}${this.cz(Math.round(t.amount))} Kč`, cls: isP ? 'ft-pos' : 'ft-neg' });
      const del = r.createEl('button', { text: '✕', cls: 'ft-del' });
      del.addEventListener('click', async () => {
        const path = isP ? this.plugin.paths.prijmy : this.plugin.paths.vydaje;
        await this.removeRow(path, t.date, t.title, String(t.amount), isP ? undefined : t.category);
        await this.load();
        this.render();
      });
      sum += t.amount;
    });
    const f = card.createEl('div', { cls: 'ft-row ft-total' });
    f.createEl('span', { text: '∑ Celkem' });
    f.createEl('span', { text: `${this.cz(Math.round(sum))} Kč` });
  }

  // ══════════ Investice ══════════
  renderInvest(root) {
    const card = root.createEl('div', { cls: 'ft-card' });
    card.createEl('h3', { text: '📈 Investice' });
    this.renderInvestForm(card);
    const inv = this.investments;
    if (!inv.length) { card.createEl('div', { text: 'Zatím žádné investice.', cls: 'ft-note' }); return; }

    const yahoo = async (sym) => {
      try {
        const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(sym)}?interval=1d&range=5d`;
        const res = await requestUrl({ url, method: 'GET', headers: { 'User-Agent': 'Mozilla/5.0' } });
        const j = res.json;
        const arr = j.chart && j.chart.result && j.chart.result[0].meta;
        return arr ? arr.regularMarketPrice : null;
      } catch (e) { return null; }
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
      inv.forEach((i, idx) => {
        const live = (typeof prices[idx] === 'number' && prices[idx] > 0) ? prices[idx] : null;
        const last = live || stored[i.ticker] || (this.n(i.naposledy) || null);
        if (live) fresh[i.ticker] = live;
        const nakl = this.n(i.investovano);
        const basis = nakl > 0 ? nakl : (i.nakupCena > 0 ? (this.n(i.podily) * i.nakupCena) : 0);
        const akt = basis > 0 && last ? (this.n(i.podily) * last) * (rate || 0) : 0;
        const pc = (basis > 0 && akt) ? Math.round(((akt - basis) / basis) * 1000) / 10 : null;
        const r = card.createEl('div', { cls: 'ft-row' });
        const l = r.createEl('div');
        l.createEl('div', { text: `${i.name} · ${i.ticker}`, cls: 'ft-rowl' });
        l.createEl('div', { text: `vloženo ${this.cz(Math.round(basis))} Kč${last ? ` · cena $${last.toFixed(2)}` : ''}${rate ? ` · $→Kč ${rate.toFixed(2)}` : ''}`, cls: 'ft-note' });
        const v = r.createEl('div', { cls: 'ft-inv' });
        if (last && rate) {
          v.createEl('div', { text: `${this.cz(Math.round(akt))} Kč`, cls: 'ft-rowl' });
          v.createEl('div', { text: pc !== null ? `${pc >= 0 ? '+' : ''}${pc} %` : '—', cls: pc >= 0 ? 'ft-pos' : 'ft-neg' });
        } else {
          v.createEl('div', { text: `${this.cz(Math.round(basis))} Kč`, cls: 'ft-rowl' });
          v.createEl('div', { text: 'offline', cls: 'ft-note' });
        }
      });
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
      await this.appendInvestment({
        ticker,
        name: iName.value.trim(),
        invested: invested > 0 ? String(Math.round(invested)) : '',
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
      .ft-root { padding: var(--size-4-4); display: flex; flex-direction: column; gap: 12px; }
      .ft-hdr { display: flex; align-items: center; gap: 12px; }
      .ft-title { font-family: "Bricolage Grotesque", Georgia, serif; font-size: 1.5em; font-weight: 700; color: var(--text-normal); flex: 1; text-align: center; }
      .ft-nav { cursor: pointer; border: 1px solid var(--background-modifier-border); background: var(--background-secondary); color: var(--text-normal); border-radius: 8px; padding: 2px 14px; font-size: 1.2em; }
      .ft-nav:hover { background: var(--background-modifier-hover); }
      .ft-cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 10px; }
      .ft-card { background: var(--background-secondary); border: 1px solid var(--background-modifier-border); border-radius: 10px; padding: 14px; }
      .ft-card h3 { margin: 0 0 10px; font-size: 1em; color: var(--text-normal); }
      .ft-card .ft-ico { font-size: 1.3em; }
      .ft-card .ft-val { font-size: 1.3em; font-weight: 700; margin: 2px 0; }
      .ft-card .ft-lab { font-size: 0.75em; color: var(--text-muted); }
      .ft-chart { display: flex; align-items: flex-end; gap: 6px; height: 150px; }
      .ft-col { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 4px; min-width: 0; }
      .ft-bars { display: flex; align-items: flex-end; gap: 3px; height: 136px; }
      .ft-b { width: 10px; border-radius: 3px 3px 0 0; }
      .ft-b-in { background: color-mix(in srgb, #7cb87c 70%, var(--text-normal)); }
      .ft-b-out { background: color-mix(in srgb, #e06c6c 70%, var(--text-normal)); }
      .ft-bl { font-size: 0.6em; color: var(--text-muted); }
      .ft-row { display: flex; align-items: center; gap: 8px; padding: 4px 0; border-bottom: 1px solid var(--background-modifier-border); font-size: 0.9em; }
      .ft-rowl { color: var(--text-normal); }
      .ft-pos { color: #7cb87c; font-weight: 700; }
      .ft-neg { color: #e06c6c; font-weight: 700; }
      .ft-total { font-weight: 700; border-bottom: none; }
      .ft-note { color: var(--text-muted); font-size: 0.8em; }
      .ft-form { display: flex; gap: 8px; flex-wrap: wrap; }
      .ft-input, .ft-btn { padding: 6px 10px; border-radius: 8px; border: 1px solid var(--background-modifier-border); background: var(--background-primary); color: var(--text-normal); }
      .ft-btn { cursor: pointer; font-weight: 600; }
      .ft-btn:hover { background: var(--background-modifier-hover); }
      .ft-del { cursor: pointer; border: none; background: transparent; color: var(--text-muted); }
      .ft-del:hover { color: #e06c6c; }
      .ft-donutwrap { display: flex; align-items: center; gap: 18px; flex-wrap: wrap; }
      .ft-donut { width: 120px; height: 120px; border-radius: 50%; position: relative; flex-shrink: 0; }
      .ft-donuthole { position: absolute; inset: 24%; background: var(--background-secondary); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 0.8em; }
      .ft-legend { display: flex; flex-direction: column; gap: 4px; flex: 1; min-width: 160px; font-size: 0.85em; }
      .ft-legt { display: flex; align-items: center; gap: 8px; }
      .ft-legdot { width: 10px; height: 10px; border-radius: 3px; display: inline-block; }
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
      .setName('Otevřít při startu')
      .setDesc('Automaticky otevřít panel financí při startu Obsidianu.')
      .addToggle(t => t
        .setValue(this.plugin.settings.openOnStartup)
        .onChange(async v => {
          this.plugin.settings.openOnStartup = v;
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