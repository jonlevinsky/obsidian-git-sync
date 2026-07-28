---
tags: web, produkce, dentlife
project: Dent&Life
pin: true
---
# Dent&Life — Dentální laboratoř

**URL:** https://laborator-dentlife.cz  
**Doména:** `laborator-dentlife.cz`  
**Repozitář:** `J:\website\dent&life`

Webová prezentace **dentální laboratoře Dent&Life** s pobočkami v Benešově a Praze. Specializuje se na fixní a snímatelnou protetiku, metalokeramiku, celokeramiku a implantátové práce.

---

## Přehled

| Atribut | Hodnota |
|---|---|
| Klient | Dent&Life s.r.o. |
| Typ | Firemní web (one-page) |
| Stack | HTML, CSS, JavaScript (vanilla) |
| Hosting | GitHub Pages |
| Doména | laborator-dentlife.cz |
| Fonty | Bricolage Grotesque, Poppins |
| Ikonky | Vlastní PNG/SVG |
| Formulář | mailto odkaz |
| Mapy | Google Maps iframe |
| SEO | Schema.org (Dentist, MedicalBusiness, VideoObject) |

---

## Struktura projektu

`J:/website/dent&life`:

| Soubor / složka | Popis |
|---|---|
| `index.html` | Hlavní one-page web (všechny sekce) — 3633 řádků |
| `admin.html` | Administrace recenzí (heslo: `admin`) |
| `dentlife_data.json` | Data pro sekce Vybavení a Reference |
| `equipment_manager.py` | Tkinter GUI editor vybavení a referencí |
| `test.html` | Testovací HTML fragment referencí |
| `data/config.json` | Konfigurace (maintenance mode) |
| `data/reviews.json` | Recenze zákazníků |
| `data/reviews.xml` | XML export recenzí |
| `files/res/` | Obrázky, loga, SVG, videa |
| `files/res/reference/` | Fotky referenčních prací (ref-01 až ref-05) |
| `files/res/video/` | Hero video (hero.mp4, hero-mobile.mp4, poster) |
| `files/res/svg/` | SVG varianty loga (light/dark, stacked) |
| `.vscode/settings.json` | Nastavení editoru |

---

## Stránka

Kompletní one-page web s následujícími sekcemi:

### 1. Hero sekce

- **Video pozadí** — autoplay hero video s přepínáním desktop/mobil
- **Overlay** — gradient + blur pro čitelnost textu
- **Gradient mesh** — animovaná barevná vlákna na pozadí
- **Nadpis** — "Preciznost v **každém detailu**"
- **CTA tlačítka** — "Objevte naše služby" / "Kontaktujte nás"
- **Scroll indikátor** — s bounce animací

![[dentlife-hero.png]]

### 2. Služby (`#sluzby`)

Tři službové karty s ikonkami:

- **Fixní protetika** — metalokeramika, celokeramika, implantátové náhrady
- **Snímatelná protetika** — celkové/částečné protézy, zásuvné spoje, Deflex
- **Individuální přístup** — osobní konzultace, výběr barvy, asistence v ordinaci

![[dentlife-services.png]]

### 3. O nás (`#o-nas`)

- **Prokládaný obrázek** — cross-fade mezi dvěma fotkami ordinace (10s interval)
- **Badge** — "15+ let zkušeností"
- **Materiály** — Ivoclar Vivadent, Amann Girrbach, Renfert, KaVo

![[dentlife-about.png]]

### 4. Reference (`#reference`)

Bento grid se 4 referenčními fotografiemi. Kliknutím se otevře **gallery modal** s fullscreen prohlížením, navigací (šipky, swipe) a vodoznakem.

![[dentlife-references.png]]

### 5. Pobočky (`#pobocky`)

Dvě lokality: Benešov (Máchova 2328) a Praha (Poliklinika Litochleby). Kliknutím na kartu se otevře **map modal** s Google Maps iframe.

![[dentlife-locations.png]]

### 6. Vybavení (`#vybaveni`)

