var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

var main_exports = {};
__export(main_exports, {
  default: () => FlashcardPlugin
});
module.exports = __toCommonJS(main_exports);
var import_obsidian = require("obsidian");

var DEFAULT_SETTINGS = {
  cards: {},
  deckStats: {},
  globalStats: {
    streak: 0,
    lastStudyDate: null,
    totalReviews: 0
  },
  lastSelectedDeck: null
};

var FlashcardPlugin = class extends import_obsidian.Plugin {
  async onload() {
    await this.loadSettings();

    this.addRibbonIcon("brain-circuit", "Flashcards - Výběr okruhů", () => {
      this.openDeckBrowser();
    });

    this.addCommand({
      id: "open-deck-browser",
      name: "Otevřít výběr okruhů",
      callback: () => this.openDeckBrowser()
    });

    this.addCommand({
      id: "scan-flashcards",
      name: "Skenovat vault pro flashcards",
      callback: async () => {
        await this.scanVault();
        new import_obsidian.Notice("Flashcards naskenovány!");
      }
    });

    this.addCommand({
      id: "quick-review",
      name: "Rychlé opakování - poslední okruh",
      callback: () => {
        const lastDeck = this.settings.lastSelectedDeck;
        if (lastDeck) {
          this.openFlashcardModal(lastDeck, 'practice');
        } else {
          new import_obsidian.Notice("Nejdřív vyber okruh!");
          this.openDeckBrowser();
        }
      }
    });

    this.addSettingTab(new FlashcardSettingTab(this.app, this));
  }

  getDeckName(filePath) {
  if (!filePath || typeof filePath !== 'string') {
    return 'Unknown';
  }
  
  const parts = filePath.split('/');
  const fileName = parts[parts.length - 1].replace('.md', '');
  if (parts.length > 1) {
    const folder = parts[parts.length - 2];
    return `${folder}/${fileName}`;
  }
  return fileName;
}

getDeckFolder(filePath) {
  if (!filePath || typeof filePath !== 'string') {
    return 'Unknown';
  }
  
  const parts = filePath.split('/');
  if (parts.length > 1) {
    return parts[parts.length - 2];
  }
  return 'Kořen';
}

async scanVault() {
  console.log("=== SPOUŠTÍM SCAN VAULT ===");
  const files = this.app.vault.getMarkdownFiles();
  console.log(`Prohledávám ${files.length} souborů...`);
  
  const newCards = {};
  const deckSet = new Set();
  
  let totalCardsFound = 0;

  for (const file of files) {
    try {
      const content = await this.app.vault.read(file);
      
      // Použijeme lepší regex pro hledání Q/A párů
      // Hledá Q:: nebo Q: a potom A:: nebo A: s jakýmkoliv obsahem mezi nimi
      const qaRegex = /^(?:\s*[-*]?\s*)?(?:Q:|Q::)\s*(.+?)\s*\n(?:.|\n)*?^(?:\s*[-*]?\s*)?(?:A:|A::)\s*(.+)$/gm;
      
      let match;
      const deckName = this.getDeckName(file.path);
      
      while ((match = qaRegex.exec(content)) !== null) {
        const question = match[1].trim();
        const answer = match[2].trim();
        
        // Přeskočit prázdné otázky/odpovědi
        if (!question || !answer) continue;
        
        console.log(`NALEZENO: "${question.substring(0, 50)}..." -> "${answer.substring(0, 50)}..."`);
        console.log(`Deck: ${deckName}`);
        
        totalCardsFound++;
        deckSet.add(deckName);
        
        const cardKey = this.hashCard(question, answer);
        
        // Najít číslo řádku pro navigaci
        const questionStart = match.index;
        const lineNumber = content.substring(0, questionStart).split('\n').length - 1;
        
        newCards[cardKey] = {
          question: question,
          answer: answer,
          file: file.path,
          deck: deckName,
          folder: this.getDeckFolder(file.path),
          line: lineNumber,
          interval: 0,
          repetition: 0,
          easeFactor: 2.5,
          dueDate: Date.now(),
          lastReview: 0,
          history: []
        };
      }
      
      // Také zkusíme jednodušší přístup - hledání po řádcích
      const lines = content.split("\n");
      let currentQuestion = "";
      let inQuestion = false;
      let answerLines = [];
      let collectingAnswer = false;

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        
        // Hledat začátek otázky (podporuje různé formáty)
        const qMatch = line.match(/^(?:\s*[-*]?\s*)?(?:Q:|Q::)\s*(.+)$/);
        if (qMatch) {
          currentQuestion = qMatch[1].trim();
          inQuestion = true;
          answerLines = []; // Resetovat odpověď
          collectingAnswer = false;
          continue;
        }
        
        // Hledat začátek odpovědi
        const aMatch = line.match(/^(?:\s*[-*]?\s*)?(?:A:|A::)\s*(.+)$/);
        if (aMatch && inQuestion) {
          answerLines = [aMatch[1].trim()];
          collectingAnswer = true;
          continue;
        }
        
        // Pokud sbíráme odpověď (pro vícerádkové odpovědi)
        if (collectingAnswer && line.trim() && !line.match(/^(?:Q:|Q::|A:|A::)/)) {
          answerLines.push(line);
        }
        
        // Konec odpovědi - prázdný řádek nebo nová otázka
        if (collectingAnswer && 
            (i === lines.length - 1 || lines[i+1].match(/^(?:Q:|Q::)/) || 
             lines[i+1].trim() === '' && lines[i+2] && lines[i+2].match(/^(?:Q:|Q::)/))) {
          
          const answer = answerLines.join('\n').trim();
          if (currentQuestion && answer) {
            console.log(`NALEZENO 2: "${currentQuestion.substring(0, 50)}..."`);
            
            const cardKey = this.hashCard(currentQuestion, answer);
            const deckName = this.getDeckName(file.path);
            
            newCards[cardKey] = {
              question: currentQuestion,
              answer: answer,
              file: file.path,
              deck: deckName,
              folder: this.getDeckFolder(file.path),
              line: i - answerLines.length,
              interval: 0,
              repetition: 0,
              easeFactor: 2.5,
              dueDate: Date.now(),
              lastReview: 0,
              history: []
            };
            
            deckSet.add(deckName);
            totalCardsFound++;
          }
          
          currentQuestion = "";
          inQuestion = false;
          collectingAnswer = false;
          answerLines = [];
        }
      }
      
    } catch (error) {
      console.error(`Chyba při čtení ${file.path}:`, error);
    }
  }

  console.log(`Celkem nalezeno ${totalCardsFound} kartiček v ${deckSet.size} deckách`);
  
  // Aktualizovat settings
  this.settings.cards = newCards;
  
  // Inicializovat deck stats
  for (const deck of deckSet) {
    if (!this.settings.deckStats[deck]) {
      this.settings.deckStats[deck] = {
        reviews: {},
        mastery: 0,
        streak: 0,
        lastStudy: null,
        totalCards: 0
      };
    }
    // Spočítat kartičky v decku
    this.settings.deckStats[deck].totalCards = 
      Object.values(newCards).filter(c => c.deck === deck).length;
  }
  
  await this.saveSettings();
  
  new import_obsidian.Notice(`Naskenováno: ${totalCardsFound} kartiček v ${deckSet.size} okruzích`);
}

  hashCard(question, answer) {
    return `${question}|||${answer}`;
  }

  updateCardSRS(card, quality) {
    const now = Date.now();
    const today = new Date().toISOString().split('T')[0];

    if (!card.history) card.history = [];
    card.history.push({ date: today, quality });

    if (quality < 3) {
      card.repetition = 0;
      card.interval = 0;
    } else {
      if (card.repetition === 0) {
        card.interval = 1;
      } else if (card.repetition === 1) {
        card.interval = 6;
      } else {
        card.interval = Math.round(card.interval * card.easeFactor);
      }
      card.repetition++;
    }

    card.easeFactor = card.easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
    if (card.easeFactor < 1.3) card.easeFactor = 1.3;

    card.dueDate = now + card.interval * 24 * 60 * 60 * 1000;
    card.lastReview = now;

    this.settings.globalStats.totalReviews++;

    const deck = card.deck;
    if (!this.settings.deckStats[deck]) {
      this.settings.deckStats[deck] = { reviews: {}, mastery: 0, streak: 0, lastStudy: null, totalCards: 0 };
    }
    const stats = this.settings.deckStats[deck];

    if (!stats.reviews[today]) stats.reviews[today] = 0;
    stats.reviews[today]++;

    const recent = card.history.slice(-10);
    const avgQuality = recent.reduce((a, b) => a + b.quality, 0) / recent.length;
    stats.mastery = Math.round((avgQuality / 5) * 100);

    const lastStudy = stats.lastStudy ? new Date(stats.lastStudy) : null;
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    if (!lastStudy || lastStudy.toISOString().split('T')[0] === today) {
    } else if (lastStudy.toISOString().split('T')[0] === yesterday.toISOString().split('T')[0]) {
      stats.streak++;
    } else {
      stats.streak = 1;
    }
    stats.lastStudy = today;

    return card;
  }

  getCardsByDeck(deck, mode = 'due') {
    const cards = Object.values(this.settings.cards).filter(c => c.deck === deck);
    const now = Date.now();

    if (mode === 'due') {
      return cards.filter(c => c.dueDate <= now);
    } else if (mode === 'practice') {
      return cards.sort((a, b) => {
        const aDue = a.dueDate <= now ? 0 : 1;
        const bDue = b.dueDate <= now ? 0 : 1;
        if (aDue !== bDue) return aDue - bDue;
        return b.easeFactor - a.easeFactor;
      });
    } else if (mode === 'cram') {
      return cards.sort(() => Math.random() - 0.5);
    }
    return cards;
  }

  getAllDecks() {
  const decks = new Set();
  Object.values(this.settings.cards).forEach(c => {
    if (c && c.deck && typeof c.deck === 'string') {
      decks.add(c.deck);
    }
  });
  return Array.from(decks).sort();
}

  getDecksByFolder() {
  const decks = this.getAllDecks();
  const folders = {};

  for (const deck of decks) {
    // Ověřit, že deck není undefined nebo null
    if (!deck) continue;
    
    // Ověřit, že deck je string
    if (typeof deck !== 'string') {
      console.warn("Nestring deck nalezen:", deck);
      continue;
    }
    
    const parts = deck.split('/');
    const folder = parts.length > 1 ? parts[0] : 'Ostatní';
    const name = parts.length > 1 ? parts.slice(1).join('/') : deck;

    if (!folders[folder]) folders[folder] = [];
    folders[folder].push({ fullName: deck, name: name });
  }

  return folders;
}

  openDeckBrowser() {
    new DeckBrowserModal(this.app, this).open();
  }

  openFlashcardModal(deck, mode = 'due') {
    this.settings.lastSelectedDeck = deck;
    this.saveSettings();
    new FlashcardModal(this.app, this, deck, mode).open();
  }

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }
};

