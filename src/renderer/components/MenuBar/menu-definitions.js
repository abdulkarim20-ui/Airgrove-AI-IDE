// Menu Definitions - Data structure for all menus
// Using 'item' for a clickable option and 'separator' for a dividing line.

export const fileMenu = [
    { type: 'item', label: 'New Text File', shortcut: 'Ctrl+N', action: 'new-text-file' },
    { type: 'item', label: 'New File...', shortcut: 'Ctrl+Alt+Win+N', action: 'new-file-advanced' },
    { type: 'item', label: 'New Window', shortcut: 'Ctrl+Shift+N', action: 'new-window' },
    {
        type: 'item', label: 'New Window with Profile', submenu: [
            { type: 'item', label: 'Default', action: 'new-window-profile-default' }
        ]
    },
    { type: 'separator' },
    { type: 'item', label: 'Open File...', shortcut: 'Ctrl+O', action: 'open-file' },
    { type: 'item', label: 'Open Folder...', shortcut: 'Ctrl+K Ctrl+O', action: 'open-folder' },
    { type: 'item', label: 'Open Workspace from File...', action: 'open-workspace' },
    {
        type: 'item', label: 'Open Recent', submenu: [
            { type: 'item', label: 'Reopen Closed Editor', shortcut: 'Ctrl+Shift+T', action: 'reopen-closed-editor' },
            { type: 'separator' },
            { type: 'item', label: 'Clear Recently Opened', action: 'clear-recent' }
        ]
    },
    { type: 'separator' },
    { type: 'item', label: 'Add Folder to Workspace...', action: 'add-folder-workspace' },
    { type: 'item', label: 'Save Workspace As...', action: 'save-workspace-as' },
    { type: 'item', label: 'Duplicate Workspace', action: 'duplicate-workspace' },
    { type: 'separator' },
    { type: 'item', label: 'Save', shortcut: 'Ctrl+S', action: 'save-file' },
    { type: 'item', label: 'Save As...', shortcut: 'Ctrl+Shift+S', action: 'save-as' },
    { type: 'item', label: 'Save All', shortcut: 'Ctrl+K S', action: 'save-all' }, // Added shortcut from image
    { type: 'separator' },
    {
        type: 'item', label: 'Share', submenu: [
            { type: 'item', label: 'Export Profile Template...', action: 'export-profile' }
        ]
    },
    { type: 'separator' },
    { type: 'item', label: 'Auto Save', action: 'toggle-auto-save' },
    {
        type: 'item', label: 'Preferences', submenu: [
            { type: 'item', label: 'Settings', shortcut: 'Ctrl+,', action: 'open-settings' },
            { type: 'item', label: 'Extensions', shortcut: 'Ctrl+Shift+X', action: 'open-extensions' },
            { type: 'item', label: 'Keyboard Shortcuts', shortcut: 'Ctrl+K Ctrl+S', action: 'open-keybindings' },
            { type: 'item', label: 'User Tasks', action: 'open-user-tasks' },
            { type: 'separator' },
            { type: 'item', label: 'Color Theme', shortcut: 'Ctrl+K Ctrl+T', action: 'select-color-theme' },
            { type: 'item', label: 'File Icon Theme', action: 'select-icon-theme' },
            { type: 'item', label: 'Product Icon Theme', action: 'select-product-icon-theme' }
        ]
    },
    { type: 'separator' },
    { type: 'item', label: 'Revert File', action: 'revert-file' },
    { type: 'item', label: 'Close Editor', shortcut: 'Ctrl+F4', action: 'close-editor' },
    { type: 'item', label: 'Close Folder', shortcut: 'Ctrl+K F', action: 'close-folder' },
    { type: 'item', label: 'Close Window', shortcut: 'Alt+F4', action: 'close-window' },
    { type: 'separator' },
    { type: 'item', label: 'Exit', action: 'exit' },
];

