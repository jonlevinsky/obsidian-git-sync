const { Plugin, PluginSettingTab, Setting, Notice, ItemView, WorkspaceLeaf, Menu } = require('obsidian');

const VIEW_TYPE_SCREENPLAY = "screenplay-view";

class ScreenplayView extends ItemView {
    constructor(leaf) {
        super(leaf);
        this.currentElement = 'action';
        this.sceneCount = 0;
        this.pageCount = 1;
        
        // Databáze pro autocomplete
        this.characters = new Set();
        this.locations = new Set();
        this.transitions = new Set(['FADE IN:', 'FADE OUT:', 'CUT TO:', 'DISSOLVE TO:', 'FADE TO BLACK:', 'JUMP CUT TO:', 'MATCH CUT TO:', 'SMASH CUT TO:']);
        
        // Historie pro undo
        this.history = [];
        this.historyIndex = -1;
    }

    getViewType() {
        return VIEW_TYPE_SCREENPLAY;
    }

    getDisplayText() {
        return "Scénář";
    }

    getIcon() {
        return "film";
    }

    async onOpen() {
        const container = this.containerEl.children[1];
        container.empty();
        container.addClass('screenplay-editor-container');

        // Hlavní layout
        const mainLayout = container.createDiv({ cls: 'screenplay-main-layout' });

        // Levý panel - seznamy
        const leftPanel = mainLayout.createDiv({ cls: 'screenplay-left-panel' });
        this.createLeftPanel(leftPanel);

        // Střední panel - editor
        const centerPanel = mainLayout.createDiv({ cls: 'screenplay-center-panel' });
        this.createCenterPanel(centerPanel);

        // Pravý panel - statistiky
        const rightPanel = mainLayout.createDiv({ cls: 'screenplay-right-panel' });
        this.createRightPanel(rightPanel);

        // Inicializace
        this.updateStats();
        this.setCurrentElement('action');
    }

    createLeftPanel(panel) {
        panel.createEl('h3', { text: '📋 Přehledy', cls: 'panel-title' });

        // Postary
        const charSection = panel.createDiv({ cls: 'list-section' });
        charSection.createEl('h4', { text: 'Postavy' });
        this.characterList = charSection.createDiv({ cls: 'screenplay-list' });

        // Lokace
        const locSection = panel.createDiv({ cls: 'list-section' });
        locSection.createEl('h4', { text: 'Lokace' });
        this.locationList = locSection.createDiv({ cls: 'screenplay-list' });

        // Scény
        const sceneSection = panel.createDiv({ cls: 'list-section' });
        sceneSection.createEl('h4', { text: 'Scény' });
        this.sceneList = sceneSection.createDiv({ cls: 'screenplay-list' });
    }