var DeckBrowserModal = class extends import_obsidian.Modal {
  constructor(app, plugin) {
    super(app);
    this.plugin = plugin;
    this.searchQuery = '';
    this.selectedFolder = 'all';
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.addClass("flashcard-deck-browser");

    const header = contentEl.createDiv({ cls: "deck-browser-header" });
    header.createEl("h2", { text: "📚 Vyber si okruh" });

    const searchContainer = contentEl.createDiv({ cls: "search-container" });
    const searchInput = searchContainer.createEl("input", {
      type: "text",
      placeholder: "🔍 Hledat okruh...",
      cls: "deck-search-input"
    });
    searchInput.addEventListener("input", (e) => {
      this.searchQuery = e.target.value.toLowerCase();
      this.renderDeckGrid();
    });

    const folders = this.plugin.getDecksByFolder();
    const folderKeys = Object.keys(folders).sort();

    if (folderKeys.length > 1) {
      const filterContainer = contentEl.createDiv({ cls: "folder-filter" });

      const allBtn = filterContainer.createEl("button", {
        text: "Vše",
        cls: `filter-btn ${this.selectedFolder === 'all' ? 'active' : ''}`
      });
      allBtn.addEventListener("click", () => {
        this.selectedFolder = 'all';
        this.updateFilterButtons(filterContainer);
        this.renderDeckGrid();
      });

      for (const folder of folderKeys) {
        const btn = filterContainer.createEl("button", {
          text: folder,
          cls: `filter-btn ${this.selectedFolder === folder ? 'active' : ''}`
        });
        btn.addEventListener("click", () => {
          this.selectedFolder = folder;
          this.updateFilterButtons(filterContainer);
          this.renderDeckGrid();
        });
      }
    }

    const allCards = Object.keys(this.plugin.settings.cards).length;
    const allDecks = this.plugin.getAllDecks().length;
    const globalStats = contentEl.createDiv({ cls: "global-stats" });
    globalStats.createEl("p", { text: `${allCards} kartiček v ${allDecks} okruzích` });

    this.gridContainer = contentEl.createDiv({ cls: "deck-grid-container" });
    this.renderDeckGrid();

    const footer = contentEl.createDiv({ cls: "deck-browser-footer" });

    const scanBtn = footer.createEl("button", {
      cls: "action-btn scan-btn",
      text: "🔄 Skenovat vault"
    });
    scanBtn.addEventListener("click", async () => {
      await this.plugin.scanVault();
      this.onOpen();
      new import_obsidian.Notice("Vault naskenován!");
    });

    const closeBtn = footer.createEl("button", {
      cls: "action-btn close-btn",
      text: "Zavřít"
    });
    closeBtn.addEventListener("click", () => this.close());
  }

  updateFilterButtons(container) {
    const buttons = container.querySelectorAll('.filter-btn');
    buttons.forEach(btn => {
      btn.classList.toggle('active', 
        (btn.textContent === 'Vše' && this.selectedFolder === 'all') ||
        btn.textContent === this.selectedFolder
      );
    });
  }

  renderDeckGrid() {
    this.gridContainer.empty();

    const folders = this.plugin.getDecksByFolder();
    const folderKeys = this.selectedFolder === 'all' 
      ? Object.keys(folders).sort() 
      : [this.selectedFolder];

    let hasResults = false;

    for (const folder of folderKeys) {
      if (!folders[folder]) continue;

      const filteredDecks = folders[folder].filter(d => 
        d.name.toLowerCase().includes(this.searchQuery) ||
        folder.toLowerCase().includes(this.searchQuery)
      );

      if (filteredDecks.length === 0) continue;
      hasResults = true;

      const section = this.gridContainer.createDiv({ cls: "deck-section" });

      if (this.selectedFolder === 'all') {
        const folderHeader = section.createDiv({ cls: "folder-header" });
        folderHeader.createEl("h3", { text: `📁 ${folder}` });
      }

      const grid = section.createDiv({ cls: "deck-grid" });

      for (const deckInfo of filteredDecks) {
        const deck = deckInfo.fullName;
        const stats = this.plugin.settings.deckStats[deck] || {};
        const cards = this.plugin.getCardsByDeck(deck, 'practice');
        const dueCards = cards.filter(c => c.dueDate <= Date.now());

        const card = grid.createDiv({ cls: "deck-card" });

        const heatmap = card.createDiv({ cls: "mini-heatmap" });
        this.renderMiniHeatmap(heatmap, stats.reviews || {});

        const info = card.createDiv({ cls: "deck-info" });
        info.createEl("h3", { text: deckInfo.name });

        const meta = info.createDiv({ cls: "deck-meta" });

        if (dueCards.length > 0) {
          meta.createEl("span", { cls: "due-badge", text: `${dueCards.length} k opakování` });
        }

        meta.createEl("span", { cls: "total-count", text: `${cards.length} celkem` });

        const mastery = stats.mastery || 0;
        const progress = info.createDiv({ cls: "mastery-bar" });
        const fill = progress.createDiv({ cls: "mastery-fill", attr: { style: `width: ${mastery}%` }});

        if (stats.streak > 0) {
          const streak = info.createDiv({ cls: "streak-badge" });
          streak.createEl("span", { text: `🔥 ${stats.streak}` });
        }

        const buttons = card.createDiv({ cls: "deck-buttons" });

        const dueBtn = buttons.createEl("button", {
          cls: "mode-btn due-btn",
          text: dueCards.length > 0 ? `Due (${dueCards.length})` : "Due ✓"
        });
        dueBtn.disabled = dueCards.length === 0;
        dueBtn.addEventListener("click", () => {
          this.close();
          this.plugin.openFlashcardModal(deck, 'due');
        });

        const practiceBtn = buttons.createEl("button", {
          cls: "mode-btn practice-btn",
          text: "Procvičit"
        });
        practiceBtn.addEventListener("click", () => {
          this.close();
          this.plugin.openFlashcardModal(deck, 'practice');
        });

        const cramBtn = buttons.createEl("button", {
          cls: "mode-btn cram-btn",
          text: "Cram"
        });
        cramBtn.addEventListener("click", () => {
          this.close();
          this.plugin.openFlashcardModal(deck, 'cram');
        });

        const statsBtn = card.createEl("button", { cls: "stats-btn", text: "📊" });
        statsBtn.addEventListener("click", () => {
          new DeckStatsModal(this.app, this.plugin, deck).open();
        });
      }
    }

    if (!hasResults) {
      this.gridContainer.createEl("div", { cls: "empty-state", text: "Žádné okruhy neodpovídají hledání. Zkus jiný výraz nebo přidej Q:: a A:: do souborů." });
    }
  }

  renderMiniHeatmap(container, reviews) {
    const days = 28;
    const today = new Date();

    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const count = reviews[dateStr] || 0;

      const cell = container.createDiv({ cls: "heatmap-cell" });
      if (count === 0) cell.addClass("level-0");
      else if (count < 3) cell.addClass("level-1");
      else if (count < 6) cell.addClass("level-2");
      else if (count < 10) cell.addClass("level-3");
      else cell.addClass("level-4");

      cell.setAttribute("title", `${dateStr}: ${count} review`);
    }
  }

  onClose() {
    const { contentEl } = this;
    contentEl.empty();
  }
};

var DeckStatsModal = class extends import_obsidian.Modal {
  constructor(app, plugin, deck) {
    super(app);
    this.plugin = plugin;
    this.deck = deck;
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.addClass("deck-stats-modal");

    const stats = this.plugin.settings.deckStats[this.deck] || {};
    const cards = this.plugin.getCardsByDeck(this.deck, 'practice');

    const header = contentEl.createDiv({ cls: "stats-header" });
    header.createEl("h2", { text: `📊 Statistiky: ${this.deck.split('/').pop()}` });

    const summary = contentEl.createDiv({ cls: "stats-summary" });

    const totalCard = summary.createDiv({ cls: "stat-card" });
    totalCard.createEl("div", { cls: "stat-value", text: cards.length.toString() });
    totalCard.createEl("div", { cls: "stat-label", text: "Kartiček" });

    const masteryCard = summary.createDiv({ cls: "stat-card" });
    masteryCard.createEl("div", { cls: "stat-value", text: `${stats.mastery || 0}%` });
    masteryCard.createEl("div", { cls: "stat-label", text: "Mastery" });

    const streakCard = summary.createDiv({ cls: "stat-card" });
    streakCard.createEl("div", { cls: "stat-value", text: (stats.streak || 0).toString() });
    streakCard.createEl("div", { cls: "stat-label", text: "Streak 🔥" });

    const dueCard = summary.createDiv({ cls: "stat-card" });
    const dueCount = cards.filter(c => c.dueDate <= Date.now()).length;
    dueCard.createEl("div", { cls: "stat-value due", text: dueCount.toString() });
    dueCard.createEl("div", { cls: "stat-label", text: "K opakování" });

    contentEl.createEl("h3", { text: "Aktivita (poslední 3 měsíce)" });
    const heatmapContainer = contentEl.createDiv({ cls: "full-heatmap" });
    this.renderFullHeatmap(heatmapContainer, stats.reviews || {});

    const legend = contentEl.createDiv({ cls: "heatmap-legend" });
    legend.createEl("span", { text: "Méně" });
    for (let i = 0; i <= 4; i++) {
      const cell = legend.createDiv({ cls: `legend-cell level-${i}` });
    }
    legend.createEl("span", { text: "Více" });

    const closeBtn = contentEl.createEl("button", { cls: "close-stats-btn", text: "Zavřít" });
    closeBtn.addEventListener("click", () => this.close());
  }

  renderFullHeatmap(container, reviews) {
    const weeks = 12;
    const today = new Date();

    for (let w = 0; w < weeks; w++) {
      const weekCol = container.createDiv({ cls: "heatmap-week" });
      for (let d = 0; d < 7; d++) {
        const date = new Date(today);
        date.setDate(date.getDate() - (w * 7 + (6 - d)));
        const dateStr = date.toISOString().split('T')[0];
        const count = reviews[dateStr] || 0;

        const cell = weekCol.createDiv({ cls: "heatmap-cell-large" });
        if (count === 0) cell.addClass("level-0");
        else if (count < 3) cell.addClass("level-1");
        else if (count < 6) cell.addClass("level-2");
        else if (count < 10) cell.addClass("level-3");
        else cell.addClass("level-4");

        cell.setAttribute("title", `${dateStr}: ${count} review`);
      }
    }
  }

  onClose() {
    this.contentEl.empty();
  }
};

