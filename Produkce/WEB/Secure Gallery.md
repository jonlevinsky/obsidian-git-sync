---
tags: web, produkce, secure-gallery
project: Secure Gallery
pin: true
---
# Secure Gallery — Šifrované klientské galerie

**Umístění:** `J:\website\secure-gallery`  
**Součást:** https://levinskyj.art (či samostatný deployment)

Sada samostatných statických galerií chráněných **PBKDF2 šifrováním**. Každá galerie je separátní složka s vlastním `index.html`, `manifest.json` a šifrovanými soubory. Určeno pro bezpečné sdílení fotek a videí s klienty.

---

## Přehled

| Atribut | Hodnota |
|---|---|
| Autor | Jan Levínský |
| Stack | HTML, CSS, JavaScript (vanilla) |
| Šifrování | PBKDF2 (600k iterací) |
| Media | AES-šifrované .enc soubory |
| Fonty | Bricolage Grotesque, Inter, Cormorant Garamond |
| Grid | Masonry-style responzivní grid |
| Video | Custom player s dešifrováním za běhu |

---

## Struktura

```
secure-gallery/
├── Balabenka/
│   ├── 9.A/
│   │   ├── index.html       # Galerie třídy 9.A (63 fotek)
│   │   ├── manifest.json    # Metadata + salt + iterace
│   │   └── files/           # Šifrované *.enc soubory
│   ├── 9.B/                 # Galerie 9.B (82 fotek)
│   └── 9.C/                 # Galerie 9.C (74 fotek)
└── Kristian&Viktor/
    ├── index.html           # Galerie (20 fotek)
    ├── manifest.json
    └── files/
```

### Manifest (`manifest.json`)

```json
{
  "version": 1,
  "title": "Kristián & Viktor",
  "salt": "45efad197bcb14b58b7bb55c7f0a199f...",
  "iterations": 600000,
  "count": 20,
  "items": [
    {
      "id": "b7bd5b0d6b27",
      "type": "image",
      "name": "20260703_Kristián&Viktor_1.JPG",
      "ext": "jpg",
      "thumb": "files/b7bd5b0d6b27_t.enc",
      "full": "files/b7bd5b0d6b27_f.enc",
      "size": 1589346,
      "width": 4498,
      "height": 2999
    }
  ]
}
```

---

## Galerie

### Balabenka — Školní galerie

3 třídy (9.A, 9.B, 9.C) — celkem **219 fotek** ze školní akce (25. 6. 2026).

| Třída | Počet | Velikost | Dominantní orientace |
|---|---|---|---|
| 9.A | 63 | 4.8 GB | mix (4000×6000 / 6000×4000) |
| 9.B | 82 | 6.1 GB | mix (4000×6000 / 6000×4000) |
| 9.C | 74 | 5.5 GB | mix (3517×5276 / 5276×3517) |

Téma: dark mode (zlatý akcent `#c4956a` na tmavě šedém pozadí), font Cormorant Garamond pro titulky.

### Kristián & Viktor

20 fotek z natáčení/focení ze dne 3. 7. 2026. Mix portrétů a krajin.

Téma: light mode (zlatý akcent `#8b6914` na krémovém pozadí).

---

## Features

### Lock Screen (Zámek)

- Heslo + jméno (nepovinné)
- PBKDF2 odvození klíče (600k iterací, SHA-256)
- Toggle zobrazení hesla (oko)
- Rate limiting (3 pokusy, poté cooldown)
- Chybová hláška
- Automatické uzamčení po nečinnosti

### Grid galerie

- Responzivní masonry grid (`auto-fill, minmax(280px, 1fr)`)
- Auto-orientace dlaždic (portrait = 2 řádky, landscape = 1)
- Skeleton loading (shimmer animace)
- Badge typu (foto/video) v levém horním rohu
- Overlay s názvem souboru při hoveru
- Download indikátor (stažené soubory)

### Filtrování

Material You chipy: All / Fotografie / Videa

### Lightbox

- Fullscreen prohlížení
- Šipková navigace (klávesy, tlačítka)
- Swipe gesta (touch)
- Tečková navigace s náhledy (tooltip)
- Progress bar (při načítání videa)
- Escape pro zavření

### Video Player

Custom player s:
- Play/Pause (K, Space, klik)
- Seek (šipky, progress bar)
- Volume slider (hover-to-reveal)
- Speed menu (0.5× – 2×)
- Decrypt overlay (probíhá dešifrování)
- Big play button
- Klávesové zkratky

### Výběr a stažení

- Select mode (tlačítko "Vybrat")
- Multi-select s vizuální indikací
- Výběrová lišta dole s počtem a tlačítkem "Stáhnout vybrané"
- Hromadné stažení jako ZIP

### Dark/Light režim

- Theme toggle (měsíček/slunce)
- Material You design tokens
- Přepínání pomocí `data-theme` atributu
- Uložení preference do localStorage

### Auto-lock

- Po 2 minutách nečinnosti se galerie automaticky uzamkne
- Animovaný přechod s lock ikonou

### Klávesové zkratky

| Klávesa | Akce |
|---|---|
| Escape | Zavřít lightbox / zamknout |
| Šipky ← → | Předchozí / Další |
| K / Space | Play / Pause |
| M | Mute |
| F | Fullscreen |
| ? | Help overlay |

### Help overlay

Modální okno se všemi klávesovými zkratkami.

### Animated Icons (ItsHover styl)

Všechny ikony mají jemné hover animace:
- Lock icon → rotate -10° + scale
- Download → translateY
- Play → scale + glow
- Close → rotate 90°
- Arrow → translateX
- Theme toggle → rotate 15°

### Responzivita

Breakpointy: 768px, 380px. Mobilní grid s menšími dlaždicemi, upravený lightbox.

---

## Šifrování

Soubory jsou šifrovány pomocí **PBKDF2** (Password-Based Key Derivation Function 2):

1. **Klíč** je odvozen z hesla + saltu (600k iterací)
2. **Thumbnaily** (`*_t.enc`) — malé náhledy do gridu
3. **Full** (`*_f.enc`) — plné rozlišení pro lightbox/download
4. **Videa** — dešifrována za běhu a streamována přes blob URL

Šifrování probíhá mimo tuto aplikaci (pomocí externího nástroje).

---

## Screenshoty

> Screenshoty nejsou k dispozici — galerie je chráněna heslem a média jsou šifrovaná.

---

## Odkazy

- **Galerie:** https://levinskyj.art/secure-gallery/{nazev}/
- **Portfolio autora:** https://levinskyj.art
