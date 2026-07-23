const { Plugin, MarkdownView } = require('obsidian');

const MOC_PATHS = [
  'Film & Foto/Film & Foto.md',
  'Databaze/Film/Film.md',
  'Produkce/Produkce.md',
  'Škola/Škola.md',
  'Život/Život.md',
  'Homepage.md',
  'System/Tasks/Tasks.md'
];

module.exports = class MocReadingViewPlugin extends Plugin {
  async onload() {
    this.registerEvent(
      this.app.workspace.on('active-leaf-change', () => {
        setTimeout(() => {
          const view = this.app.workspace.getActiveViewOfType(MarkdownView);
          if (!view || !view.file) return;
          if (!MOC_PATHS.includes(view.file.path)) return;
          const state = view.getState();
          if (state && state.mode !== 'preview') {
            state.mode = 'preview';
            state.source = false;
            view.setState(state, { history: false });
          }
        }, 200);
      })
    );
  }
};
