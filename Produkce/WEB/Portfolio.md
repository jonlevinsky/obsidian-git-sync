---
tags: web, produkce
project: Portfolio
pin: true
---
# Portfolio — Jan Levínský

**URL:** https://levinskyj.art  
**Doména:** `levinskyj.art` (GitHub Pages)  
**Repozitář:** `J:\website`

Osobní portfolio kameramana a fotografa **Jana Levínského**. Web je koncipovaný jako filmový pás — každý projekt nese 35mm perforace, rozložení dýchá v bento gridu a přechody připomínají střihy mezi scénami.

---

## Přehled

| Atribut | Hodnota |
|---|---|
| Autor | Jan Levínský |
| Role | Cinematography & Photography |
| Stack | HTML, CSS, JavaScript (vanilla) |
| Hosting | GitHub Pages |
| Doména | levinskyj.art (CNAME) |
| Animace | GSAP + Motion Library |
| Icons | Phosphor Icons |
| Fonty | Bricolage Grotesque, Inter |
| Formulář | Formspree |

---

## Struktura projektu

`J:/website`:

| Soubor / složka | Popis |
|---|---|
| `index.html` | Hlavní portfolio stránka s bento gridem |
| `about.html` | Životopis, vzdělání, dovednosti, vybavení |
| `project.html` | Detail projektu (dynamický — načítá dle `?id=`) |
| `contact.html` | Kontaktní formulář (Formspree) |
| `card.html` | Digitální vizitka |
| `404.html` | Vlastní 404 stránka |
| `style.css` | Sdílené styly |
| `main.js` | Sdílený JS (i18n, perforace, animace, hero split) |
| `projects.json` | Data všech projektů |
| `builder.py` | Lokální editor projektů (localhost:8765) |
| `builder.html` | Frontend pro builder |
| `media/` | Fotky, videa, logo, OG image |
| `fonts/` | Lokální font Bricolage Grotesque |
| `CNAME` | Custom doména pro GitHub Pages |
| `robots.txt` | SEO — povolení indexace |
| `sitemap.xml` | Automaticky generovaná mapa webu |
| `secure-gallery/` | Tajná galerie (šifrované náhledy) |
| `dent&life/` | Web pro zubní laboratoř Dent&Life |
| `gear/` | Know-how k vybavení (Optika, Kamera, Světla, Grip) |

---

## Stránky

### 1. Hlavní stránka (`index.html`)

Bento grid galerie s projekty. Obsahuje:

- **Sidebar** s logem, jménem, krátkým představením, odkazy (Instagram, YouTube, Email)
- **Filter** — All / Photo / Video s animovanou pill-indikací
- **Bento grid** — dlaždice s procedurálně generovanými filmovými perforacemi
- **Film key** — legenda perforací (foto = horizontální, video = vertikální)
- **Footer** — jméno, role, kontakt
- **Ceník** — modal s přehledem cen za služby

![[homepage.png]]

![[homepage-full.png]]

#### Desktop

![[homepage.png]]

#### Mobile

![[homepage-mobile.png]]

#### Filtrování (Video)

![[homepage-filter-video.png]]

### 2. O mně (`about.html`)

Životopis a přehled:

- **Profil** — fotka + text
- **Vzdělání** — SPŠST Panská (2022–2026), Slezská univerzita v Opavě (2026–)
- **Filmografie & Praxe** — časová osa projektů (Za Okny, Zlatý Ámos, Jack Saloon, Tábor Dvojka, Postupy práce)
- **Spolupráce** — Watch Makers, Dent&Life
- **Dovednosti** — cinematografie, postprodukce, fotografie, technické
- **Vybavení** — kamera, objektivy
- **Jazyky** — čeština (rodilý), angličtina (C1)

![[about.png]]

### 3. Detail projektu (`project.html`)

Dynamická stránka načítaná dle `?id=` z URL. Obsahuje:

- **Sidebar** — štáb (crew) a použitá technika (gear)
- **Titulek, meta informace** (typ, rok)
- **Bio** — citátově orámovaný popis projektu
- **Galerie** — dlaždice fotek/videí s perforacemi
- **Video player** — custom player s ovládáním (play/pause, seek, volume, fullscreen, settings, titulky, ambient lighting)
- **Lightbox** — modal pro prohlížení fotek s klávesovými zkratkami

![[project-detail.png]]

### 4. Kontakt (`contact.html`)

Kontaktní formulář napojený na Formspree (`https://formspree.io/f/xleabppd`).

![[contact.png]]

### 5. Digitální vizitka (`card.html`)

Samostatná stránka — digitální business card s filmovými perforacemi, 3D tilt efektem na myš.

![[card.png]]

