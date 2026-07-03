---
tags:
  - produkce
  - technika
---

# Přehled techniky

<style>
.technika-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 16px;
  margin: 1.5em 0;
}

.technika-card {
  background: var(--background-primary-alt, rgba(30, 30, 30, 0.8));
  border: 1px solid var(--background-modifier-border, rgba(255, 255, 255, 0.08));
  border-radius: 20px;
  padding: 24px;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  overflow: hidden;
  backdrop-filter: blur(12px);
  cursor: pointer;
}

.technika-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: linear-gradient(90deg, #c4956a, #d4a574, #c4956a);
  opacity: 0.8;
  transition: opacity 0.3s ease;
}

.technika-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(196, 149, 106, 0.25);
  border-color: rgba(196, 149, 106, 0.35);
}

.technika-card:hover::before {
  opacity: 1;
}

.technika-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}

.technika-icon {
  font-size: 1.6em;
  line-height: 1;
  filter: grayscale(0.2);
  transition: filter 0.3s ease;
}

.technika-card:hover .technika-icon {
  filter: grayscale(0);
}

.technika-card h3 {
  margin: 0;
  font-family: 'Bricolage Grotesque', 'Inter', sans-serif;
  font-size: 1.25em;
  font-weight: 600;
  color: var(--text-normal, #e8e6e3);
}

.technika-card h3 a {
  color: var(--text-normal, #e8e6e3);
  text-decoration: none;
  transition: color 0.2s ease;
}

.technika-card h3 a:hover {
  color: #c4956a;
}

.technika-sections {
  font-size: 0.85em;
  color: var(--text-muted, #999);
  margin-bottom: 14px;
  font-weight: 500;
  letter-spacing: 0.02em;
  line-height: 1.5;
}

.technika-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.technika-tag {
  background: rgba(196, 149, 106, 0.12);
  color: #c4956a;
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 0.75em;
  font-weight: 500;
  border: 1px solid rgba(196, 149, 106, 0.25);
  letter-spacing: 0.02em;
  text-transform: lowercase;
  transition: all 0.2s ease;
}

.technika-tag:hover {
  background: rgba(196, 149, 106, 0.2);
  border-color: rgba(196, 149, 106, 0.4);
}
</style>

```dataviewjs
const folder = "Produkce/Technika";
const files = app.vault.getMarkdownFiles()
  .filter(f => f.path.startsWith(folder + "/") && f.basename !== "Technika")
  .sort((a, b) => a.basename.localeCompare(b.basename));

const icons = {
  "Grip": "🛠️",
  "Kamera": "📷",
  "Optika": "🔍",
  "Světla": "💡"
};

const grid = document.createElement('div');
grid.className = 'technika-grid';

for (const file of files) {
  const cache = app.metadataCache.getFileCache(file);
  const tags = cache?.frontmatter?.tags || [];
  const headings = cache?.headings || [];
  
  const sections = headings
    .filter(h => h.level === 1)
    .map(h => h.heading);
  
  const relevantTags = tags.filter(t => t !== "produkce" && t !== "technika");

  const card = document.createElement('div');
  card.className = 'technika-card';
  
  card.addEventListener('click', (e) => {
    if (!e.target.closest('a')) {
      app.workspace.openLinkText(file.path, file.path);
    }
  });

  const header = document.createElement('div');
  header.className = 'technika-header';
  
  const icon = document.createElement('span');
  icon.className = 'technika-icon';
  icon.textContent = icons[file.basename] || "📁";
  header.appendChild(icon);
  
  const title = document.createElement('h3');
  const link = document.createElement('a');
  link.className = 'internal-link';
  link.href = file.path;
  link.textContent = file.basename;
  link.setAttribute('data-href', file.path);
  link.setAttribute('target', '_blank');
  link.setAttribute('rel', 'noopener');
  title.appendChild(link);
  header.appendChild(title);
  card.appendChild(header);

  if (sections.length > 0) {
    const sectionsEl = document.createElement('div');
    sectionsEl.className = 'technika-sections';
    sectionsEl.textContent = sections.join(' | ');
    card.appendChild(sectionsEl);
  }

  if (relevantTags.length > 0) {
    const meta = document.createElement('div');
    meta.className = 'technika-meta';
    for (const tag of relevantTags) {
      const span = document.createElement('span');
      span.className = 'technika-tag';
      span.textContent = tag;
      meta.appendChild(span);
    }
    card.appendChild(meta);
  }

  grid.appendChild(card);
}

dv.container.appendChild(grid);
````