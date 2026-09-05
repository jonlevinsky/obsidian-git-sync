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

### 🗓️ 06. 09. 2026 – Bento Redesign, Supabase Profil & Odstranění spodní lišty

> **Hlavní změny:**
> 1. **Bento Grid Homepage**:
>    - Převržen UI design na čistou Bento Grid rozcestníkovou plochu s dláždicemi: Profil, Finance, Nákupy, Úkoly, Nastavení.
> 2. **Odstranění spodní navigační lišty**:
>    - Spodní navigační panel (`bottomBar`) byl kompletně odstraněn.
>    - Navigace je 100% řízena z úvodního rozcestníku. Všechny pod-obrazovky získaly horní tlačítko **Zpět** (`ArrowBack`).
> 3. **Supabase Integration & Profile Data**:
>    - Model `UserProfile` napojen přímo na REST endpoint `user_profile` v Supabase.
>    - Ukládání a načítání uživatelských informací (Jméno, Tagline, Bio, Kontaktní údaje, Motto, Skills, Avatar URL) včetně lokální fallback cache.
> 4. **Aplikace Ikony & Název**:
>    - Aktualizován název aplikace na `LevinskyJ Hub` v `strings.xml`.
>    - Importovány přizpůsobené ikony z `android/` zdrojů.
> 5. **Clean Release Sestavení**:
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
