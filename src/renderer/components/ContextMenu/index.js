
// Define the structure of our context menus
const menuDefinitions = {
    file: [
        { type: 'item', label: 'Open', action: 'open-context' },
        { type: 'item', label: 'Open to the Side', action: 'open-to-side', shortcut: 'Ctrl+Enter' },
        { type: 'separator' },
        { type: 'item', label: 'Reveal in File Explorer', action: 'reveal-in-os', shortcut: 'Shift+Alt+R' },
        { type: 'separator' },
        { type: 'item', label: 'Cut', action: 'cut-file', shortcut: 'Ctrl+X' },
        { type: 'item', label: 'Copy', action: 'copy-file', shortcut: 'Ctrl+C' },
        { type: 'item', label: 'Copy Path', action: 'copy-path' },
        { type: 'item', label: 'Copy Relative Path', action: 'copy-relative-path' },
        { type: 'separator' },
        { type: 'item', label: 'Rename', action: 'rename', shortcut: 'F2' },
        { type: 'item', label: 'Delete', action: 'delete', shortcut: 'Delete' },
    ],
    folder: [
        { type: 'item', label: 'New File...', action: 'new-file-context' },
        { type: 'item', label: 'New Folder...', action: 'new-folder-context' },
        { type: 'separator' },
        { type: 'item', label: 'Reveal in File Explorer', action: 'reveal-in-os', shortcut: 'Shift+Alt+R' },
        { type: 'item', label: 'Open in Integrated Terminal', action: 'open-terminal-context' },
        { type: 'item', label: 'Find in Folder...', action: 'find-in-folder-context', shortcut: 'Shift+Alt+F' },
        { type: 'separator' },
        { type: 'item', label: 'Cut', action: 'cut-file', shortcut: 'Ctrl+X' },
        { type: 'item', label: 'Copy', action: 'copy-file', shortcut: 'Ctrl+C' },
        { type: 'item', label: 'Paste', action: 'paste-file', shortcut: 'Ctrl+V' },
        { type: 'separator' },
        { type: 'item', label: 'Copy Path', action: 'copy-path' },
        { type: 'item', label: 'Copy Relative Path', action: 'copy-relative-path' },
        { type: 'separator' },
        { type: 'item', label: 'Rename', action: 'rename', shortcut: 'F2' },
        { type: 'item', label: 'Delete', action: 'delete', shortcut: 'Delete' },
    ]
};

export class ContextMenu {
    /**
     * @param {Array} customItems - Optional. If provided, creates a menu immediately with these items.
     * @param {number} x - Optional. X position for custom menu.
     * @param {number} y - Optional. Y position for custom menu.
     */
    constructor(customItems, x, y) {
        this.menuElement = null;
        this.currentItemPath = null;
        this.activeElement = null;

        this.closeHandler = (e) => {
            if (this.menuElement && !this.menuElement.contains(e.target)) {
                this.hide();
            }
        };

        // NEW: Also close if another menu (like top bar) opens
        this.menuOpenHandler = (e) => {
            if (this.menuElement && e.detail?.source !== 'context-menu') {
                this.hide();
            }
        };

        if (customItems && typeof x === 'number' && typeof y === 'number') {
            this.showCustom(x, y, customItems);
        }
    }

    /**
     * Shows the context menu at a specific position for predefined types.
     */
    show(x, y, type, itemPath, element) {
        if (this.menuElement) this.hide();

        this.currentItemPath = itemPath;
        this.activeElement = element;
        const menuItems = menuDefinitions[type];

        if (menuItems) {
            this.menuElement = this._createMenuElement(menuItems);
            this._positionAndAppend(x, y);
        }
    }

    /**
     * Shows a custom menu with provided items
     */
    showCustom(x, y, items) {
        if (this.menuElement) this.hide();

        this.menuElement = this._createMenuElement(items);
        this._positionAndAppend(x, y);
    }

