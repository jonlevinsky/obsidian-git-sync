# Jak nainstalovat Context Cards plugin

## Rychlá instalace (bez buildu)

Pokud nechceš řešit npm a building, můžeš použít prebuilt verzi:

### Krok 1: Příprava souborů

Potřebuješ tyto 3 soubory:
- `main.js` (zkompilovaný TypeScript kód)
- `manifest.json` (metadata pluginu)
- `styles.css` (styly pro UI)

**Poznámka**: Soubor `main.js` musíš vytvořit buildem nebo si ho stáhnout z release verze. Níže je návod, jak to udělat.

### Krok 2: Umístění do Obsidianu

1. Otevři svůj Obsidian vault
2. Najdi složku `.obsidian/plugins/` (je to skrytá složka)
3. Vytvoř novou složku `.obsidian/plugins/context-cards/`
4. Zkopíruj do ní tyto 3 soubory:
   - `main.js`
   - `manifest.json`
   - `styles.css`

### Krok 3: Aktivace pluginu

1. Otevři Obsidian
2. Jdi do Settings → Community plugins
3. Klikni na "Reload plugins" nebo restartuj Obsidian
4. Najdi "Context Cards" v seznamu pluginů
5. Aktivuj ho přepínačem

### Krok 4: První spuštění

1. Měla by se ti objevit ikona vrstev (layers) v levém ribbonu
2. Klikni na ni pro otevření Context Cards panelu
3. Otevři nějakou poznámku a začni psát
4. V panelu se ti začnou objevovat relevantní karty!

## Build ze zdrojáků (pokročilé)

Pokud chceš plugin buildnout sám:

### Prerekvizity

- Node.js (doporučuji verzi 16 nebo novější)
- npm (přichází s Node.js)

### Postup

```bash
# 1. Přejdi do složky s pluginem
cd obsidian-context-cards

# 2. Nainstaluj dependencies
npm install

# 3. Build plugin
npm run build

# 4. Soubory jsou připravené
# main.js bude vytvořen v root složce
# Zkopíruj main.js, manifest.json a styles.css do .obsidian/plugins/context-cards/
```

## Řešení problémů

### Plugin se nezobrazuje v seznamu

- Zkontroluj, že máš všechny 3 soubory ve správné složce
- Ujisti se, že složka má přesně název `context-cards`
- Zkus restartovat Obsidian

### Panel se neotevírá

- Zkontroluj, že je plugin aktivovaný v nastavení
- Zkus použít command palette (Ctrl/Cmd + P) a hledat "Open Context Cards"

### Karty se nezobrazují

- Ujisti se, že máš zapnutý "Enable auto-scan" v nastavení pluginu
- Zkus psát poznámku, která obsahuje wikilinky na jiné poznámky
- Zkontroluj "Minimum match score" - zkus ho nastavit nižší (např. 0.2)

### Plugin nefunguje vůbec

- Otevři DevTools (Ctrl/Cmd + Shift + I) a zkontroluj Console tab
- Pokud vidíš chyby, pravděpodobně chybí `main.js` nebo je špatně zkompilovaný

## Tipy pro optimální použití

1. **První spuštění**: Otevři některou ze svých existujících poznámek, která má linky na jiné poznámky
2. **Experimentuj s nastavením**: Nastav si citlivost (min match score) podle toho, kolik karet chceš vidět
3. **Používej konzistentně tagy**: Plugin najde podobné poznámky podle tagů
4. **Linkuj přirozeně**: Čím víc používáš wikilinky, tím lepší kontext dostaneš

## Co dělat dál

Po instalaci můžeš:
- Nastavit si počet zobrazených karet (1-10)
- Upravit citlivost detekce (0.1-0.9)
- Experimentovat s různými poznámkami
- Dát feedback nebo nahlásit bug

---

Hodně štěstí s používáním! 🚀
