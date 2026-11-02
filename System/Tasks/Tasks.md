---
cssclasses: homepage-dashboard
---

```dataviewjs
const container = dv.container;
container.classList.add('homepage-root');

const style = document.createElement('style');
style.textContent = `
.tasks-header {
  display: flex; justify-content: space-between; align-items: center;
  padding: var(--space-8) var(--space-8) var(--space-6); flex-wrap: wrap; gap: var(--space-4);
  border-bottom: 1px solid var(--bronze-dim);
}
.tasks-header-left { display: flex; align-items: center; gap: var(--space-4); }
.tasks-header-icon { font-size: 2rem; line-height: 1; }
.tasks-header h1 {
  font-family: "Bricolage Grotesque", "Cormorant Garamond", Georgia, serif;
  font-size: var(--text-xl); color: var(--bronze); font-weight: 600;
  letter-spacing: -0.02em; margin: 0; line-height: 1.2; border: none;
}

.tasks-empty {
  text-align: center; padding: var(--space-16) var(--space-8);
  color: var(--text-muted); font-size: var(--text-lg);
}

.tasks-group-list {
  display: flex; flex-direction: column; gap: var(--space-3);
  padding: var(--space-4) var(--space-8);
}

.tasks-group-header {
  display: flex; align-items: center; gap: var(--space-3);
  padding: var(--space-3) var(--space-4); margin-bottom: var(--space-2);
  border-radius: var(--radius-md);
  background: color-mix(in srgb, var(--bronze) 8%, transparent);
  border: 1px solid color-mix(in srgb, var(--bronze) 15%, transparent);
}
.tasks-group-icon { font-size: 1.2em; line-height: 1; }
.tasks-group-title {
  font-family: "Bricolage Grotesque", "Inter", sans-serif;
  font-size: var(--text-sm); font-weight: 600; color: var(--bronze);
  text-transform: uppercase; letter-spacing: 0.06em;
}
.tasks-group-count {
  font-size: var(--text-xs); color: var(--text-muted);
  margin-left: auto;
}

.tasks-card {
  background: var(--surface); border: 1px solid var(--border);
  border-radius: var(--radius-md); padding: var(--space-4);
  transition: background var(--duration-fast) var(--ease-out),
              border-color var(--duration-fast) var(--ease-out);
  display: flex; align-items: flex-start; gap: var(--space-3);
  cursor: pointer;
}
.tasks-card:hover { background: var(--surface-elev); border-color: var(--border-hover); }

.tasks-checkbox {
  flex-shrink: 0; width: 18px; height: 18px; margin-top: 2px;
  border-radius: 4px; border: 1.5px solid var(--text-muted);
  background: transparent; cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  transition: all var(--duration-fast) var(--ease-out);
  -webkit-appearance: none; appearance: none;
}
.tasks-checkbox:checked { background: var(--bronze); border-color: var(--bronze); }
.tasks-checkbox:checked::after {
  content: '✓'; color: #fff; font-size: 12px; font-weight: 700; line-height: 1;
}

.tasks-body { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: var(--space-1); }
.tasks-text {
  font-size: var(--text-sm); color: var(--text); line-height: 1.5;
  word-break: break-word;
}
.tasks-text a { color: var(--bronze); text-decoration: none; }

