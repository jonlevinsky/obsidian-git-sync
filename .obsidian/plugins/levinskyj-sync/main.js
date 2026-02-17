// main.js
const { Plugin, PluginSettingTab, Setting, Notice } = require('obsidian');
const { exec } = require('child_process');
const util = require('util');

const execPromise = util.promisify(exec);

const DEFAULT_SETTINGS = {
    repoUrl: '',
    branch: 'main',
    syncInterval: 30,
    autoSyncOnStartup: true,
    commitMessage: 'Vault update',
    authorName: 'Obsidian User',
    authorEmail: 'user@example.com',
    githubToken: ''
};

class GitSyncPlugin extends Plugin {
    constructor() {
        super(...arguments);
        this.syncIntervalId = null;
        this.isSyncing = false;
    }

    async onload() {
        await this.loadSettings();

        this.addRibbonIcon('download', 'Git Pull Now', () => {
            this.performPull();
        });

        this.addRibbonIcon('upload', 'Git Push Now', () => {
            this.performPush();
        });

        this.addCommand({
            id: 'git-pull-now',
            name: 'Pull Now (Download)',
            callback: () => {
                this.performPull();
            }
        });

        this.addCommand({
            id: 'git-push-now',
            name: 'Push Now (Upload)',
            callback: () => {
                this.performPush();
            }
        });

        this.addSettingTab(new GitSyncSettingTab(this.app, this));

        if (this.settings.autoSyncOnStartup && this.settings.repoUrl) {
            setTimeout(() => {
                this.performPull();
            }, 3000);
        }

        this.setupPeriodicPush();
    }

    onunload() {
        this.clearPeriodicPush();
    }

    async loadSettings() {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    }

    async saveSettings() {
        await this.saveData(this.settings);
        this.setupPeriodicPush();
    }

    setupPeriodicPush() {
        this.clearPeriodicPush();
        
        if (this.settings.syncInterval > 0 && this.settings.repoUrl) {
            const intervalMs = this.settings.syncInterval * 60 * 1000;
            this.syncIntervalId = window.setInterval(() => {
                this.performPush();
            }, intervalMs);
        }
    }

    clearPeriodicPush() {
        if (this.syncIntervalId !== null) {
            window.clearInterval(this.syncIntervalId);
            this.syncIntervalId = null;
        }
    }

    // Opravená cesta pro Windows - použijeme fileSystemPath
    getVaultPath() {
        // Pro Windows musíme použít fileSystemPath místo basePath
        const adapter = this.app.vault.adapter;
        if (adapter.fileSystemPath) {
            return adapter.fileSystemPath;
        }
        if (adapter.basePath) {
            return adapter.basePath;
        }
        if (adapter.path) {
            return adapter.path;
        }
        // Fallback - zkusíme získat z vault name
        return this.app.vault.getName();
    }

    getAuthenticatedUrl() {
        if (!this.settings.githubToken) {
            return this.settings.repoUrl;
        }
        
        const url = this.settings.repoUrl;
        if (url.startsWith('https://github.com/')) {
            return url.replace('https://', `https://${this.settings.githubToken}@`);
        }
        return url;
    }

    async isGitInitialized(vaultPath) {
        try {
            await execPromise(`cd /d "${vaultPath}" && git rev-parse --git-dir`, { windowsHide: true });
            return true;
        } catch {
            return false;
        }
    }

    async initGitRepo(vaultPath) {
        if (!this.settings.repoUrl) {
            throw new Error('Repository URL not configured');
        }

        new Notice('Initializing git repository...');

        // Windows-friendly příkazy - bez || true, použijeme IF
        const commands = [
            `cd /d "${vaultPath}"`,
            'git init',
            `git config user.name "${this.settings.authorName}"`,
            `git config user.email "${this.settings.authorEmail}"`,
            `git remote add origin ${this.settings.repoUrl}`,
            // Vytvoření .gitignore - Windows verze
            'echo .obsidian/workspace.json > .gitignore',
            'echo .obsidian/graph.json >> .gitignore',
            'echo .obsidian/plugins/git-auto-sync/data.json >> .gitignore',
            'git add .gitignore',
            // Windows: git commit s ignorováním chyby když není co commitnout
            'git commit -m "Initial commit" 2>nul || exit 0'
        ];

        await execPromise(commands.join(' && '), { windowsHide: true });
        new Notice('Git repository initialized');
    }