    createCenterPanel(panel) {
        // Toolbar
        const toolbar = panel.createDiv({ cls: 'screenplay-toolbar' });
        
        const buttons = [
            { name: 'Scéna', type: 'scene', key: 'Alt+1', icon: '🎬' },
            { name: 'Akce', type: 'action', key: 'Alt+2', icon: '📝' },
            { name: 'Postava', type: 'character', key: 'Alt+3', icon: '👤' },
            { name: 'Dialog', type: 'dialogue', key: 'Alt+4', icon: '💬' },
            { name: 'Poznámka', type: 'parenthetical', key: 'Alt+5', icon: '💭' },
            { name: 'Přechod', type: 'transition', key: 'Alt+6', icon: '➡️' }
        ];

        buttons.forEach(btn => {
            const button = toolbar.createEl('button', {
                cls: 'screenplay-btn'
            });
            button.setAttribute('data-type', btn.type);
            
            const icon = button.createSpan({ cls: 'btn-icon', text: btn.icon });
            const text = button.createSpan({ cls: 'btn-text', text: btn.name });
            const shortcut = button.createSpan({ cls: 'shortcut', text: btn.key });
            
            button.onclick = () => this.setCurrentElement(btn.type);
        });

        // Editor area
        const editorArea = panel.createDiv({ cls: 'screenplay-editor-area' });
        
        // Input s autocomplete
        const inputContainer = editorArea.createDiv({ cls: 'screenplay-input-container' });
        
        const input = inputContainer.createEl('textarea', {
            cls: 'screenplay-input',
            attr: {
                placeholder: 'Začni psát svůj scénář...',
                rows: '2',
                spellcheck: 'false'
            }
        });

        const typeIndicator = inputContainer.createDiv({ 
            cls: 'type-indicator'
        });

        // Autocomplete dropdown
        this.autocompleteList = inputContainer.createDiv({ cls: 'autocomplete-list' });
        this.autocompleteList.style.display = 'none';

        // Preview (scénář)
        const previewContainer = editorArea.createDiv({ cls: 'screenplay-preview-container' });
        
        // Page indicator
        this.pageIndicator = previewContainer.createDiv({ 
            cls: 'page-indicator',
            text: 'Strana 1'
        });

        const preview = previewContainer.createDiv({ cls: 'screenplay-preview' });

        // Event listeners
        input.addEventListener('input', (e) => {
            this.handleAutocomplete(e.target.value);
        });

        input.addEventListener('keydown', (e) => {
            // Autocomplete navigation
            if (this.autocompleteList.style.display !== 'none') {
                if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
                    e.preventDefault();
                    this.navigateAutocomplete(e.key === 'ArrowDown' ? 1 : -1);
                    return;
                }
                if (e.key === 'Enter' || e.key === 'Tab') {
                    e.preventDefault();
                    this.selectAutocomplete();
                    return;
                }
                if (e.key === 'Escape') {
                    this.autocompleteList.style.display = 'none';
                    return;
                }
            }

            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.addElement(input.value, preview);
                input.value = '';
                this.autocompleteList.style.display = 'none';
            }

            // Tab key - přepnutí na další typ
            if (e.key === 'Tab' && !e.shiftKey) {
                e.preventDefault();
                this.switchToNextType();
            }

            // Undo/Redo
            if ((e.ctrlKey || e.metaKey)) {
                if (e.key === 'z' && !e.shiftKey) {
                    e.preventDefault();
                    this.undo();
                } else if (e.key === 'z' && e.shiftKey || e.key === 'y') {
                    e.preventDefault();
                    this.redo();
                }
            }

            // Klávesové zkratky Alt+číslo
            if (e.altKey) {
                const typeMap = {
                    '1': 'scene',
                    '2': 'action',
                    '3': 'character',
                    '4': 'dialogue',
                    '5': 'parenthetical',
                    '6': 'transition'
                };
                
                if (typeMap[e.key]) {
                    e.preventDefault();
                    this.setCurrentElement(typeMap[e.key]);
                }
            }
        });

        // Store references
        this.input = input;
        this.preview = preview;
        this.typeIndicator = typeIndicator;
        this.toolbar = toolbar;
    }

    createRightPanel(panel) {
        panel.createEl('h3', { text: '📊 Statistiky', cls: 'panel-title' });

        const statsDiv = panel.createDiv({ cls: 'stats-container' });

        this.stats = {
            scenes: statsDiv.createDiv({ cls: 'stat-item' }),
            pages: statsDiv.createDiv({ cls: 'stat-item' }),
            characters: statsDiv.createDiv({ cls: 'stat-item' }),
            dialogueLines: statsDiv.createDiv({ cls: 'stat-item' }),
            locations: statsDiv.createDiv({ cls: 'stat-item' })
        };

        // Export buttons
        const exportSection = panel.createDiv({ cls: 'export-section' });
        exportSection.createEl('h4', { text: 'Export' });
        
        const pdfBtn = exportSection.createEl('button', {
            text: '📄 Export PDF',
            cls: 'export-btn'
        });
        pdfBtn.onclick = () => this.exportPDF();

        const fountainBtn = exportSection.createEl('button', {
            text: '⛲ Export Fountain',
            cls: 'export-btn'
        });
        fountainBtn.onclick = () => this.exportFountain();
    }

    handleAutocomplete(value) {
        if (!value.trim() || value.length < 2) {
            this.autocompleteList.style.display = 'none';
            return;
        }

        let suggestions = [];
        const lowerValue = value.toLowerCase();

        if (this.currentElement === 'character') {
            suggestions = Array.from(this.characters)
                .filter(char => char.toLowerCase().includes(lowerValue))
                .slice(0, 5);
        } else if (this.currentElement === 'scene') {
            suggestions = Array.from(this.locations)
                .filter(loc => loc.toLowerCase().includes(lowerValue))
                .slice(0, 5);
        } else if (this.currentElement === 'transition') {
            suggestions = Array.from(this.transitions)
                .filter(trans => trans.toLowerCase().includes(lowerValue))
                .slice(0, 5);
        }

        if (suggestions.length === 0) {
            this.autocompleteList.style.display = 'none';
            return;
        }

        this.autocompleteList.empty();
        this.autocompleteList.style.display = 'block';

        suggestions.forEach((suggestion, index) => {
            const item = this.autocompleteList.createDiv({ 
                cls: 'autocomplete-item',
                text: suggestion
            });
            if (index === 0) item.addClass('selected');
            
            item.onclick = () => {
                this.input.value = suggestion;
                this.autocompleteList.style.display = 'none';
                this.input.focus();
            };
        });
    }

    navigateAutocomplete(direction) {
        const items = this.autocompleteList.querySelectorAll('.autocomplete-item');
        if (items.length === 0) return;

        let currentIndex = -1;
        items.forEach((item, index) => {
            if (item.hasClass('selected')) {
                currentIndex = index;
                item.removeClass('selected');
            }
        });

        let newIndex = currentIndex + direction;
        if (newIndex < 0) newIndex = items.length - 1;
        if (newIndex >= items.length) newIndex = 0;

        items[newIndex].addClass('selected');
        items[newIndex].scrollIntoView({ block: 'nearest' });
    }

    selectAutocomplete() {
        const selected = this.autocompleteList.querySelector('.autocomplete-item.selected');
        if (selected) {
            this.input.value = selected.textContent;
            this.autocompleteList.style.display = 'none';
            this.input.focus();
        }
    }

    setCurrentElement(type) {
        this.currentElement = type;
        
        // Update toolbar
        this.toolbar.querySelectorAll('.screenplay-btn').forEach(btn => {
            btn.removeClass('active');
            if (btn.getAttribute('data-type') === type) {
                btn.addClass('active');
            }
        });

        // Update indicator
        const names = {
            'scene': '🎬 SCÉNA',
            'action': '📝 AKCE',
            'character': '👤 POSTAVA',
            'dialogue': '💬 DIALOG',
            'parenthetical': '💭 POZNÁMKA',
            'transition': '➡️ PŘECHOD'
        };
        this.typeIndicator.textContent = names[type];
        
        // Update placeholder
        const placeholders = {
            'scene': 'např. INT. KAVÁRNA - DEN',
            'action': 'Popis akce...',
            'character': 'Jméno postavy',
            'dialogue': 'Text dialogu...',
            'parenthetical': 'režijní poznámka',
            'transition': 'např. CUT TO:'
        };
        this.input.setAttribute('placeholder', placeholders[type]);
        
        this.input.focus();
    }

    switchToNextType() {
        const sequence = {
            'scene': 'action',
            'action': 'character',
            'character': 'dialogue',
            'dialogue': 'action',
            'parenthetical': 'dialogue',
            'transition': 'scene'
        };
        
        const nextType = sequence[this.currentElement] || 'action';
        this.setCurrentElement(nextType);
    }

    addElement(text, preview) {
        if (!text.trim()) return;

        // Save to history
        this.saveState();

        const element = preview.createDiv({ cls: `sp-${this.currentElement}` });
        element.setAttribute('data-type', this.currentElement);
        
        let displayText = text.trim();
        
        // Formátování podle typu
        switch(this.currentElement) {
            case 'scene':
                displayText = this.formatScene(displayText);
                this.sceneCount++;
                this.extractLocation(displayText);
                break;
            case 'character':
                displayText = displayText.toUpperCase();
                this.characters.add(displayText);
                break;
            case 'dialogue':
                // Dialog zůstává jak je
                break;
            case 'parenthetical':
                if (!displayText.startsWith('(')) {
                    displayText = '(' + displayText + ')';
                }
                break;
            case 'transition':
                displayText = displayText.toUpperCase();
                if (!displayText.endsWith(':')) {
                    displayText = displayText + ':';
                }
                this.transitions.add(displayText);
                break;
        }

        element.textContent = displayText;
        
        // Context menu
        element.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            this.showContextMenu(e, element);
        });

        // Double click edit
        element.addEventListener('dblclick', () => {
            this.editElement(element);
        });

        // Scroll na konec
        preview.scrollTop = preview.scrollHeight;

        // Automatické přepnutí typu
        this.autoSwitchType();

        // Update všeho
        this.updateLists();
        this.updateStats();
        this.updatePageCount();
    }

    formatScene(text) {
        text = text.toUpperCase().trim();
        
        // Zkontroluj, jestli začíná INT. nebo EXT.
        if (!text.startsWith('INT.') && !text.startsWith('EXT.')) {
            // Zkus detekovat z kontextu
            if (text.toLowerCase().includes('venku') || 
                text.toLowerCase().includes('exteriér')) {
                text = 'EXT. ' + text;
            } else {
                text = 'INT. ' + text;
            }
        }
        
        // Přidej číslo scény
        this.sceneCount++;
        return `${this.sceneCount}. ${text}`;
    }

    extractLocation(sceneText) {
        // Extrahuj lokaci ze scény
        const match = sceneText.match(/(?:INT\.|EXT\.)\s+([^-]+)/);
        if (match) {
            const location = match[1].trim();
            this.locations.add(location);
        }
    }

    autoSwitchType() {
        const autoSwitch = {
            'scene': 'action',
            'character': 'dialogue',
            'parenthetical': 'dialogue',
            'dialogue': 'action'
        };
        
        if (autoSwitch[this.currentElement]) {
            this.setCurrentElement(autoSwitch[this.currentElement]);
        }
    }

    editElement(element) {
        const oldText = element.textContent;
        const type = element.getAttribute('data-type');
        
        this.setCurrentElement(type);
        this.input.value = oldText;
        this.input.focus();
        
        element.remove();
        this.updateLists();
        this.updateStats();
    }

    showContextMenu(e, element) {
        const menu = new Menu();
        
        menu.addItem((item) => {
            item.setTitle('Upravit')
                .setIcon('pencil')
                .onClick(() => this.editElement(element));
        });
        
        menu.addItem((item) => {
            item.setTitle('Smazat')
                .setIcon('trash')
                .onClick(() => {
                    element.remove();
                    this.updateLists();
                    this.updateStats();
                });
        });
        
        menu.addSeparator();
        
        menu.addItem((item) => {
            item.setTitle('Přesunout nahoru')
                .setIcon('arrow-up')
                .onClick(() => {
                    const prev = element.previousElementSibling;
                    if (prev) {
                        element.parentElement.insertBefore(element, prev);
                    }
                });
        });
        
        menu.addItem((item) => {
            item.setTitle('Přesunout dolů')
                .setIcon('arrow-down')
                .onClick(() => {
                    const next = element.nextElementSibling;
                    if (next) {
                        element.parentElement.insertBefore(next, element);
                    }
                });
        });
        
        menu.showAtMouseEvent(e);
    }

    updateLists() {
        // Update character list
        this.characterList.empty();
        const sortedChars = Array.from(this.characters).sort();
        sortedChars.forEach(char => {
            const item = this.characterList.createDiv({ 
                cls: 'list-item',
                text: char 
            });
            item.onclick = () => {
                this.setCurrentElement('character');
                this.input.value = char;
                this.input.focus();
            };
        });

        // Update location list
        this.locationList.empty();
        const sortedLocs = Array.from(this.locations).sort();
        sortedLocs.forEach(loc => {
            const item = this.locationList.createDiv({ 
                cls: 'list-item',
                text: loc 
            });
        });

        // Update scene list
        this.sceneList.empty();
        const scenes = this.preview.querySelectorAll('.sp-scene');
        scenes.forEach((scene, index) => {
            const item = this.sceneList.createDiv({ 
                cls: 'list-item scene-item',
                text: scene.textContent.substring(0, 40) + '...'
            });
            item.onclick = () => {
                scene.scrollIntoView({ behavior: 'smooth', block: 'center' });
            };
        });
    }

    updateStats() {
        const scenes = this.preview.querySelectorAll('.sp-scene').length;
        const dialogues = this.preview.querySelectorAll('.sp-dialogue').length;
        
        this.stats.scenes.innerHTML = `<strong>${scenes}</strong> scén`;
        this.stats.pages.innerHTML = `<strong>${this.pageCount}</strong> stran`;
        this.stats.characters.innerHTML = `<strong>${this.characters.size}</strong> postav`;
        this.stats.dialogueLines.innerHTML = `<strong>${dialogues}</strong> dialogů`;
        this.stats.locations.innerHTML = `<strong>${this.locations.size}</strong> lokací`;
    }

    updatePageCount() {
        // Odhad počtu stran (1 strana = cca 55 řádků)
        const elements = this.preview.children.length;
        this.pageCount = Math.max(1, Math.ceil(elements / 55));
        this.pageIndicator.textContent = `Strana ${this.pageCount}`;
        this.updateStats();
    }

    saveState() {
        const state = this.preview.innerHTML;
        this.history = this.history.slice(0, this.historyIndex + 1);
        this.history.push(state);
        this.historyIndex++;
        
        // Limit history to 50 states
        if (this.history.length > 50) {
            this.history.shift();
            this.historyIndex--;
        }
    }

    undo() {
        if (this.historyIndex > 0) {
            this.historyIndex--;
            this.preview.innerHTML = this.history[this.historyIndex];
            this.updateLists();
            this.updateStats();
            new Notice('Vráceno zpět');
        }
    }

    redo() {
        if (this.historyIndex < this.history.length - 1) {
            this.historyIndex++;
            this.preview.innerHTML = this.history[this.historyIndex];
            this.updateLists();
            this.updateStats();
            new Notice('Znovu provedeno');
        }
    }

    exportFountain() {
        let fountain = '';
        const elements = this.preview.querySelectorAll('[data-type]');
        
        elements.forEach(el => {
            const type = el.getAttribute('data-type');
            const text = el.textContent;
            
            switch(type) {
                case 'scene':
                    fountain += '\n' + text + '\n\n';
                    break;
                case 'action':
                    fountain += text + '\n\n';
                    break;
                case 'character':
                    fountain += text + '\n';
                    break;
                case 'dialogue':
                    fountain += text + '\n';
                    break;
                case 'parenthetical':
                    fountain += text + '\n';
                    break;
                case 'transition':
                    fountain += '> ' + text + '\n\n';
                    break;
            }
        });
        
        // Create and download
        const blob = new Blob([fountain], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'screenplay.fountain';
        a.click();
        
        new Notice('Scénář exportován ve formátu Fountain');
    }

    exportPDF() {
        new Notice('Export do PDF bude dostupný v příští verzi');
        // Zde by byla implementace PDF exportu
    }

    async onClose() {
        // Cleanup
    }
}

