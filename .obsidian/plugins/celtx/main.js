"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const obsidian_1 = require("obsidian");
class StyleTextPlugin extends obsidian_1.Plugin {
    onload() {
        // Add commands to apply styles
        this.addCommand({
            id: 'assign-scene-heading-style',
            name: 'Assign Scene Heading Style',
            callback: () => this.applyStyleToSelection('h1') // Use <h1> for scene heading
        });
        this.addCommand({
            id: 'assign-action-style',
            name: 'Assign Action Style',
            callback: () => this.applyStyleToSelection('h2') // Use <h2> for action
        });
        this.addCommand({
            id: 'assign-character-style',
            name: 'Assign Character Style',
            callback: () => this.applyStyleToSelection('h3') // Use <h3> for character
        });
        this.addCommand({
            id: 'assign-parentheticals-style',
            name: 'Assign Parentheticals Style',
            callback: () => this.applyStyleToSelection('h4') // Use <h4> for parentheticals
        });
        this.addCommand({
            id: 'assign-dialogue-style',
            name: 'Assign Dialogue Style',
            callback: () => this.applyStyleToSelection('h5') // Use <h5> for dialogue
        });
        this.addCommand({
            id: 'assign-transition-style',
            name: 'Assign Transition Style',
            callback: () => this.applyStyleToSelection('h6') // Use <h6> for transition
        });
    }
    applyStyleToSelection(tag) {
        const activeLeaf = this.app.workspace.activeLeaf;
        if (!activeLeaf || !activeLeaf.view) {
            return;
        }
        const view = activeLeaf.view;
        // Check if the view is a MarkdownView (which has the editor property)
        if (view instanceof obsidian_1.MarkdownView) {
            const editor = view.editor;
            if (!editor) {
                return;
            }
            const selection = editor.getSelection();
            const styledText = `<${tag}>${selection}</${tag}>`;
            editor.replaceSelection(styledText);
        }
    }
}
exports.default = StyleTextPlugin;