### 6. 404 (`404.html`)

Vlastní chybová stránka s odkazem zpět na portfolio.

---

## Features

### Filmové perforace

Každá dlaždice v galerii obsahuje procedurálně generované perforace — 35mm filmová okýnka:
- **Fotografie** → horizontální perforace (nahoře/dole)
- **Video** → vertikální perforace (vlevo/vpravo)

Perforace se dynamicky přepočítávají při změně velikosti okna.
Legenda je dostupná po kliknutí na `?` tlačítko v sidebaru.

### Bento Grid

Responzivní grid s dlaždicemi o různých velikostech:
- `normal` — 1×1
- `wide` — 2×1
- `tall` — 1×2
- `large` — 2×2

Při filtrování dochází k plynulé animaci přeskupení pomocí GSAP Flip.

### Animace

- **GSAP** — scroll-triggerované animace, flip pro filtrování
- **Motion Library** — jemné mikrointerakce (hero titulky, filter pill, film key)
- **prefers-reduced-motion** — plná podpora

### Responzivita

Breakpointy: 1024px, 880px, 640px, 480px, 400px.
Hamburger menu na mobilu, sidebar na desktopu.

### i18n (Internationalization)

Automatický překlad do angličtiny pro návštěvníky mimo ČR.
Detekce dle `navigator.language`.

### LQIP (Low Quality Image Placeholders)

Blur-up technika — nejdříve se zobrazí rozmazaná nízko-resolution verze, poté se překryje ostrým obrázkem.

### Video Player

Custom video player s:
- Play/Pause (Space, K)
- Seek (šipky ±5s, J/L ±10s)
- Volume (šipky nahoru/dolu, M mute)
- Fullscreen (F)
- Nastavení rychlosti a kvality
- Titulky (VTT)
- Ambient lighting (A)
- Klávesové zkratky

### SEO

- Open Graph meta tagy (og:image, og:title, etc.)
- Twitter Cards
- Sitemap.xml
- Robots.txt
- Kanonické URL
- Resolve case-insensitive path (fallback pro špatně napsané cesty)

---

## Projekty

Aktuálně 5 projektů v `projects.json`:

| # | Název | Typ | Rok | Layout |
|---|---|---|---|---|
| 1 | Postupy práce | video | 2026 | wide |
| 2 | Spot (Jack Saloon) | video | 2025 | normal |
| 3 | Španělsko | photo | 2025 | tall |
| 4 | Za Okny | video | 2024 | normal |
| 5 | Portraits | photo | 2026 | tall |

---

## Vývoj

### Lokální vývoj

```bash
# Python server pro main web
cd J:/website
python -m http.server 8000

# Builder (editor projektů)
python builder.py
# Otevře http://localhost:8765
```

### Builder

Aplikace v `builder.py` + `builder.html` poskytuje:

- **Seznam projektů** — drag & drop řazení
- **Formulář** — editace všech polí (title, type, year, layout, bio, media, gear, crew)
- **Media management** — upload, drag & drop řazení, LQIP generace, thumbnail
- **Gear editor** — výběr z inventáře, ruční přidání
- **Crew editor** — přidání rolí a jmen
- **Validace** — duplicitní ID, chybějící pole, nefunkční cesty
- **Preview** — náhled projektu včetně bento gridu
- **Bulk operace** — hromadné mazání, duplikování, změna roku, přidání gearu
- **Force WebP** — konverze všech obrázků na WebP
- **Normalizace názvů** — přejmenování souborů dle jednotného formátu
- **Sitemap generátor**
- **Deploy** — git add, commit, push na GitHub Pages
- **OG Image generátor**
- **Undo/Redo**

### Deploy

Manuální deploy tlačítkem v builderu (git push na GitHub Pages).
Doména `levinskyj.art` je nastavena v `CNAME`.

---

## Screenshots

| Screenshot | Popis |
|---|---|
| ![[homepage.png]] | Hlavní stránka — desktop |
| ![[homepage-full.png]] | Hlavní stránka — celá délka |
| ![[homepage-mobile.png]] | Hlavní stránka — mobilní pohled |
| ![[homepage-filter-video.png]] | Hlavní stránka — filtrování videa |
| ![[about.png]] | O mně stránka |
| ![[project-detail.png]] | Detail projektu |
| ![[contact.png]] | Kontaktní stránka |
| ![[card.png]] | Digitální vizitka |

---

## Odkazy

- **Web:** https://levinskyj.art
- **Instagram:** https://www.instagram.com/levinskyj.cine/
- **YouTube:** https://www.youtube.com/@LevinskyJ
- **Email:** levinskyj.cine@gmail.com
- **Builder:** http://localhost:8765
