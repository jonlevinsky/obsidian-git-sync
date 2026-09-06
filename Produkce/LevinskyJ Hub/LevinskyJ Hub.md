---
tags:
  - produkce
  - levinskyj-hub
  - android
  - supabase
type: project
project: LevinskyJ Hub
project_tags: levinskyj-hub
status: active
description: Osobní Android životní hub a dashboard s Bento Grid UI napojený na Supabase API
---

# LevinskyJ Hub (Android App)

Osobní mobilní aplikace pro Android (Jetpack Compose), fungující jako rozcestník a osobní životní hub pro správu financí, nákupů, úkolů a profilu.

---

## Přehled

| Atribut | Hodnota |
| --- | --- |
| **Platforma** | Android (Kotlin + Jetpack Compose) |
| **Architektura** | Bento Grid UI ("Levinskyj Premium Dark Glass") |
| **Backend / API** | Supabase REST API (`https://bkgfohfmnbmascomaozv.supabase.co`) |
| **Offline Cache** | SharedPreferences (`levinskyj_supabase_cache`) |
| **Vault Sync** | Android SAF DocumentFile (`j:/obsidian-git-sync`) |
| **Status** | Active / Production Build (`app-release.apk`) |

---

## Log Vývoje

### 🗓️ 06. 09. 2026 – Bento Redesign, Supabase Profil, Personal API & Lokální Notifikace

> **Hlavní změny:**
> 1. **Bento Grid Homepage**:
>    - Převržen UI design na čistou Bento Grid rozcestníkovou plochu s dláždicemi: Profil, Finance, Nákupy, Úkoly, Nastavení.
> 2. **Odstranění spodní navigační lišty**:
>    - Spodní navigační panel (`bottomBar`) byl kompletně odstraněn. Navigace je 100% řízena z Bento rozcestníku. Všechny pod-obrazovky získaly horní tlačítko **Zpět** (`ArrowBack`).
> 3. **Supabase Personal API Endpoints**:
>    - Vytvořena databázová schémata a importní skripty pro `projects` (Projekty z Obsidianu) a `movies` (79 položek filmů, seriálů a watchlistu).
> 4. **Lokální notifikace a připomínka**:
>    - Implementován systém lokálních notifikací (`NotificationHelper`, `NotificationChannel`, `ReminderReceiver`).
>    - Přidána podpora pro Android 13+ permission request (`POST_NOTIFICATIONS`).
>    - V **Nastavení** přidána nová karta **Oznámení & Připomínky** s možností odeslání testovací notifikace a přepínačem pro denní ranní připomínku (09:00).
> 5. **Kalendář & Projekce Opakovaných Událostí**:
>    - Rozšířena nová obrazovka **Kalendáře** (`CalendarScreen.kt`, `CalendarViewModel`, `CalendarEvent`).
>    - Přidána podpora pro:
>      - **Dynamické projektování opakovaných událostí** (`occursOnDate` pro denní, týdenní, měsíční a roční chytré zobrazení v mřížce i seznamu dní).
>      - **Místo konání** (GPS / Adresa)
>      - **Barevné rozlišení** (5 tématických barevných odstínů: Zlatá, Smaragdová, Modrá, Rubínová, Fialová)
>      - **Opakování událostí** (Žádné, Denně, Týdně, Měsíčně, Ročně)
>      - **Časované Připomínky** (V čas události, 15 min, 1 hod, 1 den předem)
>      - **Štítky / Tagy** (např. `#osobní`, `#práce`, `#projekt`)
>    - Integrována dláždice Kalendáře na Bento Grid plochu a rozšířen Supabase REST API endpoint `events`.
> 6. **Clean Release Sestavení**:
>    - Úspěšně zkompilován a podepsán výstupní APK balíček (`app-release.apk`).

---

## Supabase Schema & API Endpoints

```sql
-- Tabulka pro uživatelský profil (user_profile)
CREATE TABLE IF NOT EXISTS public.user_profile (
    id bigint PRIMARY KEY DEFAULT 1,
    name text DEFAULT 'Jonáš Levinský',
    tagline text DEFAULT 'Creator & Developer',
    bio text DEFAULT 'Osobní zápisník a hub pro správu financí, úkolů a nákupů.',
    email text DEFAULT '',
    phone text DEFAULT '',
    location text DEFAULT 'Česká republika',
    website text DEFAULT '',
    github text DEFAULT '',
    motto text DEFAULT 'Work hard, stay humble.',
    skills text DEFAULT 'Kotlin, Jetpack Compose, Supabase, Android',
    avatar_url text DEFAULT '',
    updated_at text DEFAULT ''
);

ALTER TABLE public.user_profile ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anon all" ON public.user_profile
    FOR ALL TO anon USING (true) WITH CHECK (true);
```

---

## Zdroje & Soubory projektu

- `J:/projects/levinskyj-app-android/app/src/main/java/com/levinskyj/app/MainActivity.kt`
- `J:/projects/levinskyj-app-android/app/src/main/java/com/levinskyj/app/ui/screens/HomeScreen.kt`
- `J:/projects/levinskyj-app-android/app/src/main/java/com/levinskyj/app/ui/screens/ProfileScreen.kt`
- `J:/projects/levinskyj-app-android/app/src/main/java/com/levinskyj/app/data/SupabaseRepository.kt`
- `J:/projects/levinskyj-app-android/app/build/outputs/apk/release/app-release.apk`
