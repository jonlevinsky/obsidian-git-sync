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
  color: #f5f5f7;
  font-family: var(--font-interface);
  height: 100%;
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
  background: rgba(20,20,22,0.72);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border-radius: 12px;
}

.levinskyj-todos-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  border-bottom: 1px solid rgba(255,255,255,0.06);
  padding-bottom: 12px;
}

.levinskyj-todos-title {
  font-size: 1.15rem;
  font-weight: 700;
  color: #f5f5f7;
  margin: 0;
  letter-spacing: -0.01em;
}

.levinskyj-todos-refresh-btn {
  background: rgba(255,255,255,0.06);
  border: 1px solid rgba(255,255,255,0.06);
  color: #f5f5f7;
  padding: 5px 14px;
  border-radius: 980px;
  cursor: pointer;
  font-size: 0.82rem;
  transition: all 150ms ease;
}

.levinskyj-todos-refresh-btn:hover {
  background: #5B8DEF;
  border-color: #5B8DEF;
  color: #fff;
}

.levinskyj-todos-input-container {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
}

.levinskyj-todos-input {
  flex: 1;
  background: rgba(255,255,255,0.05);
  border: 1px solid rgba(255,255,255,0.06);
  border-radius: 980px;
  padding: 8px 16px;
  color: #f5f5f7;
  font-size: 0.88rem;
  outline: none;
  transition: border-color 150ms ease;
}

.levinskyj-todos-input::placeholder {
  color: rgba(255,255,255,0.25);
}

.levinskyj-todos-input:focus {
  border-color: #5B8DEF;
  box-shadow: 0 0 0 3px rgba(91,141,239,0.15);
}

.levinskyj-todos-add-btn {
  background: #5B8DEF;
  color: #fff;
  border: none;
  border-radius: 980px;
  padding: 8px 18px;
  font-weight: 600;
  font-size: 0.85rem;
  cursor: pointer;
  transition: all 150ms ease;
}

.levinskyj-todos-add-btn:hover {
  background: #4a7de0;
  transform: scale(1.02);
}

.levinskyj-todos-add-btn:active {
  transform: scale(0.98);
}

.levinskyj-todos-filter-container {
  display: flex;
  gap: 6px;
  margin-bottom: 16px;
}

.levinskyj-todos-filter-tab {
  padding: 6px 16px;
  border-radius: 980px;
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.06);
  color: rgba(255,255,255,0.45);
  font-size: 0.8rem;
  cursor: pointer;
  transition: all 150ms ease;
  font-weight: 500;
}

.levinskyj-todos-filter-tab:hover {
  color: rgba(255,255,255,0.7);
  background: rgba(255,255,255,0.06);
}

.levinskyj-todos-filter-tab.active {
  background: #5B8DEF;
  color: #fff;
  border-color: #5B8DEF;
  font-weight: 600;
}

