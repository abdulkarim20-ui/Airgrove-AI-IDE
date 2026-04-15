export function initializeMonaco() {
  // --- VS Code "Dark Modern" Rich Theme Definition ---
  monaco.editor.defineTheme('vscode-dark-modern', {
    base: 'vs-dark',
    inherit: true,
    rules: [
      { token: 'keyword', foreground: '569CD6' },
      { token: 'string', foreground: 'CE9178' },
      { token: 'comment', foreground: '6A9955', fontStyle: 'italic' },
      { token: 'number', foreground: 'B5CEA8' },
      { token: 'type', foreground: '4EC9B0' },
      { token: 'class', foreground: '4EC9B0' },
      { token: 'interface', foreground: '4EC9B0' },
      { token: 'enum', foreground: '4EC9B0' },
      { token: 'variable', foreground: '9CDCFE' },
      { token: 'variable.parameter', foreground: '9CDCFE' },
      { token: 'variable.predefined', foreground: '9CDCFE' },
      { token: 'function', foreground: 'DCDCAA' },
      { token: 'method', foreground: 'DCDCAA' },
      { token: 'property', foreground: '9CDCFE' },
      { token: 'tag', foreground: '569CD6' },
      { token: 'attribute.name', foreground: '9CDCFE' },
      { token: 'attribute.value', foreground: 'CE9178' },
    ],
    colors: {
      'editor.background': '#1a1b1d',
      'editor.foreground': '#D4D4D4',
      'editorLineNumber.foreground': '#858585',
      'editorLineNumber.activeForeground': '#C6C6C6',
      'editorIndentGuide.background': '#333333',
      'editorIndentGuide.activeBackground': '#707070',
      'editor.selectionBackground': '#264F78',
      'editor.inactiveSelectionBackground': '#3A3D41',
      'editor.lineHighlightBackground': '#2a2d2e',
      'editorCursor.foreground': '#AEAFAD',
      'editorWhitespace.foreground': '#3B3B3B',
      'editorWidget.background': '#252526',
      'editorWidget.border': '#454545',
      'editorSuggestWidget.background': '#252526',
      'editorSuggestWidget.border': '#454545',
      'editorSuggestWidget.selectedBackground': '#063B51',
      'editorHoverWidget.background': '#252526',
      'editorHoverWidget.border': '#454545',
      'editorBracketMatch.background': '#00d4ff33',
      'editorBracketMatch.border': '#888888',
      'editorStickyScroll.background': '#1a1b1d',
      'editorStickyScrollHover.background': '#2a2d2e',

      // --- NEW: RICH MINIMAP COLORS ---
      'minimap.background': '#1a1b1d',
      'minimap.selectionHighlight': '#264F78',
      'minimap.findMatchHighlight': '#d18616',
      'minimap.selectionOccurrenceHighlight': '#c0c0c01a',
      'minimap.errorHighlight': '#ff1212',
      'minimap.warningHighlight': '#cca700',
      'minimapGutter.addedBackground': '#487e02',
      'minimapGutter.modifiedBackground': '#1b81a8',
      'minimapGutter.deletedBackground': '#f14c4c',
      'minimapSlider.background': '#ffffff15',
      'minimapSlider.hoverBackground': '#ffffff30',
      'minimapSlider.activeBackground': '#ffffff4c',

      'peekView.border': '#007acc',
      'peekViewEditor.background': '#001f33',
      'peekViewResult.background': '#252526',
      'peekViewTitle.background': '#252526',
    }
  });

  // --- Enable Deep JavaScript/TypeScript IntelliSense ---
  const tsDefaults = monaco.languages.typescript.typescriptDefaults;
  const jsDefaults = monaco.languages.typescript.javascriptDefaults;

  const compilerOptions = {
    target: monaco.languages.typescript.ScriptTarget.ESNext,
    module: monaco.languages.typescript.ModuleKind.ESNext,
    allowNonTsExtensions: true,
    checkJs: true, // Enable type checking for JS
    allowJs: true,
    lib: ['esnext', 'dom', 'dom.iterable'] // Full standard library
  };

  tsDefaults.setCompilerOptions(compilerOptions);
  jsDefaults.setCompilerOptions(compilerOptions);

  tsDefaults.setDiagnosticsOptions({
    noSemanticValidation: false,
    noSyntaxValidation: false
  });

  jsDefaults.setDiagnosticsOptions({
    noSemanticValidation: false,
    noSyntaxValidation: false
  });

  // Enable JSON validation by default
  monaco.languages.json.jsonDefaults.setDiagnosticsOptions({
    validate: true,
    allowComments: true,
    schemas: []
  });
}
