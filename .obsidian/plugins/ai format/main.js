const { Plugin, Notice, PluginSettingTab, Setting } = require('obsidian');

const DEFAULT_SETTINGS = {
	apiKey: ''
}

module.exports = class GeminiFormatterPlugin extends Plugin {
	async onload() {
		await this.loadSettings();

		// Příkaz pro strukturování textu
		this.addCommand({
			id: 'format-with-gemini',
			name: 'Strukturovat text pomocí Gemini AI',
			editorCallback: (editor, view) => {
				this.formatTextWithGemini(editor);
			}
		});

		// NOVÝ PŘÍKAZ: Generování skrytých otázek a odpovědí
		this.addCommand({
			id: 'generate-hidden-qa',
			name: 'Generovat skryté otázky a odpovědi pomocí Gemini AI',
			editorCallback: (editor, view) => {
				this.generateHiddenQA(editor);
			}
		});

		// Přidání settings tab
		this.addSettingTab(new GeminiFormatterSettingTab(this.app, this));
	}

	async formatTextWithGemini(editor) {
		if (!this.settings.apiKey) {
			new Notice('Prosím nastavte Gemini API klíč v nastavení pluginu');
			return;
		}

		const selectedText = editor.getSelection();
		
		if (!selectedText) {
			new Notice('Prosím vyberte text, který chcete formátovat');
			return;
		}

		new Notice('Strukturuji text pomocí Gemini AI...');

		try {
			const formattedText = await this.callGeminiAPI(selectedText);
			editor.replaceSelection(formattedText);
			new Notice('Text byl úspěšně strukturován!');
		} catch (error) {
			new Notice('Chyba při komunikaci s Gemini AI: ' + error.message);
			console.error('Gemini API error:', error);
		}
	}

	// NOVÁ FUNKCE: Generování skrytých otázek a odpovědí
	async generateHiddenQA(editor) {
		if (!this.settings.apiKey) {
			new Notice('Prosím nastavte Gemini API klíč v nastavení pluginu');
			return;
		}

		const selectedText = editor.getSelection();
		
		if (!selectedText) {
			new Notice('Prosím vyberte text, na který chcete vygenerovat otázky');
			return;
		}

		new Notice('Generuji otázky a odpovědi...');

		try {
			const qaContent = await this.callGeminiQA(selectedText);
			
			// Najdeme konec výběru a vložíme tam otázky
			const cursor = editor.getCursor('to');
			editor.replaceRange(qaContent, cursor);
			
			new Notice('Otázky a odpovědi byly přidány!');
		} catch (error) {
			new Notice('Chyba při generování otázek: ' + error.message);
			console.error('Gemini QA error:', error);
		}
	}

	async callGeminiAPI(text) {
		const prompt = `Tvým úkolem je převést následující text do VELMI STRUKTUROVANÉHO Markdown formátu. Buď agresivní se strukturováním!

PRAVIDLA:
1. Rozděl text do logických sekcí s nadpisy (#, ##, ###)
2. MAXIMÁLNĚ využívej odrážkové seznamy (- ) pro jakékoliv výčty, body, či související informace
3. Používej číslované seznamy (1. 2. 3.) pro postupy, kroky, pořadí
4. Zvýrazni **tučně** všechny klíčové pojmy a důležitá slova
5. Použij *kurzívu* pro terminologii nebo zdůraznění
6. Pro citace použij > 
7. Pro kód použij \`inline\` nebo \`\`\`bloky\`\`\`
8. Pokud má text 3+ související věci, VŽDY udělej z toho seznam s odrážkami
9. Dlouhé odstavce rozděl na kratší s podnadpisy

DŮLEŽITÉ: Preferuj seznamy před dlouhými odstavci. Strukturuj co nejvíc!

Text k formátování:
${text}

Vrať pouze čistý Markdown, bez vysvětlování.`;

		const response = await fetch(
			'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent',
			{
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'x-goog-api-key': this.settings.apiKey
				},
				body: JSON.stringify({
					contents: [{
						parts: [{
							text: prompt
						}]
					}],
					generationConfig: {
						temperature: 0.4,
						maxOutputTokens: 8192,
					}
				})
			}
		);

		if (!response.ok) {
			const errorData = await response.json();
			throw new Error(errorData.error?.message || 'Neznámá chyba API');
		}

		const data = await response.json();
		
		if (!data.candidates || !data.candidates[0]?.content?.parts?.[0]?.text) {
			throw new Error('Neplatná odpověď z Gemini API');
		}

		let formattedText = data.candidates[0].content.parts[0].text;
		
		// Odstranění případných markdown code bloků kolem odpovědi
		formattedText = formattedText.replace(/^```markdown\n/, '').replace(/\n```$/, '');
		formattedText = formattedText.replace(/^```\n/, '').replace(/\n```$/, '');
		
		return formattedText.trim();
	}

	// NOVÁ FUNKCE: Volání Gemini API pro otázky a odpovědi
	async callGeminiQA(text) {
		const prompt = `Na základě následujícího textu vygeneruj soubor otázek a odpovědí ke každému bodu textu, které pokrývají klíčové informace z textu. 

Formát každé dvojice MUSÍ být přesně:
Q:: [otázka]
A:: [odpověď]

DŮLEŽITÉ:
- Každá otázka musí začínat "Q:: "
- Každá odpověď musí začínat "A:: "
- Otázky by měly testovat porozumění hlavním konceptům
- Odpovědi by měly být stručné v heslech (inline), ale úplné
- Nepoužívej žádné stylizace, pouze čistý text
- Každá otázka by měla být spojena s konkrétním bodem nebo informací z textu
- Nepoužívej žádné nadpisy, komentáře ani vysvětlení
- Vrať pouze seznam otázek a odpovědí ve formátu Q:: / A::

Text:
${text}`;

		const response = await fetch(
			'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent',
			{
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'x-goog-api-key': this.settings.apiKey
				},
				body: JSON.stringify({
					contents: [{
						parts: [{
							text: prompt
						}]
					}],
					generationConfig: {
						temperature: 0.7,
						maxOutputTokens: 4096,
					}
				})
			}
		);

		if (!response.ok) {
			const errorData = await response.json();
			throw new Error(errorData.error?.message || 'Neznámá chyba API');
		}

		const data = await response.json();
		
		if (!data.candidates || !data.candidates[0]?.content?.parts?.[0]?.text) {
			throw new Error('Neplatná odpověď z Gemini API');
		}

		let qaText = data.candidates[0].content.parts[0].text;
		
		// Odstranění případných markdown code bloků
		qaText = qaText.replace(/^```markdown\n/, '').replace(/\n```$/, '');
		qaText = qaText.replace(/^```\n/, '').replace(/\n```$/, '');
		
		// Zabalení do skrytého HTML elementu
		return `\n\n<p style="display:none">\n${qaText.trim()}\n</p>`;
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}

class GeminiFormatterSettingTab extends PluginSettingTab {
	constructor(app, plugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display() {
		const {containerEl} = this;

		containerEl.empty();

		containerEl.createEl('h2', {text: 'Nastavení Gemini Formatter'});

		new Setting(containerEl)
			.setName('Gemini API klíč')
			.setDesc('Váš API klíč z Google AI Studio (https://makersuite.google.com/app/apikey)')
			.addText(text => text
				.setPlaceholder('Zadejte API klíč')
				.setValue(this.plugin.settings.apiKey)
				.onChange(async (value) => {
					this.plugin.settings.apiKey = value;
					await this.plugin.saveSettings();
				}));

		containerEl.createEl('p', {
			text: 'Pro získání API klíče navštivte Google AI Studio a vytvořte nový API klíč.',
			cls: 'setting-item-description'
		});
	}
}