export const editMenu = [
    { type: 'item', label: 'Undo', shortcut: 'Ctrl+Z', action: 'undo' },
    { type: 'item', label: 'Redo', shortcut: 'Ctrl+Y', action: 'redo' },
    { type: 'separator' },
    { type: 'item', label: 'Cut', shortcut: 'Ctrl+X', action: 'cut' },
    { type: 'item', label: 'Copy', shortcut: 'Ctrl+C', action: 'copy' },
    { type: 'item', label: 'Paste', shortcut: 'Ctrl+V', action: 'paste' },
    { type: 'separator' },
    { type: 'item', label: 'Find', shortcut: 'Ctrl+F', action: 'find' },
    { type: 'item', label: 'Replace', shortcut: 'Ctrl+H', action: 'replace' },
    { type: 'item', label: 'Find in Files', shortcut: 'Ctrl+Shift+F', action: 'find-in-files' },
    { type: 'item', label: 'Replace in Files', shortcut: 'Ctrl+Shift+H', action: 'replace-in-files' },
    { type: 'separator' },
    { type: 'item', label: 'Toggle Line Comment', shortcut: 'Ctrl+/', action: 'toggle-line-comment' },
    { type: 'item', label: 'Toggle Block Comment', shortcut: 'Shift+Alt+A', action: 'toggle-block-comment' },
    { type: 'item', label: 'Emmet: Expand Abbreviation', shortcut: 'Tab', action: 'emmet-expand' }
];

export const selectionMenu = [
    { type: 'item', label: 'Select All', shortcut: 'Ctrl+A', action: 'select-all' },
    { type: 'item', label: 'Expand Selection', shortcut: 'Shift+Alt+Right', action: 'expand-selection' },
    { type: 'item', label: 'Shrink Selection', shortcut: 'Shift+Alt+Left', action: 'shrink-selection' },
    { type: 'separator' },
    { type: 'item', label: 'Copy Line Up', shortcut: 'Shift+Alt+Up', action: 'copy-line-up' },
    { type: 'item', label: 'Copy Line Down', shortcut: 'Shift+Alt+Down', action: 'copy-line-down' },
    { type: 'item', label: 'Move Line Up', shortcut: 'Alt+Up', action: 'move-line-up' },
    { type: 'item', label: 'Move Line Down', shortcut: 'Alt+Down', action: 'move-line-down' },
    { type: 'separator' },
    { type: 'item', label: 'Duplicate Selection', action: 'duplicate-selection' },
    { type: 'item', label: 'Add Cursor Above', shortcut: 'Ctrl+Alt+Up', action: 'add-cursor-above' },
    { type: 'item', label: 'Add Cursor Below', shortcut: 'Ctrl+Alt+Down', action: 'add-cursor-below' }
];

