const { Plugin, TFile, TFolder, Notice, Modal, Setting } = require('obsidian');

const DEFAULT_SETTINGS = {
    outputPath: 'web-export',
    password: '',
    siteTitle: 'My Vault',
    includeAttachments: true,
    excludeFolders: ['.git', '.obsidian', 'node_modules'],
    maxFileSizeMB: 5,
    theme: 'dark',
    primaryColor: '#7c3aed',
    sortBy: 'name', // name | date | manual
    sortFoldersFirst: true,
    showOnlyMedia: true // Skryje .html, .css, .js, .json, .enc...
};

// ============ UTILS ============
const slugify = (text) => text.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-');

// Povolené formáty pro zobrazení
const ALLOWED_EXTENSIONS = ['md', 'png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'bmp', 'ico'];
const HIDDEN_EXTENSIONS = ['html', 'css', 'js', 'json', 'enc', 'map', 'txt', 'xml', 'yml', 'yaml'];

class CryptoHelper {
    static async encryptLargeData(data, password, onProgress) {
        const encoder = new TextEncoder();
        const text = typeof data === 'string' ? data : JSON.stringify(data);
        const bytes = encoder.encode(text);
        const CHUNK_SIZE = 64 * 1024;
        const chunks = [];
        const totalChunks = Math.ceil(bytes.length / CHUNK_SIZE);
        
        const salt = crypto.getRandomValues(new Uint8Array(16));
        const iv = crypto.getRandomValues(new Uint8Array(12));
        const key = await this.deriveKey(password, salt);
        
        for (let i = 0; i < totalChunks; i++) {
            const start = i * CHUNK_SIZE;
            const end = Math.min(start + CHUNK_SIZE, bytes.length);
            const chunk = bytes.slice(start, end);
            
            const chunkIv = new Uint8Array(iv);
            const view = new DataView(chunkIv.buffer);
            view.setUint32(8, i, false);
            
            const encrypted = await crypto.subtle.encrypt(
                { name: 'AES-GCM', iv: chunkIv },
                key,
                chunk
            );
            
            chunks.push(new Uint8Array(encrypted));
            if (onProgress) onProgress((i + 1) / totalChunks);
        }
        
        const metadata = JSON.stringify({
            version: 2,
            chunks: totalChunks,
            originalLength: bytes.length,
            salt: Array.from(salt),
            iv: Array.from(iv)
        });
        
        const metaBytes = encoder.encode(metadata);
        const metaLength = new Uint8Array(4);
        new DataView(metaLength.buffer).setUint32(0, metaBytes.length, false);
        
        let totalLength = 4 + metaBytes.length;
        chunks.forEach(c => totalLength += c.length);
        
        const result = new Uint8Array(totalLength);
        let offset = 0;
        
        result.set(metaLength, offset); offset += 4;
        result.set(metaBytes, offset); offset += metaBytes.length;
        chunks.forEach(chunk => { result.set(chunk, offset); offset += chunk.length; });
        
        return this.arrayBufferToBase64(result);
    }
    
    static async deriveKey(password, salt) {
        const encoder = new TextEncoder();
        const keyMaterial = await crypto.subtle.importKey(
            'raw', encoder.encode(password), { name: 'PBKDF2' }, false, ['deriveBits', 'deriveKey']
        );
        return await crypto.subtle.deriveKey(
            { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' },
            keyMaterial, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']
        );
    }
    
    static arrayBufferToBase64(buffer) {
        const bytes = new Uint8Array(buffer);
        let binary = '';
        for (let i = 0; i < bytes.byteLength; i += 0x8000) {
            binary += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
        }
        return btoa(binary);
    }
}

// ============ PLUGIN ============
class VaultToWebPlugin extends Plugin {
    async onload() {
        await this.loadSettings();
        
        this.addRibbonIcon('globe', 'Export to Web', () => this.exportVault());
        this.addCommand({ id: 'export-web', name: 'Export to Encrypted Web', callback: () => this.exportVault() });
        this.addSettingTab(new SettingTab(this.app, this));
    }
    
    async exportVault() {
        if (!this.settings.password) {
            new Notice('❌ Nastav heslo v nastavení!');
            return;
        }
        
        const progress = new ProgressModal(this.app);
        progress.open();
        
        try {
            progress.setMessage('📁 Sbírání souborů...');
            const vaultData = await this.collectVaultData(progress);
            
            if (vaultData.stats.totalFiles === 0) {
                progress.close();
                new Notice('⚠️ Žádné soubory k exportu (zkontroluj filtry)');
                return;
            }
            
            vaultData.index = this.buildIndex(vaultData);
            
            progress.setMessage('🔐 Šifrování...');
            const encrypted = await CryptoHelper.encryptLargeData(vaultData, this.settings.password, (p) => {
                progress.setProgress(p * 100);
            });
            
            progress.setMessage('📝 Generování HTML...');
            await this.generateWebsite(encrypted);
            
            progress.close();
            new Notice(`✅ Hotovo! ${vaultData.stats.totalFiles} souborů exportováno.`);
        } catch (err) {
            progress.close();
            console.error(err);
            new Notice('❌ Chyba: ' + err.message);
        }
    }
    
    buildIndex(data) {
        const index = {};
        const walk = (items, parentPath = '') => {
            items.forEach(item => {
                const fullPath = parentPath ? `${parentPath}/${item.name}` : item.name;
                if (item.type === 'folder') {
                    walk(item.children, fullPath);
                } else {
                    const nameWithoutExt = item.name.replace(/\.[^/.]+$/, '');
                    index[nameWithoutExt.toLowerCase()] = fullPath;
                    index[item.name.toLowerCase()] = fullPath;
                    index[fullPath.toLowerCase()] = fullPath;
                    index[slugify(nameWithoutExt)] = fullPath;
                }
            });
        };
        walk(data.structure);
        return index;
    }
    
    shouldIncludeFile(ext) {
        // Pokud je zapnutý showOnlyMedia, povol jen md a obrázky
        if (this.settings.showOnlyMedia) {
            return ALLOWED_EXTENSIONS.includes(ext.toLowerCase());
        }
        // Jinak skryj jen explicitně zakázané
        return !HIDDEN_EXTENSIONS.includes(ext.toLowerCase());
    }
    
    async collectVaultData(progress) {
        const data = {
            meta: { 
                title: this.settings.siteTitle, 
                exported: new Date().toISOString(), 
                version: '2.1',
                sortBy: this.settings.sortBy,
                sortFoldersFirst: this.settings.sortFoldersFirst
            },
            files: {}, 
            structure: [], 
            stats: { totalFiles: 0, totalSize: 0, skipped: 0 }
        };
        
        let processed = 0;
        const allFiles = [];
        
        const countFiles = (item) => {
            if (this.settings.excludeFolders.some(ex => item.path.includes(ex))) return;
            if (item instanceof TFolder) {
                item.children.forEach(countFiles);
            } else {
                const ext = item.extension;
                if (this.shouldIncludeFile(ext)) {
                    allFiles.push(item);
                } else {
                    data.stats.skipped++;
                }
            }
        };
        
        this.app.vault.getRoot().children.forEach(countFiles);
        
        // Sort funkce
        const sortItems = (items) => {
            const folders = items.filter(i => i instanceof TFolder);
            const files = items.filter(i => i instanceof TFile);
            
            const sortFn = (a, b) => {
                switch (this.settings.sortBy) {
                    case 'date':
                        return b.stat.mtime - a.stat.mtime; // Nejnovější první
                    case 'name':
                    default:
                        return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
                }
            };
            
            if (this.settings.sortFoldersFirst) {
                return [...folders.sort(sortFn), ...files.sort(sortFn)];
            }
            return items.sort(sortFn);
        };
        
        const processItem = async (item, path = '') => {
            const fullPath = path ? `${path}/${item.name}` : item.name;
            
            if (this.settings.excludeFolders.some(ex => fullPath.includes(ex))) return null;
            
            if (item instanceof TFolder) {
                // Získej a seřaď children
                const sortedChildren = sortItems(item.children);
                const children = [];
                
                for (const child of sortedChildren) {
                    const childData = await processItem(child, fullPath);
                    if (childData) children.push(childData);
                }
                
                // Nepřidávej prázdné složky (pokud mají skryté soubory)
                if (children.length === 0) return null;
                
                return {
                    type: 'folder',
                    name: item.name,
                    path: fullPath,
                    children,
                    modified: item.stat.mtime
                };
                
            } else if (item instanceof TFile) {
                const ext = item.extension.toLowerCase();
                
                // Filtruj soubory
                if (!this.shouldIncludeFile(ext)) {
                    return null;
                }
                
                processed++;
                if (processed % 5 === 0) {
                    progress.setMessage(`📄 ${processed}/${allFiles.length} souborů...`);
                }
                
                const size = item.stat.size;
                const maxSize = this.settings.maxFileSizeMB * 1024 * 1024;
                
                // Zpracuj podle typu
                if (ext === 'md') {
                    const content = await this.app.vault.read(item);
                    data.files[fullPath] = {
                        type: 'markdown',
                        content: content,
                        links: this.extractLinks(content),
                        modified: item.stat.mtime
                    };
                    data.stats.totalSize += content.length;
                    
                } else if (['png','jpg','jpeg','gif','webp','svg','bmp','ico'].includes(ext)) {
                    if (size < maxSize) {
                        try {
                            const binary = await this.app.vault.readBinary(item);
                            data.files[fullPath] = {
                                type: 'image',
                                mime: `image/${ext === 'svg' ? 'svg+xml' : ext}`,
                                data: this.arrayBufferToBase64(binary),
                                modified: item.stat.mtime
                            };
                            data.stats.totalSize += size;
                        } catch (e) {
                            console.warn('Chyba obrázku:', fullPath);
                            return null;
                        }
                    } else {
                        console.warn('Příliš velký obrázek:', fullPath);
                        return null;
                    }
                }
                
                data.stats.totalFiles++;
                return {
                    type: 'file',
                    name: item.name,
                    path: fullPath,
                    extension: ext,
                    modified: item.stat.mtime
                };
            }
            return null;
        };
        
        // Seřaď root items
        const sortedRoot = sortItems(this.app.vault.getRoot().children);
        
        for (const item of sortedRoot) {
            const res = await processItem(item);
            if (res) data.structure.push(res);
        }
        
        return data;
    }
    
    extractLinks(content) {
        const links = [];
        const wikiRegex = /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g;
        let match;
        while ((match = wikiRegex.exec(content)) !== null) {
            links.push({ type: 'wiki', target: match[1], alias: match[2], raw: match[0] });
        }
        const embedRegex = /!\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g;
        while ((match = embedRegex.exec(content)) !== null) {
            links.push({ type: 'embed', target: match[1], alias: match[2], raw: match[0] });
        }
        const mdRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
        while ((match = mdRegex.exec(content)) !== null) {
            if (!match[2].startsWith('http')) {
                links.push({ type: 'md', target: match[2], alias: match[1], raw: match[0] });
            }
        }
        return links;
    }
    
    arrayBufferToBase64(buffer) {
        const bytes = new Uint8Array(buffer);
        let binary = '';
        for (let i = 0; i < bytes.byteLength; i += 0x8000) {
            binary += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
        }
        return btoa(binary);
    }
    
    async generateWebsite(encrypted) {
        const adapter = this.app.vault.adapter;
        const out = this.settings.outputPath;
        
        if (!(await adapter.exists(out))) await adapter.mkdir(out);
        
        const CHUNK_SIZE = 1024 * 1024;
        const chunks = Math.ceil(encrypted.length / CHUNK_SIZE);
        
        if (chunks > 1) {
            await adapter.write(`${out}/vault-manifest.json`, JSON.stringify({ version: 2, chunks, encrypted: true }));
            for (let i = 0; i < chunks; i++) {
                await adapter.write(`${out}/vault-data-${i}.enc`, encrypted.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE));
            }
        } else {
            await adapter.write(`${out}/vault-data.enc`, encrypted);
        }
        
        await adapter.write(`${out}/index.html`, this.getLoginHTML(chunks > 1));
        await adapter.write(`${out}/app.html`, this.getAppHTML());
        await adapter.write(`${out}/styles.css`, this.getStyles());
    }
    
    getLoginHTML(isMultiChunk) {
        const theme = this.settings.theme;
        const primary = this.settings.primaryColor;
        
        return `<!DOCTYPE html>
<html lang="cs" data-theme="${theme}">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${this.settings.siteTitle}</title>
    <link rel="stylesheet" href="styles.css">
    <style>:root { --primary: ${primary}; }</style>
</head>
<body class="login-page">
    <div class="login-container">
        <div class="logo">◈</div>
        <h1>${this.settings.siteTitle}</h1>
        <p class="subtitle">Zadej heslo pro odemčení vaultu</p>
        
        <form id="loginForm" class="login-form">
            <div class="input-group">
                <input type="password" id="password" placeholder=" " autocomplete="off" autofocus>
                <label for="password">Heslo</label>
                <button type="button" class="toggle-password" onclick="togglePassword()">👁</button>
            </div>
            <button type="submit" id="submitBtn">
                <span class="btn-text">Odemknout</span>
                <span class="btn-loader hidden"></span>
            </button>
        </form>
        
        <div id="progress" class="progress-container hidden">
            <div class="progress-bar"><div class="progress-fill"></div></div>
            <span class="progress-text">Načítání...</span>
        </div>
        
        <div id="error" class="error-message hidden"></div>
    </div>

    <script>
        const isMultiChunk = ${isMultiChunk};
        
        function togglePassword() {
            const input = document.getElementById('password');
            input.type = input.type === 'password' ? 'text' : 'password';
        }
        
        document.getElementById('loginForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const password = document.getElementById('password').value;
            const btn = document.getElementById('submitBtn');
            const error = document.getElementById('error');
            const progress = document.getElementById('progress');
            
            btn.disabled = true;
            btn.querySelector('.btn-text').classList.add('hidden');
            btn.querySelector('.btn-loader').classList.remove('hidden');
            error.classList.add('hidden');
            progress.classList.remove('hidden');
            
            try {
                let encryptedData = '';
                
                if (isMultiChunk) {
                    const manifest = await fetch('vault-manifest.json').then(r => r.json());
                    for (let i = 0; i < manifest.chunks; i++) {
                        const chunk = await fetch(\`vault-data-\${i}.enc\`).then(r => r.text());
                        encryptedData += chunk;
                        updateProgress((i + 1) / manifest.chunks * 40);
                    }
                } else {
                    encryptedData = await fetch('vault-data.enc').then(r => r.text());
                    updateProgress(40);
                }
                
                const decrypted = await decryptData(encryptedData, password, (p) => {
                    updateProgress(40 + p * 60);
                });
                
                sessionStorage.setItem('vaultData', JSON.stringify(decrypted));
                sessionStorage.setItem('vaultUnlocked', 'true');
                window.location.href = 'app.html';
                
            } catch (err) {
                console.error(err);
                error.textContent = 'Špatné heslo nebo poškozená data';
                error.classList.remove('hidden');
                btn.disabled = false;
                btn.querySelector('.btn-text').classList.remove('hidden');
                btn.querySelector('.btn-loader').classList.add('hidden');
                progress.classList.add('hidden');
            }
        });
        
        function updateProgress(pct) {
            document.querySelector('.progress-fill').style.width = pct + '%';
            document.querySelector('.progress-text').textContent = Math.round(pct) + '%';
        }
        
        async function decryptData(encryptedBase64, password, onProgress) {
            const combined = Uint8Array.from(atob(encryptedBase64), c => c.charCodeAt(0));
            const metaLength = new DataView(combined.buffer).getUint32(0, false);
            const metadata = JSON.parse(new TextDecoder().decode(combined.slice(4, 4 + metaLength)));
            
            const salt = new Uint8Array(metadata.salt);
            const iv = new Uint8Array(metadata.iv);
            const key = await deriveKey(password, salt);
            
            let offset = 4 + metaLength;
            const chunks = [];
            const chunkSize = 64 * 1024 + 16;
            
            for (let i = 0; i < metadata.chunks; i++) {
                const chunkIv = new Uint8Array(iv);
                new DataView(chunkIv.buffer).setUint32(8, i, false);
                
                const encryptedChunk = combined.slice(offset, offset + chunkSize);
                offset += chunkSize;
                
                const decrypted = await crypto.subtle.decrypt(
                    { name: 'AES-GCM', iv: chunkIv }, key, encryptedChunk
                );
                chunks.push(new Uint8Array(decrypted));
                if (onProgress) onProgress((i + 1) / metadata.chunks);
            }
            
            const totalLength = chunks.reduce((a, b) => a + b.length, 0);
            const result = new Uint8Array(totalLength);
            let pos = 0;
            chunks.forEach(c => { result.set(c, pos); pos += c.length; });
            
            return JSON.parse(new TextDecoder().decode(result));
        }
        
        async function deriveKey(password, salt) {
            const enc = new TextEncoder();
            const keyMaterial = await crypto.subtle.importKey('raw', enc.encode(password), { name: 'PBKDF2' }, false, ['deriveKey']);
            return crypto.subtle.deriveKey(
                { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' },
                keyMaterial, { name: 'AES-GCM', length: 256 }, false, ['decrypt']
            );
        }
    </script>
</body>
</html>`;
    }
    
    getAppHTML() {
        const theme = this.settings.theme;
        const primary = this.settings.primaryColor;
        
        return `<!DOCTYPE html>
<html lang="cs" data-theme="${theme}">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${this.settings.siteTitle}</title>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/github-dark.min.css">
    <script src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/highlight.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/marked/9.1.6/marked.min.js"></script>
    <link rel="stylesheet" href="styles.css">
    <style>:root { --primary: ${primary}; }</style>
</head>
<body>
    <div id="app">
        <aside class="sidebar" id="sidebar">
            <div class="sidebar-header">
                <div class="site-title">
                    <span class="logo">◈</span>
                    <span>${this.settings.siteTitle}</span>
                </div>
                <button class="menu-toggle" onclick="toggleSidebar()">✕</button>
            </div>
            
            <div class="toolbar">
                <div class="search-box">
                    <input type="text" id="search" placeholder="Hledat (Ctrl+K)..." autocomplete="off">
                    <svg class="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="11" cy="11" r="8"></circle>
                        <path d="m21 21-4.35-4.35"></path>
                    </svg>
                </div>
                <button onclick="toggleSort()" class="btn-icon" title="Řazení">⇅</button>
            </div>
            
            <div id="sortInfo" class="sort-info hidden">
                <span id="sortLabel">Seřazeno: A-Z</span>
            </div>
            
            <nav id="fileTree" class="file-tree"></nav>
            
            <div class="sidebar-footer">
                <button onclick="logout()" class="btn-secondary">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                        <polyline points="16 17 21 12 16 7"></polyline>
                        <line x1="21" y1="12" x2="9" y2="12"></line>
                    </svg>
                    Odhlásit
                </button>
            </div>
        </aside>
        
        <div class="mobile-header">
            <button class="menu-toggle" onclick="toggleSidebar()">☰</button>
            <span class="mobile-title">${this.settings.siteTitle}</span>
            <button onclick="toggleSort()" class="btn-icon" title="Řazení">⇅</button>
        </div>
        
        <main class="content">
            <div class="content-header">
                <nav id="breadcrumbs" class="breadcrumbs"></nav>
                <div class="actions">
                    <button onclick="toggleTheme()" class="btn-icon" title="Téma">◐</button>
                </div>
            </div>
            
            <article id="pageContent" class="markdown-body">
                <div class="welcome">
                    <div class="welcome-icon">◈</div>
                    <h1>${this.settings.siteTitle}</h1>
                    <p>Vyber poznámku v menu nebo použij vyhledávání</p>
                    <div class="stats" id="stats"></div>
                </div>
            </article>
        </main>
    </div>
    
    <div id="imageModal" class="modal hidden" onclick="closeModal()">
        <img id="modalImage" src="" alt="">
    </div>

    <script>
        if (!sessionStorage.getItem('vaultUnlocked')) {
            window.location.href = 'index.html';
        }
        
        const vaultData = JSON.parse(sessionStorage.getItem('vaultData'));
        const index = vaultData.index || {};
        let currentPath = '';
        let currentSort = vaultData.meta?.sortBy || 'name';
        let sortFoldersFirst = vaultData.meta?.sortFoldersFirst !== false;
        
        // Statistiky
        const totalFiles = Object.keys(vaultData.files).length;
        const mdFiles = Object.values(vaultData.files).filter(f => f.type === 'markdown').length;
        const imgFiles = Object.values(vaultData.files).filter(f => f.type === 'image').length;
        document.getElementById('stats').innerHTML = \`
            <span>\${mdFiles} poznámek</span> • <span>\${imgFiles} obrázků</span>
        \`;
        
        marked.setOptions({
            highlight: function(code, lang) {
                if (lang && hljs.getLanguage(lang)) {
                    return hljs.highlight(code, { language: lang }).value;
                }
                return hljs.highlightAuto(code).value;
            },
            breaks: true,
            gfm: true
        });
        
        const renderer = new marked.Renderer();
        const originalLink = renderer.link.bind(renderer);
        
        renderer.link = function(href, title, text) {
            if (!href.startsWith('http') && !href.startsWith('#')) {
                return renderWikiLink(href, text, false);
            }
            return originalLink(href, title, text);
        };
        
        renderer.image = function(href, title, text) {
            const resolved = resolvePath(href);
            const file = vaultData.files[resolved];
            if (file && file.type === 'image') {
                return \`<img src="data:\${file.mime};base64,\${file.data}" 
                    alt="\${text}" title="\${title || ''}" 
                    class="embed-image" onclick="openModal(this)" 
                    data-path="\${resolved}">\`;
            }
            return \`<span class="broken-image">❌ Obrázek: \${href}</span>\`;
        };
        
        marked.use({ renderer });
        
        document.addEventListener('DOMContentLoaded', () => {
            renderFileTree(vaultData.structure, document.getElementById('fileTree'));
            setupSearch();
            updateSortLabel();
            window.addEventListener('hashchange', handleRoute);
            handleRoute();
            
            const savedTheme = localStorage.getItem('theme') || '${theme}';
            document.documentElement.setAttribute('data-theme', savedTheme);
        });
        
        function resolvePath(link, currentFile = currentPath) {
            link = link.replace(/\\.md$/i, '');
            const lower = link.toLowerCase();
            if (index[lower]) return index[lower];
            const slug = slugify(link);
            if (index[slug]) return index[slug];
            
            if (currentFile) {
                const currentDir = currentFile.substring(0, currentFile.lastIndexOf('/'));
                const relativePath = currentDir ? \`\${currentDir}/\${link}\` : link;
                if (vaultData.files[relativePath]) return relativePath;
                if (vaultData.files[relativePath + '.md']) return relativePath + '.md';
            }
            
            if (vaultData.files[link + '.md']) return link + '.md';
            return link;
        }
        
        function renderWikiLink(target, alias, isEmbed) {
            const resolved = resolvePath(target);
            const file = vaultData.files[resolved];
            const displayText = alias || target.split('/').pop().replace(/\\.md$/i, '');
            
            if (isEmbed) {
                if (!file) return \`<div class="embed-error">❌ Nenalezeno: \${target}</div>\`;
                
                if (file.type === 'image') {
                    return \`<img src="data:\${file.mime};base64,\${file.data}" 
                        alt="\${displayText}" class="embed-image" 
                        onclick="openModal(this)" data-path="\${resolved}">\`;
                } else if (file.type === 'markdown') {
                    let preview = file.content.substring(0, 500);
                    if (file.content.length > 500) preview += '...';
                    return \`<div class="embed-note">
                        <div class="embed-header">▦ \${displayText}</div>
                        <div class="embed-content">\${marked.parse(preview)}</div>
                        <a href="#/note/\${encodeURIComponent(resolved)}" class="embed-link">Otevřít →</a>
                    </div>\`;
                }
                return \`<div class="embed-file">📎 \${displayText}</div>\`;
            }
            
            const isBroken = !file;
            return \`<a href="#/note/\${encodeURIComponent(resolved)}" 
                class="internal-link \${isBroken ? 'broken' : ''}" 
                data-path="\${resolved}">\${displayText}\${isBroken ? ' ⚠' : ''}</a>\`;
        }
        
        function processContent(content, filePath) {
            let processed = content;
            processed = processed.replace(/!\\[\\[([^\\]|]+)(?:\\|([^\\]]+))?\\]\\]/g, (match, target, alias) => {
                return renderWikiLink(target, alias, true);
            });
            processed = processed.replace(/\\[\\[([^\\]|]+)(?:\\|([^\\]]+))?\\]\\]/g, (match, target, alias) => {
                return renderWikiLink(target, alias, false);
            });
            return processed;
        }
        
        // ============ SORTING ============
        function toggleSort() {
            const modes = [
                { by: 'name', foldersFirst: true, label: 'A-Z (složky první)' },
                { by: 'name', foldersFirst: false, label: 'A-Z (vše)' },
                { by: 'date', foldersFirst: true, label: 'Nejnovější (složky první)' },
                { by: 'date', foldersFirst: false, label: 'Nejnovější (vše)' }
            ];
            
            const currentIndex = modes.findIndex(m => m.by === currentSort && m.foldersFirst === sortFoldersFirst);
            const next = modes[(currentIndex + 1) % modes.length];
            
            currentSort = next.by;
            sortFoldersFirst = next.foldersFirst;
            
            // Re-render stromu
            renderFileTree(vaultData.structure, document.getElementById('fileTree'));
            updateSortLabel();
            
            // Ulož preference
            localStorage.setItem('vaultSort', JSON.stringify({ by: currentSort, foldersFirst: sortFoldersFirst }));
        }
        
        function updateSortLabel() {
            const labels = {
                'name-true': 'A-Z ↓',
                'name-false': 'A-Z',
                'date-true': 'Datum ↓',
                'date-false': 'Datum'
            };
            const key = \`\${currentSort}-\${sortFoldersFirst}\`;
            const label = labels[key] || 'A-Z';
            document.getElementById('sortLabel').textContent = \`Seřazeno: \${label}\`;
            document.getElementById('sortInfo').classList.remove('hidden');
        }
        
        function sortItems(items) {
            const folders = items.filter(i => i.type === 'folder');
            const files = items.filter(i => i.type === 'file');
            
            const sortFn = (a, b) => {
                if (currentSort === 'date') {
                    return (b.modified || 0) - (a.modified || 0);
                }
                return a.name.localeCompare(b.name, undefined, { sensitivity: 'base', numeric: true });
            };
            
            if (sortFoldersFirst) {
                return [...folders.sort(sortFn), ...files.sort(sortFn)];
            }
            return [...folders, ...files].sort(sortFn);
        }
        
        // ============ TREE RENDER ============
        function renderFileTree(items, container, level = 0) {
            // Seřaď podle aktuálního nastavení
            const sorted = sortItems(items);
            
            const ul = document.createElement('ul');
            ul.style.paddingLeft = level > 0 ? '8px' : '0';
            
            sorted.forEach(item => {
                const li = document.createElement('li');
                li.className = item.type;
                
                if (item.type === 'folder') {
                    const hasVisibleChildren = item.children && item.children.length > 0;
                    if (!hasVisibleChildren) return; // Přeskoč prázdné složky
                    
                    const header = document.createElement('div');
                    header.className = 'folder-header';
                    header.innerHTML = \`
                        <span class="chevron">▶</span>
                        <span class="icon">📁</span>
                        <span class="name">\${item.name}</span>
                        <span class="count">\${item.children.length}</span>
                    \`;
                    header.onclick = () => toggleFolder(li);
                    li.appendChild(header);
                    
                    const children = document.createElement('div');
                    children.className = 'folder-children collapsed';
                    renderFileTree(item.children, children, level + 1);
                    li.appendChild(children);
                } else {
                    const icon = getFileIcon(item.extension);
                    li.innerHTML = \`<a href="#/note/\${encodeURIComponent(item.path)}" 
                        onclick="loadFile('\${item.path}'); return false;"
                        class="file-link" data-path="\${item.path}">
                        <span class="icon">\${icon}</span>
                        <span class="name">\${item.name.replace(/\\.md$/i, '')}</span>
                    </a>\`;
                }
                ul.appendChild(li);
            });
            container.appendChild(ul);
        }
        
        function getFileIcon(ext) {
            const map = {
                'md': '▦', 'png': '🖼', 'jpg': '🖼', 'jpeg': '🖼', 'gif': '🖼', 
                'svg': '🎨', 'webp': '🖼', 'bmp': '🖼', 'ico': '🎯'
            };
            return map[ext] || '📄';
        }
        
        function toggleFolder(li) {
            li.classList.toggle('expanded');
            const children = li.querySelector('.folder-children');
            const chevron = li.querySelector('.chevron');
            if (children) children.classList.toggle('collapsed');
            if (chevron) chevron.textContent = li.classList.contains('expanded') ? '▼' : '▶';
        }
        
        // ============ CONTENT ============
        function loadFile(path) {
            currentPath = path;
            const file = vaultData.files[path];
            const contentDiv = document.getElementById('pageContent');
            
            if (!file) {
                contentDiv.innerHTML = \`<div class="error-page">
                    <h1>⚠</h1>
                    <p>Soubor nenalezen: \${path}</p>
                </div>\`;
                return;
            }
            
            const parts = path.split('/');
            document.getElementById('breadcrumbs').innerHTML = parts.map((part, i) => {
                const partPath = parts.slice(0, i + 1).join('/');
                const isLast = i === parts.length - 1;
                const name = isLast ? part.replace(/\\.md$/i, '') : part;
                return isLast ? \`<span class="current">\${name}</span>\` 
                    : \`<a href="#/note/\${encodeURIComponent(partPath)}">\${name}</a>\`;
            }).join(' <span class="sep">/</span> ');
            
            if (file.type === 'markdown') {
                currentContent = file.content;
                const processed = processContent(file.content, path);
                contentDiv.innerHTML = marked.parse(processed);
                
                contentDiv.querySelectorAll('pre code').forEach((block) => {
                    hljs.highlightElement(block);
                });
                
                contentDiv.querySelectorAll('.internal-link').forEach(link => {
                    link.addEventListener('click', (e) => {
                        e.preventDefault();
                        const target = link.getAttribute('data-path');
                        if (target) window.location.hash = '#/note/' + encodeURIComponent(target);
                    });
                });
                
            } else if (file.type === 'image') {
                contentDiv.innerHTML = \`<div class="image-view">
                    <img src="data:\${file.mime};base64,\${file.data}" 
                        onclick="openModal(this)" class="full-image" alt="\${path}">
                </div>\`;
            }
            
            document.querySelectorAll('.file-link').forEach(a => a.classList.remove('active'));
            document.querySelector(\`.file-link[data-path="\${CSS.escape(path)}"]\`)?.classList.add('active');
            
            if (window.innerWidth <= 768) {
                document.getElementById('sidebar').classList.remove('open');
            }
            window.scrollTo(0, 0);
        }
        
        function handleRoute() {
            const hash = window.location.hash;
            if (hash.startsWith('#/note/')) {
                loadFile(decodeURIComponent(hash.slice(7)));
            }
        }
        
        // ============ SEARCH ============
        function setupSearch() {
            const search = document.getElementById('search');
            let debounce;
            
            search.addEventListener('input', (e) => {
                clearTimeout(debounce);
                debounce = setTimeout(() => performSearch(e.target.value), 300);
            });
            
            search.addEventListener('focus', () => {
                if (search.value) performSearch(search.value);
            });
        }
        
        function performSearch(query) {
            if (!query) {
                renderFileTree(vaultData.structure, document.getElementById('fileTree'));
                return;
            }
            
            const results = [];
            const q = query.toLowerCase();
            
            Object.entries(vaultData.files).forEach(([path, file]) => {
                if (file.type !== 'markdown') return;
                
                const name = path.split('/').pop().replace(/\\.md$/i, '').toLowerCase();
                const content = file.content.toLowerCase();
                const folder = path.substring(0, path.lastIndexOf('/')).toLowerCase();
                
                let score = 0;
                if (name === q) score = 100;
                else if (name.startsWith(q)) score = 80;
                else if (name.includes(q)) score = 60;
                else if (content.includes(q)) score = 40;
                else if (folder.includes(q)) score = 20;
                
                if (score > 0) {
                    results.push({ path, file, score, name: path.split('/').pop().replace(/\\.md$/i, '') });
                }
            });
            
            results.sort((a, b) => b.score - a.score);
            
            const container = document.getElementById('fileTree');
            container.innerHTML = '';
            
            if (results.length === 0) {
                container.innerHTML = '<div class="no-results">🔍 Žádné výsledky</div>';
                return;
            }
            
            const ul = document.createElement('ul');
            results.slice(0, 50).forEach(({ path, name }) => {
                const folder = path.substring(0, path.lastIndexOf('/')) || 'Root';
                const li = document.createElement('li');
                li.className = 'file';
                li.innerHTML = \`<a href="#/note/\${encodeURIComponent(path)}" 
                    onclick="loadFile('\${path}'); return false;" class="file-link">
                    <span class="icon">▦</span>
                    <div class="search-result">
                        <div class="name">\${name}</div>
                        <div class="path">\${folder}</div>
                    </div>
                </a>\`;
                ul.appendChild(li);
            });
            container.appendChild(ul);
            
            // Přidáme info o počtu výsledků
            const info = document.createElement('div');
            info.className = 'search-info';
            info.innerHTML = \`<span>\${results.length} výsledků</span>\`;
            container.insertBefore(info, ul);
        }
        
        // ============ MODAL & UTILS ============
        function openModal(img) {
            const modal = document.getElementById('imageModal');
            const modalImg = document.getElementById('modalImage');
            modalImg.src = img.src;
            modal.classList.remove('hidden');
            document.body.style.overflow = 'hidden';
        }
        
        function closeModal() {
            document.getElementById('imageModal').classList.add('hidden');
            document.body.style.overflow = '';
        }
        
        function toggleSidebar() {
            document.getElementById('sidebar').classList.toggle('open');
        }
        
        function toggleTheme() {
            const html = document.documentElement;
            const current = html.getAttribute('data-theme');
            const next = current === 'dark' ? 'light' : 'dark';
            html.setAttribute('data-theme', next);
            localStorage.setItem('theme', next);
        }
        
        function logout() {
            sessionStorage.clear();
            window.location.href = 'index.html';
        }
        
        function slugify(text) {
            return text.toLowerCase().replace(/[^\\w\\s-]/g, '').replace(/\\s+/g, '-');
        }
        
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') closeModal();
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault();
                document.getElementById('search').focus();
            }
        });
    </script>
</body>
</html>`;
    }
    
    getStyles() {
        const primary = this.settings.primaryColor;
        
        return `/* ============ VARIABLES ============ */
:root {
    --primary: ${primary};
    --primary-light: color-mix(in srgb, ${primary} 70%, white);
    --primary-dark: color-mix(in srgb, ${primary} 80%, black);
    
    --bg-primary: #0d1117;
    --bg-secondary: #161b22;
    --bg-tertiary: #21262d;
    --bg-hover: #30363d;
    
    --text-primary: #f0f6fc;
    --text-secondary: #c9d1d9;
    --text-muted: #8b949e;
    --text-disabled: #484f58;
    
    --border: #30363d;
    --border-light: #21262d;
    
    --radius-sm: 6px;
    --radius-md: 8px;
    --radius-lg: 12px;
    
    --shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.3);
    --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.4);
    
    --sidebar-width: 300px;
    --header-height: 60px;
}

[data-theme="light"] {
    --bg-primary: #ffffff;
    --bg-secondary: #f6f8fa;
    --bg-tertiary: #eaeef2;
    --bg-hover: #d0d7de;
    
    --text-primary: #1f2328;
    --text-secondary: #24292f;
    --text-muted: #57606a;
    --text-disabled: #8c959f;
    
    --border: #d0d7de;
    --border-light: #eaeef2;
}

/* ============ RESET ============ */
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

html {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Noto Sans', Helvetica, Arial, sans-serif;
    font-size: 16px;
    line-height: 1.6;
    color: var(--text-primary);
    background: var(--bg-primary);
}

/* ============ LOGIN ============ */
.login-page {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 100vh;
    background: linear-gradient(135deg, var(--bg-secondary) 0%, var(--bg-primary) 100%);
    padding: 1rem;
}

.login-container {
    background: var(--bg-secondary);
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    padding: 2.5rem;
    width: 100%;
    max-width: 400px;
    box-shadow: var(--shadow-lg);
    text-align: center;
}

.logo {
    font-size: 3rem;
    color: var(--primary);
    margin-bottom: 0.5rem;
    filter: drop-shadow(0 0 20px var(--primary));
}

.login-container h1 {
    font-size: 1.5rem;
    font-weight: 600;
    margin-bottom: 0.5rem;
    color: var(--text-primary);
}

.subtitle {
    color: var(--text-muted);
    margin-bottom: 2rem;
    font-size: 0.95rem;
}

.input-group {
    position: relative;
    margin-bottom: 1rem;
}

.input-group input {
    width: 100%;
    padding: 12px 40px 12px 16px;
    background: var(--bg-primary);
    border: 1px solid var(--border);
    border-radius: var(--radius-md);
    color: var(--text-primary);
    font-size: 1rem;
    transition: all 0.2s;
}

.input-group input:focus {
    outline: none;
    border-color: var(--primary);
    box-shadow: 0 0 0 3px color-mix(in srgb, var(--primary) 20%, transparent);
}

.toggle-password {
    position: absolute;
    right: 12px;
    top: 50%;
    transform: translateY(-50%);
    background: none;
    border: none;
    color: var(--text-muted);
    cursor: pointer;
    padding: 4px;
    font-size: 1.1rem;
}

button {
    padding: 12px 24px;
    background: var(--primary);
    color: white;
    border: none;
    border-radius: var(--radius-md);
    font-size: 1rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
}

button:hover:not(:disabled) {
    background: var(--primary-light);
    transform: translateY(-1px);
    box-shadow: var(--shadow);
}

button:disabled {
    opacity: 0.6;
    cursor: not-allowed;
}

.btn-secondary {
    background: transparent;
    border: 1px solid var(--border);
    color: var(--text-secondary);
    padding: 8px 16px;
    font-size: 0.875rem;
    width: 100%;
}

.btn-secondary:hover {
    background: var(--bg-hover);
    border-color: var(--text-muted);
}

.btn-icon {
    padding: 8px;
    background: transparent;
    border: 1px solid var(--border);
    color: var(--text-muted);
    width: 36px;
    height: 36px;
    flex-shrink: 0;
}

.btn-icon:hover {
    background: var(--bg-hover);
    color: var(--text-primary);
}

.btn-loader {
    width: 20px;
    height: 20px;
    border: 2px solid transparent;
    border-top-color: currentColor;
    border-radius: 50%;
    animation: spin 1s linear infinite;
}

@keyframes spin {
    to { transform: rotate(360deg); }
}

.progress-container {
    margin-top: 1.5rem;
}

.progress-bar {
    height: 4px;
    background: var(--bg-tertiary);
    border-radius: 2px;
    overflow: hidden;
}

.progress-fill {
    height: 100%;
    background: var(--primary);
    transition: width 0.3s;
    width: 0%;
}

.progress-text {
    display: block;
    margin-top: 0.5rem;
    font-size: 0.875rem;
    color: var(--text-muted);
}

.error-message {
    margin-top: 1rem;
    padding: 0.75rem;
    background: rgba(248, 81, 73, 0.1);
    border: 1px solid rgba(248, 81, 73, 0.3);
    border-radius: var(--radius-md);
    color: #f85149;
    font-size: 0.875rem;
}

/* ============ APP LAYOUT ============ */
#app {
    display: flex;
    min-height: 100vh;
}

.sidebar {
    width: var(--sidebar-width);
    background: var(--bg-secondary);
    border-right: 1px solid var(--border);
    display: flex;
    flex-direction: column;
    position: fixed;
    height: 100vh;
    z-index: 100;
    transition: transform 0.3s;
}

.sidebar-header {
    padding: 1rem;
    border-bottom: 1px solid var(--border);
    display: flex;
    align-items: center;
    justify-content: space-between;
    height: var(--header-height);
}

.site-title {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-weight: 600;
    font-size: 1.1rem;
    color: var(--text-primary);
}

.site-title .logo {
    color: var(--primary);
    font-size: 1.5rem;
    filter: none;
}

.toolbar {
    padding: 0.75rem 1rem;
    display: flex;
    gap: 0.5rem;
    border-bottom: 1px solid var(--border-light);
}

.search-box {
    position: relative;
    flex: 1;
}

.search-box input {
    width: 100%;
    padding: 8px 12px 8px 36px;
    background: var(--bg-primary);
    border: 1px solid var(--border);
    border-radius: var(--radius-md);
    color: var(--text-primary);
    font-size: 0.875rem;
}

.search-box input:focus {
    outline: none;
    border-color: var(--primary);
}

.search-icon {
    position: absolute;
    left: 12px;
    top: 50%;
    transform: translateY(-50%);
    width: 16px;
    height: 16px;
    color: var(--text-muted);
    pointer-events: none;
}

.sort-info {
    padding: 0.5rem 1rem;
    font-size: 0.75rem;
    color: var(--text-muted);
    background: var(--bg-tertiary);
    border-bottom: 1px solid var(--border);
}

.file-tree {
    flex: 1;
    overflow-y: auto;
    padding: 0.5rem;
}

.file-tree ul {
    list-style: none;
}

.file-tree li {
    margin: 1px 0;
}

.folder-header {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 6px 8px;
    border-radius: var(--radius-sm);
    cursor: pointer;
    color: var(--text-secondary);
    font-size: 0.875rem;
    user-select: none;
    transition: all 0.15s;
}

.folder-header:hover {
    background: var(--bg-hover);
}

.chevron {
    font-size: 0.625rem;
    width: 12px;
    transition: transform 0.2s;
    color: var(--text-muted);
}

.folder.expanded .chevron {
    transform: rotate(90deg);
}

.folder-header .count {
    margin-left: auto;
    font-size: 0.75rem;
    color: var(--text-disabled);
    background: var(--bg-tertiary);
    padding: 2px 6px;
    border-radius: 10px;
}

.folder-children {
    overflow: hidden;
    transition: max-height 0.3s ease;
}

.folder-children.collapsed {
    max-height: 0;
}

.file-link {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 6px 8px;
    border-radius: var(--radius-sm);
    color: var(--text-muted);
    text-decoration: none;
    font-size: 0.875rem;
    transition: all 0.15s;
}

.file-link:hover, .file-link.active {
    background: color-mix(in srgb, var(--primary) 15%, transparent);
    color: var(--primary);
}

.file-link .icon {
    font-size: 1rem;
    opacity: 0.8;
    width: 20px;
    text-align: center;
}

.search-result .path {
    font-size: 0.75rem;
    color: var(--text-disabled);
    margin-top: 2px;
}

.no-results, .search-info {
    padding: 1rem;
    text-align: center;
    color: var(--text-muted);
    font-size: 0.875rem;
}

.sidebar-footer {
    padding: 1rem;
    border-top: 1px solid var(--border);
}

/* Mobile header */
.mobile-header {
    display: none;
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    height: var(--header-height);
    background: var(--bg-secondary);
    border-bottom: 1px solid var(--border);
    align-items: center;
    padding: 0 1rem;
    z-index: 99;
    gap: 0.5rem;
}

.mobile-title {
    font-weight: 600;
    flex: 1;
}

/* Content */
.content {
    flex: 1;
    margin-left: var(--sidebar-width);
    min-height: 100vh;
}

.content-header {
    position: sticky;
    top: 0;
    background: var(--bg-primary);
    border-bottom: 1px solid var(--border);
    padding: 1rem 2rem;
    display: flex;
    align-items: center;
    justify-content: space-between;
    z-index: 10;
}

.breadcrumbs {
    font-size: 0.875rem;
    color: var(--text-muted);
    display: flex;
    align-items: center;
    gap: 0.5rem;
    flex-wrap: wrap;
}

.breadcrumbs a {
    color: var(--text-secondary);
    text-decoration: none;
}

.breadcrumbs a:hover {
    color: var(--primary);
    text-decoration: underline;
}

.breadcrumbs .current {
    color: var(--text-primary);
    font-weight: 500;
}

.breadcrumbs .sep {
    color: var(--text-disabled);
}

.actions {
    display: flex;
    gap: 0.5rem;
}

#pageContent {
    max-width: 900px;
    margin: 0 auto;
    padding: 2rem;
}

/* ============ MARKDOWN ============ */
.markdown-body {
    font-size: 1rem;
    line-height: 1.8;
    color: var(--text-primary);
}

.markdown-body h1, .markdown-body h2, .markdown-body h3, 
.markdown-body h4, .markdown-body h5, .markdown-body h6 {
    margin-top: 2rem;
    margin-bottom: 1rem;
    font-weight: 600;
    line-height: 1.3;
    color: var(--text-primary);
}

.markdown-body h1 { font-size: 2rem; border-bottom: 1px solid var(--border); padding-bottom: 0.5rem; }
.markdown-body h2 { font-size: 1.5rem; border-bottom: 1px solid var(--border-light); padding-bottom: 0.3rem; }
.markdown-body h3 { font-size: 1.25rem; }

.markdown-body p {
    margin-bottom: 1rem;
    color: var(--text-secondary);
}

.markdown-body a {
    color: var(--primary);
    text-decoration: none;
}

.markdown-body a:hover {
    text-decoration: underline;
}

.markdown-body a.internal-link {
    color: var(--primary);
    font-weight: 500;
    border-bottom: 1px dashed var(--primary);
    transition: all 0.2s;
}

.markdown-body a.internal-link:hover {
    background: color-mix(in srgb, var(--primary) 10%, transparent);
    text-decoration: none;
    padding: 2px 4px;
    border-radius: 4px;
    margin: -2px -4px;
}

.markdown-body a.internal-link.broken {
    color: #f85149;
    border-bottom-color: #f85149;
    opacity: 0.7;
    text-decoration: line-through;
}

.markdown-body ul, .markdown-body ol {
    margin-bottom: 1rem;
    padding-left: 2rem;
}

.markdown-body li {
    margin: 0.25rem 0;
}

.markdown-body code {
    background: var(--bg-tertiary);
    padding: 0.2em 0.4em;
    border-radius: var(--radius-sm);
    font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
    font-size: 0.9em;
    color: var(--text-primary);
}

.markdown-body pre {
    background: var(--bg-secondary);
    padding: 1rem;
    border-radius: var(--radius-md);
    overflow-x: auto;
    margin-bottom: 1rem;
    border: 1px solid var(--border);
}

.markdown-body pre code {
    background: none;
    padding: 0;
    font-size: 0.875rem;
}

.markdown-body blockquote {
    border-left: 4px solid var(--primary);
    padding-left: 1rem;
    margin: 1rem 0;
    color: var(--text-muted);
    font-style: italic;
}

.markdown-body img {
    max-width: 100%;
    border-radius: var(--radius-md);
    margin: 1rem 0;
}

.markdown-body img.embed-image {
    cursor: zoom-in;
    transition: transform 0.2s, box-shadow 0.2s;
    border: 1px solid var(--border);
}

.markdown-body img.embed-image:hover {
    transform: scale(1.02);
    box-shadow: var(--shadow);
}

.markdown-body table {
    width: 100%;
    border-collapse: collapse;
    margin: 1rem 0;
}

.markdown-body th, .markdown-body td {
    padding: 0.5rem;
    border: 1px solid var(--border);
    text-align: left;
}

.markdown-body th {
    background: var(--bg-secondary);
    font-weight: 600;
}

.markdown-body tr:nth-child(even) {
    background: var(--bg-secondary);
}

/* Embeds */
.embed-note {
    background: var(--bg-secondary);
    border: 1px solid var(--border);
    border-radius: var(--radius-md);
    padding: 1rem;
    margin: 1rem 0;
    border-left: 4px solid var(--primary);
}

.embed-header {
    font-weight: 600;
    color: var(--primary);
    margin-bottom: 0.5rem;
    font-size: 0.875rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    display: flex;
    align-items: center;
    gap: 0.5rem;
}

.embed-content {
    opacity: 0.8;
    font-size: 0.95rem;
    max-height: 200px;
    overflow: hidden;
    position: relative;
}

.embed-content::after {
    content: '';
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    height: 60px;
    background: linear-gradient(transparent, var(--bg-secondary));
}

.embed-link {
    display: inline-block;
    margin-top: 0.5rem;
    font-size: 0.875rem;
    font-weight: 500;
}

.embed-error, .broken-image {
    padding: 1rem;
    background: rgba(248, 81, 73, 0.1);
    border: 1px solid rgba(248, 81, 73, 0.3);
    border-radius: var(--radius-md);
    color: #f85149;
    font-size: 0.875rem;
    margin: 1rem 0;
}

/* Welcome */
.welcome {
    text-align: center;
    padding: 6rem 2rem;
    color: var(--text-muted);
}

.welcome-icon {
    font-size: 4rem;
    margin-bottom: 1rem;
    opacity: 0.5;
    color: var(--primary);
}

.welcome h1 {
    font-size: 2rem;
    margin-bottom: 0.5rem;
    color: var(--text-primary);
    border: none;
}

.stats {
    margin-top: 1.5rem;
    display: flex;
    gap: 1rem;
    justify-content: center;
    font-size: 0.875rem;
    color: var(--text-muted);
}

.stats span {
    background: var(--bg-secondary);
    padding: 0.5rem 1rem;
    border-radius: var(--radius-md);
    border: 1px solid var(--border);
}

/* Modal */
.modal {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.9);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    cursor: zoom-out;
    padding: 2rem;
}

.modal img {
    max-width: 90%;
    max-height: 90%;
    object-fit: contain;
    border-radius: var(--radius-md);
    box-shadow: var(--shadow-lg);
}

/* Error page */
.error-page {
    text-align: center;
    padding: 6rem 2rem;
}

.error-page h1 {
    font-size: 4rem;
    color: var(--primary);
    opacity: 0.5;
    margin-bottom: 1rem;
}

/* Scrollbar */
::-webkit-scrollbar {
    width: 8px;
    height: 8px;
}

::-webkit-scrollbar-track {
    background: var(--bg-primary);
}

::-webkit-scrollbar-thumb {
    background: var(--bg-hover);
    border-radius: 4px;
}

::-webkit-scrollbar-thumb:hover {
    background: var(--text-disabled);
}

/* ============ RESPONSIVE ============ */
@media (max-width: 768px) {
    :root {
        --sidebar-width: 280px;
    }
    
    .sidebar {
        transform: translateX(-100%);
    }
    
    .sidebar.open {
        transform: translateX(0);
    }
    
    .menu-toggle {
        display: flex;
        align-items: center;
        justify-content: center;
    }
    
    .mobile-header {
        display: flex;
    }
    
    .content {
        margin-left: 0;
        margin-top: var(--header-height);
    }
    
    .content-header {
        padding: 1rem;
    }
    
    #pageContent {
        padding: 1rem;
    }
    
    .markdown-body h1 { font-size: 1.5rem; }
    .markdown-body h2 { font-size: 1.25rem; }
    
    .stats {
        flex-direction: column;
        gap: 0.5rem;
    }
}

/* Utilities */
.hidden { display: none !important; }`;
    }
    
    async loadSettings() {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    }
    
    async saveSettings() {
        await this.saveData(this.settings);
    }
}

class ProgressModal extends Modal {
    constructor(app) {
        super(app);
    }
    
    onOpen() {
        const { contentEl } = this;
        contentEl.createEl('h3', { text: 'Export vaultu' });
        this.msgEl = contentEl.createEl('p', { text: 'Příprava...', cls: 'progress-message' });
        this.progressEl = contentEl.createEl('div', { text: '0%', cls: 'progress-percentage' });
        
        // Přidej styly pro modal
        contentEl.style.padding = '2rem';
    }
    
    setMessage(msg) { 
        if (this.msgEl) this.msgEl.textContent = msg; 
    }
    
    setProgress(pct) { 
        if (this.progressEl) this.progressEl.textContent = Math.round(pct) + '%'; 
    }
    
    onClose() { 
        this.contentEl.empty(); 
    }
}

class SettingTab extends require('obsidian').PluginSettingTab {
    constructor(app, plugin) {
        super(app, plugin);
        this.plugin = plugin;
    }
    
    display() {
        const { containerEl } = this;
        containerEl.empty();
        containerEl.createEl('h2', { text: 'Vault to Encrypted Web' });
        
        new Setting(containerEl)
            .setName('Výstupní složka')
            .setDesc('Kam se uloží webovka')
            .addText(t => t.setPlaceholder('web-export').setValue(this.plugin.settings.outputPath)
                .onChange(async (v) => { this.plugin.settings.outputPath = v; await this.plugin.saveSettings(); }));
        
        new Setting(containerEl)
            .setName('Heslo pro šifrování')
            .setDesc('Heslo pro odemčení (NEZAPOMEŇ SI HO!)')
            .addText(t => t.setPlaceholder('Silné heslo...').setValue(this.plugin.settings.password)
                .onChange(async (v) => { this.plugin.settings.password = v; await this.plugin.saveSettings(); }));
        
        new Setting(containerEl)
            .setName('Název webu')
            .addText(t => t.setPlaceholder('My Vault').setValue(this.plugin.settings.siteTitle)
                .onChange(async (v) => { this.plugin.settings.siteTitle = v; await this.plugin.saveSettings(); }));
        
        new Setting(containerEl)
            .setName('Primární barva')
            .setDesc('Hex barvy tématu (např. #7c3aed pro fialovou)')
            .addText(t => t.setValue(this.plugin.settings.primaryColor)
                .onChange(async (v) => { this.plugin.settings.primaryColor = v; await this.plugin.saveSettings(); }));
        
        new Setting(containerEl)
            .setName('Řazení souborů')
            .setDesc('Výchozí způsob řazení')
            .addDropdown(d => d
                .addOption('name', 'Podle názvu (A-Z)')
                .addOption('date', 'Podle data (nejnovější)')
                .setValue(this.plugin.settings.sortBy)
                .onChange(async (v) => { this.plugin.settings.sortBy = v; await this.plugin.saveSettings(); }));
        
        new Setting(containerEl)
            .setName('Složky první')
            .setDesc('Zobrazit složky před soubory')
            .addToggle(t => t.setValue(this.plugin.settings.sortFoldersFirst)
                .onChange(async (v) => { this.plugin.settings.sortFoldersFirst = v; await this.plugin.saveSettings(); }));
        
        new Setting(containerEl)
            .setName('Skrýt systémové soubory')
            .setDesc('Zobrazit pouze .md a obrázky (skrýt .html, .css, .js, .json...)')
            .addToggle(t => t.setValue(this.plugin.settings.showOnlyMedia)
                .onChange(async (v) => { this.plugin.settings.showOnlyMedia = v; await this.plugin.saveSettings(); }));
        
        new Setting(containerEl)
            .setName('Max velikost obrázku (MB)')
            .setDesc('Obrázky větší než tato hodnota se přeskočí')
            .addSlider(s => s.setLimits(1, 20, 1).setValue(this.plugin.settings.maxFileSizeMB).setDynamicTooltip()
                .onChange(async (v) => { this.plugin.settings.maxFileSizeMB = v; await this.plugin.saveSettings(); }));
        
        new Setting(containerEl)
            .setName('Vyloučené složky')
            .setDesc('Složky oddělené čárkou, které se neexportují')
            .addText(t => t.setPlaceholder('.git, .obsidian, node_modules').setValue(this.plugin.settings.excludeFolders.join(', '))
                .onChange(async (v) => { this.plugin.settings.excludeFolders = v.split(',').map(s => s.trim()); await this.plugin.saveSettings(); }));
    }
}

module.exports = VaultToWebPlugin;