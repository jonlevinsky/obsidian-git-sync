![[Profil#📌 Základní informace]]

![[Přehled]]


```dataviewjs
let tasks = dv.pages().file.tasks;
let total = tasks.length;
let done = tasks.filter(t => t.completed).length;
let progress = total > 0 ? (done / total) * 100 : 0;

// Vytvoř hlavní div pro progress bar
let progressBar = dv.el('div', '', {
    attr: {
        style: `
            background-color: var(--background-secondary);
            border-radius: 12px;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
            overflow: hidden;
            height: 12px;
            width: 100%;
            margin-top: 16px;
        `
    }
});

// Vytvoř vnitřní div pro výplň progress baru
let progressFill = dv.el('div', '', {
    attr: {
        style: `
            background-color: var(--interactive-accent);
            height: 100%;
            border-radius: 12px;
            width: 0%;
            transition: width 1s ease-in-out;
        `
    }
});

// Nastav šířku po malé prodlevě pro animaci
setTimeout(() => {
    progressFill.style.width = `${progress}%`;
}, 100);

// Přidej výplň do hlavního divu
progressBar.appendChild(progressFill);

// Zobraz progress bar
dv.container.appendChild(progressBar);

// Zobraz textový indikátor
let progressText = dv.el('div', `Progress: ${progress.toFixed(0)}%`, {
    attr: {
        style: `
            margin-top: 8px;
            font-size: 14px;
            color: var(--text-normal);
            text-align: center;
        `
    }
});

// Přidej text do kontejneru
dv.container.appendChild(progressText);
```