class ScreenplayPlugin extends Plugin {
    async onload() {
        console.log('Loading Screenplay Writer Plugin');

        this.registerView(
            VIEW_TYPE_SCREENPLAY,
            (leaf) => new ScreenplayView(leaf)
        );

        this.addRibbonIcon('film', 'Otevřít editor scénářů', () => {
            this.activateView();
        });

        this.addCommand({
            id: 'open-screenplay-editor',
            name: 'Otevřít editor scénářů',
            callback: () => {
                this.activateView();
            }
        });

        this.addStyles();
        this.addSettingTab(new ScreenplaySettingTab(this.app, this));
    }

    async activateView() {
        const { workspace } = this.app;
        let leaf = null;
        const leaves = workspace.getLeavesOfType(VIEW_TYPE_SCREENPLAY);

        if (leaves.length > 0) {
            leaf = leaves[0];
        } else {
            leaf = workspace.getRightLeaf(false);
            await leaf.setViewState({
                type: VIEW_TYPE_SCREENPLAY,
                active: true
            });
        }

        workspace.revealLeaf(leaf);
    }

    addStyles() {
        const styles = document.createElement('style');
        styles.id = 'screenplay-editor-styles';
        styles.textContent = `
            .screenplay-editor-container {
                height: 100%;
                display: flex;
                flex-direction: column;
                padding: 0;
                background: var(--background-primary);
            }

            .screenplay-main-layout {
                display: grid;
                grid-template-columns: 200px 1fr 200px;
                gap: 0;
                height: 100%;
                overflow: hidden;
            }

            /* Left Panel */
            .screenplay-left-panel {
                background: var(--background-secondary);
                padding: 15px;
                overflow-y: auto;
                border-right: 1px solid var(--background-modifier-border);
            }

            .panel-title {
                margin: 0 0 15px 0;
                font-size: 14px;
                color: var(--text-muted);
                text-transform: uppercase;
                letter-spacing: 1px;
            }

            .list-section {
                margin-bottom: 20px;
            }

            .list-section h4 {
                font-size: 12px;
                color: var(--text-muted);
                margin: 0 0 8px 0;
                text-transform: uppercase;
            }

            .screenplay-list {
                font-size: 11px;
            }

            .list-item {
                padding: 6px 8px;
                margin: 2px 0;
                background: var(--background-primary);
                border-radius: 4px;
                cursor: pointer;
                transition: all 0.15s;
                border-left: 3px solid transparent;
            }

            .list-item:hover {
                background: var(--background-modifier-hover);
                border-left-color: var(--interactive-accent);
            }

            .scene-item {
                font-size: 10px;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
            }

            /* Center Panel */
            .screenplay-center-panel {
                display: flex;
                flex-direction: column;
                overflow: hidden;
            }

            .screenplay-toolbar {
                display: flex;
                gap: 4px;
                padding: 10px;
                background: var(--background-secondary);
                border-bottom: 2px solid var(--background-modifier-border);
                flex-wrap: wrap;
            }

            .screenplay-btn {
                display: flex;
                flex-direction: column;
                align-items: center;
                padding: 8px 12px;
                background: var(--background-primary);
                border: 1px solid var(--background-modifier-border);
                border-radius: 6px;
                cursor: pointer;
                transition: all 0.2s;
                min-width: 70px;
            }

            .screenplay-btn:hover {
                background: var(--background-modifier-hover);
                transform: translateY(-1px);
                box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            }

            .screenplay-btn.active {
                background: var(--interactive-accent);
                color: white;
                border-color: var(--interactive-accent);
                font-weight: bold;
            }

            .btn-icon {
                font-size: 18px;
                margin-bottom: 4px;
            }

            .btn-text {
                font-size: 11px;
            }

            .screenplay-btn .shortcut {
                font-size: 9px;
                opacity: 0.6;
                margin-top: 2px;
            }

            .screenplay-editor-area {
                flex: 1;
                display: flex;
                flex-direction: column;
                overflow: hidden;
            }

            .screenplay-input-container {
                padding: 15px 20px;
                border-bottom: 2px solid var(--background-modifier-border);
                background: var(--background-primary);
                position: relative;
            }

            .screenplay-input {
                width: 100%;
                min-height: 50px;
                font-family: 'Courier Prime', 'Courier New', Courier, monospace;
                font-size: 12pt;
                padding: 12px;
                border: 2px solid var(--background-modifier-border);
                border-radius: 6px;
                background: var(--background-primary);
                color: var(--text-normal);
                resize: none;
                transition: border-color 0.2s;
            }

            .screenplay-input:focus {
                outline: none;
                border-color: var(--interactive-accent);
                box-shadow: 0 0 0 3px rgba(var(--interactive-accent-rgb), 0.1);
            }

            .type-indicator {
                position: absolute;
                top: 20px;
                right: 30px;
                background: var(--interactive-accent);
                color: white;
                padding: 6px 14px;
                border-radius: 20px;
                font-size: 11px;
                font-weight: bold;
                box-shadow: 0 2px 6px rgba(0,0,0,0.2);
            }

            /* Autocomplete */
            .autocomplete-list {
                position: absolute;
                top: 100%;
                left: 20px;
                right: 20px;
                background: var(--background-primary);
                border: 2px solid var(--interactive-accent);
                border-radius: 6px;
                max-height: 200px;
                overflow-y: auto;
                z-index: 1000;
                box-shadow: 0 4px 12px rgba(0,0,0,0.2);
                margin-top: 4px;
            }

            .autocomplete-item {
                padding: 10px 15px;
                cursor: pointer;
                font-family: 'Courier Prime', 'Courier New', Courier, monospace;
                font-size: 12pt;
                border-bottom: 1px solid var(--background-modifier-border);
            }

            .autocomplete-item:last-child {
                border-bottom: none;
            }

            .autocomplete-item:hover,
            .autocomplete-item.selected {
                background: var(--interactive-accent);
                color: white;
            }

            /* Preview */
            .screenplay-preview-container {
                flex: 1;
                overflow-y: auto;
                background: white;
                position: relative;
            }

            .page-indicator {
                position: sticky;
                top: 10px;
                right: 10px;
                float: right;
                background: rgba(0,0,0,0.7);
                color: white;
                padding: 6px 12px;
                border-radius: 4px;
                font-size: 11px;
                z-index: 10;
                margin: 10px;
            }

            .screenplay-preview {
                max-width: 8.5in;
                margin: 0 auto;
                padding: 1in 1.5in 1in 1.5in;
                background: white;
                color: black;
                font-family: 'Courier Prime', 'Courier New', Courier, monospace;
                font-size: 12pt;
                line-height: 1.5;
                min-height: 11in;
            }

            .theme-dark .screenplay-preview-container {
                background: #2a2a2a;
            }

            .theme-dark .screenplay-preview {
                background: #1a1a1a;
                color: #e0e0e0;
            }

            /* Screenplay Elements - Celtx Style */
            .sp-scene {
                font-weight: bold;
                text-transform: uppercase;
                margin-top: 2em;
                margin-bottom: 1em;
                font-size: 12pt;
            }

            .sp-action {
                margin: 1em 0;
                text-align: left;
                max-width: 100%;
            }

            .sp-character {
                margin-top: 1.5em;
                margin-left: 3.7in;
                font-weight: normal;
                text-transform: uppercase;
                margin-bottom: 0;
            }

            .sp-dialogue {
                margin-left: 2.5in;
                margin-right: 2.3in;
                margin-top: 0;
                margin-bottom: 1em;
            }

            .sp-parenthetical {
                margin-left: 3.1in;
                margin-right: 3in;
                margin-top: 0;
                margin-bottom: 0;
            }

            .sp-transition {
                text-align: right;
                margin-top: 1.5em;
                margin-bottom: 1.5em;
                font-weight: normal;
                text-transform: uppercase;
            }

            .screenplay-preview > div {
                cursor: pointer;
                padding: 2px 4px;
                margin: 0;
                border-radius: 2px;
                transition: background 0.1s;
            }

            .screenplay-preview > div:hover {
                background: rgba(100, 150, 255, 0.1);
            }

            /* Right Panel */
            .screenplay-right-panel {
                background: var(--background-secondary);
                padding: 15px;
                overflow-y: auto;
                border-left: 1px solid var(--background-modifier-border);
            }

            .stats-container {
                margin-bottom: 20px;
            }

            .stat-item {
                padding: 10px;
                margin: 8px 0;
                background: var(--background-primary);
                border-radius: 6px;
                font-size: 12px;
                border-left: 3px solid var(--interactive-accent);
            }

            .stat-item strong {
                font-size: 18px;
                color: var(--interactive-accent);
                display: block;
            }

            .export-section {
                margin-top: 20px;
            }

            .export-section h4 {
                font-size: 12px;
                color: var(--text-muted);
                margin: 0 0 10px 0;
                text-transform: uppercase;
            }

            .export-btn {
                width: 100%;
                padding: 10px;
                margin: 6px 0;
                background: var(--interactive-normal);
                border: 1px solid var(--background-modifier-border);
                border-radius: 6px;
                cursor: pointer;
                font-size: 12px;
                transition: all 0.2s;
            }

            .export-btn:hover {
                background: var(--interactive-hover);
                transform: translateY(-1px);
            }

            /* Scrollbars */
            .screenplay-preview-container::-webkit-scrollbar,
            .screenplay-left-panel::-webkit-scrollbar,
            .screenplay-right-panel::-webkit-scrollbar {
                width: 8px;
            }

            .screenplay-preview-container::-webkit-scrollbar-track,
            .screenplay-left-panel::-webkit-scrollbar-track,
            .screenplay-right-panel::-webkit-scrollbar-track {
                background: var(--background-secondary);
            }

            .screenplay-preview-container::-webkit-scrollbar-thumb,
            .screenplay-left-panel::-webkit-scrollbar-thumb,
            .screenplay-right-panel::-webkit-scrollbar-thumb {
                background: var(--background-modifier-border);
                border-radius: 4px;
            }

            .screenplay-preview-container::-webkit-scrollbar-thumb:hover,
            .screenplay-left-panel::-webkit-scrollbar-thumb:hover,
            .screenplay-right-panel::-webkit-scrollbar-thumb:hover {
                background: var(--text-muted);
            }
        `;
        document.head.appendChild(styles);
    }