var FlashcardModal = class extends import_obsidian.Modal {
  constructor(app, plugin, deck, mode) {
    super(app);
    this.plugin = plugin;
    this.deck = deck;
    this.mode = mode;
    this.currentCard = null;
    this.showingAnswer = false;
    this.cards = [];
    this.currentIndex = 0;
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.addClass("flashcard-modal-content");
    
    // Přidat CSS pro responzivní obrázky
    const style = document.createElement("style");
    style.id = "flashcard-images-style";
    style.textContent = `
    .flashcard-modal-content {
      max-width: 800px;
      margin: 0 auto;
      padding: 20px;
    }
    
    .flashcard-modal-content .flashcard-content {
      font-size: 16px;
      line-height: 1.6;
      padding: 20px;
      background: var(--background-secondary);
      border-radius: 10px;
      margin: 15px 0;
      max-width: 100%;
      overflow-wrap: break-word;
      word-break: break-word;
    }
    
    /* TADY JE KLÍČOVÁ ČÁST - NASTAVÍME MAX VELIKOST OBRAZKŮ */
    .flashcard-modal-content img {
      max-width: 200px !important;  /* Změňte na požadovanou velikost */
      max-height: 200px !important; /* Změňte na požadovanou velikost */
      width: auto !important;
      height: auto !important;
      border-radius: 8px;
      box-shadow: 0 3px 10px rgba(0,0,0,0.1);
      display: block;
      margin: 10px auto;
    }
    
    /* Pro menší obrazovky */
    @media (max-width: 768px) {
      .flashcard-modal-content img {
        max-width: 250px !important;
        max-height: 250px !important;
      }
    }
    
    /* Když je obrázek kliknutý (zvětšený) */
    .flashcard-modal-content img.expanded {
      max-width: 90vw !important;
      max-height: 80vh !important;
      cursor: zoom-out;
      position: relative;
      z-index: 1000;
      background: rgba(0,0,0,0.8);
      padding: 10px;
      border-radius: 10px;
    }
    
    .flashcard-modal-content img:not(.expanded) {
      cursor: zoom-in;
    }
    
    .flashcard-modal-content strong {
      color: var(--text-accent);
      font-weight: bold;
    }
    
    .flashcard-modal-content em {
      font-style: italic;
    }
    
    .flashcard-modal-content .internal-link {
      color: var(--text-accent);
      text-decoration: underline;
      cursor: pointer;
    }
    
    /* Styly pro kartičku */
    .flashcard-card {
      width: 100%;
      max-width: 100%;
    }
    
    /* Header */
    .flashcard-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 15px;
      flex-wrap: wrap;
      gap: 10px;
    }
    
    .deck-badge, .mode-badge {
      padding: 4px 12px;
      border-radius: 20px;
      font-size: 14px;
      font-weight: 500;
    }
    
    .deck-badge {
      background: var(--background-modifier-accent);
      color: var(--text-on-accent);
    }
    
    .mode-badge {
      background: var(--interactive-accent);
      color: white;
    }
  `;
  document.head.appendChild(style);
  
  // Uklidit při zavření
  this.onClose = () => {
    const styleEl = document.getElementById("flashcard-images-style");
    if (styleEl) styleEl.remove();
    contentEl.empty();
  };
  
  this.cards = this.plugin.getCardsByDeck(this.deck, this.mode);
  this.render();
}

convertMarkdownToHtml(text) {
  if (!text) return '';
  
  return text
    // Code blocks
    .replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>')
    // Inline code
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    // Bold
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    // Italic
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    // Strikethrough
    .replace(/~~(.*?)~~/g, '<del>$1</del>')
    // Images - opravené pro Obsidian
    .replace(/!\[\[(.*?)(?:\|.*?)?\]\]/g, (match, imagePath) => {
      // Získat skutečnou cestu k obrázku
      const realPath = this.getRealImagePath(imagePath, this.currentCard.file);
      return `<div class="image-container"><img src="${realPath}" alt="Obrázek" class="flashcard-img" data-path="${imagePath}"></div>`;
    })
    // Odkazy
    .replace(/\[\[(.*?)\]\]/g, '<span class="internal-link">$1</span>')
    // URL odkazy
    .replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" target="_blank">$1</a>')
    // Nové řádky
    .replace(/\n/g, '<br>');
}

getRealImagePath(imageName, cardFilePath) {
  try {
    // Zkusit najít soubor v vault
    const imageFile = this.app.vault.getAbstractFileByPath(imageName);
    if (imageFile) {
      // Pokud najdeme přímo podle cesty
      return this.app.vault.getResourcePath(imageFile);
    }
    
    // Zkusit najít v attachments složce
    const cardDir = cardFilePath.substring(0, cardFilePath.lastIndexOf('/'));
    const possiblePaths = [
      imageName,
      `${cardDir}/${imageName}`,
      `${cardDir}/attachments/${imageName}`,
      `attachments/${imageName}`,
      `Assets/${imageName}`
    ];
    
    for (const path of possiblePaths) {
      const file = this.app.vault.getAbstractFileByPath(path);
      if (file) {
        return this.app.vault.getResourcePath(file);
      }
    }
    
    // Pokud nic nenajdeme, vrátíme původní název
    console.warn(`Obrázek nenalezen: ${imageName} pro soubor: ${cardFilePath}`);
    return imageName;
  } catch (error) {
    console.error(`Chyba při hledání obrázku ${imageName}:`, error);
    return imageName;
  }
}

  getImagePath(imageName) {
    // Zjednodušené - v reálném použití byste potřebovali získat skutečnou cestu
    // V Obsidianu jsou obrázky obvykle v attachments nebo ve stejném folderu
    return imageName; // Prozatím vrátíme jen název
  }

  setupImageListeners() {
  const contentEl = this.contentEl;
  const images = contentEl.querySelectorAll('img');
  
  images.forEach(img => {
    // Přidat loading="lazy" pro lepší performance
    img.setAttribute('loading', 'lazy');
    
    // Přidat title pro hover
    if (!img.title) {
      img.title = 'Klikni pro zvětšení';
    }
    
    // Zkontrolovat, jestli se obrázek nenačetl
    img.addEventListener('error', () => {
      console.error(`Obrázek se nenačetl: ${img.src}`);
      const altText = img.getAttribute('data-path') || 'Obrázek';
      img.alt = `[Chyba při načítání: ${altText}]`;
      img.style.border = '2px dashed red';
      img.style.padding = '10px';
      img.style.backgroundColor = 'var(--background-modifier-error)';
    });
    
    // Kliknutí pro zvětšení
    img.addEventListener('click', (e) => {
      e.stopPropagation();
      this.toggleImageSize(img);
    });
  });
}

  toggleImageSize(img) {
    if (img.classList.contains('expanded')) {
      img.classList.remove('expanded');
      img.style.maxHeight = '';
      img.style.cursor = 'zoom-in';
    } else {
      img.classList.add('expanded');
      img.style.maxHeight = '90vh';
      img.style.cursor = 'zoom-out';
    }
  }

  render() {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.addClass("flashcard-modal-content");

    const header = contentEl.createDiv({ cls: "flashcard-header" });
    const deckName = this.deck.split('/').pop();
    header.createEl("span", { cls: "deck-badge", text: deckName });
    header.createEl("span", { cls: "mode-badge", text: this.getModeLabel() });

    const progress = contentEl.createDiv({ cls: "session-progress" });
    progress.createEl("span", { text: `${this.currentIndex + 1} / ${this.cards.length}` });
    const bar = progress.createDiv({ cls: "progress-bar" });
    const fill = bar.createDiv({ cls: "progress-fill", attr: { style: `width: ${((this.currentIndex + 1) / this.cards.length) * 100}%` }});

    if (this.currentIndex >= this.cards.length) {
      this.renderSessionComplete();
      return;
    }

    if (!this.currentCard) {
      this.currentCard = this.cards[this.currentIndex];
      this.showingAnswer = false;
    }

    const cardDiv = contentEl.createDiv({ cls: "flashcard-card" });

    // OTÁZKA
    const questionDiv = cardDiv.createDiv({ cls: "flashcard-question" });
    questionDiv.createEl("h2", { text: "Otázka:" });
    
    const questionContent = questionDiv.createDiv({ cls: "flashcard-content" });
    
    // Lepší konverze markdown na HTML
    let questionHtml = this.convertMarkdownToHtml(this.currentCard.question);
    questionContent.innerHTML = questionHtml;

    if (this.showingAnswer) {
      // ODPOVĚĎ
      const answerDiv = cardDiv.createDiv({ cls: "flashcard-answer" });
      answerDiv.createEl("h2", { text: "Odpověď:" });
      
      const answerContent = answerDiv.createDiv({ cls: "flashcard-content" });
      
      let answerHtml = this.convertMarkdownToHtml(this.currentCard.answer);
      answerContent.innerHTML = answerHtml;

      // Tlačítka pro hodnocení
      const buttonDiv = contentEl.createDiv({ cls: "flashcard-buttons" });
      const buttons = [
        { label: "Znovu", quality: 0, cls: "btn-again", desc: "< 10m" },
        { label: "Těžké", quality: 3, cls: "btn-hard", desc: "< 6d" },
        { label: "Dobře", quality: 4, cls: "btn-good", desc: "~2t" },
        { label: "Lehké", quality: 5, cls: "btn-easy", desc: "~1m" }
      ];

      buttons.forEach(btn => {
        const wrapper = buttonDiv.createDiv({ cls: "rating-wrapper" });
        const button = wrapper.createEl("button", { text: btn.label, cls: btn.cls });
        wrapper.createEl("span", { cls: "rating-desc", text: btn.desc });
        button.addEventListener("click", () => this.rateCard(btn.quality));
      });
    } else {
      const showBtn = contentEl.createEl("button", { 
        text: "Ukázat odpověď", 
        cls: "btn-show-answer" 
      });
      showBtn.addEventListener("click", () => {
        this.showingAnswer = true;
        this.render();
      });
    }

    // Footer
    const footer = contentEl.createDiv({ cls: "flashcard-footer" });
    const left = footer.createDiv({ cls: "footer-left" });
    
    // Navigace k souboru
    const fileBtn = left.createEl("button", { 
      cls: "file-link-btn",
      text: `📄 ${this.currentCard.file.split('/').pop()}`
    });
    fileBtn.addEventListener("click", async () => {
      const file = this.app.vault.getAbstractFileByPath(this.currentCard.file);
      if (file) {
        const leaf = this.app.workspace.getLeaf();
        await leaf.openFile(file);
        if (this.currentCard.line >= 0) {
          setTimeout(() => {
            this.app.workspace.activeEditor?.editor?.setCursor(
              this.currentCard.line, 0
            );
          }, 100);
        }
      }
    });

    const right = footer.createDiv({ cls: "footer-right" });
    const skipBtn = right.createEl("button", { cls: "skip-btn", text: "Přeskočit →" });
    skipBtn.addEventListener("click", () => {
      this.currentIndex++;
      this.currentCard = null;
      this.render();
    });

    const pauseBtn = right.createEl("button", { cls: "pause-btn", text: "Pozastavit" });
    pauseBtn.addEventListener("click", () => {
      this.close();
      this.plugin.openDeckBrowser();
    });
    
    // Přidat event listenery pro obrázky
    setTimeout(() => this.setupImageListeners(), 100);
  }

  getModeLabel() {
    switch(this.mode) {
      case 'due': return 'Due';
      case 'practice': return 'Procvičování';
      case 'cram': return 'Cram';
      default: return '';
    }
  }

  renderSessionComplete() {
    const { contentEl } = this;

    const complete = contentEl.createDiv({ cls: "session-complete" });
    complete.createEl("div", { cls: "complete-icon", text: "🎉" });
    complete.createEl("h2", { text: "Session dokončen!" });
    complete.createEl("p", { text: `Prošel jsi ${this.cards.length} kartiček v okruhu ${this.deck.split('/').pop()}` });

    const buttons = contentEl.createDiv({ cls: "complete-buttons" });

    const againBtn = buttons.createEl("button", { cls: "again-btn", text: "Znovu stejný režim" });
    againBtn.addEventListener("click", () => {
      this.currentIndex = 0;
      this.currentCard = null;
      this.render();
    });

    const practiceBtn = buttons.createEl("button", { cls: "practice-btn", text: "Procvičit vše" });
    practiceBtn.addEventListener("click", () => {
      this.mode = 'practice';
      this.cards = this.plugin.getCardsByDeck(this.deck, 'practice');
      this.currentIndex = 0;
      this.currentCard = null;
      this.render();
    });

    const backBtn = buttons.createEl("button", { cls: "back-btn", text: "Zpět na okruhy" });
    backBtn.addEventListener("click", () => {
      this.close();
      this.plugin.openDeckBrowser();
    });

    const closeBtn = buttons.createEl("button", { cls: "close-btn", text: "Zavřít" });
    closeBtn.addEventListener("click", () => this.close());
  }

  async rateCard(quality) {
    if (!this.currentCard) return;

    const cardKey = this.plugin.hashCard(this.currentCard.question, this.currentCard.answer);
    const updatedCard = this.plugin.updateCardSRS(this.currentCard, quality);
    this.plugin.settings.cards[cardKey] = updatedCard;
    await this.plugin.saveSettings();

    this.currentIndex++;
    this.currentCard = null;
    this.showingAnswer = false;
    this.render();
  }
};

