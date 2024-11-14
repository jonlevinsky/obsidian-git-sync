<%*
const datum = tp.date.now("DD.MM.YY");
const nazevSouboru = await tp.system.prompt(`Name:`, `Nová poznámka ${datum}`);
await tp.file.rename(nazevSouboru);

// Seznam tagů pro simulaci autocomplete s výběrem
const dostupneTagy = ["writing", "promitac", "ap", "journal", "school", "novyrad", " "];

// Použij výběrové okno s možnostmi pro autocomplete tagu
let tag = await tp.system.suggester(dostupneTagy, dostupneTagy, true);

// Definuj složky podle tagů
const tagToFolderMap = {
  "writing": "Škola/Scenáristika",
  "promitac": "Promítačský kurz",
  "ap": "Škola/Absolventský projekt",
  "journal": "Deník",
  "school": "Škola",
  "novyrad": "Škola/Absolventský projekt/Nový řád"
};

let slozka;

// Zpracování pro tag "promitac"
if (tag === "promitac") {
  // Vytvoření podložky s aktuálním datem
  const podlozka = tp.date.now("DD-MM-YYYY"); // Změna formátu data pro složku
  slozka = `Promítačský kurz/${podlozka}`;
} else {
  slozka = tagToFolderMap[tag];
}

if (slozka) {
  await tp.file.move("/" + slozka + "/" + nazevSouboru);
} else {
  new Notice("Tag nemá přiřazenou složku. Poznámka zůstane v aktuální složce.");
}

// Detekuj zařízení
const deviceInfo = navigator.userAgent.includes("Windows") ? "LevinskyJ Desktop" :
                   navigator.userAgent.includes("Android") ? "LevinskyJ Samsung phone" :
                   navigator.userAgent.includes("Linux") ? "LevinskyJ Surface" : "Jiné zařízení";

// Přidej tag jako klasický Obsidian tag
let obsidianTag = `${tag}`;
if (tag === "writing" || tag === "ap") {
  obsidianTag += ", school"; // Přidání tagu #school
}
if (tag === "novyrad") {
  obsidianTag += ", school, ap, writing"
}
%>---
tags: [<% obsidianTag %>]
created: <% tp.file.creation_date("YYYY-MM-DD") %>
device: <% deviceInfo %>
---
<div style="text-align: center; font-size: 1.6em; font-weight: bold; padding: 10px 0; font-family: Courier New">
  <% nazevSouboru %>
</div>

<div style="text-align: center; color: gray; font-size: 1.1em; margin-bottom: 20px; font-family: Courier New">  <% tp.file.creation_date("DD MMMM YYYY") %>
</div>

---



---

<div style="text-align: center; color: gray; font-size: 0.9em; margin-top: 40px; font-family: Courier New">
  Obsidian na: <strong><% deviceInfo %></strong>
</div>
