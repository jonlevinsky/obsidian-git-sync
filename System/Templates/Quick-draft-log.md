<%* function normalizeTag(str) { return str .toLowerCase() .normalize("NFD").replace(/[\u0300-\u036f]/g, "") .replace(/\s+/g, "_"); }

moment.locale("cs"); const year = tp.date.now("YYYY"); const month = tp.date.now("MM"); const datum = tp.date.now("DD.MM.YYYY"); const cas = tp.date.now("HH:mm"); const nazevSouboru = tp.date.now("YYYY-MM-DD_HH-mm");

const slozka = `Život/QuickDraft/${year}/${month}`;

await tp.file.rename(nazevSouboru); await tp.file.move(`${slozka}/${nazevSouboru}`);

const deviceInfo = navigator.userAgent.includes("Windows") ? "LevinskyJ Desktop" : navigator.userAgent.includes("Android") ? "LevinskyJ Samsung phone" : navigator.userAgent.includes("Linux") ? "LevinskyJ Surface" : "Jiné zařízení";

// Prompt pro typ draftu const draftType = await tp.system.suggester( ["Nápad", "Poznámka", "Citát", "Reflexe", "Návrh", "Jiné"], ["idea", "note", "quote", "reflection", "proposal", "other"], false, "Typ draftu:" );

// Prompt pro prioritu const priority = await tp.system.suggester( ["🔴 Vysoká", "🟡 Střední", "🟢 Nízká"], ["high", "medium", "low"], false, "Priorita:" );

// Prompt pro titulek (volitelný) const title = await tp.system.prompt("Titulek (nebo nech prázdné):", "", false);

## const obsidianTag = `quickdraft, ${draftType}`; %>

## created: <% tp.file.creation_date("YYYY-MM-DD HH:mm") %> device: <% deviceInfo %> type: <% draftType %> priority: <% priority %> <%* if (title && title.trim() !== "") { %> title: <% title %> <%* } %> tags: [<% obsidianTag %>]

<div style="text-align: center; color: #888; font-size: 0.9em; margin-bottom: 16px; font-family: 'Courier New', monospace; letter-spacing: 1px;"> 📄 QUICKDRAFT — <% tp.file.creation_date("DD. MMMM YYYY · HH:mm") %> </div>

---

<%* if (title && title.trim() !== "") { %>

# <% title %>

<%* } else { %>

# 📝 Rychlý záznam

<%* } %>

> **Typ:** `<% draftType %>` | **Priorita:** `<% priority %>`

---

---

<div style="text-align: right; color: #666; font-size: 0.75em; margin-top: 24px; font-family: 'Courier New', monospace;"> zapsáno na <% deviceInfo %> · QuickDraft </div>