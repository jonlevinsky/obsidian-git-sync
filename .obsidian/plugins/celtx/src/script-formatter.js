import { __awaiter } from "tslib";
import { MarkdownView } from 'obsidian';
export class ScriptFormatter {
    constructor(app, plugin) {
        this.app = app;
        this.plugin = plugin;
    }
    formatScript() {
        return __awaiter(this, void 0, void 0, function* () {
            const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
            if (!activeView)
                return;
            const editor = activeView.editor;
            const content = editor.getValue();
            if (this.hasStyleScriptTag(content)) {
                const formattedContent = this.generateFormattedText(content);
                editor.setValue(formattedContent);
                this.applyStyleScript();
            }
        });
    }
    hasStyleScriptTag(content) {
        return content.includes('style:script');
    }
    applyStyleScript() {
        const style = document.createElement('style');
        style.id = 'script-formatting-style';
        style.textContent = `
            /* Celkový styl pro scénář */
            .cm-s-obsidian .HyperMD-header-1,
            .cm-s-obsidian .HyperMD-header-2,
            .cm-s-obsidian .HyperMD-header-3,
            .cm-s-obsidian .HyperMD-header-4,
            .cm-s-obsidian .HyperMD-header-5,
            .cm-s-obsidian .HyperMD-header-6 {
                font-family: 'Courier New', Courier, monospace;
                font-size: 12px;
                line-height: 13px;
            }

            /* Scene Heading (h1) */
            .cm-s-obsidian .HyperMD-header-1 {
                font-weight: bold;
                text-transform: uppercase;
                background-color: #D3D3D3;
                color: #1e1e1e;
                padding: 0.1in 0;
                text-align: left;
                letter-spacing: 1px;
            }

            /* Action (h2) */
            .cm-s-obsidian .HyperMD-header-2 {
                text-align: justify;
            }

            /* Character (h3) */
            .cm-s-obsidian .HyperMD-header-3 {
                font-weight: bold;
                text-transform: uppercase;
                text-align: left;
                margin-left: 3.7in;
            }

            /* Parentheticals (h4) */
            .cm-s-obsidian .HyperMD-header-4 {
                font-style: italic;
                text-align: left;
                margin-left: 3.7in;
            }

            /* Dialogue (h5) */
            .cm-s-obsidian .HyperMD-header-5 {
                text-align: left;
                margin-left: 2.5in;
                margin-right: 1in;
            }

            /* Transition (h6) */
            .cm-s-obsidian .HyperMD-header-6 {
                font-weight: bold;
                text-transform: uppercase;
                text-align: center;
            }
        `;
        document.head.appendChild(style);
    }
    generateFormattedText(input) {
        let output = input;
        // Regex pro nahrazení tagů třídami podle předchozího kódu
        output = output.replace(/# (.*)/, (match, p1) => `# ${p1}`);
        output = output.replace(/## (.*)/, (match, p1) => `## ${p1}`);
        output = output.replace(/### (.*)/, (match, p1) => `### ${p1}`);
        output = output.replace(/#### (.*)/, (match, p1) => {
            if (!p1.startsWith('(') && !p1.endsWith(')')) {
                return `#### (${p1})`;
            }
            return `#### ${p1}`;
        });
        output = output.replace(/##### (.*)/, (match, p1) => `##### ${p1}`);
        output = output.replace(/###### (.*)/, (match, p1) => `###### ${p1}`);
        return output;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2NyaXB0LWZvcm1hdHRlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uL29ic2lkaWFuIHBsdWdpbi9jZWx0eC9zcmMvc2NyaXB0LWZvcm1hdHRlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUEsT0FBTyxFQUFPLFlBQVksRUFBRSxNQUFNLFVBQVUsQ0FBQztBQUc3QyxNQUFNLE9BQU8sZUFBZTtJQUN4QixZQUFvQixHQUFRLEVBQVUsTUFBMkI7UUFBN0MsUUFBRyxHQUFILEdBQUcsQ0FBSztRQUFVLFdBQU0sR0FBTixNQUFNLENBQXFCO0lBQUcsQ0FBQztJQUUvRCxZQUFZOztZQUNkLE1BQU0sVUFBVSxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsU0FBUyxDQUFDLG1CQUFtQixDQUFDLFlBQVksQ0FBQyxDQUFDO1lBQ3hFLElBQUksQ0FBQyxVQUFVO2dCQUFFLE9BQU87WUFFeEIsTUFBTSxNQUFNLEdBQUcsVUFBVSxDQUFDLE1BQU0sQ0FBQztZQUNqQyxNQUFNLE9BQU8sR0FBRyxNQUFNLENBQUMsUUFBUSxFQUFFLENBQUM7WUFFbEMsSUFBSSxJQUFJLENBQUMsaUJBQWlCLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQztnQkFDbEMsTUFBTSxnQkFBZ0IsR0FBRyxJQUFJLENBQUMscUJBQXFCLENBQUMsT0FBTyxDQUFDLENBQUM7Z0JBQzdELE1BQU0sQ0FBQyxRQUFRLENBQUMsZ0JBQWdCLENBQUMsQ0FBQztnQkFDbEMsSUFBSSxDQUFDLGdCQUFnQixFQUFFLENBQUM7WUFDNUIsQ0FBQztRQUNMLENBQUM7S0FBQTtJQUVPLGlCQUFpQixDQUFDLE9BQWU7UUFDckMsT0FBTyxPQUFPLENBQUMsUUFBUSxDQUFDLGNBQWMsQ0FBQyxDQUFDO0lBQzVDLENBQUM7SUFFTyxnQkFBZ0I7UUFDcEIsTUFBTSxLQUFLLEdBQUcsUUFBUSxDQUFDLGFBQWEsQ0FBQyxPQUFPLENBQUMsQ0FBQztRQUM5QyxLQUFLLENBQUMsRUFBRSxHQUFHLHlCQUF5QixDQUFDO1FBQ3JDLEtBQUssQ0FBQyxXQUFXLEdBQUc7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztTQXlEbkIsQ0FBQztRQUNGLFFBQVEsQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxDQUFDO0lBQ3JDLENBQUM7SUFFTyxxQkFBcUIsQ0FBQyxLQUFhO1FBQ3ZDLElBQUksTUFBTSxHQUFHLEtBQUssQ0FBQztRQUVuQiwwREFBMEQ7UUFDMUQsTUFBTSxHQUFHLE1BQU0sQ0FBQyxPQUFPLENBQUMsUUFBUSxFQUFFLENBQUMsS0FBSyxFQUFFLEVBQUUsRUFBRSxFQUFFLENBQUMsS0FBSyxFQUFFLEVBQUUsQ0FBQyxDQUFDO1FBQzVELE1BQU0sR0FBRyxNQUFNLENBQUMsT0FBTyxDQUFDLFNBQVMsRUFBRSxDQUFDLEtBQUssRUFBRSxFQUFFLEVBQUUsRUFBRSxDQUFDLE1BQU0sRUFBRSxFQUFFLENBQUMsQ0FBQztRQUM5RCxNQUFNLEdBQUcsTUFBTSxDQUFDLE9BQU8sQ0FBQyxVQUFVLEVBQUUsQ0FBQyxLQUFLLEVBQUUsRUFBRSxFQUFFLEVBQUUsQ0FBQyxPQUFPLEVBQUUsRUFBRSxDQUFDLENBQUM7UUFDaEUsTUFBTSxHQUFHLE1BQU0sQ0FBQyxPQUFPLENBQUMsV0FBVyxFQUFFLENBQUMsS0FBSyxFQUFFLEVBQUUsRUFBRSxFQUFFO1lBQy9DLElBQUksQ0FBQyxFQUFFLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDO2dCQUMzQyxPQUFPLFNBQVMsRUFBRSxHQUFHLENBQUM7WUFDMUIsQ0FBQztZQUNELE9BQU8sUUFBUSxFQUFFLEVBQUUsQ0FBQztRQUN4QixDQUFDLENBQUMsQ0FBQztRQUNILE1BQU0sR0FBRyxNQUFNLENBQUMsT0FBTyxDQUFDLFlBQVksRUFBRSxDQUFDLEtBQUssRUFBRSxFQUFFLEVBQUUsRUFBRSxDQUFDLFNBQVMsRUFBRSxFQUFFLENBQUMsQ0FBQztRQUNwRSxNQUFNLEdBQUcsTUFBTSxDQUFDLE9BQU8sQ0FBQyxhQUFhLEVBQUUsQ0FBQyxLQUFLLEVBQUUsRUFBRSxFQUFFLEVBQUUsQ0FBQyxVQUFVLEVBQUUsRUFBRSxDQUFDLENBQUM7UUFFdEUsT0FBTyxNQUFNLENBQUM7SUFDbEIsQ0FBQztDQUNKIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgQXBwLCBNYXJrZG93blZpZXcgfSBmcm9tICdvYnNpZGlhbic7XHJcbmltcG9ydCBTY3JpcHRXcml0aW5nUGx1Z2luIGZyb20gJy4vbWFpbic7XHJcblxyXG5leHBvcnQgY2xhc3MgU2NyaXB0Rm9ybWF0dGVyIHtcclxuICAgIGNvbnN0cnVjdG9yKHByaXZhdGUgYXBwOiBBcHAsIHByaXZhdGUgcGx1Z2luOiBTY3JpcHRXcml0aW5nUGx1Z2luKSB7fVxyXG5cclxuICAgIGFzeW5jIGZvcm1hdFNjcmlwdCgpIHtcclxuICAgICAgICBjb25zdCBhY3RpdmVWaWV3ID0gdGhpcy5hcHAud29ya3NwYWNlLmdldEFjdGl2ZVZpZXdPZlR5cGUoTWFya2Rvd25WaWV3KTtcclxuICAgICAgICBpZiAoIWFjdGl2ZVZpZXcpIHJldHVybjtcclxuXHJcbiAgICAgICAgY29uc3QgZWRpdG9yID0gYWN0aXZlVmlldy5lZGl0b3I7XHJcbiAgICAgICAgY29uc3QgY29udGVudCA9IGVkaXRvci5nZXRWYWx1ZSgpO1xyXG5cclxuICAgICAgICBpZiAodGhpcy5oYXNTdHlsZVNjcmlwdFRhZyhjb250ZW50KSkge1xyXG4gICAgICAgICAgICBjb25zdCBmb3JtYXR0ZWRDb250ZW50ID0gdGhpcy5nZW5lcmF0ZUZvcm1hdHRlZFRleHQoY29udGVudCk7XHJcbiAgICAgICAgICAgIGVkaXRvci5zZXRWYWx1ZShmb3JtYXR0ZWRDb250ZW50KTtcclxuICAgICAgICAgICAgdGhpcy5hcHBseVN0eWxlU2NyaXB0KCk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgaGFzU3R5bGVTY3JpcHRUYWcoY29udGVudDogc3RyaW5nKTogYm9vbGVhbiB7XHJcbiAgICAgICAgcmV0dXJuIGNvbnRlbnQuaW5jbHVkZXMoJ3N0eWxlOnNjcmlwdCcpO1xyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgYXBwbHlTdHlsZVNjcmlwdCgpIHtcclxuICAgICAgICBjb25zdCBzdHlsZSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3N0eWxlJyk7XHJcbiAgICAgICAgc3R5bGUuaWQgPSAnc2NyaXB0LWZvcm1hdHRpbmctc3R5bGUnO1xyXG4gICAgICAgIHN0eWxlLnRleHRDb250ZW50ID0gYFxyXG4gICAgICAgICAgICAvKiBDZWxrb3bDvSBzdHlsIHBybyBzY8OpbsOhxZkgKi9cclxuICAgICAgICAgICAgLmNtLXMtb2JzaWRpYW4gLkh5cGVyTUQtaGVhZGVyLTEsXHJcbiAgICAgICAgICAgIC5jbS1zLW9ic2lkaWFuIC5IeXBlck1ELWhlYWRlci0yLFxyXG4gICAgICAgICAgICAuY20tcy1vYnNpZGlhbiAuSHlwZXJNRC1oZWFkZXItMyxcclxuICAgICAgICAgICAgLmNtLXMtb2JzaWRpYW4gLkh5cGVyTUQtaGVhZGVyLTQsXHJcbiAgICAgICAgICAgIC5jbS1zLW9ic2lkaWFuIC5IeXBlck1ELWhlYWRlci01LFxyXG4gICAgICAgICAgICAuY20tcy1vYnNpZGlhbiAuSHlwZXJNRC1oZWFkZXItNiB7XHJcbiAgICAgICAgICAgICAgICBmb250LWZhbWlseTogJ0NvdXJpZXIgTmV3JywgQ291cmllciwgbW9ub3NwYWNlO1xyXG4gICAgICAgICAgICAgICAgZm9udC1zaXplOiAxMnB4O1xyXG4gICAgICAgICAgICAgICAgbGluZS1oZWlnaHQ6IDEzcHg7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIC8qIFNjZW5lIEhlYWRpbmcgKGgxKSAqL1xyXG4gICAgICAgICAgICAuY20tcy1vYnNpZGlhbiAuSHlwZXJNRC1oZWFkZXItMSB7XHJcbiAgICAgICAgICAgICAgICBmb250LXdlaWdodDogYm9sZDtcclxuICAgICAgICAgICAgICAgIHRleHQtdHJhbnNmb3JtOiB1cHBlcmNhc2U7XHJcbiAgICAgICAgICAgICAgICBiYWNrZ3JvdW5kLWNvbG9yOiAjRDNEM0QzO1xyXG4gICAgICAgICAgICAgICAgY29sb3I6ICMxZTFlMWU7XHJcbiAgICAgICAgICAgICAgICBwYWRkaW5nOiAwLjFpbiAwO1xyXG4gICAgICAgICAgICAgICAgdGV4dC1hbGlnbjogbGVmdDtcclxuICAgICAgICAgICAgICAgIGxldHRlci1zcGFjaW5nOiAxcHg7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIC8qIEFjdGlvbiAoaDIpICovXHJcbiAgICAgICAgICAgIC5jbS1zLW9ic2lkaWFuIC5IeXBlck1ELWhlYWRlci0yIHtcclxuICAgICAgICAgICAgICAgIHRleHQtYWxpZ246IGp1c3RpZnk7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIC8qIENoYXJhY3RlciAoaDMpICovXHJcbiAgICAgICAgICAgIC5jbS1zLW9ic2lkaWFuIC5IeXBlck1ELWhlYWRlci0zIHtcclxuICAgICAgICAgICAgICAgIGZvbnQtd2VpZ2h0OiBib2xkO1xyXG4gICAgICAgICAgICAgICAgdGV4dC10cmFuc2Zvcm06IHVwcGVyY2FzZTtcclxuICAgICAgICAgICAgICAgIHRleHQtYWxpZ246IGxlZnQ7XHJcbiAgICAgICAgICAgICAgICBtYXJnaW4tbGVmdDogMy43aW47XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIC8qIFBhcmVudGhldGljYWxzIChoNCkgKi9cclxuICAgICAgICAgICAgLmNtLXMtb2JzaWRpYW4gLkh5cGVyTUQtaGVhZGVyLTQge1xyXG4gICAgICAgICAgICAgICAgZm9udC1zdHlsZTogaXRhbGljO1xyXG4gICAgICAgICAgICAgICAgdGV4dC1hbGlnbjogbGVmdDtcclxuICAgICAgICAgICAgICAgIG1hcmdpbi1sZWZ0OiAzLjdpbjtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgLyogRGlhbG9ndWUgKGg1KSAqL1xyXG4gICAgICAgICAgICAuY20tcy1vYnNpZGlhbiAuSHlwZXJNRC1oZWFkZXItNSB7XHJcbiAgICAgICAgICAgICAgICB0ZXh0LWFsaWduOiBsZWZ0O1xyXG4gICAgICAgICAgICAgICAgbWFyZ2luLWxlZnQ6IDIuNWluO1xyXG4gICAgICAgICAgICAgICAgbWFyZ2luLXJpZ2h0OiAxaW47XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIC8qIFRyYW5zaXRpb24gKGg2KSAqL1xyXG4gICAgICAgICAgICAuY20tcy1vYnNpZGlhbiAuSHlwZXJNRC1oZWFkZXItNiB7XHJcbiAgICAgICAgICAgICAgICBmb250LXdlaWdodDogYm9sZDtcclxuICAgICAgICAgICAgICAgIHRleHQtdHJhbnNmb3JtOiB1cHBlcmNhc2U7XHJcbiAgICAgICAgICAgICAgICB0ZXh0LWFsaWduOiBjZW50ZXI7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICBgO1xyXG4gICAgICAgIGRvY3VtZW50LmhlYWQuYXBwZW5kQ2hpbGQoc3R5bGUpO1xyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgZ2VuZXJhdGVGb3JtYXR0ZWRUZXh0KGlucHV0OiBzdHJpbmcpOiBzdHJpbmcge1xyXG4gICAgICAgIGxldCBvdXRwdXQgPSBpbnB1dDtcclxuICAgIFxyXG4gICAgICAgIC8vIFJlZ2V4IHBybyBuYWhyYXplbsOtIHRhZ8WvIHTFmcOtZGFtaSBwb2RsZSBwxZllZGNob3rDrWhvIGvDs2R1XHJcbiAgICAgICAgb3V0cHV0ID0gb3V0cHV0LnJlcGxhY2UoLyMgKC4qKS8sIChtYXRjaCwgcDEpID0+IGAjICR7cDF9YCk7XHJcbiAgICAgICAgb3V0cHV0ID0gb3V0cHV0LnJlcGxhY2UoLyMjICguKikvLCAobWF0Y2gsIHAxKSA9PiBgIyMgJHtwMX1gKTtcclxuICAgICAgICBvdXRwdXQgPSBvdXRwdXQucmVwbGFjZSgvIyMjICguKikvLCAobWF0Y2gsIHAxKSA9PiBgIyMjICR7cDF9YCk7XHJcbiAgICAgICAgb3V0cHV0ID0gb3V0cHV0LnJlcGxhY2UoLyMjIyMgKC4qKS8sIChtYXRjaCwgcDEpID0+IHtcclxuICAgICAgICAgICAgaWYgKCFwMS5zdGFydHNXaXRoKCcoJykgJiYgIXAxLmVuZHNXaXRoKCcpJykpIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiBgIyMjIyAoJHtwMX0pYDtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICByZXR1cm4gYCMjIyMgJHtwMX1gO1xyXG4gICAgICAgIH0pO1xyXG4gICAgICAgIG91dHB1dCA9IG91dHB1dC5yZXBsYWNlKC8jIyMjIyAoLiopLywgKG1hdGNoLCBwMSkgPT4gYCMjIyMjICR7cDF9YCk7XHJcbiAgICAgICAgb3V0cHV0ID0gb3V0cHV0LnJlcGxhY2UoLyMjIyMjIyAoLiopLywgKG1hdGNoLCBwMSkgPT4gYCMjIyMjIyAke3AxfWApO1xyXG4gICAgXHJcbiAgICAgICAgcmV0dXJuIG91dHB1dDtcclxuICAgIH1cclxufVxyXG5cclxuIl19