    async performPull() {
        if (this.isSyncing) {
            new Notice('Sync already in progress...');
            return;
        }

        if (!this.settings.repoUrl) {
            new Notice('Git repository URL not configured!');
            return;
        }

        this.isSyncing = true;
        const vaultPath = this.getVaultPath();

        try {
            // Debug log
            console.log('Vault path:', vaultPath);

            const isInitialized = await this.isGitInitialized(vaultPath);
            if (!isInitialized) {
                await this.initGitRepo(vaultPath);
            }

            new Notice('Pulling from GitHub...');

            const authUrl = this.getAuthenticatedUrl();
            
            // Windows-friendly příkazy
            const commands = [
                `cd /d "${vaultPath}"`,
                `git remote set-url origin ${authUrl}`,
                'git config pull.rebase false',
                // Pull s ignorováním chyby "already up to date"
                `git pull origin ${this.settings.branch} --allow-unrelated-histories 2>&1`,
                `git remote set-url origin ${this.settings.repoUrl}`
            ];

            const { stdout, stderr } = await execPromise(commands.join(' && '), {
                timeout: 60000,
                maxBuffer: 1024 * 1024,
                windowsHide: true
            });

            console.log('Git pull output:', stdout);
            if (stderr) console.log('Git pull stderr:', stderr);

            if (stdout.includes('Already up to date') || stdout.includes('up to date')) {
                new Notice('Already up to date');
            } else {
                new Notice('Pull completed! Vault updated.');
            }
        } catch (error) {
            console.error('Git pull error:', error);
            // Cleanup
            try {
                await execPromise(`cd /d "${vaultPath}" && git remote set-url origin ${this.settings.repoUrl}`, { windowsHide: true });
            } catch (e) { /* ignore */ }
            
            new Notice(`Pull failed: ${error.message}`, 5000);
        } finally {
            this.isSyncing = false;
        }
    }

    async performPush() {
        if (this.isSyncing) {
            new Notice('Sync already in progress...');
            return;
        }

        if (!this.settings.repoUrl) {
            new Notice('Git repository URL not configured!');
            return;
        }

        this.isSyncing = true;
        const vaultPath = this.getVaultPath();

        try {
            const isInitialized = await this.isGitInitialized(vaultPath);
            if (!isInitialized) {
                await this.initGitRepo(vaultPath);
            }

            new Notice('Pushing to GitHub...');

            const authUrl = this.getAuthenticatedUrl();
            const timestamp = new Date().toLocaleString();

            // Windows-friendly příkazy
            const commands = [
                `cd /d "${vaultPath}"`,
                `git config user.name "${this.settings.authorName}"`,
                `git config user.email "${this.settings.authorEmail}"`,
                'git add -A',
                // Commit pouze pokud jsou změny - Windows verze
                'git diff --cached --quiet || git commit -m "' + this.settings.commitMessage + ' [' + timestamp + ']"',
                `git remote set-url origin ${authUrl}`,
                `git push origin ${this.settings.branch}`,
                `git remote set-url origin ${this.settings.repoUrl}`
            ];

            const { stdout, stderr } = await execPromise(commands.join(' && '), {
                timeout: 60000,
                maxBuffer: 1024 * 1024,
                windowsHide: true
            });

            console.log('Git push output:', stdout);
            if (stderr) console.log('Git push stderr:', stderr);

            if (stdout.includes('nothing to commit') || (stderr && stderr.includes('nothing to commit'))) {
                new Notice('Nothing to push - no changes');
            } else {
                new Notice('Push completed! Changes uploaded.');
            }
        } catch (error) {
            console.error('Git push error:', error);
            try {
                await execPromise(`cd /d "${vaultPath}" && git remote set-url origin ${this.settings.repoUrl}`, { windowsHide: true });
            } catch (e) { /* ignore */ }
            
            if (error.message.includes('rejected')) {
                new Notice('Push rejected - pull first to get latest changes', 5000);
            } else {
                new Notice(`Push failed: ${error.message}`, 5000);
            }
        } finally {
            this.isSyncing = false;
        }
    }
}

