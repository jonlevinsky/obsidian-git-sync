# 🚀 RYCHLÝ START - Context Cards Plugin

Vítej! Tohle je kompletní Obsidian plugin, kterej ti ukáže souvislosti mezi poznámkami automaticky při psaní.

## ⚡ Instalace za 3 minuty

### 1. Zkopíruj tyto 3 soubory:
```
main.js
manifest.json  
styles.css
```

### 2. Vlož je do:
```
tvůj-vault/.obsidian/plugins/context-cards/
```

### 3. Aktivuj plugin:
- Obsidian → Settings → Community plugins
- Najdi "Context Cards"
- Zapni ho

### 4. Otevři panel:
- Klikni na ikonu vrstev (layers) vlevo
- Nebo použij Command Palette: "Open Context Cards"

## ✨ Co plugin dělá

Při psaní automaticky najde a zobrazí:
- 🔗 Poznámky, které zmiňuješ (wikilinky)
- 🏷️ Poznámky se stejnými tagy
- 📅 Poznámky ze stejného období
- 🧠 Sémanticky podobné poznámky

## 🎯 Příklad použití

Píšeš poznámku:
```markdown
Dnes jsem pracoval na [[projekt ABC]]. Potřebuji dodělat 
#design a projít si předchozí #meeting poznámky.
```

Plugin ti automaticky ukáže karty s:
- Poznámkou "projekt ABC"
- Jinými poznámkami s tagem #design
- Jinými poznámkami s tagem #meeting
- Poznámkami, co mají podobná klíčová slova

## ⚙️ Nastavení

**Enable auto-scan**: Automatické skenování při psaní (doporučeno: ON)

**Max context cards**: Kolik karet max zobrazit (doporučeno: 5)

**Minimum match score**: Jak moc musí být poznámka relevantní (doporučeno: 0.3)
- Nižší číslo = víc karet (i méně relevantních)
- Vyšší číslo = míň karet (jen velmi relevantní)

## 💡 Tipy

1. **První spuštění**: Zkus otevřít poznámku, kde už máš nějaké wikilinky
2. **Experimentuj**: Zkus různá nastavení "Minimum match score"
3. **Linkuj víc**: Čím víc používáš [[wikilinky]], tím lepší kontext
4. **Používej tagy**: Konzistentní používání tagů pomáhá najít souvislosti

## 🐛 Problémy?

**Panel se neotevírá**: Zkus Command Palette (Ctrl/Cmd+P) → "Open Context Cards"

**Žádné karty**: 
- Zkontroluj "Enable auto-scan" v nastavení
- Sniž "Minimum match score" na 0.2
- Ujisti se, že máš v poznámce nějaké linky nebo tagy

**Plugin nefunguje**: 
- Zkontroluj, že máš všechny 3 soubory
- Zkus restartovat Obsidian
- Otevři DevTools (Ctrl/Cmd+Shift+I) a koukni na chyby

## 📁 Struktura souborů

```
vault/
└── .obsidian/
    └── plugins/
        └── context-cards/
            ├── main.js          ← Hlavní kód
            ├── manifest.json    ← Metadata
            └── styles.css       ← Vzhled
```

## 🎨 Jak to vypadá

Karty mají:
- **Ikonu** podle typu souvislosti (🔗 link, 🏷️ tag, 📅 datum, 🧠 sémantika)
- **Název** poznámky (klikatelný)
- **Kontext** - ukázka relevantního textu z poznámky
- **Skóre** - barevná lišta ukazuje jak moc je poznámka relevantní

---

**Hotovo!** Teď jen začni psát a karty se objeví samy 🎉

Pro víc info koukni do README.md nebo INSTALACE.md
