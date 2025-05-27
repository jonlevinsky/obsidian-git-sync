<%*
const ignore = ["System", ".git", "PDF", ".trash", ".obsidian"];

function isFolderExcluded(path) {
  return ignore.some(name => path.split("/").includes(name));
}

function normalizeTag(str) {
  return str
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // odstranění diakritiky
    .replace(/\s+/g, "_");
}

const allFolders = app.vault.getAllLoadedFiles()
  .filter(f => f.children !== undefined && !isFolderExcluded(f.path))
  .map(f => f.path)
  .sort();

const createNewOption = "✨ Vytvořit novou složku...";

const options = [...allFolders, createNewOption];

let vyber = await tp.system.suggester(options, options);

if (vyber === createNewOption) {
  vyber = await tp.system.prompt("Zadej název nové složky (relativní cesta):");
  if (vyber.trim() !== "") {
    await app.vault.createFolder(vyber).catch(() => {});
  } else {
    new Notice("Nezadána žádná složka, použita kořenová složka.");
    vyber = "";
  }
}

const datum = tp.date.now("DD.MM.YY");
const nazevSouboru = await tp.system.prompt("Název souboru:", `Nová poznámka ${datum}`);

await tp.file.rename(nazevSouboru);
if (vyber !== "") {
  await tp.file.move(vyber + "/" + nazevSouboru);
}

const obsidianTag = vyber.split("/")
  .filter(Boolean)
  .map(s => normalizeTag(s))
  .join(", ");

const deviceInfo = navigator.userAgent.includes("Windows") ? "LevinskyJ Desktop" :
                   navigator.userAgent.includes("Android") ? "LevinskyJ Samsung phone" :
                   navigator.userAgent.includes("Linux") ? "LevinskyJ Surface" : "Jiné zařízení";
%>---
created: <% tp.file.creation_date("YYYY-MM-DD") %>
device: <% deviceInfo %>
tags: [<% obsidianTag %>]
---
<div style="text-align: center; font-size: 1.6em; font-weight: bold; padding: 10px 0; font-family: Courier New">
  <% nazevSouboru %>
</div>

<div style="text-align: center; color: gray; font-size: 1.1em; margin-bottom: 20px; font-family: Courier New">
  <% tp.file.creation_date("DD MMMM YYYY") %>
</div>

---



---

<div style="text-align: center; color: gray; font-size: 0.9em; margin-top: 40px; font-family: Courier New">
  Obsidian na: <strong><% deviceInfo %></strong>
</div>
