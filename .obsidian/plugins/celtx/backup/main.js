import { __awaiter } from "tslib";
import { Plugin, MarkdownView } from 'obsidian';
export default class ScriptFormattingPlugin extends Plugin {
    onload() {
        return __awaiter(this, void 0, void 0, function* () {
            this.addCommand({
                id: 'format-script',
                name: 'Format Script',
                callback: () => {
                    this.formatScript();
                }
            });
        });
    }
    formatScript() {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            const activeView = (_a = this.app.workspace.activeLeaf) === null || _a === void 0 ? void 0 : _a.view;
            if (!(activeView instanceof MarkdownView))
                return; // Zkontroluje, zda je aktivní pohled typu MarkdownView
            const activeFile = activeView.file; // Získá soubor z MarkdownView
            if (!activeFile)
                return;
            const fileContent = yield this.app.vault.read(activeFile); // Čtení souboru asynchronně
            // Zkontrolujeme, zda soubor obsahuje tag 'style:script'
            if (this.hasStyleScriptTag(fileContent)) {
                const formattedContent = this.generateFormattedText(fileContent);
                // Automatické přepsání souboru novým formátovaným obsahem
                yield this.app.vault.modify(activeFile, formattedContent);
                // Přidání specifického stylu pouze pro tento soubor
                this.applyStyleScript();
            }
        });
    }
    // Funkce pro detekci tagu 'style:script'
    hasStyleScriptTag(content) {
        return content.includes('style:script'); // Hledání tagu 'style:script'
    }
    // Funkce pro aplikaci stylu na soubor s tagem 'style:script'
    applyStyleScript() {
        const style = document.createElement('style');
        style.textContent = `
    /* Celkový styl pro scénář pro editor */
    @media print{
        * { 
            font-family: 'Courier New', Courier, monospace;
            color #000;
            background-color: transparent;
            font-size: 12px;
            line-height: 13px;
            padding: 0;
        }
    }
    
    .cm-s-obsidian body {
        font-size: 12px !important; 
        line-height: 13px !important;
    }
    
    /* Scene Heading (h1) - pro # */
    .cm-s-obsidian .cm-header-1 {
        font-family: 'Courier New', Courier, monospace;
        font-size: 12px;
        font-weight: bold;
        text-transform: uppercase;
        background-color: #D3D3D3;
        color: #1e1e1e;
        padding: 0.1in 0;
        text-align: left;
        letter-spacing: 1px;
        line-height: 13px;
    }
    
    /* Action (h2) - pro ## */
    .cm-s-obsidian .cm-header-2 {
        font-family: 'Courier New', Courier, monospace;
        font-size: 12px;
        line-height: 13px;
        text-align: justify;
    }
    
    /* Character (h3) - pro ### */
    .cm-s-obsidian .cm-header-3 {
        font-family: 'Courier New', Courier, monospace;
        font-size: 12px;
        font-weight: bold;
        text-transform: uppercase;
        text-align: left;
        margin-left: 3.7in;
        line-height: 13px;
    }
    
    /* Parentheticals (h4) - pro #### */
    .cm-s-obsidian .cm-header-4 {
        font-family: 'Courier New', Courier, monospace;
        font-size: 12px;
        font-style: italic;
        text-align: left;
        margin-left: 3.7in;
        line-height: 13px;
    }
    
    /* Dialogue (h5) - pro ##### */
    .cm-s-obsidian .cm-header-5 {
        font-family: 'Courier New', Courier, monospace;
        font-size: 12px;
        line-height: 13px;
        text-align: left;
        margin-left: 2.5in;
        margin-right: 1in;
    }
    
    /* Transition (h6) - pro ###### */
    .cm-s-obsidian .cm-header-6 {
        font-family: 'Courier New', Courier, monospace;
        font-size: 12px;
        font-weight: bold;
        text-transform: uppercase;
        text-align: center;
        line-height: 13px;
    }
    
    /* Styl pro režim čtení (Preview) */
    
    /* Celkový styl pro scénář pro preview */
    .markdown-preview-view body {
        font-size: 12px;
        line-height: 13px;
    }
    
    /* Scene Heading (h1) - pro # */
    .markdown-preview-view h1 {
        font-family: 'Courier New', Courier, monospace;
        font-size: 12px;
        font-weight: bold;
        text-transform: uppercase;
        background-color: #D3D3D3;
        color: #1e1e1e;
        padding: 0.1in 0;
        text-align: left;
        letter-spacing: 1px;
        line-height: 13px;
    }
    
    /* Action (h2) - pro ## */
    .markdown-preview-view h2 {
        font-family: 'Courier New', Courier, monospace;
        font-size: 12px;
        line-height: 13px;
        text-align: justify;
    }
    
    /* Character (h3) - pro ### */
    .markdown-preview-view h3 {
        font-family: 'Courier New', Courier, monospace;
        font-size: 12px;
        font-weight: bold;
        text-transform: uppercase;
        text-align: left;
        margin-left: 3.7in;
        line-height: 13px;
    }
    
    /* Parentheticals (h4) - pro #### */
    .markdown-preview-view h4 {
        font-family: 'Courier New', Courier, monospace;
        font-size: 12px;
        font-style: italic;
        text-align: left;
        margin-left: 3.7in;
        line-height: 13px;
    }
    
    /* Dialogue (h5) - pro ##### */
    .markdown-preview-view h5 {
        font-family: 'Courier New', Courier, monospace;
        font-size: 12px;
        line-height: 13px;
        text-align: left;
        margin-left: 2.5in;
        margin-right: 1in;
    }
    
    /* Transition (h6) - pro ###### */
    .markdown-preview-view h6 {
        font-family: 'Courier New', Courier, monospace;
        font-size: 12px;
        font-weight: bold;
        text-transform: uppercase;
        text-align: center;
        line-height: 13px;
    }
    `;
        document.head.appendChild(style);
    }
    generateFormattedText(input) {
        let output = input;
        // Regex pro nahrazení tagů třídami podle předchozího kódu
        output = output.replace(/# (.*)/, (match, p1) => {
            return `# ${p1}`; // Udržení Markdownu s původními značkami
        });
        output = output.replace(/## (.*)/, (match, p1) => {
            return `## ${p1}`;
        });
        output = output.replace(/### (.*)/, (match, p1) => {
            return `### ${p1}`;
        });
        output = output.replace(/#### (.*)/, (match, p1) => {
            // Přidání závorek pouze pokud tam ještě nejsou
            if (!p1.startsWith('(') && !p1.endsWith(')')) {
                return `#### (${p1})`;
            }
            return `#### ${p1}`;
        });
        output = output.replace(/##### (.*)/, (match, p1) => {
            return `##### ${p1}`;
        });
        output = output.replace(/###### (.*)/, (match, p1) => {
            return `###### ${p1}`;
        });
        return output;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpbi5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uL29ic2lkaWFuIHBsdWdpbi9jZWx0eC9iYWNrdXAvbWFpbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUEsT0FBTyxFQUFFLE1BQU0sRUFBRSxZQUFZLEVBQUUsTUFBTSxVQUFVLENBQUM7QUFFaEQsTUFBTSxDQUFDLE9BQU8sT0FBTyxzQkFBdUIsU0FBUSxNQUFNO0lBQ2xELE1BQU07O1lBQ1YsSUFBSSxDQUFDLFVBQVUsQ0FBQztnQkFDZCxFQUFFLEVBQUUsZUFBZTtnQkFDbkIsSUFBSSxFQUFFLGVBQWU7Z0JBQ3JCLFFBQVEsRUFBRSxHQUFHLEVBQUU7b0JBQ2IsSUFBSSxDQUFDLFlBQVksRUFBRSxDQUFDO2dCQUN0QixDQUFDO2FBQ0YsQ0FBQyxDQUFDO1FBQ0wsQ0FBQztLQUFBO0lBRUssWUFBWTs7O1lBQ2hCLE1BQU0sVUFBVSxHQUFHLE1BQUEsSUFBSSxDQUFDLEdBQUcsQ0FBQyxTQUFTLENBQUMsVUFBVSwwQ0FBRSxJQUFJLENBQUM7WUFDdkQsSUFBSSxDQUFDLENBQUMsVUFBVSxZQUFZLFlBQVksQ0FBQztnQkFBRSxPQUFPLENBQUMsdURBQXVEO1lBRTFHLE1BQU0sVUFBVSxHQUFHLFVBQVUsQ0FBQyxJQUFJLENBQUMsQ0FBQyw4QkFBOEI7WUFDbEUsSUFBSSxDQUFDLFVBQVU7Z0JBQUUsT0FBTztZQUV4QixNQUFNLFdBQVcsR0FBRyxNQUFNLElBQUksQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLDRCQUE0QjtZQUV2Rix3REFBd0Q7WUFDeEQsSUFBSSxJQUFJLENBQUMsaUJBQWlCLENBQUMsV0FBVyxDQUFDLEVBQUUsQ0FBQztnQkFDeEMsTUFBTSxnQkFBZ0IsR0FBRyxJQUFJLENBQUMscUJBQXFCLENBQUMsV0FBVyxDQUFDLENBQUM7Z0JBQ2pFLDBEQUEwRDtnQkFDMUQsTUFBTSxJQUFJLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsVUFBVSxFQUFFLGdCQUFnQixDQUFDLENBQUM7Z0JBRTFELG9EQUFvRDtnQkFDcEQsSUFBSSxDQUFDLGdCQUFnQixFQUFFLENBQUM7WUFDMUIsQ0FBQztRQUNILENBQUM7S0FBQTtJQUVELHlDQUF5QztJQUN6QyxpQkFBaUIsQ0FBQyxPQUFlO1FBQy9CLE9BQU8sT0FBTyxDQUFDLFFBQVEsQ0FBQyxjQUFjLENBQUMsQ0FBQyxDQUFDLDhCQUE4QjtJQUN6RSxDQUFDO0lBRUQsNkRBQTZEO0lBQzdELGdCQUFnQjtRQUNkLE1BQU0sS0FBSyxHQUFHLFFBQVEsQ0FBQyxhQUFhLENBQUMsT0FBTyxDQUFDLENBQUM7UUFDOUMsS0FBSyxDQUFDLFdBQVcsR0FBRzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztLQXVKbkIsQ0FBQztRQUNGLFFBQVEsQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxDQUFDO0lBQ25DLENBQUM7SUFFRCxxQkFBcUIsQ0FBQyxLQUFhO1FBQ2pDLElBQUksTUFBTSxHQUFHLEtBQUssQ0FBQztRQUVuQiwwREFBMEQ7UUFDMUQsTUFBTSxHQUFHLE1BQU0sQ0FBQyxPQUFPLENBQUMsUUFBUSxFQUFFLENBQUMsS0FBSyxFQUFFLEVBQUUsRUFBRSxFQUFFO1lBQzlDLE9BQU8sS0FBSyxFQUFFLEVBQUUsQ0FBQyxDQUFDLHlDQUF5QztRQUM3RCxDQUFDLENBQUMsQ0FBQztRQUNILE1BQU0sR0FBRyxNQUFNLENBQUMsT0FBTyxDQUFDLFNBQVMsRUFBRSxDQUFDLEtBQUssRUFBRSxFQUFFLEVBQUUsRUFBRTtZQUMvQyxPQUFPLE1BQU0sRUFBRSxFQUFFLENBQUM7UUFDcEIsQ0FBQyxDQUFDLENBQUM7UUFDSCxNQUFNLEdBQUcsTUFBTSxDQUFDLE9BQU8sQ0FBQyxVQUFVLEVBQUUsQ0FBQyxLQUFLLEVBQUUsRUFBRSxFQUFFLEVBQUU7WUFDaEQsT0FBTyxPQUFPLEVBQUUsRUFBRSxDQUFDO1FBQ3JCLENBQUMsQ0FBQyxDQUFDO1FBQ0gsTUFBTSxHQUFHLE1BQU0sQ0FBQyxPQUFPLENBQUMsV0FBVyxFQUFFLENBQUMsS0FBSyxFQUFFLEVBQUUsRUFBRSxFQUFFO1lBQ2pELCtDQUErQztZQUMvQyxJQUFJLENBQUMsRUFBRSxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQztnQkFDN0MsT0FBTyxTQUFTLEVBQUUsR0FBRyxDQUFDO1lBQ3hCLENBQUM7WUFDRCxPQUFPLFFBQVEsRUFBRSxFQUFFLENBQUM7UUFDdEIsQ0FBQyxDQUFDLENBQUM7UUFDSCxNQUFNLEdBQUcsTUFBTSxDQUFDLE9BQU8sQ0FBQyxZQUFZLEVBQUUsQ0FBQyxLQUFLLEVBQUUsRUFBRSxFQUFFLEVBQUU7WUFDbEQsT0FBTyxTQUFTLEVBQUUsRUFBRSxDQUFDO1FBQ3ZCLENBQUMsQ0FBQyxDQUFDO1FBQ0gsTUFBTSxHQUFHLE1BQU0sQ0FBQyxPQUFPLENBQUMsYUFBYSxFQUFFLENBQUMsS0FBSyxFQUFFLEVBQUUsRUFBRSxFQUFFO1lBQ25ELE9BQU8sVUFBVSxFQUFFLEVBQUUsQ0FBQztRQUN4QixDQUFDLENBQUMsQ0FBQztRQUVILE9BQU8sTUFBTSxDQUFDO0lBQ2hCLENBQUM7Q0FFRiIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IFBsdWdpbiwgTWFya2Rvd25WaWV3IH0gZnJvbSAnb2JzaWRpYW4nO1xyXG5cclxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgU2NyaXB0Rm9ybWF0dGluZ1BsdWdpbiBleHRlbmRzIFBsdWdpbiB7XHJcbiAgYXN5bmMgb25sb2FkKCkge1xyXG4gICAgdGhpcy5hZGRDb21tYW5kKHtcclxuICAgICAgaWQ6ICdmb3JtYXQtc2NyaXB0JyxcclxuICAgICAgbmFtZTogJ0Zvcm1hdCBTY3JpcHQnLFxyXG4gICAgICBjYWxsYmFjazogKCkgPT4ge1xyXG4gICAgICAgIHRoaXMuZm9ybWF0U2NyaXB0KCk7XHJcbiAgICAgIH1cclxuICAgIH0pO1xyXG4gIH1cclxuXHJcbiAgYXN5bmMgZm9ybWF0U2NyaXB0KCkge1xyXG4gICAgY29uc3QgYWN0aXZlVmlldyA9IHRoaXMuYXBwLndvcmtzcGFjZS5hY3RpdmVMZWFmPy52aWV3O1xyXG4gICAgaWYgKCEoYWN0aXZlVmlldyBpbnN0YW5jZW9mIE1hcmtkb3duVmlldykpIHJldHVybjsgLy8gWmtvbnRyb2x1amUsIHpkYSBqZSBha3Rpdm7DrSBwb2hsZWQgdHlwdSBNYXJrZG93blZpZXdcclxuXHJcbiAgICBjb25zdCBhY3RpdmVGaWxlID0gYWN0aXZlVmlldy5maWxlOyAvLyBaw61za8OhIHNvdWJvciB6IE1hcmtkb3duVmlld1xyXG4gICAgaWYgKCFhY3RpdmVGaWxlKSByZXR1cm47XHJcblxyXG4gICAgY29uc3QgZmlsZUNvbnRlbnQgPSBhd2FpdCB0aGlzLmFwcC52YXVsdC5yZWFkKGFjdGl2ZUZpbGUpOyAvLyDEjHRlbsOtIHNvdWJvcnUgYXN5bmNocm9ubsSbXHJcblxyXG4gICAgLy8gWmtvbnRyb2x1amVtZSwgemRhIHNvdWJvciBvYnNhaHVqZSB0YWcgJ3N0eWxlOnNjcmlwdCdcclxuICAgIGlmICh0aGlzLmhhc1N0eWxlU2NyaXB0VGFnKGZpbGVDb250ZW50KSkge1xyXG4gICAgICBjb25zdCBmb3JtYXR0ZWRDb250ZW50ID0gdGhpcy5nZW5lcmF0ZUZvcm1hdHRlZFRleHQoZmlsZUNvbnRlbnQpO1xyXG4gICAgICAvLyBBdXRvbWF0aWNrw6kgcMWZZXBzw6Fuw60gc291Ym9ydSBub3bDvW0gZm9ybcOhdG92YW7DvW0gb2JzYWhlbVxyXG4gICAgICBhd2FpdCB0aGlzLmFwcC52YXVsdC5tb2RpZnkoYWN0aXZlRmlsZSwgZm9ybWF0dGVkQ29udGVudCk7XHJcblxyXG4gICAgICAvLyBQxZlpZMOhbsOtIHNwZWNpZmlja8OpaG8gc3R5bHUgcG91emUgcHJvIHRlbnRvIHNvdWJvclxyXG4gICAgICB0aGlzLmFwcGx5U3R5bGVTY3JpcHQoKTtcclxuICAgIH1cclxuICB9XHJcblxyXG4gIC8vIEZ1bmtjZSBwcm8gZGV0ZWtjaSB0YWd1ICdzdHlsZTpzY3JpcHQnXHJcbiAgaGFzU3R5bGVTY3JpcHRUYWcoY29udGVudDogc3RyaW5nKTogYm9vbGVhbiB7XHJcbiAgICByZXR1cm4gY29udGVudC5pbmNsdWRlcygnc3R5bGU6c2NyaXB0Jyk7IC8vIEhsZWTDoW7DrSB0YWd1ICdzdHlsZTpzY3JpcHQnXHJcbiAgfVxyXG5cclxuICAvLyBGdW5rY2UgcHJvIGFwbGlrYWNpIHN0eWx1IG5hIHNvdWJvciBzIHRhZ2VtICdzdHlsZTpzY3JpcHQnXHJcbiAgYXBwbHlTdHlsZVNjcmlwdCgpIHtcclxuICAgIGNvbnN0IHN0eWxlID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnc3R5bGUnKTtcclxuICAgIHN0eWxlLnRleHRDb250ZW50ID0gYFxyXG4gICAgLyogQ2Vsa292w70gc3R5bCBwcm8gc2PDqW7DocWZIHBybyBlZGl0b3IgKi9cclxuICAgIEBtZWRpYSBwcmludHtcclxuICAgICAgICAqIHsgXHJcbiAgICAgICAgICAgIGZvbnQtZmFtaWx5OiAnQ291cmllciBOZXcnLCBDb3VyaWVyLCBtb25vc3BhY2U7XHJcbiAgICAgICAgICAgIGNvbG9yICMwMDA7XHJcbiAgICAgICAgICAgIGJhY2tncm91bmQtY29sb3I6IHRyYW5zcGFyZW50O1xyXG4gICAgICAgICAgICBmb250LXNpemU6IDEycHg7XHJcbiAgICAgICAgICAgIGxpbmUtaGVpZ2h0OiAxM3B4O1xyXG4gICAgICAgICAgICBwYWRkaW5nOiAwO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuICAgIFxyXG4gICAgLmNtLXMtb2JzaWRpYW4gYm9keSB7XHJcbiAgICAgICAgZm9udC1zaXplOiAxMnB4ICFpbXBvcnRhbnQ7IFxyXG4gICAgICAgIGxpbmUtaGVpZ2h0OiAxM3B4ICFpbXBvcnRhbnQ7XHJcbiAgICB9XHJcbiAgICBcclxuICAgIC8qIFNjZW5lIEhlYWRpbmcgKGgxKSAtIHBybyAjICovXHJcbiAgICAuY20tcy1vYnNpZGlhbiAuY20taGVhZGVyLTEge1xyXG4gICAgICAgIGZvbnQtZmFtaWx5OiAnQ291cmllciBOZXcnLCBDb3VyaWVyLCBtb25vc3BhY2U7XHJcbiAgICAgICAgZm9udC1zaXplOiAxMnB4O1xyXG4gICAgICAgIGZvbnQtd2VpZ2h0OiBib2xkO1xyXG4gICAgICAgIHRleHQtdHJhbnNmb3JtOiB1cHBlcmNhc2U7XHJcbiAgICAgICAgYmFja2dyb3VuZC1jb2xvcjogI0QzRDNEMztcclxuICAgICAgICBjb2xvcjogIzFlMWUxZTtcclxuICAgICAgICBwYWRkaW5nOiAwLjFpbiAwO1xyXG4gICAgICAgIHRleHQtYWxpZ246IGxlZnQ7XHJcbiAgICAgICAgbGV0dGVyLXNwYWNpbmc6IDFweDtcclxuICAgICAgICBsaW5lLWhlaWdodDogMTNweDtcclxuICAgIH1cclxuICAgIFxyXG4gICAgLyogQWN0aW9uIChoMikgLSBwcm8gIyMgKi9cclxuICAgIC5jbS1zLW9ic2lkaWFuIC5jbS1oZWFkZXItMiB7XHJcbiAgICAgICAgZm9udC1mYW1pbHk6ICdDb3VyaWVyIE5ldycsIENvdXJpZXIsIG1vbm9zcGFjZTtcclxuICAgICAgICBmb250LXNpemU6IDEycHg7XHJcbiAgICAgICAgbGluZS1oZWlnaHQ6IDEzcHg7XHJcbiAgICAgICAgdGV4dC1hbGlnbjoganVzdGlmeTtcclxuICAgIH1cclxuICAgIFxyXG4gICAgLyogQ2hhcmFjdGVyIChoMykgLSBwcm8gIyMjICovXHJcbiAgICAuY20tcy1vYnNpZGlhbiAuY20taGVhZGVyLTMge1xyXG4gICAgICAgIGZvbnQtZmFtaWx5OiAnQ291cmllciBOZXcnLCBDb3VyaWVyLCBtb25vc3BhY2U7XHJcbiAgICAgICAgZm9udC1zaXplOiAxMnB4O1xyXG4gICAgICAgIGZvbnQtd2VpZ2h0OiBib2xkO1xyXG4gICAgICAgIHRleHQtdHJhbnNmb3JtOiB1cHBlcmNhc2U7XHJcbiAgICAgICAgdGV4dC1hbGlnbjogbGVmdDtcclxuICAgICAgICBtYXJnaW4tbGVmdDogMy43aW47XHJcbiAgICAgICAgbGluZS1oZWlnaHQ6IDEzcHg7XHJcbiAgICB9XHJcbiAgICBcclxuICAgIC8qIFBhcmVudGhldGljYWxzIChoNCkgLSBwcm8gIyMjIyAqL1xyXG4gICAgLmNtLXMtb2JzaWRpYW4gLmNtLWhlYWRlci00IHtcclxuICAgICAgICBmb250LWZhbWlseTogJ0NvdXJpZXIgTmV3JywgQ291cmllciwgbW9ub3NwYWNlO1xyXG4gICAgICAgIGZvbnQtc2l6ZTogMTJweDtcclxuICAgICAgICBmb250LXN0eWxlOiBpdGFsaWM7XHJcbiAgICAgICAgdGV4dC1hbGlnbjogbGVmdDtcclxuICAgICAgICBtYXJnaW4tbGVmdDogMy43aW47XHJcbiAgICAgICAgbGluZS1oZWlnaHQ6IDEzcHg7XHJcbiAgICB9XHJcbiAgICBcclxuICAgIC8qIERpYWxvZ3VlIChoNSkgLSBwcm8gIyMjIyMgKi9cclxuICAgIC5jbS1zLW9ic2lkaWFuIC5jbS1oZWFkZXItNSB7XHJcbiAgICAgICAgZm9udC1mYW1pbHk6ICdDb3VyaWVyIE5ldycsIENvdXJpZXIsIG1vbm9zcGFjZTtcclxuICAgICAgICBmb250LXNpemU6IDEycHg7XHJcbiAgICAgICAgbGluZS1oZWlnaHQ6IDEzcHg7XHJcbiAgICAgICAgdGV4dC1hbGlnbjogbGVmdDtcclxuICAgICAgICBtYXJnaW4tbGVmdDogMi41aW47XHJcbiAgICAgICAgbWFyZ2luLXJpZ2h0OiAxaW47XHJcbiAgICB9XHJcbiAgICBcclxuICAgIC8qIFRyYW5zaXRpb24gKGg2KSAtIHBybyAjIyMjIyMgKi9cclxuICAgIC5jbS1zLW9ic2lkaWFuIC5jbS1oZWFkZXItNiB7XHJcbiAgICAgICAgZm9udC1mYW1pbHk6ICdDb3VyaWVyIE5ldycsIENvdXJpZXIsIG1vbm9zcGFjZTtcclxuICAgICAgICBmb250LXNpemU6IDEycHg7XHJcbiAgICAgICAgZm9udC13ZWlnaHQ6IGJvbGQ7XHJcbiAgICAgICAgdGV4dC10cmFuc2Zvcm06IHVwcGVyY2FzZTtcclxuICAgICAgICB0ZXh0LWFsaWduOiBjZW50ZXI7XHJcbiAgICAgICAgbGluZS1oZWlnaHQ6IDEzcHg7XHJcbiAgICB9XHJcbiAgICBcclxuICAgIC8qIFN0eWwgcHJvIHJlxb5pbSDEjXRlbsOtIChQcmV2aWV3KSAqL1xyXG4gICAgXHJcbiAgICAvKiBDZWxrb3bDvSBzdHlsIHBybyBzY8OpbsOhxZkgcHJvIHByZXZpZXcgKi9cclxuICAgIC5tYXJrZG93bi1wcmV2aWV3LXZpZXcgYm9keSB7XHJcbiAgICAgICAgZm9udC1zaXplOiAxMnB4O1xyXG4gICAgICAgIGxpbmUtaGVpZ2h0OiAxM3B4O1xyXG4gICAgfVxyXG4gICAgXHJcbiAgICAvKiBTY2VuZSBIZWFkaW5nIChoMSkgLSBwcm8gIyAqL1xyXG4gICAgLm1hcmtkb3duLXByZXZpZXctdmlldyBoMSB7XHJcbiAgICAgICAgZm9udC1mYW1pbHk6ICdDb3VyaWVyIE5ldycsIENvdXJpZXIsIG1vbm9zcGFjZTtcclxuICAgICAgICBmb250LXNpemU6IDEycHg7XHJcbiAgICAgICAgZm9udC13ZWlnaHQ6IGJvbGQ7XHJcbiAgICAgICAgdGV4dC10cmFuc2Zvcm06IHVwcGVyY2FzZTtcclxuICAgICAgICBiYWNrZ3JvdW5kLWNvbG9yOiAjRDNEM0QzO1xyXG4gICAgICAgIGNvbG9yOiAjMWUxZTFlO1xyXG4gICAgICAgIHBhZGRpbmc6IDAuMWluIDA7XHJcbiAgICAgICAgdGV4dC1hbGlnbjogbGVmdDtcclxuICAgICAgICBsZXR0ZXItc3BhY2luZzogMXB4O1xyXG4gICAgICAgIGxpbmUtaGVpZ2h0OiAxM3B4O1xyXG4gICAgfVxyXG4gICAgXHJcbiAgICAvKiBBY3Rpb24gKGgyKSAtIHBybyAjIyAqL1xyXG4gICAgLm1hcmtkb3duLXByZXZpZXctdmlldyBoMiB7XHJcbiAgICAgICAgZm9udC1mYW1pbHk6ICdDb3VyaWVyIE5ldycsIENvdXJpZXIsIG1vbm9zcGFjZTtcclxuICAgICAgICBmb250LXNpemU6IDEycHg7XHJcbiAgICAgICAgbGluZS1oZWlnaHQ6IDEzcHg7XHJcbiAgICAgICAgdGV4dC1hbGlnbjoganVzdGlmeTtcclxuICAgIH1cclxuICAgIFxyXG4gICAgLyogQ2hhcmFjdGVyIChoMykgLSBwcm8gIyMjICovXHJcbiAgICAubWFya2Rvd24tcHJldmlldy12aWV3IGgzIHtcclxuICAgICAgICBmb250LWZhbWlseTogJ0NvdXJpZXIgTmV3JywgQ291cmllciwgbW9ub3NwYWNlO1xyXG4gICAgICAgIGZvbnQtc2l6ZTogMTJweDtcclxuICAgICAgICBmb250LXdlaWdodDogYm9sZDtcclxuICAgICAgICB0ZXh0LXRyYW5zZm9ybTogdXBwZXJjYXNlO1xyXG4gICAgICAgIHRleHQtYWxpZ246IGxlZnQ7XHJcbiAgICAgICAgbWFyZ2luLWxlZnQ6IDMuN2luO1xyXG4gICAgICAgIGxpbmUtaGVpZ2h0OiAxM3B4O1xyXG4gICAgfVxyXG4gICAgXHJcbiAgICAvKiBQYXJlbnRoZXRpY2FscyAoaDQpIC0gcHJvICMjIyMgKi9cclxuICAgIC5tYXJrZG93bi1wcmV2aWV3LXZpZXcgaDQge1xyXG4gICAgICAgIGZvbnQtZmFtaWx5OiAnQ291cmllciBOZXcnLCBDb3VyaWVyLCBtb25vc3BhY2U7XHJcbiAgICAgICAgZm9udC1zaXplOiAxMnB4O1xyXG4gICAgICAgIGZvbnQtc3R5bGU6IGl0YWxpYztcclxuICAgICAgICB0ZXh0LWFsaWduOiBsZWZ0O1xyXG4gICAgICAgIG1hcmdpbi1sZWZ0OiAzLjdpbjtcclxuICAgICAgICBsaW5lLWhlaWdodDogMTNweDtcclxuICAgIH1cclxuICAgIFxyXG4gICAgLyogRGlhbG9ndWUgKGg1KSAtIHBybyAjIyMjIyAqL1xyXG4gICAgLm1hcmtkb3duLXByZXZpZXctdmlldyBoNSB7XHJcbiAgICAgICAgZm9udC1mYW1pbHk6ICdDb3VyaWVyIE5ldycsIENvdXJpZXIsIG1vbm9zcGFjZTtcclxuICAgICAgICBmb250LXNpemU6IDEycHg7XHJcbiAgICAgICAgbGluZS1oZWlnaHQ6IDEzcHg7XHJcbiAgICAgICAgdGV4dC1hbGlnbjogbGVmdDtcclxuICAgICAgICBtYXJnaW4tbGVmdDogMi41aW47XHJcbiAgICAgICAgbWFyZ2luLXJpZ2h0OiAxaW47XHJcbiAgICB9XHJcbiAgICBcclxuICAgIC8qIFRyYW5zaXRpb24gKGg2KSAtIHBybyAjIyMjIyMgKi9cclxuICAgIC5tYXJrZG93bi1wcmV2aWV3LXZpZXcgaDYge1xyXG4gICAgICAgIGZvbnQtZmFtaWx5OiAnQ291cmllciBOZXcnLCBDb3VyaWVyLCBtb25vc3BhY2U7XHJcbiAgICAgICAgZm9udC1zaXplOiAxMnB4O1xyXG4gICAgICAgIGZvbnQtd2VpZ2h0OiBib2xkO1xyXG4gICAgICAgIHRleHQtdHJhbnNmb3JtOiB1cHBlcmNhc2U7XHJcbiAgICAgICAgdGV4dC1hbGlnbjogY2VudGVyO1xyXG4gICAgICAgIGxpbmUtaGVpZ2h0OiAxM3B4O1xyXG4gICAgfVxyXG4gICAgYDtcclxuICAgIGRvY3VtZW50LmhlYWQuYXBwZW5kQ2hpbGQoc3R5bGUpO1xyXG4gIH1cclxuXHJcbiAgZ2VuZXJhdGVGb3JtYXR0ZWRUZXh0KGlucHV0OiBzdHJpbmcpOiBzdHJpbmcge1xyXG4gICAgbGV0IG91dHB1dCA9IGlucHV0O1xyXG4gIFxyXG4gICAgLy8gUmVnZXggcHJvIG5haHJhemVuw60gdGFnxa8gdMWZw61kYW1pIHBvZGxlIHDFmWVkY2hvesOtaG8ga8OzZHVcclxuICAgIG91dHB1dCA9IG91dHB1dC5yZXBsYWNlKC8jICguKikvLCAobWF0Y2gsIHAxKSA9PiB7XHJcbiAgICAgIHJldHVybiBgIyAke3AxfWA7IC8vIFVkcsW+ZW7DrSBNYXJrZG93bnUgcyBwxa92b2Ruw61taSB6bmHEjWthbWlcclxuICAgIH0pO1xyXG4gICAgb3V0cHV0ID0gb3V0cHV0LnJlcGxhY2UoLyMjICguKikvLCAobWF0Y2gsIHAxKSA9PiB7XHJcbiAgICAgIHJldHVybiBgIyMgJHtwMX1gO1xyXG4gICAgfSk7XHJcbiAgICBvdXRwdXQgPSBvdXRwdXQucmVwbGFjZSgvIyMjICguKikvLCAobWF0Y2gsIHAxKSA9PiB7XHJcbiAgICAgIHJldHVybiBgIyMjICR7cDF9YDtcclxuICAgIH0pO1xyXG4gICAgb3V0cHV0ID0gb3V0cHV0LnJlcGxhY2UoLyMjIyMgKC4qKS8sIChtYXRjaCwgcDEpID0+IHtcclxuICAgICAgLy8gUMWZaWTDoW7DrSB6w6F2b3JlayBwb3V6ZSBwb2t1ZCB0YW0gamXFoXTEmyBuZWpzb3VcclxuICAgICAgaWYgKCFwMS5zdGFydHNXaXRoKCcoJykgJiYgIXAxLmVuZHNXaXRoKCcpJykpIHtcclxuICAgICAgICByZXR1cm4gYCMjIyMgKCR7cDF9KWA7XHJcbiAgICAgIH1cclxuICAgICAgcmV0dXJuIGAjIyMjICR7cDF9YDtcclxuICAgIH0pO1xyXG4gICAgb3V0cHV0ID0gb3V0cHV0LnJlcGxhY2UoLyMjIyMjICguKikvLCAobWF0Y2gsIHAxKSA9PiB7XHJcbiAgICAgIHJldHVybiBgIyMjIyMgJHtwMX1gO1xyXG4gICAgfSk7XHJcbiAgICBvdXRwdXQgPSBvdXRwdXQucmVwbGFjZSgvIyMjIyMjICguKikvLCAobWF0Y2gsIHAxKSA9PiB7XHJcbiAgICAgIHJldHVybiBgIyMjIyMjICR7cDF9YDtcclxuICAgIH0pO1xyXG4gIFxyXG4gICAgcmV0dXJuIG91dHB1dDtcclxuICB9XHJcbiAgXHJcbn1cclxuIl19