class GitSyncSettingTab extends PluginSettingTab {
    constructor(app, plugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display() {
        const { containerEl } = this;

        containerEl.empty();
        
        containerEl.createEl('h2', { text: 'Git Sync Settings' });
        
        const infoDiv = containerEl.createDiv();
        infoDiv.style.backgroundColor = 'var(--background-modifier-form-field)';
        infoDiv.style.padding = '10px';
        infoDiv.style.borderRadius = '5px';
        infoDiv.style.marginBottom = '20px';
        infoDiv.innerHTML = `
            <strong>How it works:</strong><br>
            • <strong>Startup:</strong> Pull (download changes)<br>
            • <strong>Every ${this.plugin.settings.syncInterval} min:</strong> Push (commit & upload)<br>
            <br>
            <strong>First time:</strong> Plugin will auto-initialize git repo
        `;

        // Zobrazení cesty pro debug
        new Setting(containerEl)
            .setName('Vault Path (Debug)')
            .setDesc('Detected vault path - if this is wrong, plugin won\'t work')
            .addText(text => {
                text.setValue(this.plugin.getVaultPath());
                text.inputEl.disabled = true;
                text.inputEl.style.width = '300px';
            });

        // Repo URL
        new Setting(containerEl)
            .setName('Repository URL')
            .setDesc('GitHub repository URL (HTTPS)')
            .addText(text => {
                text.setPlaceholder('https://github.com/username/repo.git');
                text.setValue(this.plugin.settings.repoUrl);
                text.onChange(async (value) => {
                    this.plugin.settings.repoUrl = value;
                    await this.plugin.saveSettings();
                });
                text.inputEl.style.width = '300px';
            });

        // GitHub Token
        new Setting(containerEl)
            .setName('GitHub Personal Access Token')
            .setDesc('Token with repo scope. Required for private repos.')
            .addText(text => {
                text.setPlaceholder('ghp_xxxxxxxxxxxx');
                text.setValue(this.plugin.settings.githubToken);
                text.onChange(async (value) => {
                    this.plugin.settings.githubToken = value;
                    await this.plugin.saveSettings();
                });
                text.inputEl.type = 'password';
                text.inputEl.style.width = '300px';
            });

        // Branch
        new Setting(containerEl)
            .setName('Branch')
            .setDesc('Git branch to sync with')
            .addText(text => {
                text.setPlaceholder('main');
                text.setValue(this.plugin.settings.branch);
                text.onChange(async (value) => {
                    this.plugin.settings.branch = value || 'main';
                    await this.plugin.saveSettings();
                });
            });

        // Sync Interval
        new Setting(containerEl)
            .setName('Push Interval')
            .setDesc('Auto-push interval in minutes (0 = disabled)')
            .addSlider(slider => slider
                .setLimits(0, 120, 5)
                .setValue(this.plugin.settings.syncInterval)
                .setDynamicTooltip()
                .onChange(async (value) => {
                    this.plugin.settings.syncInterval = value;
                    await this.plugin.saveSettings();
                    this.display();
                }))
            .addExtraButton(button => button
                .setIcon('reset')
                .setTooltip('Reset to 30 min')
                .onClick(async () => {
                    this.plugin.settings.syncInterval = 30;
                    await this.plugin.saveSettings();
                    this.display();
                }));

        // Auto sync on startup
        new Setting(containerEl)
            .setName('Pull on Startup')
            .setDesc('Automatically pull when Obsidian starts')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.autoSyncOnStartup)
                .onChange(async (value) => {
                    this.plugin.settings.autoSyncOnStartup = value;
                    await this.plugin.saveSettings();
                }));

        // Commit Message
        new Setting(containerEl)
            .setName('Commit Message')
            .setDesc('Commit message prefix')
            .addText(text => {
                text.setPlaceholder('Vault update');
                text.setValue(this.plugin.settings.commitMessage);
                text.onChange(async (value) => {
                    this.plugin.settings.commitMessage = value;
                    await this.plugin.saveSettings();
                });
            });

        // Author Name
        new Setting(containerEl)
            .setName('Git Author Name')
            .setDesc('Name for git commits')
            .addText(text => {
                text.setPlaceholder('Obsidian User');
                text.setValue(this.plugin.settings.authorName);
                text.onChange(async (value) => {
                    this.plugin.settings.authorName = value;
                    await this.plugin.saveSettings();
                });
            });

        // Author Email
        new Setting(containerEl)
            .setName('Git Author Email')
            .setDesc('Email for git commits')
            .addText(text => {
                text.setPlaceholder('user@example.com');
                text.setValue(this.plugin.settings.authorEmail);
                text.onChange(async (value) => {
                    this.plugin.settings.authorEmail = value;
                    await this.plugin.saveSettings();
                });
            });

        // Manual buttons
        containerEl.createEl('h3', { text: 'Manual Actions' });
        
        const buttonContainer = containerEl.createDiv();
        buttonContainer.style.display = 'flex';
        buttonContainer.style.gap = '10px';
        buttonContainer.style.marginTop = '10px';

        const pullBtn = buttonContainer.createEl('button', { text: 'Pull Now (Download)' });
        pullBtn.className = 'mod-cta';
        pullBtn.onclick = () => {
            this.plugin.performPull();
        };

        const pushBtn = buttonContainer.createEl('button', { text: 'Push Now (Upload)' });
        pushBtn.className = 'mod-warning';
        pushBtn.onclick = () => {
            this.plugin.performPush();
        };

        // Token help
        containerEl.createEl('h3', { text: 'How to get GitHub Token' });
        const helpText = containerEl.createEl('div');
        helpText.innerHTML = `
            <ol style="padding-left: 20px; line-height: 1.6;">
                <li>GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic)</li>
                <li>Click "Generate new token (classic)"</li>
                <li>Select scope: <code>repo</code></li>
                <li>Copy token (starts with <code>ghp_</code>)</li>
            </ol>
        `;
    }
}

module.exports = GitSyncPlugin;