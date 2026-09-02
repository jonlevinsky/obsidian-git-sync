const { Plugin, PluginSettingTab, Setting, ItemView, Notice, Platform, requestUrl } = require('obsidian');

const VIEW_TYPE_TODOS = 'levinskyj-todos-view';
const SUPABASE_URL = 'https://bkgfohfmnbmascomaozv.supabase.co/rest/v1';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJrZ2ZvaGZtbmJtYXNjb21hb3p2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgzMzMwMzYsImV4cCI6MjEwMzkwOTAzNn0.RgxJDflLqIuBIH17imSvdLmbRjg8Fp3vDWK_O5u6w-c';

const DEFAULT_SETTINGS = {
  folder: 'System/Tasks',
  file: 'TasksList',
  useSupabase: true
};

const STYLES = `
.levinskyj-todos-container {
  padding: 16px;
  color: #e0e0e0;
  font-family: var(--font-interface);
  height: 100%;
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
}

.levinskyj-todos-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  border-bottom: 1px solid #2a2a2a;
  padding-bottom: 12px;
}

.levinskyj-todos-title {
  font-size: 1.2rem;
  font-weight: 700;
  color: #c4956a;
  margin: 0;
}

.levinskyj-todos-refresh-btn {
  background: transparent;
  border: 1px solid #333;
  color: #c4956a;
  padding: 4px 10px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.85rem;
  transition: all 0.2s ease;
}

.levinskyj-todos-refresh-btn:hover {
  background: #c4956a;
  color: #161616;
}

.levinskyj-todos-input-container {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
}

.levinskyj-todos-input {
  flex: 1;
  background: #161616;
  border: 1px solid #333;
  border-radius: 6px;
  padding: 8px 12px;
  color: #ffffff;
  font-size: 0.9rem;
  outline: none;
  transition: border-color 0.2s ease;
}

.levinskyj-todos-input:focus {
  border-color: #c4956a;
}

.levinskyj-todos-add-btn {
  background: #c4956a;
  color: #161616;
  border: none;
  border-radius: 6px;
  padding: 8px 16px;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.2s ease;
}

.levinskyj-todos-add-btn:hover {
  opacity: 0.9;
}

.levinskyj-todos-filter-container {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
}

.levinskyj-todos-filter-tab {
  padding: 6px 14px;
  border-radius: 4px;
  background: #161616;
  border: 1px solid #2a2a2a;
  color: #a0a0a0;
  cursor: pointer;
  font-size: 0.85rem;
  font-weight: 500;
  transition: all 0.2s ease;
}

.levinskyj-todos-filter-tab.active {
  background: #c4956a;
  color: #161616;
  border-color: #c4956a;
  font-weight: 600;
}

.levinskyj-todos-list {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.levinskyj-todos-card {
  background: #161616;
  border: 1px solid #262626;
  border-radius: 6px;
  padding: 10px 14px;
  display: flex;
  align-items: center;
  gap: 12px;
  transition: border-color 0.2s ease;
}

.levinskyj-todos-card:hover {
  border-color: #383838;
}

.levinskyj-todos-checkbox {
  width: 18px;
  height: 18px;
  accent-color: #c4956a;
  cursor: pointer;
}

.levinskyj-todos-text {
  flex: 1;
  font-size: 0.9rem;
  color: #e0e0e0;
  word-break: break-word;
}

.levinskyj-todos-card.completed .levinskyj-todos-text {
  text-decoration: line-through;
  color: #777777;
}

.levinskyj-todos-delete-btn {
  background: transparent;
  border: none;
  color: #888888;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 0.85rem;
  transition: color 0.2s ease, background 0.2s ease;
}

.levinskyj-todos-delete-btn:hover {
  color: #ff6b6b;
  background: rgba(255, 107, 107, 0.1);
}

.levinskyj-todos-empty {
  text-align: center;
  color: #666666;
  padding: 24px;
  font-size: 0.85rem;
  font-style: italic;
}
`;

class TodosView extends ItemView {
  constructor(leaf, plugin) {
    super(leaf);
    this.plugin = plugin;
    this.tasks = [];
    this.currentFilter = 'all';
  }

