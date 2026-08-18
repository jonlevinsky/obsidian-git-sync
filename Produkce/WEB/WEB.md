---
tags:
  - produkce
  - web
type: project
project: Portfolio
project_tags: web
status: active
description: Osobní web levinskyj.art + Secure Gallery
---

# Web — Přehled

**URL:** https://levinskyj.art  
**Repozitář:** `J:\website`

---

## Portfolio — Jan Levínský

Osobní portfolio kameramana a fotografa. Koncipované jako filmový pás — 35mm perforace, bento grid, GSAP animace.

| Atribut | Hodnota |
|---|---|
| Stack | HTML, CSS, JS (vanilla) |
| Hosting | GitHub Pages |
| Doména | levinskyj.art |
| Animace | GSAP + Motion Library |
| Icons | Phosphor Icons |
| Fonty | Bricolage Grotesque, Inter |

### Stránky

| Stránka | Popis |
|---|---|
| `index.html` | Bento grid galerie, filter All/Photo/Video, ceník |
| `about.html` | Životopis, vzdělání, filmografie, dovednosti, vybavení |
| `project.html` | Detail projektu dle `?id=`, gear, crew, lightbox |
| `contact.html` | Formspree kontaktní formulář |
| `card.html` | Digitální vizitka s 3D tilt efektem |
| `404.html` | Vlastní chybová stránka |

### Projekty

| # | Název | Typ | Rok | Layout |
|---|---|---|---|---|
| 1 | Postupy práce | video | 2026 | wide |
| 2 | Spot (Jack Saloon) | video | 2025 | normal |
| 3 | Španělsko | photo | 2025 | tall |
| 4 | Za Okny | video | 2024 | normal |
| 5 | Portraits | photo | 2026 | tall |

### Features

- **Filmové perforace** — procedurální 35mm okýnka (horizontální pro foto, vertikální pro video)
- **Bento Grid** — normal/wide/tall/large, GSAP Flip při filtrování
- **GSAP + Motion** — scroll-triggered animace, mikrointerakce
- **Responzivita** — breakpointy 1024–400px, hamburger menu
- **i18n** — auto-překlad do EN dle `navigator.language`
- **LQIP** — blur-up placeholders
- **Video Player** — custom ovládání, speed, titulky, ambient lighting
- **SEO** — OG/Twitter tags, sitemap, robots.txt, schema.org

### Vývoj

```bash
python -m http.server 8000              # lokální server
python builder.py                        # editor projektů :8765
```

Builder: správa projektů, media, gear, crew, validace, force WebP, generátor sitemap, deploy.

---

## Secure Gallery

Sada šifrovaných klientských galerií s PBKDF2 ochranou (600k iterací).

| Atribut | Hodnota |
|---|---|
| Šifrování | PBKDF2 + AES |
| Formát | `.enc` (thumb `_t`, full `_f`) |
| Fonty | Bricolage Grotesque, Inter, Cormorant Garamond |
| Video | Dešifrování za běhu, blob URL |

### Galerie

| Galerie | Položek | Velikost |
|---|---|---|
| Balabenka / 9.A | 63 fotek | 4.8 GB |
| Balabenka / 9.B | 82 fotek | 6.1 GB |
| Balabenka / 9.C | 74 fotek | 5.5 GB |
| Kristián & Viktor | 20 fotek | ~1.5 GB |

### Features

- **Lock screen** — heslo + PBKDF2, rate limiting, auto-lock 2 min
- **Grid** — masonry, skeleton loading, badge typu, download indikátor
- **Lightbox** — fullscreen, swipe, dot navigation s tooltip
- **Video Player** — custom, s decrypt overlay
- **Výběr + stažení** — multi-select, ZIP download
- **Theme toggle** — dark/light, Material You tokens
- **Animated icons** — ItsHover styl (rotate, scale, translate)
- **Klávesové zkratky** — Escape, šipky, K/Space, M, F, ?

---

## Screenshoty

| Soubor | Popis |
|---|---|
| `![[homepage.webp]]` | Portfolio — desktop |
| `![[homepage-full.webp]]` | Portfolio — celá délka |
| `![[homepage-mobile.webp]]` | Portfolio — mobil |
| `![[homepage-filter-video.webp]]` | Portfolio — filtr video |
| `![[about.webp]]` | O mně |
| `![[project-detail.webp]]` | Detail projektu |
| `![[contact.webp]]` | Kontakt |
| `![[card.webp]]` | Vizitka |

> Secure Gallery screenshoty nejsou k dispozici — obsah je šifrovaný.

---

## Odkazy

- **Portfolio:** https://levinskyj.art
- **Builder:** http://localhost:8765
- **Instagram:** https://www.instagram.com/levinskyj.cine/
- **YouTube:** https://www.youtube.com/@LevinskyJ
- **Email:** levinskyj.cine@gmail.com
