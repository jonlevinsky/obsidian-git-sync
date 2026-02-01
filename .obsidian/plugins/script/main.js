const { Plugin, PluginSettingTab, Setting, Notice, ItemView, WorkspaceLeaf } = require('obsidian');

const VIEW_TYPE_SCREENPLAY = "screenplay-view";

class ScreenplayView extends ItemView {
    constructor(leaf) {
        super(leaf);
        this.currentElement = 'action';
    }

    getViewType() {
        return VIEW_TYPE_SCREENPLAY;
    }

    getDisplayText() {
        return "Screenplay Editor";
    }

    getIcon() {
        return "film";
    }

    async onOpen() {
        const container = this.containerEl.children[1];
        container.empty();
        container.addClass('screenplay-editor-container');

        // Toolbar
        const toolbar = container.createDiv({ cls: 'screenplay-toolbar' });
        
        const buttons = [
            { name: 'Scéna', type: 'scene', key: 'S' },
            { name: 'Akce', type: 'action', key: 'A' },
            { name: 'Postava', type: 'character', key: 'C' },
            { name: 'Dialog', type: 'dialogue', key: 'D' },
            { name: 'Poznámka', type: 'parenthetical', key: 'P' },
            { name: 'Přechod', type: 'transition', key: 'T' }
        ];

        buttons.forEach(btn => {
            const button = toolbar.createEl('button', {
                text: btn.name,
                cls: 'screenplay-btn'
            });
            button.setAttribute('data-type', btn.type);
            button.onclick = () => this.setCurrentElement(btn.type);
            
            const shortcut = button.createSpan({ cls: 'shortcut' });
            shortcut.textContent = `(${btn.key})`;
        });

        // Editor area
        const editorArea = container.createDiv({ cls: 'screenplay-editor-area' });
        
        // Input
        const inputContainer = editorArea.createDiv({ cls: 'screenplay-input-container' });
        const input = inputContainer.createEl('textarea', {
            cls: 'screenplay-input',
            attr: {
                placeholder: 'Začni psát svůj scénář...',
                rows: '3'
            }
        });

        const typeIndicator = inputContainer.createDiv({ 
            cls: 'type-indicator',
            text: 'Akce'
        });

        // Preview
        const preview = editorArea.createDiv({ cls: 'screenplay-preview' });

        // Event listeners
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.addElement(input.value, preview);
                input.value = '';
            }

            // Klávesové zkratky
            if (e.ctrlKey || e.metaKey) {
                switch(e.key.toLowerCase()) {
                    case 's':
                        e.preventDefault();
                        this.setCurrentElement('scene');
                        break;
                    case 'a':
                        e.preventDefault();
                        this.setCurrentElement('action');
                        break;
                    case 'c':
                        e.preventDefault();
                        this.setCurrentElement('character');
                        break;
                    case 'd':
                        e.preventDefault();
                        this.setCurrentElement('dialogue');
                        break;
                    case 'p':
                        e.preventDefault();
                        this.setCurrentElement('parenthetical');
                        break;
                    case 't':
                        e.preventDefault();
                        this.setCurrentElement('transition');
                        break;
                }
            }
        });

        // Store references
        this.input = input;
        this.preview = preview;
        this.typeIndicator = typeIndicator;
        this.toolbar = toolbar;
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
            'scene': 'Scéna',
            'action': 'Akce',
            'character': 'Postava',
            'dialogue': 'Dialog',
            'parenthetical': 'Poznámka',
            'transition': 'Přechod'
        };
        this.typeIndicator.textContent = names[type];
        this.input.focus();
    }

    addElement(text, preview) {
        if (!text.trim()) return;

        const element = preview.createDiv({ cls: `sp-${this.currentElement}` });
        
        let displayText = text.trim();
        
        // Formátování podle typu
        switch(this.currentElement) {
            case 'scene':
                displayText = displayText.toUpperCase();
                if (!displayText.startsWith('INT.') && !displayText.startsWith('EXT.')) {
                    displayText = 'INT. ' + displayText;
                }
                break;
            case 'character':
                displayText = displayText.toUpperCase();
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
                break;
        }

        element.textContent = displayText;
        
        // Možnost editace
        element.addEventListener('dblclick', () => {
            const newText = prompt('Upravit text:', element.textContent);
            if (newText !== null) {
                element.textContent = newText;
            }
        });

        // Scroll na konec
        preview.scrollTop = preview.scrollHeight;

        // Po přidání dialogu automaticky přejdi na další řádek jako akce
        if (this.currentElement === 'dialogue') {
            this.setCurrentElement('action');
        }
        // Po scéně jdi na akci
        if (this.currentElement === 'scene') {
            this.setCurrentElement('action');
        }
        // Po postavě jdi na dialog
        if (this.currentElement === 'character') {
            this.setCurrentElement('dialogue');
        }
    }

    async onClose() {
        // Cleanup
    }
}

