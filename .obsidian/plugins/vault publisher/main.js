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
    sortBy: 'name',
    sortFoldersFirst: true,
    showOnlyMedia: true
};

const ALLOWED_EXTENSIONS = ['md', 'png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'bmp', 'ico'];
const HIDDEN_EXTENSIONS = ['html', 'css', 'js', 'json', 'enc', 'map', 'txt', 'xml', 'yml', 'yaml'];

// Definice helper funkcí NAHOŘE, před classou
function slugify(text) {
    return text.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-');
}

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
            console.error('Export error:', err);
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
        if (this.settings.showOnlyMedia) {
            return ALLOWED_EXTENSIONS.includes(ext.toLowerCase());
        }
        return !HIDDEN_EXTENSIONS.includes(ext.toLowerCase());
    }
    
    getFileStats(item) {
        if (!item.stat) {
            return {
                mtime: Date.now(),
                ctime: Date.now(),
                size: 0
            };
        }
        return {
            mtime: item.stat.mtime || Date.now(),
            ctime: item.stat.ctime || Date.now(),
            size: item.stat.size || 0
        };
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
            } else if (item instanceof TFile) {
                const ext = item.extension;
                if (this.shouldIncludeFile(ext)) {
                    allFiles.push(item);
                } else {
                    data.stats.skipped++;
                }
            }
        };
        
        this.app.vault.getRoot().children.forEach(countFiles);
        
        const sortItems = (items) => {
            const folders = items.filter(i => i instanceof TFolder);
            const files = items.filter(i => i instanceof TFile);
            
            const sortFn = (a, b) => {
                if (this.settings.sortBy === 'date') {
                    const aTime = this.getFileStats(a).mtime;
                    const bTime = this.getFileStats(b).mtime;
                    return bTime - aTime;
                }
                return a.name.localeCompare(b.name, undefined, { sensitivity: 'base', numeric: true });
            };
            
            if (this.settings.sortFoldersFirst) {
                return [...folders.sort(sortFn), ...files.sort(sortFn)];
            }
            return [...folders, ...files].sort(sortFn);
        };
        
        const processItem = async (item, path = '') => {
            const fullPath = path ? `${path}/${item.name}` : item.name;
            
            if (this.settings.excludeFolders.some(ex => fullPath.includes(ex))) return null;
            
            if (item instanceof TFolder) {
                const sortedChildren = sortItems(item.children);
                const children = [];
                
                for (const child of sortedChildren) {
                    const childData = await processItem(child, fullPath);
                    if (childData) children.push(childData);
                }
                
                if (children.length === 0) return null;
                
                const stats = this.getFileStats(item);
                
                return {
                    type: 'folder',
                    name: item.name,
                    path: fullPath,
                    children,
                    modified: stats.mtime
                };
                
            } else if (item instanceof TFile) {
                const ext = item.extension.toLowerCase();
                
                if (!this.shouldIncludeFile(ext)) {
                    return null;
                }
                
                processed++;
                if (processed % 5 === 0) {
                    progress.setMessage(`📄 ${processed}/${allFiles.length} souborů...`);
                }
                
                const stats = this.getFileStats(item);
                const maxSize = this.settings.maxFileSizeMB * 1024 * 1024;
                
                if (ext === 'md') {
                    const content = await this.app.vault.read(item);
                    data.files[fullPath] = {
                        type: 'markdown',
                        content: content,
                        links: this.extractLinks(content),
                        modified: stats.mtime
                    };
                    data.stats.totalSize += content.length;
                    
                } else if (['png','jpg','jpeg','gif','webp','svg','bmp','ico'].includes(ext)) {
                    if (stats.size < maxSize) {
                        try {
                            const binary = await this.app.vault.readBinary(item);
                            data.files[fullPath] = {
                                type: 'image',
                                mime: `image/${ext === 'svg' ? 'svg+xml' : ext}`,
                                data: this.arrayBufferToBase64(binary),
                                modified: stats.mtime
                            };
                            data.stats.totalSize += stats.size;
                        } catch (e) {
                            console.warn('Chyba obrázku:', fullPath, e);
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
                    modified: stats.mtime
                };
            }
            return null;
        };
        
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
    <div class="bg-orbs">
        <div class="orb orb-1"></div>
        <div class="orb orb-2"></div>
        <div class="orb orb-3"></div>
    </div>
    <div class="login-container glass-panel">
        <div class="logo-wrap">
            <div class="logo-glow"></div>
            <div class="logo">
                <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
                    <path d="M24 4L6 14v20l18 10 18-10V14L24 4z" stroke="currentColor" stroke-width="1.5" fill="none" opacity="0.3"/>
                    <path d="M24 8L10 16v16l14 8 14-8V16L24 8z" stroke="currentColor" stroke-width="1.5" fill="none" opacity="0.6"/>
                    <path d="M24 12L14 18v12l10 6 10-6V18L24 12z" fill="currentColor" opacity="0.15"/>
                    <circle cx="24" cy="24" r="4" fill="currentColor" opacity="0.8"/>
                </svg>
            </div>
        </div>
        <h1>${this.settings.siteTitle}</h1>
        <p class="subtitle">Enter password to unlock vault</p>
        
        <form id="loginForm" class="login-form">
            <div class="input-group">
                <svg class="input-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                    <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                </svg>
                <input type="password" id="password" placeholder="Password" autocomplete="off" autofocus>
                <button type="button" class="toggle-password" onclick="togglePassword()">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                        <circle cx="12" cy="12" r="3"/>
                    </svg>
                </button>
            </div>
            <button type="submit" id="submitBtn" class="btn-primary">
                <span class="btn-text">Unlock</span>
                <span class="btn-loader hidden"></span>
                <svg class="btn-arrow" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M5 12h14M12 5l7 7-7 7"/>
                </svg>
            </button>
        </form>
        
        <div id="progress" class="progress-container hidden">
            <div class="progress-bar"><div class="progress-fill"></div></div>
            <span class="progress-text">Loading...</span>
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
    <div class="bg-orbs app-bg">
        <div class="orb orb-1"></div>
        <div class="orb orb-2"></div>
        <div class="orb orb-3"></div>
    </div>
    <div id="app">
        <aside class="sidebar glass-sidebar" id="sidebar">
            <div class="sidebar-header">
                <div class="site-title">
                    <svg class="site-logo" width="22" height="22" viewBox="0 0 48 48" fill="none">
                        <path d="M24 8L10 16v16l14 8 14-8V16L24 8z" stroke="currentColor" stroke-width="1.5" fill="none" opacity="0.6"/>
                        <circle cx="24" cy="24" r="4" fill="currentColor" opacity="0.8"/>
                    </svg>
                    <span>${this.settings.siteTitle}</span>
                </div>
                <button class="menu-toggle" onclick="toggleSidebar()">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M18 6L6 18M6 6l12 12"/>
                    </svg>
                </button>
            </div>
            
            <div class="toolbar">
                <div class="search-box">
                    <svg class="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                        <circle cx="11" cy="11" r="8"></circle>
                        <path d="m21 21-4.35-4.35"></path>
                    </svg>
                    <input type="text" id="search" placeholder="Search (Ctrl+K)..." autocomplete="off">
                    <kbd class="search-kbd">K</kbd>
                </div>
                <button onclick="toggleSort()" class="btn-icon" title="Sort">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M11 5h10M11 9h7M11 13h4M3 17l4 4 4-4M7 3v18"/>
                    </svg>
                </button>
            </div>
            
            <div id="sortInfo" class="sort-info hidden">
                <span id="sortLabel">Sort: A-Z</span>
            </div>
            
            <nav id="fileTree" class="file-tree"></nav>
            
            <div class="sidebar-footer">
                <button onclick="logout()" class="btn-secondary">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                        <polyline points="16 17 21 12 16 7"/>
                        <line x1="21" y1="12" x2="9" y2="12"/>
                    </svg>
                    Sign out
                </button>
            </div>
        </aside>
        
        <div class="mobile-header glass-panel">
            <button class="menu-toggle" onclick="toggleSidebar()">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M3 12h18M3 6h18M3 18h18"/>
                </svg>
            </button>
            <span class="mobile-title">${this.settings.siteTitle}</span>
            <button onclick="toggleSort()" class="btn-icon" title="Sort">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M11 5h10M11 9h7M11 13h4M3 17l4 4 4-4M7 3v18"/>
                </svg>
            </button>
        </div>
        
        <main class="content">
            <div class="content-header glass-bar">
                <nav id="breadcrumbs" class="breadcrumbs"></nav>
                <div class="actions">
                    <button onclick="toggleTheme()" class="btn-icon" title="Theme">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                            <circle cx="12" cy="12" r="5"/>
                            <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
                        </svg>
                    </button>
                </div>
            </div>
            
            <article id="pageContent" class="markdown-body">
                <div class="welcome">
                    <div class="welcome-icon">
                        <svg width="64" height="64" viewBox="0 0 48 48" fill="none">
                            <path d="M24 4L6 14v20l18 10 18-10V14L24 4z" stroke="currentColor" stroke-width="1" fill="none" opacity="0.2"/>
                            <path d="M24 8L10 16v16l14 8 14-8V16L24 8z" stroke="currentColor" stroke-width="1" fill="none" opacity="0.4"/>
                            <path d="M24 12L14 18v12l10 6 10-6V18L24 12z" fill="currentColor" opacity="0.1"/>
                            <circle cx="24" cy="24" r="4" fill="currentColor" opacity="0.6"/>
                        </svg>
                    </div>
                    <h1>${this.settings.siteTitle}</h1>
                    <p>Select a note or use search</p>
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
            
            renderFileTree(vaultData.structure, document.getElementById('fileTree'));
            updateSortLabel();
            
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
        
        function renderFileTree(items, container, level = 0) {
            container.innerHTML = '';
            const sorted = sortItems(items);
            
            const ul = document.createElement('ul');
            ul.style.paddingLeft = level > 0 ? '8px' : '0';
            
            sorted.forEach(item => {
                const li = document.createElement('li');
                li.className = item.type;
                
                if (item.type === 'folder') {
                    const hasVisibleChildren = item.children && item.children.length > 0;
                    if (!hasVisibleChildren) return;
                    
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
        
        // NAJDI FOLDER V STRUKTUŘE PODLE CESTY
        function findFolderInStructure(path, items = vaultData.structure) {
            if (!path) return null;
            
            const parts = path.split('/');
            let current = items;
            
            for (const part of parts) {
                const found = current.find(item => item.type === 'folder' && item.name === part);
                if (!found) return null;
                current = found.children;
            }
            
            return { children: current, path: path };
        }
        
        // RENDER OBSAHU FOLDERU
        function renderFolderContent(folderPath) {
            currentPath = folderPath;
            const folderData = findFolderInStructure(folderPath);
            const contentDiv = document.getElementById('pageContent');
            
            if (!folderData) {
                contentDiv.innerHTML = \`<div class="error-page">
                    <h1>⚠</h1>
                    <p>Složka nenalezena: \${folderPath}</p>
                </div>\`;
                return;
            }
            
            // Update breadcrumbs
            const parts = folderPath.split('/');
            document.getElementById('breadcrumbs').innerHTML = parts.map((part, i) => {
                const partPath = parts.slice(0, i + 1).join('/');
                const isLast = i === parts.length - 1;
                return isLast ? \`<span class="current">\${part}</span>\` 
                    : \`<a href="#/folder/\${encodeURIComponent(partPath)}" onclick="navigateToFolder('\${partPath}'); return false;">\${part}</a>\`;
            }).join(' <span class="sep">/</span> ');
            
            // Seřazení položek
            const sorted = sortItems(folderData.children);
            const folders = sorted.filter(i => i.type === 'folder');
            const files = sorted.filter(i => i.type === 'file');
            
            let html = \`<div class="folder-view">
                <h1>📁 \${parts[parts.length - 1]}</h1>
                <div class="folder-stats">\${folders.length} složek, \${files.length} souborů</div>
            \`;
            
            if (sorted.length === 0) {
                html += \`<div class="empty-folder">Tato složka je prázdná</div>\`;
            } else {
                // Podsložky
                if (folders.length > 0) {
                    html += \`<div class="folder-section"><h2>Složky</h2><div class="folder-grid">\`;
                    folders.forEach(folder => {
                        const childCount = folder.children ? folder.children.length : 0;
                        html += \`
                            <a href="#/folder/\${encodeURIComponent(folder.path)}" 
                               onclick="navigateToFolder('\${folder.path}'); return false;"
                               class="folder-card">
                                <span class="folder-icon">📁</span>
                                <span class="folder-name">\${folder.name}</span>
                                <span class="folder-count">\${childCount} položek</span>
                            </a>
                        \`;
                    });
                    html += \`</div></div>\`;
                }
                
                // Soubory
                if (files.length > 0) {
                    html += \`<div class="folder-section"><h2>Soubory</h2><div class="file-list">\`;
                    files.forEach(file => {
                        const icon = getFileIcon(file.extension);
                        const isMd = file.extension === 'md';
                        html += \`
                            <a href="#/note/\${encodeURIComponent(file.path)}" 
                               onclick="loadFile('\${file.path}'); return false;"
                               class="file-row \${isMd ? 'is-md' : ''}">
                                <span class="file-icon">\${icon}</span>
                                <span class="file-name">\${file.name.replace(/\\.md$/i, '')}</span>
                                <span class="file-date">\${formatDate(file.modified)}</span>
                            </a>
                        \`;
                    });
                    html += \`</div></div>\`;
                }
            }
            
            html += \`</div>\`;
            contentDiv.innerHTML = html;
            
            // Odstranit aktivní zvýraznění ze sidebaru
            document.querySelectorAll('.file-link').forEach(a => a.classList.remove('active'));
            
            if (window.innerWidth <= 768) {
                document.getElementById('sidebar').classList.remove('open');
            }
            window.scrollTo(0, 0);
        }
        
        function formatDate(timestamp) {
            if (!timestamp) return '';
            const date = new Date(timestamp);
            return date.toLocaleDateString('cs-CZ', { day: 'numeric', month: 'short', year: 'numeric' });
        }
        
        function navigateToFolder(path) {
            window.location.hash = '#/folder/' + encodeURIComponent(path);
        }
        
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
            const currentFileName = parts[parts.length - 1];
            const parentFolder = parts.length > 1 ? parts.slice(0, -1).join('/') : '';
            
            // Update breadcrumbs - poslední část je soubor (neklikací), předchozí jsou složky
            let breadcrumbsHtml = '';
            if (parentFolder) {
                const parentParts = parentFolder.split('/');
                breadcrumbsHtml = parentParts.map((part, i) => {
                    const partPath = parentParts.slice(0, i + 1).join('/');
                    return \`<a href="#/folder/\${encodeURIComponent(partPath)}" onclick="navigateToFolder('\${partPath}'); return false;">\${part}</a>\`;
                }).join(' <span class="sep">/</span> ');
                breadcrumbsHtml += ' <span class="sep">/</span> ';
            }
            breadcrumbsHtml += \`<span class="current">\${currentFileName.replace(/\\.md$/i, '')}</span>\`;
            document.getElementById('breadcrumbs').innerHTML = breadcrumbsHtml;
            
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
            } else if (hash.startsWith('#/folder/')) {
                renderFolderContent(decodeURIComponent(hash.slice(9)));
            } else if (hash === '' || hash === '#') {
                // Zobrazit welcome page
                document.getElementById('pageContent').innerHTML = \`
                    <div class="welcome">
                        <div class="welcome-icon">◈</div>
                        <h1>\${vaultData.meta.title}</h1>
                        <p>Vyber poznámku v menu nebo použij vyhledávání</p>
                        <div class="stats" id="stats">
                            <span>\${mdFiles} poznámek</span> • <span>\${imgFiles} obrázků</span>
                        </div>
                    </div>
                \`;
                document.getElementById('breadcrumbs').innerHTML = '';
                currentPath = '';
            }
        }
        
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
            
            const info = document.createElement('div');
            info.className = 'search-info';
            info.innerHTML = \`<span>\${results.length} výsledků</span>\`;
            container.insertBefore(info, ul);
        }
        
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
        
        return `/* ============ LIQUID GLASS THEME ============ */
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&display=swap');

:root {
    --primary: ${primary};
    --primary-light: color-mix(in srgb, ${primary} 70%, white);
    --primary-dark: color-mix(in srgb, ${primary} 80%, black);
    --primary-glow: color-mix(in srgb, ${primary} 25%, transparent);
    
    --bg-body: #0a0a0f;
    --bg-primary: rgba(255, 255, 255, 0.03);
    --bg-secondary: rgba(255, 255, 255, 0.04);
    --bg-tertiary: rgba(255, 255, 255, 0.06);
    --bg-hover: rgba(255, 255, 255, 0.08);
    
    --glass-bg: rgba(255, 255, 255, 0.04);
    --glass-border: rgba(255, 255, 255, 0.08);
    --glass-highlight: rgba(255, 255, 255, 0.12);
    --glass-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
    --glass-blur: 20px;
    
    --text-primary: rgba(255, 255, 255, 0.92);
    --text-secondary: rgba(255, 255, 255, 0.65);
    --text-muted: rgba(255, 255, 255, 0.4);
    --text-disabled: rgba(255, 255, 255, 0.2);
    
    --border: rgba(255, 255, 255, 0.06);
    --border-light: rgba(255, 255, 255, 0.04);
    
    --radius-sm: 8px;
    --radius-md: 12px;
    --radius-lg: 20px;
    --radius-xl: 24px;
    
    --sidebar-width: 300px;
    --header-height: 56px;
    
    --ease-out: cubic-bezier(0.16, 1, 0.3, 1);
    --ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1);
}

[data-theme="light"] {
    --bg-body: #e8eaed;
    --bg-primary: rgba(255, 255, 255, 0.5);
    --bg-secondary: rgba(255, 255, 255, 0.4);
    --bg-tertiary: rgba(255, 255, 255, 0.6);
    --bg-hover: rgba(255, 255, 255, 0.7);
    
    --glass-bg: rgba(255, 255, 255, 0.45);
    --glass-border: rgba(255, 255, 255, 0.6);
    --glass-highlight: rgba(255, 255, 255, 0.8);
    --glass-shadow: 0 8px 32px rgba(0, 0, 0, 0.08);
    
    --text-primary: rgba(0, 0, 0, 0.85);
    --text-secondary: rgba(0, 0, 0, 0.6);
    --text-muted: rgba(0, 0, 0, 0.4);
    --text-disabled: rgba(0, 0, 0, 0.2);
    
    --border: rgba(0, 0, 0, 0.06);
    --border-light: rgba(0, 0, 0, 0.04);
}

/* ============ RESET ============ */
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

html {
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    font-size: 15px;
    line-height: 1.6;
    color: var(--text-primary);
    background: var(--bg-body);
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
}

body { overflow-x: hidden; }

/* ============ BACKGROUND ORBS ============ */
.bg-orbs {
    position: fixed;
    inset: 0;
    z-index: 0;
    overflow: hidden;
    pointer-events: none;
}

.orb {
    position: absolute;
    border-radius: 50%;
    filter: blur(100px);
    opacity: 0.35;
    animation: float 20s ease-in-out infinite;
}

.orb-1 {
    width: 500px;
    height: 500px;
    background: var(--primary);
    top: -15%;
    left: -10%;
    animation-delay: 0s;
}

.orb-2 {
    width: 400px;
    height: 400px;
    background: color-mix(in srgb, var(--primary) 60%, #0ea5e9);
    bottom: -10%;
    right: -10%;
    animation-delay: -7s;
}

.orb-3 {
    width: 300px;
    height: 300px;
    background: color-mix(in srgb, var(--primary) 40%, #06b6d4);
    top: 40%;
    left: 50%;
    animation-delay: -14s;
    opacity: 0.2;
}

.app-bg .orb { opacity: 0.15; }

[data-theme="light"] .orb { opacity: 0.2; }
[data-theme="light"] .app-bg .orb { opacity: 0.1; }

@keyframes float {
    0%, 100% { transform: translate(0, 0) scale(1); }
    25% { transform: translate(30px, -40px) scale(1.05); }
    50% { transform: translate(-20px, 20px) scale(0.95); }
    75% { transform: translate(15px, 30px) scale(1.02); }
}

/* ============ GLASS UTILITIES ============ */
.glass-panel {
    background: var(--glass-bg);
    backdrop-filter: blur(var(--glass-blur)) saturate(1.4);
    -webkit-backdrop-filter: blur(var(--glass-blur)) saturate(1.4);
    border: 1px solid var(--glass-border);
    box-shadow: 
        var(--glass-shadow),
        inset 0 1px 0 var(--glass-highlight);
}

.glass-sidebar {
    background: var(--glass-bg);
    backdrop-filter: blur(24px) saturate(1.4);
    -webkit-backdrop-filter: blur(24px) saturate(1.4);
    border-right: 1px solid var(--glass-border);
    box-shadow: 
        4px 0 24px rgba(0, 0, 0, 0.2),
        inset 1px 0 0 var(--glass-highlight);
}

.glass-bar {
    background: var(--glass-bg);
    backdrop-filter: blur(16px) saturate(1.3);
    -webkit-backdrop-filter: blur(16px) saturate(1.3);
    border-bottom: 1px solid var(--glass-border);
}

/* ============ LOGIN ============ */
.login-page {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 100vh;
    padding: 1.5rem;
    position: relative;
}

.login-container {
    border-radius: var(--radius-xl);
    padding: 3rem 2.5rem;
    width: 100%;
    max-width: 380px;
    text-align: center;
    position: relative;
    z-index: 1;
    animation: fadeUp 0.6s var(--ease-out) both;
}

@keyframes fadeUp {
    from { opacity: 0; transform: translateY(20px); }
    to { opacity: 1; transform: translateY(0); }
}

.logo-wrap {
    position: relative;
    display: inline-flex;
    margin-bottom: 1.5rem;
}

.logo-glow {
    position: absolute;
    inset: -20px;
    background: var(--primary);
    border-radius: 50%;
    filter: blur(40px);
    opacity: 0.2;
    animation: pulse 3s ease-in-out infinite;
}

@keyframes pulse {
    0%, 100% { opacity: 0.2; transform: scale(1); }
    50% { opacity: 0.35; transform: scale(1.1); }
}

.logo {
    color: var(--primary);
    position: relative;
    z-index: 1;
}

.login-container h1 {
    font-size: 1.35rem;
    font-weight: 600;
    margin-bottom: 0.35rem;
    color: var(--text-primary);
    letter-spacing: -0.02em;
}

.subtitle {
    color: var(--text-muted);
    margin-bottom: 2rem;
    font-size: 0.875rem;
    font-weight: 400;
}

.input-group {
    position: relative;
    margin-bottom: 1rem;
}

.input-icon {
    position: absolute;
    left: 14px;
    top: 50%;
    transform: translateY(-50%);
    color: var(--text-muted);
    z-index: 1;
    pointer-events: none;
}

.input-group input {
    width: 100%;
    padding: 13px 44px;
    background: var(--bg-tertiary);
    border: 1px solid var(--border);
    border-radius: var(--radius-md);
    color: var(--text-primary);
    font-size: 0.9rem;
    font-family: inherit;
    transition: all 0.25s var(--ease-out);
    outline: none;
}

.input-group input::placeholder {
    color: var(--text-muted);
}

.input-group input:focus {
    border-color: color-mix(in srgb, var(--primary) 50%, transparent);
    box-shadow: 0 0 0 3px var(--primary-glow);
    background: var(--bg-hover);
}

.toggle-password {
    position: absolute;
    right: 6px;
    top: 50%;
    transform: translateY(-50%);
    background: none;
    border: none;
    color: var(--text-muted);
    cursor: pointer;
    padding: 8px;
    border-radius: var(--radius-sm);
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s;
}

.toggle-password:hover {
    color: var(--text-secondary);
    background: var(--bg-hover);
}

/* ============ BUTTONS ============ */
button, .btn-primary {
    padding: 12px 24px;
    background: var(--primary);
    color: white;
    border: none;
    border-radius: var(--radius-md);
    font-size: 0.9rem;
    font-weight: 500;
    font-family: inherit;
    cursor: pointer;
    transition: all 0.25s var(--ease-out);
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    position: relative;
    overflow: hidden;
}

.btn-primary {
    width: 100%;
    padding: 13px 24px;
    box-shadow: 0 4px 16px color-mix(in srgb, var(--primary) 30%, transparent);
}

.btn-primary::before {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(180deg, rgba(255,255,255,0.12) 0%, transparent 50%);
    pointer-events: none;
}

button:hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: 0 6px 20px color-mix(in srgb, var(--primary) 35%, transparent);
}

button:active:not(:disabled) {
    transform: translateY(0);
}

button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
}

.btn-secondary {
    background: var(--glass-bg);
    border: 1px solid var(--glass-border);
    color: var(--text-secondary);
    padding: 10px 16px;
    font-size: 0.8rem;
    width: 100%;
    box-shadow: none;
    backdrop-filter: blur(8px);
}

.btn-secondary:hover:not(:disabled) {
    background: var(--bg-hover);
    border-color: var(--glass-highlight);
    color: var(--text-primary);
    box-shadow: none;
    transform: none;
}

.btn-icon {
    padding: 8px;
    background: transparent;
    border: 1px solid var(--border);
    color: var(--text-muted);
    width: 34px;
    height: 34px;
    flex-shrink: 0;
    box-shadow: none;
    border-radius: var(--radius-sm);
}

.btn-icon:hover:not(:disabled) {
    background: var(--bg-hover);
    color: var(--text-primary);
    border-color: var(--glass-border);
    box-shadow: none;
    transform: none;
}

.btn-arrow { transition: transform 0.2s var(--ease-out); }
.btn-primary:hover .btn-arrow { transform: translateX(3px); }

.btn-loader {
    width: 18px;
    height: 18px;
    border: 2px solid rgba(255,255,255,0.2);
    border-top-color: white;
    border-radius: 50%;
    animation: spin 0.7s linear infinite;
}

@keyframes spin { to { transform: rotate(360deg); } }

.progress-container {
    margin-top: 1.5rem;
}

.progress-bar {
    height: 3px;
    background: var(--bg-tertiary);
    border-radius: 3px;
    overflow: hidden;
}

.progress-fill {
    height: 100%;
    background: linear-gradient(90deg, var(--primary), var(--primary-light));
    transition: width 0.3s var(--ease-out);
    width: 0%;
    border-radius: 3px;
    box-shadow: 0 0 12px var(--primary-glow);
}

.progress-text {
    display: block;
    margin-top: 0.6rem;
    font-size: 0.8rem;
    color: var(--text-muted);
    font-variant-numeric: tabular-nums;
}

.error-message {
    margin-top: 1rem;
    padding: 0.75rem 1rem;
    background: rgba(239, 68, 68, 0.08);
    border: 1px solid rgba(239, 68, 68, 0.2);
    border-radius: var(--radius-md);
    color: #ef4444;
    font-size: 0.825rem;
}

/* ============ APP LAYOUT ============ */
#app {
    display: flex;
    min-height: 100vh;
    position: relative;
    z-index: 1;
}

.sidebar {
    width: var(--sidebar-width);
    display: flex;
    flex-direction: column;
    position: fixed;
    height: 100vh;
    z-index: 100;
    transition: transform 0.4s var(--ease-out);
}

.sidebar-header {
    padding: 0 1rem;
    display: flex;
    align-items: center;
    justify-content: space-between;
    height: var(--header-height);
    border-bottom: 1px solid var(--border);
}

.sidebar-header .menu-toggle {
    display: none;
    background: none;
    border: none;
    color: var(--text-muted);
    padding: 6px;
    box-shadow: none;
}

.site-title {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    font-weight: 600;
    font-size: 0.95rem;
    color: var(--text-primary);
    letter-spacing: -0.01em;
}

.site-logo {
    color: var(--primary);
}

.toolbar {
    padding: 0.75rem;
    display: flex;
    gap: 0.5rem;
    border-bottom: 1px solid var(--border);
}

.search-box {
    position: relative;
    flex: 1;
}

.search-box input {
    width: 100%;
    padding: 9px 40px 9px 36px;
    background: var(--bg-tertiary);
    border: 1px solid var(--border);
    border-radius: var(--radius-md);
    color: var(--text-primary);
    font-size: 0.825rem;
    font-family: inherit;
    transition: all 0.2s var(--ease-out);
    outline: none;
}

.search-box input::placeholder { color: var(--text-muted); }

.search-box input:focus {
    border-color: color-mix(in srgb, var(--primary) 40%, transparent);
    background: var(--bg-hover);
}

.search-icon {
    position: absolute;
    left: 11px;
    top: 50%;
    transform: translateY(-50%);
    width: 15px;
    height: 15px;
    color: var(--text-muted);
    pointer-events: none;
}

.search-kbd {
    position: absolute;
    right: 8px;
    top: 50%;
    transform: translateY(-50%);
    font-size: 0.65rem;
    font-family: inherit;
    color: var(--text-disabled);
    background: var(--bg-secondary);
    border: 1px solid var(--border);
    border-radius: 4px;
    padding: 1px 5px;
    pointer-events: none;
}

.sort-info {
    padding: 0.4rem 0.75rem;
    font-size: 0.7rem;
    color: var(--text-muted);
    background: var(--bg-secondary);
    border-bottom: 1px solid var(--border);
    letter-spacing: 0.03em;
    text-transform: uppercase;
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
    padding: 6px 10px;
    border-radius: var(--radius-sm);
    cursor: pointer;
    color: var(--text-secondary);
    font-size: 0.825rem;
    user-select: none;
    transition: all 0.2s var(--ease-out);
}

.folder-header:hover {
    background: var(--bg-hover);
}

.chevron {
    font-size: 0.6rem;
    width: 12px;
    transition: transform 0.25s var(--ease-out);
    color: var(--text-muted);
}

.folder.expanded .chevron {
    transform: rotate(90deg);
}

.folder-header .count {
    margin-left: auto;
    font-size: 0.7rem;
    color: var(--text-disabled);
    background: var(--bg-tertiary);
    padding: 1px 7px;
    border-radius: 10px;
}

.folder-children {
    overflow: hidden;
    transition: max-height 0.35s var(--ease-out);
}

.folder-children.collapsed {
    max-height: 0;
}

.file-link {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 6px 10px;
    border-radius: var(--radius-sm);
    color: var(--text-muted);
    text-decoration: none;
    font-size: 0.825rem;
    transition: all 0.2s var(--ease-out);
}

.file-link:hover {
    background: var(--bg-hover);
    color: var(--text-primary);
}

.file-link.active {
    background: color-mix(in srgb, var(--primary) 12%, transparent);
    color: var(--primary);
    box-shadow: inset 2px 0 0 var(--primary);
}

.file-link .icon {
    font-size: 0.9rem;
    opacity: 0.7;
    width: 18px;
    text-align: center;
}

.search-result .path {
    font-size: 0.7rem;
    color: var(--text-disabled);
    margin-top: 1px;
}

.no-results, .search-info {
    padding: 1rem;
    text-align: center;
    color: var(--text-muted);
    font-size: 0.825rem;
}

.sidebar-footer {
    padding: 0.75rem;
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
    align-items: center;
    padding: 0 1rem;
    z-index: 99;
    gap: 0.5rem;
}

.mobile-header .menu-toggle {
    background: none;
    border: none;
    color: var(--text-secondary);
    padding: 6px;
    box-shadow: none;
}

.mobile-title {
    font-weight: 600;
    flex: 1;
    font-size: 0.9rem;
    letter-spacing: -0.01em;
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
    padding: 0.75rem 2rem;
    display: flex;
    align-items: center;
    justify-content: space-between;
    z-index: 10;
}

.breadcrumbs {
    font-size: 0.8rem;
    color: var(--text-muted);
    display: flex;
    align-items: center;
    gap: 0.4rem;
    flex-wrap: wrap;
}

.breadcrumbs a {
    color: var(--text-secondary);
    text-decoration: none;
    transition: color 0.2s;
}

.breadcrumbs a:hover {
    color: var(--primary);
}

.breadcrumbs .current {
    color: var(--text-primary);
    font-weight: 500;
}

.breadcrumbs .sep {
    color: var(--text-disabled);
    font-size: 0.7rem;
}

.actions {
    display: flex;
    gap: 0.5rem;
}

#pageContent {
    max-width: 800px;
    margin: 0 auto;
    padding: 2rem;
}

/* ============ MARKDOWN ============ */
.markdown-body {
    font-size: 0.95rem;
    line-height: 1.75;
    color: var(--text-primary);
}

.markdown-body h1, .markdown-body h2, .markdown-body h3, 
.markdown-body h4, .markdown-body h5, .markdown-body h6 {
    margin-top: 2rem;
    margin-bottom: 0.75rem;
    font-weight: 600;
    line-height: 1.3;
    color: var(--text-primary);
    letter-spacing: -0.02em;
}

.markdown-body h1 { 
    font-size: 1.85rem; 
    padding-bottom: 0.6rem; 
    border-bottom: 1px solid var(--border); 
}
.markdown-body h2 { 
    font-size: 1.4rem; 
    padding-bottom: 0.4rem; 
    border-bottom: 1px solid var(--border-light); 
}
.markdown-body h3 { font-size: 1.15rem; }

.markdown-body p {
    margin-bottom: 1rem;
    color: var(--text-secondary);
}

.markdown-body a {
    color: var(--primary);
    text-decoration: none;
    transition: all 0.2s;
}

.markdown-body a:hover {
    text-decoration: underline;
}

.markdown-body a.internal-link {
    color: var(--primary);
    font-weight: 500;
    border-bottom: 1px dashed color-mix(in srgb, var(--primary) 40%, transparent);
    transition: all 0.2s var(--ease-out);
}

.markdown-body a.internal-link:hover {
    background: color-mix(in srgb, var(--primary) 10%, transparent);
    text-decoration: none;
    padding: 2px 6px;
    border-radius: 6px;
    margin: -2px -6px;
    border-bottom-color: transparent;
}

.markdown-body a.internal-link.broken {
    color: #ef4444;
    border-bottom-color: rgba(239, 68, 68, 0.3);
    opacity: 0.6;
    text-decoration: line-through;
}

.markdown-body ul, .markdown-body ol {
    margin-bottom: 1rem;
    padding-left: 1.75rem;
}

.markdown-body li {
    margin: 0.2rem 0;
}

.markdown-body code {
    background: var(--bg-tertiary);
    padding: 0.15em 0.45em;
    border-radius: 6px;
    font-family: 'SF Mono', 'Fira Code', 'JetBrains Mono', Consolas, monospace;
    font-size: 0.85em;
    color: var(--primary-light);
    border: 1px solid var(--border);
}

.markdown-body pre {
    background: var(--glass-bg);
    backdrop-filter: blur(8px);
    padding: 1.25rem;
    border-radius: var(--radius-md);
    overflow-x: auto;
    margin-bottom: 1rem;
    border: 1px solid var(--glass-border);
    box-shadow: inset 0 1px 0 var(--glass-highlight);
}

.markdown-body pre code {
    background: none;
    padding: 0;
    font-size: 0.825rem;
    border: none;
    color: var(--text-primary);
}

.markdown-body blockquote {
    border-left: 3px solid var(--primary);
    padding: 0.75rem 1rem;
    margin: 1rem 0;
    color: var(--text-muted);
    font-style: italic;
    background: var(--bg-secondary);
    border-radius: 0 var(--radius-sm) var(--radius-sm) 0;
}

.markdown-body img {
    max-width: 100%;
    border-radius: var(--radius-md);
    margin: 1rem 0;
}

.markdown-body img.embed-image {
    cursor: zoom-in;
    transition: all 0.3s var(--ease-out);
    border: 1px solid var(--glass-border);
}

.markdown-body img.embed-image:hover {
    transform: scale(1.01);
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
}

.markdown-body table {
    width: 100%;
    border-collapse: collapse;
    margin: 1rem 0;
    border-radius: var(--radius-md);
    overflow: hidden;
}

.markdown-body th, .markdown-body td {
    padding: 0.6rem 0.75rem;
    border: 1px solid var(--border);
    text-align: left;
    font-size: 0.9rem;
}

.markdown-body th {
    background: var(--bg-tertiary);
    font-weight: 600;
    font-size: 0.8rem;
    text-transform: uppercase;
    letter-spacing: 0.03em;
    color: var(--text-muted);
}

.markdown-body tr:nth-child(even) {
    background: var(--bg-secondary);
}

/* Embeds */
.embed-note {
    background: var(--glass-bg);
    backdrop-filter: blur(12px);
    border: 1px solid var(--glass-border);
    border-radius: var(--radius-md);
    padding: 1.25rem;
    margin: 1rem 0;
    border-left: 3px solid var(--primary);
    box-shadow: inset 0 1px 0 var(--glass-highlight);
}

.embed-header {
    font-weight: 600;
    color: var(--primary);
    margin-bottom: 0.5rem;
    font-size: 0.8rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    display: flex;
    align-items: center;
    gap: 0.5rem;
}

.embed-content {
    opacity: 0.75;
    font-size: 0.9rem;
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
    background: linear-gradient(transparent, var(--bg-body));
}

.embed-link {
    display: inline-block;
    margin-top: 0.5rem;
    font-size: 0.825rem;
    font-weight: 500;
}

.embed-error, .broken-image {
    padding: 1rem;
    background: rgba(239, 68, 68, 0.06);
    border: 1px solid rgba(239, 68, 68, 0.15);
    border-radius: var(--radius-md);
    color: #ef4444;
    font-size: 0.825rem;
    margin: 1rem 0;
}

/* Welcome */
.welcome {
    text-align: center;
    padding: 8rem 2rem 4rem;
    color: var(--text-muted);
}

.welcome-icon {
    margin-bottom: 1.5rem;
    color: var(--primary);
    opacity: 0.5;
    animation: pulse 3s ease-in-out infinite;
}

.welcome h1 {
    font-size: 1.75rem;
    margin-bottom: 0.5rem;
    color: var(--text-primary);
    border: none;
    letter-spacing: -0.03em;
    font-weight: 600;
}

.welcome p {
    font-size: 0.9rem;
    color: var(--text-muted);
}

.stats {
    margin-top: 2rem;
    display: flex;
    gap: 0.75rem;
    justify-content: center;
    font-size: 0.8rem;
    color: var(--text-muted);
}

.stats span {
    background: var(--glass-bg);
    backdrop-filter: blur(8px);
    padding: 0.5rem 1.2rem;
    border-radius: var(--radius-md);
    border: 1px solid var(--glass-border);
    box-shadow: inset 0 1px 0 var(--glass-highlight);
}

/* Modal */
.modal {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.85);
    backdrop-filter: blur(12px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    cursor: zoom-out;
    padding: 2rem;
    animation: fadeIn 0.2s ease;
}

@keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
}

.modal img {
    max-width: 92%;
    max-height: 92%;
    object-fit: contain;
    border-radius: var(--radius-lg);
    box-shadow: 0 24px 80px rgba(0, 0, 0, 0.5);
}

/* Error page */
.error-page {
    text-align: center;
    padding: 6rem 2rem;
}

.error-page h1 {
    font-size: 3rem;
    color: var(--primary);
    opacity: 0.4;
    margin-bottom: 1rem;
}

/* Scrollbar */
::-webkit-scrollbar {
    width: 6px;
    height: 6px;
}

::-webkit-scrollbar-track {
    background: transparent;
}

::-webkit-scrollbar-thumb {
    background: var(--bg-hover);
    border-radius: 3px;
}

::-webkit-scrollbar-thumb:hover {
    background: var(--text-disabled);
}

/* ============ FOLDER VIEW ============ */
.folder-view {
    padding: 1rem 0;
}

.folder-view h1 {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    margin-bottom: 0.5rem;
    font-size: 1.5rem;
    letter-spacing: -0.02em;
}

.folder-stats {
    color: var(--text-muted);
    font-size: 0.8rem;
    margin-bottom: 2rem;
    padding-bottom: 1rem;
    border-bottom: 1px solid var(--border);
}

.folder-section {
    margin-bottom: 2rem;
}

.folder-section h2 {
    font-size: 0.75rem;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--text-muted);
    margin-bottom: 0.75rem;
    font-weight: 600;
}

.folder-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
    gap: 0.75rem;
}

.folder-card {
    background: var(--glass-bg);
    backdrop-filter: blur(8px);
    border: 1px solid var(--glass-border);
    border-radius: var(--radius-md);
    padding: 1.25rem 1rem;
    text-decoration: none;
    color: var(--text-primary);
    transition: all 0.25s var(--ease-out);
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    gap: 0.4rem;
    box-shadow: inset 0 1px 0 var(--glass-highlight);
}

.folder-card:hover {
    border-color: color-mix(in srgb, var(--primary) 30%, transparent);
    background: color-mix(in srgb, var(--primary) 6%, var(--glass-bg));
    transform: translateY(-2px);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2), inset 0 1px 0 var(--glass-highlight);
}

.folder-icon {
    font-size: 2rem;
    opacity: 0.8;
}

.folder-name {
    font-weight: 500;
    font-size: 0.875rem;
    word-break: break-word;
}

.folder-count {
    font-size: 0.7rem;
    color: var(--text-muted);
}

.file-list {
    display: flex;
    flex-direction: column;
    gap: 3px;
}

.file-row {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.65rem 1rem;
    background: var(--glass-bg);
    border: 1px solid var(--glass-border);
    border-radius: var(--radius-sm);
    text-decoration: none;
    color: var(--text-secondary);
    transition: all 0.2s var(--ease-out);
}

.file-row:hover {
    background: var(--bg-hover);
    border-color: color-mix(in srgb, var(--primary) 20%, transparent);
    color: var(--text-primary);
}

.file-row.is-md {
    border-left: 2px solid color-mix(in srgb, var(--primary) 50%, transparent);
}

.file-icon {
    font-size: 1.1rem;
    width: 22px;
    text-align: center;
    opacity: 0.7;
}

.file-name {
    flex: 1;
    font-weight: 500;
    font-size: 0.875rem;
}

.file-date {
    font-size: 0.7rem;
    color: var(--text-muted);
    white-space: nowrap;
    font-variant-numeric: tabular-nums;
}

.empty-folder {
    text-align: center;
    padding: 3rem;
    color: var(--text-muted);
    font-style: italic;
    background: var(--glass-bg);
    border-radius: var(--radius-md);
    border: 1px dashed var(--glass-border);
    font-size: 0.9rem;
}

/* Breadcrumbs folder links */
.breadcrumbs a[href^="#/folder/"] {
    color: var(--primary);
    font-weight: 500;
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
    
    .sidebar-header .menu-toggle {
        display: flex;
    }
    
    .mobile-header {
        display: flex;
    }
    
    .content {
        margin-left: 0;
        margin-top: var(--header-height);
    }
    
    .content-header {
        padding: 0.75rem 1rem;
    }
    
    #pageContent {
        padding: 1rem;
    }
    
    .markdown-body h1 { font-size: 1.4rem; }
    .markdown-body h2 { font-size: 1.15rem; }
    
    .stats {
        flex-direction: column;
        gap: 0.5rem;
    }
    
    .welcome {
        padding: 4rem 1.5rem 2rem;
    }
    
    .folder-grid {
        grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
    }
}

/* Selection */
::selection {
    background: color-mix(in srgb, var(--primary) 30%, transparent);
    color: var(--text-primary);
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
