<%*
function normalizeTag(str) {
  return str
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // odstranění diakritiky
    .replace(/\s+/g, "_");
}

moment.locale("cs");
const year = tp.date.now("YYYY");
const month = tp.date.now("MM");
const datum = tp.date.now("DD.MM.YYYY");
const nazevSouboru = datum;

const slozka = `Telos/Log/${year}/${month}`;

await tp.file.rename(nazevSouboru);
await tp.file.move(`${slozka}/${nazevSouboru}`);

const obsidianTag = "log, telos";

const deviceInfo = navigator.userAgent.includes("Windows") ? "LevinskyJ Desktop" :
                   navigator.userAgent.includes("Android") ? "LevinskyJ Samsung phone" :
                   navigator.userAgent.includes("Linux") ? "LevinskyJ Surface" : "Jiné zařízení";
%>---
created: <% tp.file.creation_date("YYYY-MM-DD") %>
device: <% deviceInfo %>
tags: [<% obsidianTag %>]
---

<div style="text-align: center; color: gray; font-size: 1.1em; margin-bottom: 20px; font-family: Courier New">
  <% tp.file.creation_date("dd DD. MMMM YYYY") %>
</div>

---

---