  getViewType() {
    return VIEW_TYPE_TODOS;
  }

  getDisplayText() {
    return 'Úkoly';
  }

  getIcon() {
    return 'check-square';
  }

  async onOpen() {
    const container = this.containerEl.children[1];
    container.empty();
    container.addClass('levinskyj-todos-container');

    // Header
    const header = container.createEl('div', { cls: 'levinskyj-todos-header' });
    header.createEl('h4', { text: 'Úkoly', cls: 'levinskyj-todos-title' });
    const refreshBtn = header.createEl('button', { text: 'Obnovit', cls: 'levinskyj-todos-refresh-btn' });
    refreshBtn.addEventListener('click', () => this.loadTasks());

    // Input form
    const inputContainer = container.createEl('div', { cls: 'levinskyj-todos-input-container' });
    const input = inputContainer.createEl('input', {
      type: 'text',
      placeholder: 'Přidat nový úkol...',
      cls: 'levinskyj-todos-input'
    });
    const addBtn = inputContainer.createEl('button', { text: 'Přidat', cls: 'levinskyj-todos-add-btn' });

    const handleAdd = async () => {
      const val = input.value.trim();
      if (val) {
        input.value = '';
        await this.addTask(val);
      }
    };

    addBtn.addEventListener('click', handleAdd);
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        handleAdd();
      }
    });

    // Filter tabs
    const filterContainer = container.createEl('div', { cls: 'levinskyj-todos-filter-container' });
    const filters = [
      { id: 'all', label: 'Vše' },
      { id: 'active', label: 'Nehotové' },
      { id: 'completed', label: 'Hotové' }
    ];

    filters.forEach((f) => {
      const tab = filterContainer.createEl('button', {
        text: f.label,
        cls: `levinskyj-todos-filter-tab ${this.currentFilter === f.id ? 'active' : ''}`
      });
      tab.addEventListener('click', () => {
        this.currentFilter = f.id;
        filterContainer.querySelectorAll('.levinskyj-todos-filter-tab').forEach((t) => t.removeClass('active'));
        tab.addClass('active');
        this.renderTasks();
      });
    });

    // Task list container
    this.listEl = container.createEl('div', { cls: 'levinskyj-todos-list' });

    await this.loadTasks();
  }

  async loadTasks() {
    let loadedFromSupabase = false;

    if (this.plugin.settings.useSupabase) {
      try {
        const response = await requestUrl({
          url: `${SUPABASE_URL}/todos?select=*&order=id.desc`,
          method: 'GET',
          headers: {
            'apikey': SUPABASE_KEY,
            'Authorization': `Bearer ${SUPABASE_KEY}`,
            'Content-Type': 'application/json'
          }
        });

        if (response.status === 200) {
          const data = JSON.parse(response.text);
          this.tasks = data.map((t) => ({
            id: t.id,
            text: t.text || t.title || '',
            completed: !!t.completed
          }));
          loadedFromSupabase = true;
          await this.saveMarkdownBackup(this.tasks);
        }
      } catch (err) {
        console.warn('Supabase fetch failed, falling back to Markdown:', err);
        new Notice('Supabase nedostupný, načítám z Markdownu.');
      }
    }

    if (!loadedFromSupabase) {
      this.tasks = await this.readMarkdownBackup();
    }

    this.renderTasks();
  }

  renderTasks() {
    if (!this.listEl) return;
    this.listEl.empty();

    const filtered = this.tasks.filter((t) => {
      if (this.currentFilter === 'active') return !t.completed;
      if (this.currentFilter === 'completed') return t.completed;
      return true;
    });

    if (filtered.length === 0) {
      this.listEl.createEl('div', { text: 'Žádné úkoly.', cls: 'levinskyj-todos-empty' });
      return;
    }

    filtered.forEach((task) => {
      const card = this.listEl.createEl('div', {
        cls: `levinskyj-todos-card ${task.completed ? 'completed' : ''}`
      });

      const checkbox = card.createEl('input', {
        type: 'checkbox',
        cls: 'levinskyj-todos-checkbox'
      });
      checkbox.checked = task.completed;
      checkbox.addEventListener('change', async () => {
        await this.toggleTask(task);
      });

      card.createEl('span', { text: task.text, cls: 'levinskyj-todos-text' });

      const delBtn = card.createEl('button', { text: 'Smazat', cls: 'levinskyj-todos-delete-btn' });
      delBtn.addEventListener('click', async () => {
        await this.deleteTask(task);
      });
    });
  }

  async addTask(text) {
    let newTask = null;

    if (this.plugin.settings.useSupabase) {
      try {
        const response = await requestUrl({
          url: `${SUPABASE_URL}/todos`,
          method: 'POST',
          headers: {
            'apikey': SUPABASE_KEY,
            'Authorization': `Bearer ${SUPABASE_KEY}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=representation'
          },
          body: JSON.stringify({ text, completed: false })
        });

        if (response.status === 201 || response.status === 200) {
          const resData = JSON.parse(response.text);
          const created = Array.isArray(resData) ? resData[0] : resData;
          newTask = {
            id: created.id,
            text: created.text || text,
            completed: !!created.completed
          };
        }
      } catch (err) {
        console.warn('Failed to add task to Supabase:', err);
        new Notice('Chyba při ukládání do Supabase.');
      }
    }

    if (!newTask) {
      newTask = {
        id: Date.now(),
        text,
        completed: false
      };
    }

    this.tasks.unshift(newTask);
    await this.saveMarkdownBackup(this.tasks);
    this.renderTasks();
  }

  async toggleTask(task) {
    const newStatus = !task.completed;
    task.completed = newStatus;

    if (this.plugin.settings.useSupabase && typeof task.id === 'number') {
      try {
        await requestUrl({
          url: `${SUPABASE_URL}/todos?id=eq.${task.id}`,
          method: 'PATCH',
          headers: {
            'apikey': SUPABASE_KEY,
            'Authorization': `Bearer ${SUPABASE_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ completed: newStatus })
        });
      } catch (err) {
        console.warn('Failed to update task in Supabase:', err);
      }
    }

    await this.saveMarkdownBackup(this.tasks);
    this.renderTasks();
  }

  async deleteTask(task) {
    this.tasks = this.tasks.filter((t) => t.id !== task.id);

    if (this.plugin.settings.useSupabase && typeof task.id === 'number') {
      try {
        await requestUrl({
          url: `${SUPABASE_URL}/todos?id=eq.${task.id}`,
          method: 'DELETE',
          headers: {
            'apikey': SUPABASE_KEY,
            'Authorization': `Bearer ${SUPABASE_KEY}`,
            'Content-Type': 'application/json'
          }
        });
      } catch (err) {
        console.warn('Failed to delete task in Supabase:', err);
      }
    }

    await this.saveMarkdownBackup(this.tasks);
    this.renderTasks();
  }

  getFilePath() {
    const folder = this.plugin.settings.folder || 'System/Tasks';
    const file = this.plugin.settings.file || 'TasksList';
    return `${folder}/${file}.md`;
  }

  async saveMarkdownBackup(tasks) {
    try {
      const filePath = this.getFilePath();
      const lines = ['# Úkoly', ''];
      tasks.forEach((t) => {
        lines.push(`- [${t.completed ? 'x' : ' '}] ${t.text}`);
      });
      const content = lines.join('\n') + '\n';

      const file = this.app.vault.getAbstractFileByPath(filePath);
      if (file) {
        await this.app.vault.modify(file, content);
      } else {
        const parts = filePath.split('/');
        let current = '';
        for (let i = 0; i < parts.length - 1; i++) {
          current = current ? `${current}/${parts[i]}` : parts[i];
          if (!(await this.app.vault.adapter.exists(current))) {
            await this.app.vault.createFolder(current);
          }
        }
        await this.app.vault.create(filePath, content);
      }
    } catch (err) {
      console.error('Failed to save Markdown backup:', err);
    }
  }

  async readMarkdownBackup() {
    try {
      const filePath = this.getFilePath();
      const file = this.app.vault.getAbstractFileByPath(filePath);
      if (!file) return [];

      const content = await this.app.vault.read(file);
      const lines = content.split('\n');
      const tasks = [];

      lines.forEach((line, idx) => {
        const trimmed = line.trim();
        if (trimmed.startsWith('- [x]') || trimmed.startsWith('- [X]')) {
          tasks.push({
            id: Date.now() + idx,
            text: trimmed.replace(/^- \[[xX]\]\s*/, ''),
            completed: true
          });
        } else if (trimmed.startsWith('- [ ]')) {
          tasks.push({
            id: Date.now() + idx,
            text: trimmed.replace(/^- \[ \]\s*/, ''),
            completed: false
          });
        }
      });

      return tasks;
    } catch (err) {
      console.error('Failed to read Markdown backup:', err);
      return [];
    }
  }

  async onClose() {}
}

