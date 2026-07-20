```dataviewjs
const container = dv.container;
container.classList.add('homepage-root');

const logPages = dv.pages('"Život/Log"');
const moodData = new Map();
const logData = new Map();

for (const page of logPages) {
  const match = page.file.path.match(/(\d{2})\.(\d{2})\.(\d{4})\.md$/);
  if (!match) continue;
  const key = `${match[3]}-${match[2]}-${match[1]}`;
  const size = page.file.size || 0;
  logData.set(key, Math.max(0, Math.round((size - 200) / 5)));
  if (page.mood) moodData.set(key, String(page.mood).toLowerCase().trim());
}

const moodConfig = {
  good:   { emoji: '😁', label: 'Skvěle', color: '#7cb87c', score: 5 },
  ok:     { emoji: '😊', label: 'Dobře', color: '#b8b87c', score: 4 },
  normal: { emoji: '🫤', label: 'Normálně', color: '#b8a07c', score: 3 },
  tired:  { emoji: '🥱', label: 'Unaveně', color: '#b88c7c', score: 2 },
  bad:    { emoji: '😟', label: 'Špatně', color: '#b87c7c', score: 1 }
};

const moodScores = { good: 5, ok: 4, normal: 3, tired: 2, bad: 1 };

const days = [];
for (let i = 29; i >= 0; i--) {
  const d = moment().subtract(i, 'days');
  const key = d.format('YYYY-MM-DD');
  const mood = moodData.get(key);
  days.push({ date: d, key, mood, words: logData.get(key) || 0, info: mood ? moodConfig[mood] : null });
}

// ═══════════════════════════════════════════
// SVG CHART
// ═══════════════════════════════════════════
// ═══════════════════════════════════════════
// LINE CHART (div-based)
// ═══════════════════════════════════════════
const wrap = container.createDiv();
wrap.style.cssText = 'width:100%;overflow:hidden;border-radius:10px;background:var(--background-primary);border:0.5px solid var(--background-modifier-border);box-sizing:border-box;padding:20px 12px 16px;';

const W = 700, H = 110;
const PL = 70, PR = 8, PT = 4, PB = 18;
const CW = W - PL - PR, CH = H - PT - PB;

const rowLabels = ['good', 'ok', 'normal', 'tired', 'bad'];
const col = wrap.createDiv();
col.style.cssText = `position:relative;width:100%;max-width:100%;height:${H}px;`;

// Grid lines + Y labels
for (let s = 1; s <= 5; s++) {
  const y = PT + CH - ((s - 1) / 4) * CH;
  const info = Object.values(moodConfig).find(c => c.score === s);

  const line = col.createDiv();
  line.style.cssText = `position:absolute;left:${PL}px;right:${PR}px;top:${y}px;height:0;border-top:0.5px solid var(--background-modifier-border);`;

  const lbl = col.createDiv();
  lbl.textContent = `${info.emoji} ${info.label}`;
  lbl.style.cssText = `position:absolute;right:calc(100% - ${PL - 6}px);top:${y - 5}px;font-size:9px;color:var(--text-muted);white-space:nowrap;text-align:right;`;
}

// Position dots
const pts = [];
for (let i = 0; i < days.length; i++) {
  const d = days[i];
  const x = PL + (i / (days.length - 1)) * CW;
  const score = d.info ? moodScores[d.mood] : null;
  const y = score ? PT + CH - ((score - 1) / 4) * CH : null;
  pts.push({ x: x / W * 100, y: y !== null ? y / H * 100 : null, day: d });
}

// Connecting line via absolutely-positioned SVG
const vp = pts.filter(p => p.y !== null);
if (vp.length > 1) {
  const lineSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  lineSvg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  lineSvg.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;overflow:visible;';
  const ptsStr = vp.map(p => `${p.x * W / 100},${p.y * H / 100}`).join(' ');
  const poly = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
  poly.setAttribute('points', ptsStr);
  poly.setAttribute('fill', 'none');
  poly.setAttribute('stroke', 'var(--interactive-accent)');
  poly.setAttribute('stroke-width', '2.5');
  poly.setAttribute('stroke-linejoin', 'round');
  poly.setAttribute('stroke-linecap', 'round');
  poly.setAttribute('opacity', '0.6');
  lineSvg.appendChild(poly);
  col.appendChild(lineSvg);
}

// Dots + emoji
for (const p of pts) {
  if (p.y === null) continue;

  const dot = col.createDiv();
  dot.style.cssText = `position:absolute;left:${p.x}%;top:${p.y}%;width:10px;height:10px;margin:-5px 0 0 -5px;border-radius:50%;background:${p.day.info.color};border:2px solid var(--background-primary);cursor:pointer;z-index:2;transition:transform 0.15s;`;
  dot.title = `${p.day.date.format('DD.MM.YYYY')} — ${p.day.info.label}${p.day.words ? ` (${p.day.words} slov)` : ''}`;
  dot.addEventListener('mouseenter', () => dot.style.transform = 'scale(1.4)');
  dot.addEventListener('mouseleave', () => dot.style.transform = 'scale(1)');
  dot.addEventListener('click', () => {
    app.workspace.openLinkText(`Život/Log/${p.day.date.format('YYYY')}/${p.day.date.format('MM')}/${p.day.date.format('DD.MM.YYYY')}.md`, '');
  });

  const emoji = col.createDiv();
  emoji.textContent = p.day.info.emoji;
  emoji.style.cssText = `position:absolute;left:${p.x}%;top:${p.y - 3}%;font-size:12px;transform:translate(-50%,-100%);pointer-events:none;opacity:0.8;`;
}

// X labels
for (let i = 0; i < days.length; i += 5) {
  const x = PL + (i / (days.length - 1)) * CW;
  const lbl = col.createDiv();
  lbl.textContent = days[i].date.format('D.M.');
  lbl.style.cssText = `position:absolute;left:${x / W * 100}%;top:100%;font-size:8px;color:var(--text-faint);transform:translateX(-50%);margin-top:4px;white-space:nowrap;`;
}

// Today marker
const todayIdx = days.findIndex(d => d.date.isSame(moment(), 'day'));
if (todayIdx >= 0) {
  const p = pts[todayIdx];
  const marker = col.createDiv();
  marker.style.cssText = `position:absolute;left:${p.x}%;top:0;width:1.5px;height:${100 - PB/H*100}%;background:var(--interactive-accent);opacity:0.35;`;

  const tag = col.createDiv();
  tag.textContent = 'DNES';
  tag.style.cssText = `position:absolute;left:${p.x}%;top:-2px;transform:translateX(-50%);font-size:7px;font-weight:700;letter-spacing:0.12em;color:var(--interactive-accent);background:color-mix(in srgb, var(--interactive-accent) 15%, transparent);padding:1px 6px;border-radius:4px;white-space:nowrap;`;
}

// ═══════════════════════════════════════════
// STATS PILLS
// ═══════════════════════════════════════════
const row = container.createDiv();
row.style.cssText = 'display:flex;align-items:center;gap:10px;margin-top:14px;flex-wrap:wrap;';

let streak = 0;
let cd = moment();
while (logData.has(cd.format('YYYY-MM-DD'))) { streak++; cd.subtract(1, 'day'); }

const moods = [...moodData.values()];
const moodCounts = {};
for (const m of moods) moodCounts[m] = (moodCounts[m] || 0) + 1;

const avgScore = moods.length > 0
  ? (moods.reduce((s, m) => s + (moodScores[m] || 3), 0) / moods.length).toFixed(1)
  : '—';

function pill(icon, value, label) {
  const el = row.createDiv();
  el.style.cssText = 'display:flex;align-items:center;gap:5px;padding:5px 14px;border-radius:20px;background:var(--background-primary-alt);border:0.5px solid var(--background-modifier-border);font-size:0.7em;transition:border-color 0.2s,background 0.2s;';
  el.addEventListener('mouseenter', () => { el.style.background = 'var(--background-modifier-hover)'; el.style.borderColor = 'var(--background-modifier-border-hover)'; });
  el.addEventListener('mouseleave', () => { el.style.background = 'var(--background-primary-alt)'; el.style.borderColor = 'var(--background-modifier-border)'; });
  el.createEl('span', { text: icon });
  el.createEl('span', { text: value, style: 'font-weight:700;color:var(--text-normal);' });
  el.createEl('span', { text: label, style: 'color:var(--text-muted);' });
}

pill('🔥', `${streak}d`, 'streak');
pill('📝', `${logData.size}`, 'logů');
pill('📊', avgScore, 'ø nálada');

// Legend
const leg = container.createDiv();
leg.style.cssText = 'display:flex;gap:8px;margin-top:8px;flex-wrap:wrap;';
for (const [k, info] of Object.entries(moodConfig)) {
  const c = moodCounts[k] || 0;
  const el = leg.createDiv();
  el.style.cssText = `display:inline-flex;align-items:center;gap:4px;padding:3px 10px;border-radius:14px;font-size:0.65em;background:color-mix(in srgb, ${info.color} 12%, transparent);border:0.5px solid color-mix(in srgb, ${info.color} 20%, transparent);transition:background 0.2s;`;
  el.addEventListener('mouseenter', () => { el.style.background = `color-mix(in srgb, ${info.color} 22%, transparent)`; });
  el.addEventListener('mouseleave', () => { el.style.background = `color-mix(in srgb, ${info.color} 12%, transparent)`; });
  el.createEl('span', { text: info.emoji });
  el.createEl('span', { text: `${info.label} (${c})`, style: `color:${info.color};` });
}
```