class ScreenplayPlugin extends Plugin {
    async onload() {
        console.log('Loading Screenplay Writer Plugin');

        // Registruj view
        this.registerView(
            VIEW_TYPE_SCREENPLAY,
            (leaf) => new ScreenplayView(leaf)
        );

        // Přidej ribbon icon
        this.addRibbonIcon('film', 'Open Screenplay Editor', () => {
            this.activateView();
        });

        // Příkaz pro otevření editoru
        this.addCommand({
            id: 'open-screenplay-editor',
            name: 'Open Screenplay Editor',
            callback: () => {
                this.activateView();
            }
        });

        // Přidej CSS styly
        this.addStyles();

        // Nastavení
        this.addSettingTab(new ScreenplaySettingTab(this.app, this));
    }

    async activateView() {
        const { workspace } = this.app;

        let leaf = null;
        const leaves = workspace.getLeavesOfType(VIEW_TYPE_SCREENPLAY);

        if (leaves.length > 0) {
            // View už existuje, aktivuj ho
            leaf = leaves[0];
        } else {
            // Vytvoř nový view
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
            }

            .screenplay-toolbar {
                display: flex;
                gap: 5px;
                padding: 10px;
                background: var(--background-secondary);
                border-bottom: 1px solid var(--background-modifier-border);
                flex-wrap: wrap;
            }

            .screenplay-btn {
                padding: 8px 12px;
                background: var(--interactive-normal);
                border: 1px solid var(--background-modifier-border);
                border-radius: 4px;
                cursor: pointer;
                font-size: 13px;
                transition: all 0.2s;
            }

            .screenplay-btn:hover {
                background: var(--interactive-hover);
            }

            .screenplay-btn.active {
                background: var(--interactive-accent);
                color: white;
                font-weight: bold;
            }

            .screenplay-btn .shortcut {
                font-size: 10px;
                opacity: 0.6;
                margin-left: 4px;
            }

            .screenplay-editor-area {
                flex: 1;
                display: flex;
                flex-direction: column;
                overflow: hidden;
            }

            .screenplay-input-container {
                padding: 15px;
                border-bottom: 2px solid var(--background-modifier-border);
                background: var(--background-primary);
                position: relative;
            }

            .screenplay-input {
                width: 100%;
                min-height: 60px;
                font-family: 'Courier New', Courier, monospace;
                font-size: 12pt;
                padding: 10px;
                border: 1px solid var(--background-modifier-border);
                border-radius: 4px;
                background: var(--background-primary);
                color: var(--text-normal);
                resize: vertical;
            }

            .screenplay-input:focus {
                outline: none;
                border-color: var(--interactive-accent);
            }

            .type-indicator {
                position: absolute;
                top: 20px;
                right: 25px;
                background: var(--interactive-accent);
                color: white;
                padding: 4px 10px;
                border-radius: 12px;
                font-size: 11px;
                font-weight: bold;
            }

            .screenplay-preview {
                flex: 1;
                overflow-y: auto;
                padding: 40px 60px;
                background: white;
                color: black;
                font-family: 'Courier New', Courier, monospace;
                font-size: 12pt;
                line-height: 1.5;
            }

            .theme-dark .screenplay-preview {
                background: #1e1e1e;
                color: #e0e0e0;
            }

            /* Scénářové elementy */
            .sp-scene {
                font-weight: bold;
                text-transform: uppercase;
                margin-top: 2em;
                margin-bottom: 1em;
            }

            .sp-action {
                margin: 0.5em 0;
                max-width: 90%;
            }

            .sp-character {
                margin-top: 1.5em;
                margin-left: 40%;
                font-weight: bold;
                text-transform: uppercase;
            }

            .sp-dialogue {
                margin-left: 25%;
                margin-right: 25%;
                margin-bottom: 0.5em;
            }

            .sp-parenthetical {
                margin-left: 30%;
                margin-right: 30%;
                font-style: italic;
                margin-bottom: 0.3em;
            }

            .sp-transition {
                margin-left: 60%;
                margin-top: 1.5em;
                margin-bottom: 1.5em;
                font-weight: bold;
                text-transform: uppercase;
            }

            .screenplay-preview > div {
                cursor: pointer;
                padding: 2px 4px;
                border-radius: 2px;
            }

            .screenplay-preview > div:hover {
                background: rgba(0, 0, 0, 0.05);
            }

            .theme-dark .screenplay-preview > div:hover {
                background: rgba(255, 255, 255, 0.05);
            }
        `;
        document.head.appendChild(styles);
    }

    onunload() {
        console.log('Unloading Screenplay Writer Plugin');
        const styles = document.getElementById('screenplay-editor-styles');
        if (styles) {
            styles.remove();
        }
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

        containerEl.createEl('h2', { text: 'Screenplay Writer Settings' });

        new Setting(containerEl)
            .setName('About')
            .setDesc('Screenplay Writer v1.0.0 - WYSIWYG editor pro psaní scénářů');
    }
}

module.exports = ScreenplayPlugin;