export const viewMenu = [
    { type: 'item', label: 'Command Palette...', shortcut: 'Ctrl+Shift+P', action: 'command-palette' },
    { type: 'item', label: 'Open View...', action: 'open-view' },
    { type: 'separator' },
    {
        type: 'item', label: 'Appearance', submenu: [
            { type: 'item', label: 'Full Screen', shortcut: 'F11', action: 'toggle-fullscreen' },
            { type: 'item', label: 'Zen Mode', shortcut: 'Ctrl+K Z', action: 'toggle-zen-mode' },
            { type: 'item', label: 'Center Layout', action: 'toggle-center-layout' },
            { type: 'separator' },
            { type: 'item', label: 'Show Menu Bar', action: 'toggle-menu-bar' },
            { type: 'item', label: 'Show Primary Side Bar', shortcut: 'Ctrl+B', action: 'toggle-sidebar' },
            { type: 'item', label: 'Show Secondary Side Bar', action: 'toggle-secondary-sidebar' },
            { type: 'item', label: 'Show Status Bar', action: 'toggle-status-bar' },
            { type: 'item', label: 'Show Activity Bar', action: 'toggle-activity-bar' },
            { type: 'item', label: 'Show Panel', shortcut: 'Ctrl+J', action: 'toggle-panel' },
            { type: 'separator' },
            { type: 'item', label: 'Move Primary Side Bar Right', action: 'move-sidebar-right' },
            {
                type: 'item', label: 'Panel Position', submenu: [
                    { type: 'item', label: 'Bottom', action: 'panel-bottom' },
                    { type: 'item', label: 'Left', action: 'panel-left' },
                    { type: 'item', label: 'Right', action: 'panel-right' }
                ]
            },
            { type: 'separator' },
            { type: 'item', label: 'Zoom In', shortcut: 'Ctrl+=', action: 'zoom-in' },
            { type: 'item', label: 'Zoom Out', shortcut: 'Ctrl+-', action: 'zoom-out' },
            { type: 'item', label: 'Reset Zoom', shortcut: 'Ctrl+Num0', action: 'reset-zoom' }
        ]
    },
    {
        type: 'item', label: 'Editor Layout', submenu: [
            { type: 'item', label: 'Split Up', action: 'split-up' },
            { type: 'item', label: 'Split Down', action: 'split-down' },
            { type: 'item', label: 'Split Left', action: 'split-left' },
            { type: 'item', label: 'Split Right', action: 'split-right' },
            { type: 'separator' },
            { type: 'item', label: 'Single', action: 'layout-single' },
            { type: 'item', label: 'Two Columns', action: 'layout-two-columns' },
            { type: 'item', label: 'Three Columns', action: 'layout-three-columns' },
            { type: 'item', label: 'Two Rows', action: 'layout-two-rows' },
            { type: 'item', label: 'Grid (2x2)', action: 'layout-grid' }
        ]
    },
    { type: 'separator' },
    { type: 'item', label: 'Explorer', shortcut: 'Ctrl+Shift+E', action: 'view-explorer' },
    { type: 'item', label: 'Search', shortcut: 'Ctrl+Shift+F', action: 'view-search' },
    { type: 'item', label: 'Source Control', shortcut: 'Ctrl+Shift+G', action: 'view-scm' },
    { type: 'item', label: 'Run', shortcut: 'Ctrl+Shift+D', action: 'view-debug' },
    { type: 'item', label: 'Extensions', shortcut: 'Ctrl+Shift+X', action: 'view-extensions' },
    { type: 'separator' },
    { type: 'item', label: 'Output', shortcut: 'Ctrl+K Ctrl+H', action: 'view-output' },
    { type: 'item', label: 'Terminal', shortcut: 'Ctrl+`', action: 'view-terminal' },
    { type: 'item', label: 'Problems', shortcut: 'Ctrl+Shift+M', action: 'view-problems' }
];

export const goMenu = [
    { type: 'item', label: 'Back', shortcut: 'Alt+Left', action: 'go-back' },
    { type: 'item', label: 'Forward', shortcut: 'Alt+Right', action: 'go-forward' },
    { type: 'item', label: 'Last Edit Location', shortcut: 'Ctrl+K Ctrl+Q', action: 'go-last-edit' },
    { type: 'separator' },
    { type: 'item', label: 'Go to File...', shortcut: 'Ctrl+P', action: 'go-to-file' },
    { type: 'item', label: 'Go to Symbol in Workspace...', shortcut: 'Ctrl+T', action: 'go-to-symbol-workspace' },
    { type: 'separator' },
    { type: 'item', label: 'Go to Symbol in Editor...', shortcut: 'Ctrl+Shift+O', action: 'go-to-symbol-editor' },
    { type: 'item', label: 'Go to Definition', shortcut: 'F12', action: 'go-to-definition' },
    { type: 'item', label: 'Go to Declaration', action: 'go-to-declaration' },
    { type: 'item', label: 'Go to Type Definition', action: 'go-to-type-definition' },
    { type: 'item', label: 'Go to Implementation', shortcut: 'Ctrl+F12', action: 'go-to-implementation' },
    { type: 'item', label: 'Go to References', shortcut: 'Shift+F12', action: 'go-to-references' },
    { type: 'separator' },
    { type: 'item', label: 'Go to Line/Column...', shortcut: 'Ctrl+G', action: 'go-to-line' },
    { type: 'item', label: 'Go to Bracket', shortcut: 'Ctrl+Shift+\\', action: 'go-to-bracket' },
    { type: 'separator' },
    { type: 'item', label: 'Next Problem', shortcut: 'F8', action: 'next-problem' },
    { type: 'item', label: 'Previous Problem', shortcut: 'Shift+F8', action: 'prev-problem' },
    { type: 'item', label: 'Next Change', shortcut: 'Alt+F3', action: 'next-change' },
    { type: 'item', label: 'Previous Change', shortcut: 'Shift+Alt+F3', action: 'prev-change' }
];