4 technologie ze `dentlife_data.json`: 3D skener, CAD/CAM, keramická pec, stereomikroskop.

### 7. Kontakt (`#kontakt`)

CTA sekce s tlačítky: email (`dentlife@email.cz`), telefon (`+420 608 547 489`).

![[dentlife-contact.png]]

### 8. Footer

Logo, navigace, adresy, copyright s creditem "Jan Levínský pro Dent&Life".

### Mobile

![[dentlife-mobile.png]]

---

## Features

### Responzivita

Breakpointy: 1024px, 768px, 640px. Header přechází z transparentního na bílý (blur) při scrollu. Mobilní hamburger menu.

### Animace

- **Intersection Observer** — staggered reveal sekcí a karet (120ms zpoždění)
- **Cross-fade obrázků** — v About sekci (10s interval)
- **Custom scrollbar** — vlastní scroll thumb s drag & drop
- **Hover efekty** — karty (translate, shadow, icon color)
- **prefers-reduced-motion** — plná podpora

### Gallery Modal

Fullscreen prohlížení referencí, navigace šipkami a swipe, klávesové zkratky, vodoznak.

### Map Modal

Google Maps iframe, focus trap, tlačítko "Navigovat".

### SEO

Schema.org (Dentist, MedicalBusiness, VideoObject, WebSite, WebPage, ImageObject), Open Graph, Twitter Cards, geo tagy.

### Maintenance mode

Přes `data/config.json`. Při aktivaci se zobrazí custom zpráva.

### Image handling

Shimmer loading, lazy loading, error fallback placeholder.

---

## Administrace recenzí (`admin.html`)

Samostatná stránka chráněná heslem (`admin`):

- Přidání/editace recenzí (jméno, role, text, 1-5★, fotka)
- Přehled recenzí s JSON exportem/importem
- Statistiky (počet, průměr, počet 5★)
- Maintenance mode toggle
- Storage: localStorage + PHP backend fallback

### Data (`data/reviews.json`)

| Jméno | Role | ★ |
|---|---|---|
| Květuše Hornová | Zákaznice, Praha | 4.5 |
| Sirstiplak | Zákazník, Praha | 5 |
| Jan Levínský | Test | 5 |

---

## Editor vybavení (`equipment_manager.py`)

Tkinter GUI pro správu `dentlife_data.json`:

- Drag & drop řazení položek
- Inject HTML přímo do `index.html`
- Auto-save do JSON

### Vybavení

| # | Název | Klíčové vlastnosti |
|---|---|---|
| 01 | CAD/CAM systém | 5-osé frézování, Exocad |
| 02 | Keramická pec | Ivoclar, programovatelné křivky |
| 03 | Stereomikroskop | 40× zvětšení, LED |
| 04 | 3D skener | 5 µm rozlišení |

### Reference

| Index | Název | Soubor |
|---|---|---|
| 0 | Metalokeramické korunky | `ref-01.jpg` |
| 1 | Celokeramické můstky | `ref-02.jpg` |
| 2 | Implantátové práce | `ref-03.jpg` |
| 3 | Snímatelné protézy | `ref-04.jpg` |

---

## Screenshoty

| Screenshot | Popis |
|---|---|
| ![[dentlife-hero.png]] | Hero sekce |
| ![[dentlife-services.png]] | Služby |
| ![[dentlife-about.png]] | O nás |
| ![[dentlife-references.png]] | Reference |
| ![[dentlife-locations.png]] | Pobočky |
| ![[dentlife-contact.png]] | Kontakt |
| ![[dentlife-mobile.png]] | Mobil |
| ![[dentlife-full.png]] | Celá stránka |

---

## Odkazy

- **Web:** https://laborator-dentlife.cz
- **Admin:** https://laborator-dentlife.cz/admin.html
- **Email:** dentlife@email.cz
- **Telefon:** +420 608 547 489 (Praha), +420 723 159 128 (Benešov)
- **Portfolio autora:** https://levinskyj.art
