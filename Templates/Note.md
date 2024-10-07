<%*
const nazevSouboru = await tp.system.prompt("Zadejte název souboru (poznámky):", "Nový soubor");
await tp.file.rename(nazevSouboru);

const tag = await tp.system.prompt("Zadejte tag, podle kterého bude poznámka zařazena do složky:", "default");

await tp.file.move("/" + tag + "/" + nazevSouboru + ".md");
%>

---
creation date: <% tp.file.creation_date("dddd Do MMMM YYYY") %>
title: <% nazevSouboru %>
---

# <% nazevSouboru %>

Vytvořeno: <% tp.file.creation_date("dddd Do MMMM YYYY") %>

---

## Text poznámky:

