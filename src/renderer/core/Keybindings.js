// This file defines the mapping between keyboard shortcuts and the actions they trigger.
// Actions are dispatched as CustomEvents that other components can listen for.

export const keybindings = [
    // File Operations
    { key: 'Ctrl+N', action: 'new-text-file-triggered' },
    { key: 'Ctrl+O', action: 'open-file-triggered' },
    { key: 'Ctrl+K Ctrl+O', action: 'open-folder-triggered' },
    { key: 'Ctrl+S', action: 'save-file-triggered' },

    // Search and Command Palette
    { key: 'Ctrl+P', action: 'quick-search-triggered' },
    { key: 'Ctrl+Shift+P', action: 'command-palette-triggered' },
];