.levinskyj-todos-list {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.levinskyj-todos-list::-webkit-scrollbar {
  width: 4px;
}

.levinskyj-todos-list::-webkit-scrollbar-track {
  background: transparent;
}

.levinskyj-todos-list::-webkit-scrollbar-thumb {
  background: rgba(255,255,255,0.1);
  border-radius: 980px;
}

.levinskyj-todos-card {
  background: #141416;
  border: 1px solid rgba(255,255,255,0.06);
  border-radius: 12px;
  padding: 10px 14px;
  display: flex;
  align-items: center;
  gap: 12px;
  transition: all 150ms ease;
}

.levinskyj-todos-card:hover {
  background: #1a1a1e;
  border-color: rgba(255,255,255,0.1);
}

.levinskyj-todos-card.completed {
  opacity: 0.45;
}

.levinskyj-todos-card.completed .levinskyj-todos-text {
  text-decoration: line-through;
  color: rgba(255,255,255,0.3);
}

.levinskyj-todos-checkbox {
  -webkit-appearance: none;
  appearance: none;
  width: 18px;
  height: 18px;
  min-width: 18px;
  border: 2px solid rgba(255,255,255,0.15);
  border-radius: 50%;
  background: transparent;
  cursor: pointer;
  transition: all 150ms ease;
  position: relative;
  display: grid;
  place-content: center;
}

.levinskyj-todos-checkbox::before {
  content: "";
  width: 8px;
  height: 8px;
  transform: scale(0);
  transition: transform 150ms ease;
  background: #fff;
  border-radius: 50%;
}

.levinskyj-todos-checkbox:hover {
  border-color: #5B8DEF;
}

.levinskyj-todos-checkbox:checked {
  background: #5B8DEF;
  border-color: #5B8DEF;
}

.levinskyj-todos-checkbox:checked::before {
  transform: scale(1);
}

.levinskyj-todos-text {
  flex: 1;
  font-size: 0.9rem;
  color: #f5f5f7;
  line-height: 1.4;
}

.levinskyj-todos-delete-btn {
  background: transparent;
  border: none;
  color: rgba(255,255,255,0.2);
  cursor: pointer;
  padding: 4px 8px;
  font-size: 0.82rem;
  transition: color 150ms ease;
  border-radius: 980px;
}

.levinskyj-todos-delete-btn:hover {
  color: #ff6b6b;
}

.levinskyj-todos-empty {
  text-align: center;
  color: rgba(255,255,255,0.3);
  padding: 32px;
  font-size: 0.88rem;
}
`;

class TodosView extends ItemView {
  constructor(leaf, plugin) {
    super(leaf);
    this.plugin = plugin;
    this.tasks = [];
    this.currentFilter = 'active';
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
    this.injectStyles();
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
      { id: 'active', label: 'Nehotové' },
      { id: 'completed', label: 'Hotové' },
      { id: 'all', label: 'Vše' }
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

  injectStyles() {
    if (!document.getElementById('levinskyj-todos-styles')) {
      const styleEl = document.createElement('style');
      styleEl.id = 'levinskyj-todos-styles';
      styleEl.innerHTML = STYLES;
      document.head.appendChild(styleEl);
    }
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
          },
          throwOnError: false
        });

        if (response.status === 200 && response.json) {
          const data = response.json;
          this.tasks = data.map((t) => ({
            id: t.id,
            text: t.text || t.title || '',
            completed: !!t.completed,
            priority: t.priority || 'low'
          }));
          loadedFromSupabase = true;
          await this.saveMarkdownBackup(this.tasks);
        }
      } catch (err) {
        console.warn('Supabase fetch failed:', err);
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

      const delBtn = card.createEl('button', { text: '✕', cls: 'levinskyj-todos-delete-btn' });
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
          body: JSON.stringify({ text, completed: false, priority: 'low' })
        });

        if (response.status === 201 || response.status === 200) {
          const resData = response.json;
          const created = Array.isArray(resData) ? resData[0] : resData;
          if (created) {
            newTask = {
              id: created.id,
              text: created.text || text,
              completed: !!created.completed,
              priority: created.priority || 'low'
            };
          }
        }
      } catch (err) {
        console.warn('Failed to add task to Supabase:', err);
      }
    }

    if (!newTask) {
      newTask = {
        id: Date.now(),
        text,
        completed: false,
        priority: 'low'
      };
    }

    this.tasks.unshift(newTask);
    await this.saveMarkdownBackup(this.tasks);
    this.renderTasks();
  }

  async toggleTask(task) {
    const newStatus = !task.completed;
    task.completed = newStatus;

    if (this.plugin.settings.useSupabase && task.id) {
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

    if (this.plugin.settings.useSupabase && task.id) {
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

      await this.plugin.ensureFolder(this.plugin.settings.folder || 'System/Tasks');
      let file = this.app.vault.getAbstractFileByPath(filePath);
      if (!file) {
        file = await this.app.vault.create(filePath, content);
      } else {
        await this.app.vault.modify(file, content);
      }
    } catch (err) {
      console.warn('Failed to save Markdown backup:', err);
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
      let idCounter = 1;
      lines.forEach((line) => {
        const match = line.match(/^-\s*\[([ xX])\]\s*(.*)$/);
        if (match) {
          tasks.push({
            id: idCounter++,
            completed: match[1].toLowerCase() === 'x',
            text: match[2].trim()
          });
        }
      });
      return tasks;
    } catch (err) {
      return [];
    }
  }
}

class TodosSettingTab extends PluginSettingTab {
  constructor(app, plugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display() {
    const { containerEl } = this;
    containerEl.empty();
    containerEl.createEl('h2', { text: 'Levinskyj Todos' });

    new Setting(containerEl)
      .setName('Používat Supabase Cloud')
      .setDesc('Synchronizovat úkoly přímo se Supabase cloud databází (sdíleno s Android aplikací).')
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.useSupabase)
          .onChange(async (value) => {
            this.plugin.settings.useSupabase = value;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName('Složka úkolů')
      .setDesc('Cílová složka pro zálohu v Markdownu.')
      .addText((text) =>
        text
          .setPlaceholder('System/Tasks')
          .setValue(this.plugin.settings.folder)
          .onChange(async (value) => {
            this.plugin.settings.folder = value;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName('Název souboru')
      .setDesc('Název Markdown souboru (bez .md).')
      .addText((text) =>
        text
          .setPlaceholder('TasksList')
          .setValue(this.plugin.settings.file)
          .onChange(async (value) => {
            this.plugin.settings.file = value;
            await this.plugin.saveSettings();
          })
      );
  }
}

class TodosPlugin extends Plugin {
  async onload() {
    await this.loadSettings();

    this.registerView(VIEW_TYPE_TODOS, (leaf) => new TodosView(leaf, this));

    this.addRibbonIcon('check-square', 'Levinskyj Todos', () => {
      this.activateView();
    });

    this.addCommand({
      id: 'open-todos',
      name: 'Otevřít úkoly',
      callback: () => {
        this.activateView();
      }
    });

    this.addCommand({
      id: 'refresh-todos',
      name: 'Obnovit úkoly ze Supabase',
      callback: async () => {
        const leaves = this.app.workspace.getLeavesOfType(VIEW_TYPE_TODOS);
        for (const leaf of leaves) {
          if (leaf.view && leaf.view.loadTasks) {
            await leaf.view.loadTasks();
          }
        }
        new Notice('Úkoly obnoveny.');
      }
    });

    this.addSettingTab(new TodosSettingTab(this.app, this));
  }

  onunload() {
    this.app.workspace.detachLeavesOfType(VIEW_TYPE_TODOS);
  }

  async activateView() {
    const { workspace } = this.app;
    let leaf = workspace.getLeavesOfType(VIEW_TYPE_TODOS)[0];
    if (!leaf) {
      leaf = workspace.getLeaf('tab');
      await leaf.setViewState({ type: VIEW_TYPE_TODOS, active: true });
    }
    workspace.revealLeaf(leaf);
  }

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }

  async ensureFolder(path) {
    if (!path) return;
    const parts = path.split('/');
    let cur = '';
    for (const part of parts) {
      if (!part) continue;
      cur = cur ? cur + '/' + part : part;
      if (!this.app.vault.getAbstractFileByPath(cur)) {
        try {
          await this.app.vault.createFolder(cur);
        } catch (e) {
          // složka již existuje
        }
      }
    }
  }
}

module.exports = TodosPlugin;