    onunload() {
        console.log('Unloading Screenplay Writer Plugin');
        const styles = document.getElementById('screenplay-editor-styles');
        if (styles) styles.remove();
    }
}

class ScreenplaySettingTab extends PluginSettingTab {
    constructor(app, plugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display() {
        const { containerEl } = this;
        containerEl.empty();

        containerEl.createEl('h2', { text: 'Nastavení editoru scénářů' });

        new Setting(containerEl)
            .setName('O pluginu')
            .setDesc('Screenplay Writer v2.0.0 - Profesionální WYSIWYG editor pro psaní scénářů s formátováním podle standardu Celtx.');

        containerEl.createEl('h3', { text: 'Klávesové zkratky' });
        
        const shortcuts = containerEl.createDiv({ cls: 'shortcuts-list' });
        shortcuts.createEl('p', { text: 'Alt+1 - Scéna' });
        shortcuts.createEl('p', { text: 'Alt+2 - Akce' });
        shortcuts.createEl('p', { text: 'Alt+3 - Postava' });
        shortcuts.createEl('p', { text: 'Alt+4 - Dialog' });
        shortcuts.createEl('p', { text: 'Alt+5 - Poznámka' });
        shortcuts.createEl('p', { text: 'Alt+6 - Přechod' });
        shortcuts.createEl('p', { text: 'Enter - Přidat element' });
        shortcuts.createEl('p', { text: 'Tab - Přepnout na další typ' });
        shortcuts.createEl('p', { text: 'Ctrl+Z - Vrátit zpět' });
        shortcuts.createEl('p', { text: 'Ctrl+Shift+Z - Znovu' });
    }
}

module.exports = ScreenplayPlugin;