class TodosSettingTab extends PluginSettingTab {
  constructor(app, plugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display() {
    const { containerEl } = this;
    containerEl.empty();
    containerEl.createEl('h2', { text: 'Levinskyj Todos Nastavení' });

    new Setting(containerEl)
      .setName('Složka pro úkoly')
      .setDesc('Cesta ke složce, kde se ukládá Markdown záloha úkolů.')
      .addText((text) =>
        text
          .setPlaceholder('System/Tasks')
          .setValue(this.plugin.settings.folder)
          .onChange(async (value) => {
            this.plugin.settings.folder = value.trim() || 'System/Tasks';
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName('Název souboru')
      .setDesc('Název Markdown souboru (bez přípony .md).')
      .addText((text) =>
        text
          .setPlaceholder('TasksList')
          .setValue(this.plugin.settings.file)
          .onChange(async (value) => {
            this.plugin.settings.file = value.trim() || 'TasksList';
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName('Používat Supabase')
      .setDesc('Zapne/vypne synchronizaci s cloud databází Supabase.')
      .addToggle((toggle) =>
        toggle.setValue(this.plugin.settings.useSupabase).onChange(async (value) => {
          this.plugin.settings.useSupabase = value;
          await this.plugin.saveSettings();
        })
      );
  }
}

class TodosPlugin extends Plugin {
  async onload() {
    await this.loadSettings();

    // Inject CSS
    this.styleEl = document.createElement('style');
    this.styleEl.id = 'levinskyj-todos-style';
    this.styleEl.textContent = STYLES;
    document.head.appendChild(this.styleEl);

    // Register custom view
    this.registerView(VIEW_TYPE_TODOS, (leaf) => new TodosView(leaf, this));

    // Ribbon icon
    this.addRibbonIcon('check-square', 'Úkoly', () => {
      this.activateView();
    });

    // Commands
    this.addCommand({
      id: 'open-todos',
      name: 'Otevřít Úkoly',
      callback: () => {
        this.activateView();
      }
    });

    this.addCommand({
      id: 'refresh-todos',
      name: 'Obnovit Úkoly',
      callback: () => {
        const leaves = this.app.workspace.getLeavesOfType(VIEW_TYPE_TODOS);
        leaves.forEach((leaf) => {
          if (leaf.view instanceof TodosView) {
            leaf.view.loadTasks();
          }
        });
        new Notice('Úkoly byly obnoveny.');
      }
    });

    // Settings tab
    this.addSettingTab(new TodosSettingTab(this.app, this));
  }

  onunload() {
    this.app.workspace.detachLeavesOfType(VIEW_TYPE_TODOS);
    if (this.styleEl) {
      this.styleEl.remove();
    }
  }

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }

  async activateView() {
    const { workspace } = this.app;
    let leaf = workspace.getLeavesOfType(VIEW_TYPE_TODOS)[0];

    if (!leaf) {
      leaf = workspace.getRightLeaf(false);
      await leaf.setViewState({
        type: VIEW_TYPE_TODOS,
        active: true
      });
    }

    workspace.revealLeaf(leaf);
  }
}

module.exports = TodosPlugin;