    _positionAndAppend(x, y) {
        document.body.appendChild(this.menuElement);

        const { innerWidth, innerHeight } = window;
        const menuWidth = this.menuElement.offsetWidth;
        const menuHeight = this.menuElement.offsetHeight;

        this.menuElement.style.left = `${Math.min(x, innerWidth - menuWidth - 5)}px`;
        this.menuElement.style.top = `${Math.min(y, innerHeight - menuHeight - 5)}px`;

        // Register handlers to close when clicking outside
        // setTimeout 0 ensures the current click/contextmenu that opened this doesn't immediately close it
        setTimeout(() => {
            if (this.menuElement) {
                this.menuElement.classList.add('visible');
                window.addEventListener('click', this.closeHandler);
                window.addEventListener('contextmenu', this.closeHandler);
                window.addEventListener('mousedown', this.closeHandler);
                document.addEventListener('menu-opened', this.menuOpenHandler);

                // NEW: Signal that a menu is opening
                document.dispatchEvent(new CustomEvent('menu-opened', { detail: { source: 'context-menu' } }));
            }
        }, 0);
    }

    hide() {
        if (this.menuElement) {
            this.menuElement.remove();
            this.menuElement = null;
            this.currentItemPath = null;
            this.activeElement = null;

            // Cleanup listeners to prevent memory leaks if used as disposable
            window.removeEventListener('click', this.closeHandler);
            window.removeEventListener('contextmenu', this.closeHandler);
            window.removeEventListener('mousedown', this.closeHandler);
            document.removeEventListener('menu-opened', this.menuOpenHandler);
        }
    }

    _createMenuElement(items) {
        const menu = document.createElement('div');
        menu.className = 'context-menu';

        items.forEach(item => {
            if (item.type === 'separator' || (!item.label && !item.action && !item.type)) {
                // Treat empty objects or explicit type as separator
                const separator = document.createElement('div');
                separator.className = 'context-menu-separator';
                menu.appendChild(separator);
            } else {
                const menuItem = document.createElement('div');
                menuItem.className = 'context-menu-item';

                // --- START: ADD ICON SUPPORT ---
                if (item.icon) {
                    const icon = document.createElement('i');
                    // Handle both simple codicon class or full codicon string
                    icon.className = `codicon ${item.icon.startsWith('codicon-') ? item.icon : 'codicon-' + item.icon}`;
                    menuItem.appendChild(icon);
                }
                // --- END: ADD ICON SUPPORT ---

                const label = document.createElement('span');
                label.className = 'context-menu-item-label';
                label.textContent = item.label;
                menuItem.appendChild(label);

                if (item.shortcut) {
                    const shortcut = document.createElement('span');
                    shortcut.className = 'context-menu-item-shortcut';

                    const parts = item.shortcut.split(/(\+)|(\s)/).filter(p => p !== undefined && p !== '');
                    parts.forEach(part => {
                        const span = document.createElement('span');
                        if (part === '+') {
                            span.className = 'shortcut-plus';
                            span.textContent = '+';
                        } else if (part === ' ') {
                            span.className = 'shortcut-space';
                        } else {
                            span.className = 'shortcut-key';
                            span.textContent = part;
                        }
                        shortcut.appendChild(span);
                    });
                    menuItem.appendChild(shortcut);
                }

                menuItem.addEventListener('click', (e) => {
                    e.stopPropagation(); // Prevent immediate close by window listener?

                    if (typeof item.action === 'function') {
                        // Direct callback
                        item.action();
                    } else if (typeof item.action === 'string') {
                        // Event dispatch
                        document.dispatchEvent(new CustomEvent(`${item.action}-triggered`, {
                            detail: {
                                path: this.currentItemPath,
                                element: this.activeElement
                            }
                        }));
                    }

                    this.hide();
                });

                menu.appendChild(menuItem);
            }
        });

        return menu;
    }
}
