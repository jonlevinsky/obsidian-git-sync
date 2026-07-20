# 📖 Dokumentace vaultu

## Struktura složek

```
├── Homepage.md              ← Hlavní dashboard (DataviewJS)
├── Inbox/                   ← Rychlé záchytné poznámky (quick-capture)
├── Život/                   ← Osobní deníky a logy
│   ├── Život.md             ← MOC + mood chart
│   └── Log/YYYY/MM/         ← Denní logy (formát DD.MM.YYYY.md)
├── Film & Foto/             ← Filmové projekty
│   ├── Film & Foto.md       ← MOC (DataviewJS přehled)
│   └── {Projekt}/           ← Projektová složka
├── Škola/                   ← Školní předměty (PANSKÁ)
│   ├── Škola.md             ← MOC (DataviewJS přehled)
│   └── PANSKÁ/{Předmět}/    ← Předmět s lekcemi
├── Produkce/                ← Klientská práce a technika
│   ├── Produkce.md          ← MOC (DataviewJS přehled)
│   ├── Technika/            ← Přehled vybavení
│   └── {Projekt}/           ← Aktivní/archivované projekty
└── System/                  ← Systémové soubory
    ├── Tasks.md             ← Agregátor úkolů
    └── Templates/           ← Templater šablony
```

## Frontmatter konvence

### Projekt (MOC soubor složky)
```yaml
type: project
project: Název projektu
project_tags: [tag1, tag2]    # tagy pro přiřazení souborů k projektu
status: active|archived|completed
```

### Denní log
```yaml
created: YYYY-MM-DD
device: LevinskyJ Desktop|Samsung phone|Surface
tags: [log, Život]
project: log
mood: good|ok|normal|tired|bad    # volitelné
```

### Quick-capture (Inbox)
```yaml
created: YYYY-MM-DD
source: quick-capture
tags: [inbox]
status: unread|read
```

## Tagovací konvence

| Oblast | Tagy |
|--------|------|
| Film | `#filmy`, `#kratasy`, `#novy_rad`, `#metro`, `#cordyceps`, `#postup_prace` |
| Škola | `#skola`, `#maturita`, `#spsst-panska` |
| Předměty | `#vu` (výtv. umění), `#fu` (film. umění), `#to` (tech. obrazu), `#tz` (tech. zvuku), `#duf` |
| Produkce | `#produkce`, `#dentlife`, `#web`, `#technika` |
| Systém | `#log`, `#Život`, `#inbox`, `#system` |

## Workflow

### Nový projekt
1. Vytvoř složku v příslušné sekci
2. Vytvoř MOC soubor (`Název.md`) s frontmatterem:
   - `type: project`, `status: active`, `project: Název`, `project_tags: [tag]`
3. Další soubory v projektu automaticky inheritnou přiřazení přes tagy

### Denní log
- Použij Templater šablonu `Log.md` (automaticky vytvoří soubor ve správné složce)
- Nebo použij Quick Capture na Homepage (LOG mód)
- Mood se nastavuje přes mood picker na Homepage nebo ručně v frontmatter

### Rychlá poznámka
- Použij Quick Capture na Homepage (INBOX mód)
- Nebo Templater `Quick-draft-log.md` pro strukturovaný draft

### Nová poznámka
- Použij Templater `Full note.md` — vybereš kategorii, automaticky přesune a otaguje

## Klávesové zkratky
- `Ctrl+U` — Obsidian Git commit & push
- Quick Capture na Homepage — LOG/INBOX mód

## Pluginy
- **Dataview** — dotazování do poznámek (klíčový pro dashboard a MOC)
- **Templater** — pokročilé šablony s proměnnými
- **Obsidian Tasks** — task management
- **Obsidian Git** — verzování vaultu
- **Homepage** — nastavuje Homepage.md jako start page
- **Folder Notes** — propojení složky s MOC souborem
