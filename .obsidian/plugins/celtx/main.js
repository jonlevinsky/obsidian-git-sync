"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const obsidian_1 = require("obsidian");
class ScriptFormattingPlugin extends obsidian_1.Plugin {
    async onload() {
        const style = document.createElement('style');
        style.textContent = `
      /* Celkový styl pro scénář */
      body {
        font-size: 12pt;
        line-height: 1; /* Mírně zvýšené řádkování pro lepší čitelnost */
      }

      /* Scene Heading (h1) - pro # */
      h1 {
        font-family: 'Courier New', Courier, monospace;
        font-size: 12pt;
        font-weight: bold;
        text-transform: uppercase;
        background-color: #D3D3D3; /* světle šedá */
        color: #1e1e1e;
        padding: 0.2in 0;
        margin-bottom: 0.2in;
        text-align: left;
        letter-spacing: 1px;
        line-height: 1;
      }

      /* Action (h2) - pro ## */
      h2 {
        font-family: 'Courier New', Courier, monospace;
        font-size: 12pt;
        line-height: 1;
        margin-bottom: 0.5in;
        text-align: justify;
      }

      /* Character (h3) - pro ### */
      h3 {
        font-family: 'Courier New', Courier, monospace;
        font-size: 12pt;
        font-weight: bold;
        text-transform: uppercase;
        text-align: left;
        margin-left: 3.7in;
        margin-bottom: 0.2in;
        line-height: 1;
      }

      /* Parentheticals (h4) - pro #### */
      h4 {
        font-family: 'Courier New', Courier, monospace;
        font-size: 12pt;
        font-style: italic;
        text-align: left;
        margin-left: 3.7in;
        margin-bottom: 0.2in;
        line-height: 1;
      }

      /* Dialogue (h5) - pro ##### */
      h5 {
        font-family: 'Courier New', Courier, monospace;
        font-size: 12pt;
        line-height: 1;
        text-align: left;
        margin-left: 2.5in; /* Odsazení pro dialog */
        margin-right: 1in; /* Pravý okraj */
        margin-bottom: 0.5in;
      }

      /* Transition (h6) - pro ###### */
      h6 {
        font-family: 'Courier New', Courier, monospace;
        font-size: 12pt;
        font-weight: bold;
        text-transform: uppercase;
        margin-top: 0.5in;
        text-align: center;
        line-height: 1;
      }
    `;
        document.head.appendChild(style);
    }
}
exports.default = ScriptFormattingPlugin;
