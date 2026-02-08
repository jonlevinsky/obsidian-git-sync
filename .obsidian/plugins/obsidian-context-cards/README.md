# Context Cards - Obsidian Plugin

Automaticky zobrazuje relevantní kontextový karty založené na tom, co právě píšeš v Obsidianu. Plugin ti pomáhá odhalit souvislosti mezi poznámkami bez nutnosti všechno manuálně linkovat.

## ✨ Funkce

- **Automatické skenování**: Při psaní se automaticky hledají relevantní poznámky
- **Chytrá detekce**: Rozpoznává wikilinky, tagy, data a semantické souvislosti
- **Vizuální karty**: Pěkně zobrazené kontextové karty v postranním panelu
- **Skóre relevance**: Vidíš, jak moc je která poznámka relevantní
- **Klikatelné odkazy**: Jednoduchý přístup k souvisejícím poznámkám

## 🚀 Instalace

### Manuální instalace

1. Stáhni si `main.js`, `manifest.json` a `styles.css`
2. Vytvoř složku `.obsidian/plugins/context-cards/` ve svém vaultu
3. Zkopíruj stažené soubory do této složky
4. Otevři Obsidian a v nastavení aktivuj plugin "Context Cards"

### Build ze zdrojáků

```bash
# Naklonuj nebo stáhni repozitář
cd obsidian-context-cards

# Nainstaluj dependencies
npm install

# Build
npm run build
```

## 📖 Jak to používat

1. **Otevři Context Cards panel**: Klikni na ikonu vrstev (layers) v levém ribbonu nebo použij příkaz "Open Context Cards"

2. **Piš poznámky normálně**: Plugin automaticky skenuje tvůj text při psaní

3. **Prohlížej si souvislosti**: V postranním panelu se objeví karty s relevantními poznámkami

4. **Klikni na kartu**: Otevře se příslušná poznámka

## 🎯 Co plugin rozpoznává

- **Wikilinky**: `[[název poznámky]]` - najde poznámky, které zmiňuješ
- **Tagy**: `#projekt #důležité` - najde poznámky se stejnými tagy
- **Data**: `2024-01-15` - najde poznámky ze stejného období
- **Backlinky**: Poznámky, které odkazují na aktuální soubor
- **Klíčová slova**: Semantická podobnost na základě společných slov

## ⚙️ Nastavení

### Základní nastavení

- **Enable auto-scan**: Zapni/vypni automatické skenování při psaní
- **Max context cards**: Kolik karet max zobrazit (1-10)
- **Minimum match score**: Jak vysoké skóre musí poznámka mít, aby se zobrazila (0.1-0.9)

### AI funkce (připravované)

- **Enable AI context**: Použití AI pro chytřejší rozpoznání souvislostí
- **API Key**: Tvůj Anthropic API klíč pro AI funkce

## 🎨 Typy karet

Plugin rozlišuje různé typy souvislostí:

- 🔗 **Link**: Přímá zmínka v aktuální poznámce
- 🏷️ **Tag**: Společné tagy
- 📅 **Date**: Společná data
- 🧠 **Semantic**: Sémantická podobnost (klíčová slova)

## 💡 Tipy pro použití

1. **Používej wikilinky**: Čím víc linkuješ, tím lepší kontext dostaneš
2. **Taguj konzistentně**: Stejné tagy pomáhají najít podobné poznámky
3. **Piš přirozeně**: Plugin rozpozná i nepřímé souvislosti
4. **Nastav si citlivost**: Experimentuj s "Minimum match score" pro optimální výsledky

## 🔧 Technické detaily

Plugin analyzuje:
- Přímé odkazy (wikilinky) - vysoké skóre (0.5)
- Společné tagy - střední skóre (0.3)
- Backlinky - vysoké skóre (0.4)
- Zmínky v textu - nižší skóre (0.2)
- Překryv klíčových slov - postupné skóre (0.05 per slovo, max 0.3)

## 🐛 Známé problémy

- Plugin zatím nepoužívá AI pro sémantickou analýzu (to je připravované)
- Při velmi velkých vaultech (1000+ poznámek) může být skenování pomalejší

## 🚧 Plánované funkce

- [ ] AI-powered sémantická analýza
- [ ] Cache pro rychlejší skenování
- [ ] Filtry podle typu karet
- [ ] Export souvislostí do grafu
- [ ] Možnost ignorovat určité složky

## 📝 Licence

MIT

## 🤝 Příspěvky

Návrhy, bugreporty a pull requesty jsou vítány!

---

Vytvořeno s ❤️ pro lepší práci s poznámkami v Obsidianu
