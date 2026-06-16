<%*
const datum = tp.date.now("DD.MM.YY");

// 1. Prompt pro název
const nazevSouboru = await tp.system.prompt("Název poznámky:", `Nová poznámka ${datum}`);
await tp.file.rename(nazevSouboru);

// 2. Menu pro suggester
const moznosti = [
    { tag: "writing", slozka: "Škola/Scenáristika", label: "✍️ Scenáristika (writing)" },
    { tag: "promitac", slozka: "Promítačský kurz", label: "📽️ Promítačský kurz (promitac)" },
    { tag: "ap", slozka: "Škola/Absolventský projekt", label: "🎓 Absolventský projekt (ap)" },
    { tag: "novyrad", slozka: "Škola/Absolventský projekt/Nový řád", label: "🎬 Nový řád (novyrad)" },
    { tag: "school", slozka: "Škola", label: "🏫 Škola (school)" },
    { tag: "journal", slozka: "Deník", label: "📓 Deník (journal)" },
    { tag: "none", slozka: "", label: "📁 Ponechat v aktuální složce (bez tagu)" }
];

const vyber = await tp.system.suggester(moznosti.map(m => m.label), moznosti);

let finalSlozka = "";
let tagsArray = [];

// 3. Logika složek a generování tagů
if (vyber && vyber.tag !== "none") {
    tagsArray.push(vyber.tag);

    if (vyber.tag === "promitac") {
        const podlozka = tp.date.now("DD-MM-YYYY");
        finalSlozka = `Promítačský kurz/${podlozka}`;
    } else {
        finalSlozka = vyber.slozka;
    }

    if (vyber.tag === "writing" || vyber.tag === "ap") {
        tagsArray.push("school");
    }
    if (vyber.tag === "novyrad") {
        tagsArray.push("school", "ap", "writing");
    }
}

const uniqueTags = [...new Set(tagsArray)];

// 4. Přesun souboru
if (finalSlozka !== "") {
    await tp.file.move(`/${finalSlozka}/${nazevSouboru}`);
} else if (!vyber) {
    new Notice("Vytváření poznámky zrušeno, zůstává na místě.");
}

// 5. Detekce zařízení
const ua = navigator.userAgent;
const deviceInfo = ua.includes("Windows") ? "LevinskyJ Desktop" :
                   ua.includes("Android") ? "LevinskyJ Samsung phone" :
                   ua.includes("Linux") ? "LevinskyJ Surface" : "Jiné zařízení";
_%>
---
tags: [<% uniqueTags.join(", ") %>]
---
# <% nazevSouboru %>
**Vytvořeno:** <% tp.file.creation_date("DD. MMMM YYYY") %> | **Tagy:** <% uniqueTags.map(t => `#${t}`).join(" ") %>
***

<% tp.file.cursor(1) %>

***
*Obsidian na: <% deviceInfo %>*