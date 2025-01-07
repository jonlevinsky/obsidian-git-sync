"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const obsidian_1 = require("obsidian");
class StyleTextPlugin extends obsidian_1.Plugin {
    onload() {
        // Add commands to apply styles
        this.addCommand({
            id: 'assign-scene-heading-style',
            name: 'Assign Scene Heading Style',
            callback: () => this.applyStyleToSelection('scene-heading')
        });
        this.addCommand({
            id: 'assign-action-style',
            name: 'Assign Action Style',
            callback: () => this.applyStyleToSelection('action')
        });
        this.addCommand({
            id: 'assign-character-style',
            name: 'Assign Character Style',
            callback: () => this.applyStyleToSelection('character')
        });
        this.addCommand({
            id: 'assign-parentheticals-style',
            name: 'Assign Parentheticals Style',
            callback: () => this.applyStyleToSelection('parentheticals')
        });
        this.addCommand({
            id: 'assign-dialogue-style',
            name: 'Assign Dialogue Style',
            callback: () => this.applyStyleToSelection('dialogue')
        });
        this.addCommand({
            id: 'assign-transition-style',
            name: 'Assign Transition Style',
            callback: () => this.applyStyleToSelection('transition')
        });
    }
    applyStyleToSelection(style) {
        const activeLeaf = this.app.workspace.activeLeaf;
        if (!activeLeaf || !activeLeaf.view) {
            return;
        }
        const view = activeLeaf.view;
        // Check if the view is a MarkdownView (which has the sourceMode and editor properties)
        if (view instanceof obsidian_1.MarkdownView) {
            let editor;
            // Check if the view is in source mode
            if (view.sourceMode) {
                editor = view.sourceMode.cmEditor;
            }
            else {
                editor = view.editor;
            }
            if (!editor) {
                return;
            }
            const selection = editor.getSelection();
            const styledText = `<${style}>${selection}</${style}>`;
            editor.replaceSelection(styledText);
        }
    }
}
exports.default = StyleTextPlugin;