.tasks-meta {
  display: flex; flex-wrap: wrap; gap: var(--space-2); align-items: center;
}
.tasks-tag {
  font-size: 9px; padding: 1px 7px; border-radius: 10px;
  background: color-mix(in srgb, var(--bronze) 12%, transparent);
  color: var(--bronze); border: 0.5px solid color-mix(in srgb, var(--bronze) 20%, transparent);
  font-weight: 500; line-height: 1.5;
}
.tasks-prio-high { color: #e06c6c; font-size: 11px; }
.tasks-prio-medium { color: #d4a84b; font-size: 11px; }
.tasks-prio-low { color: var(--text-muted); font-size: 11px; }
.tasks-due { color: var(--text-muted); font-size: 10px; }
.tasks-due-over { color: #e06c6c; font-size: 10px; font-weight: 600; }

.tasks-source {
  font-size: 10px; color: var(--text-muted); flex-shrink: 0;
  max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.tasks-source:hover { color: var(--bronze); }

@media (max-width: 720px) {
  .tasks-group-list { padding: var(--space-2) var(--space-4); }
  .tasks-source { display: none; }
}
`;
document.head.appendChild(style);

const allTasks = dv.pages().file.tasks.where(t => !t.completed);

const header = container.createDiv({ cls: 'tasks-header' });
const left = header.createDiv({ cls: 'tasks-header-left' });
left.createEl('span', { text: '✅', cls: 'tasks-header-icon' });
left.createEl('h1', { text: 'ÚKOLY' });
const meta = header.createDiv({ cls: 'moc-header-meta' });
const makeStat = (icon, val, label) => {
  const el = meta.createDiv({ cls: 'hp-meta-bubble' });
  el.createEl('span', { cls: 'hp-meta-icon', text: icon });
  el.createEl('span', { cls: 'hp-meta-value', text: `${val}` });
  el.createEl('span', { cls: 'hp-meta-label', text: label });
};
makeStat('📋', allTasks.length, 'nehotových');
makeStat('🔥', allTasks.where(t => t.priority === 'high').length, 'vysoká');

if (allTasks.length === 0) {
  container.createDiv({ cls: 'tasks-empty' }).createEl('p', { text: 'Žádné nehotové úkoly 🎉' });
} else {
  const groups = {};
  for (const t of allTasks) {
    const folder = t.path.includes('/') ? t.path.split('/').slice(0, -1).join('/') : '/';
    if (!groups[folder]) groups[folder] = [];
    groups[folder].push(t);
  }

  const folderMeta = {
    'Život/Log': { icon: '📝', label: 'Denní logy' },
    'Inbox': { icon: '📥', label: 'Inbox' },
    'System/Tasks': { icon: '✅', label: 'Rychlé úkoly' },
  };
  const defaultMeta = { icon: '📄', label: 'Ostatní' };

  const list = container.createDiv({ cls: 'tasks-group-list' });

  for (const [folder, tasks] of Object.entries(groups)) {
    const fm = folderMeta[folder] || defaultMeta;

    const group = list.createDiv({ cls: 'tasks-group' });
    const groupHeader = group.createDiv({ cls: 'tasks-group-header' });
    groupHeader.createEl('span', { text: fm.icon, cls: 'tasks-group-icon' });
    groupHeader.createEl('span', { text: fm.label, cls: 'tasks-group-title' });
    groupHeader.createEl('span', { text: `${tasks.length}`, cls: 'tasks-group-count' });

    const priorityEmoji = { high: '🔴', medium: '🟡', low: '🟢' };
    const priorityClass = { high: 'tasks-prio-high', medium: 'tasks-prio-medium', low: 'tasks-prio-low' };

    for (const task of tasks) {
      const card = group.createDiv({ cls: 'tasks-card' });

      const checkbox = card.createEl('input', { type: 'checkbox', cls: 'tasks-checkbox' });

      const body = card.createDiv({ cls: 'tasks-body' });
      const textEl = body.createDiv({ cls: 'tasks-text' });
      textEl.textContent = task.text.replace(/\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g, '$1');

      const metaRow = body.createDiv({ cls: 'tasks-meta' });

      if (task.priority && task.priority !== 'none' && task.priority !== 'default') {
        metaRow.createEl('span', {
          text: `${priorityEmoji[task.priority] || ''} ${task.priority}`,
          cls: priorityClass[task.priority] || ''
        });
      }

      if (task.due) {
        const m = window.moment ? moment(task.due) : null;
        const isOverdue = m && m.isBefore(moment(), 'day');
        metaRow.createEl('span', {
          text: `📅 ${m ? m.format('DD.MM.YYYY') : task.due}`,
          cls: isOverdue ? 'tasks-due-over' : 'tasks-due'
        });
      }

      const file = dv.page(task.path);
      if (file && file.tags) {
        const uniqueTags = [...new Set(file.tags)].filter(t => !['#log', '#Život', '#inbox', '#quick-capture'].includes(t));
        for (const tag of uniqueTags.slice(0, 2)) {
          metaRow.createEl('span', { text: tag, cls: 'tasks-tag' });
        }
      }

      const sourceEl = card.createEl('a', {
        text: task.path.split('/').pop(),
        href: task.path,
        cls: 'internal-link tasks-source',
        attr: { title: task.path }
      });

      card.addEventListener('click', (e) => {
        if (e.target.tagName === 'A' || e.target.tagName === 'INPUT') return;
        app.workspace.openLinkText(task.path, '');
      });

      checkbox.addEventListener('change', async () => {
        try {
          const fileObj = app.vault.getAbstractFileByPath(task.path);
          if (!fileObj) return;
          const content = await app.vault.read(fileObj);
          const lines = content.split('\n');
          let changed = false;
          for (let i = 0; i < lines.length; i++) {
            if (lines[i].includes('- [ ]') && lines[i].includes(task.text.trim())) {
              lines[i] = lines[i].replace('- [ ]', '- [x]');
              changed = true;
              break;
            }
          }
          if (changed) {
            await app.vault.modify(fileObj, lines.join('\n'));
            new Notice('✅ Hotovo');
            setTimeout(() => window.location.reload(), 300);
          }
        } catch (err) { new Notice('Chyba'); }
      });
    }
  }
}
```