export const runMenu = [
    { type: 'item', label: 'Start Debugging', shortcut: 'F5', action: 'start-debugging' },
    { type: 'item', label: 'Run Without Debugging', shortcut: 'Ctrl+F5', action: 'run-without-debugging' },
    { type: 'item', label: 'Stop Debugging', shortcut: 'Shift+F5', action: 'stop-debugging' },
    { type: 'item', label: 'Restart Debugging', shortcut: 'Ctrl+Shift+F5', action: 'restart-debugging' },
    { type: 'separator' },
    { type: 'item', label: 'Open Configurations', action: 'open-configurations' },
    { type: 'item', label: 'Add Configuration...', action: 'add-configuration' },
    { type: 'separator' },
    { type: 'item', label: 'Toggle Breakpoint', shortcut: 'F9', action: 'toggle-breakpoint' },
    {
        type: 'item', label: 'New Breakpoint', submenu: [
            { type: 'item', label: 'Conditional Breakpoint...', action: 'new-conditional-breakpoint' },
            { type: 'item', label: 'Logpoint...', action: 'new-logpoint' }
        ]
    }
];

export const terminalMenu = [
    { type: 'item', label: 'New Terminal', shortcut: 'Ctrl+Shift+`', action: 'new-terminal' },
    { type: 'item', label: 'Split Terminal', shortcut: 'Ctrl+Shift+5', action: 'split-terminal' },
    { type: 'separator' },
    { type: 'item', label: 'Run Task...', action: 'run-task' },
    { type: 'item', label: 'Configure Tasks...', action: 'configure-tasks' },
    { type: 'item', label: 'Run Build Task...', shortcut: 'Ctrl+Shift+B', action: 'run-build-task' },
    { type: 'separator' },
    { type: 'item', label: 'Run Active File In Terminal', action: 'run-active-file' },
    { type: 'item', label: 'Run Selected Text In Active Terminal', action: 'run-selected-text' }
];

export const helpMenu = [
    { type: 'item', label: 'Welcome', action: 'welcome' },
    { type: 'item', label: 'Show All Commands', shortcut: 'Ctrl+Shift+P', action: 'command-palette' },
    { type: 'item', label: 'Documentation', action: 'documentation' },
    { type: 'item', label: 'Editor Playground', action: 'editor-playground' },
    { type: 'item', label: 'Release Notes', action: 'release-notes' },
    { type: 'separator' },
    { type: 'item', label: 'Keyboard Shortcuts Reference', shortcut: 'Ctrl+K Ctrl+R', action: 'keybindings-reference' },
    { type: 'item', label: 'Report Issue', action: 'report-issue' },
    { type: 'item', label: 'Join Us on Twitter', action: 'join-twitter' },
    { type: 'item', label: 'Search Feature Requests', action: 'search-feature-requests' },
    { type: 'separator' },
    { type: 'item', label: 'View License', action: 'view-license' },
    { type: 'item', label: 'Privacy Statement', action: 'privacy-statement' },
    { type: 'separator' },
    { type: 'item', label: 'Toggle Developer Tools', shortcut: 'Ctrl+Shift+I', action: 'toggle-dev-tools' },
    { type: 'item', label: 'About', action: 'about' }
];