var FlashcardSettingTab = class extends import_obsidian.PluginSettingTab {
  constructor(app, plugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display() {
    const { containerEl } = this;
    containerEl.empty();
    containerEl.createEl("h2", { text: "Flashcard Nastavení" });

    new import_obsidian.Setting(containerEl)
      .setName("Skenovat vault")
      .setDesc("Skenovat vault pro flashcards (Q:: / A:: formát)")
      .addButton(btn => btn.setButtonText("Skenovat").onClick(async () => {
        await this.plugin.scanVault();
        new import_obsidian.Notice("Vault naskenován!");
      }));

    new import_obsidian.Setting(containerEl)
      .setName("Reset všech kartiček")
      .setDesc("Resetovat všechny progressy (nelze vrátit)")
      .addButton(btn => btn.setButtonText("Reset").setWarning().onClick(async () => {
        this.plugin.settings.cards = {};
        this.plugin.settings.deckStats = {};
        await this.plugin.saveSettings();
        await this.plugin.scanVault();
        new import_obsidian.Notice("Vše resetováno!");
      }));

    containerEl.createEl("h3", { text: "Statistiky" });
    const total = Object.keys(this.plugin.settings.cards).length;
    const due = Object.values(this.plugin.settings.cards).filter(c => c.dueDate <= Date.now()).length;
    const decks = this.plugin.getAllDecks().length;
    containerEl.createEl("p", { text: `Celkem kartiček: ${total}` });
    containerEl.createEl("p", { text: `Okruhů: ${decks}` });
    containerEl.createEl("p", { text: `K opakování: ${due}` });
    containerEl.createEl("p", { text: `Celkové review: ${this.plugin.settings.globalStats.totalReviews || 0}` });
  }
};