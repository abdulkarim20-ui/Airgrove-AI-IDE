// MenuBar Component - Advanced Logic with Submenu Support
// This component handles the creation, display, and interaction of dropdown menus with nested submenus

import { fileMenu, editMenu, selectionMenu, viewMenu, goMenu, runMenu, terminalMenu, helpMenu } from './menu-definitions.js';

document.addEventListener('DOMContentLoaded', () => {
    let activeMenu = null; // To track the currently open menu element
    let activeSubMenu = null; // NEW: To track the open submenu element
    let subMenuCloseTimeout = null; // NEW: To manage closing submenus gracefully

    const menuTriggers = {
        'menubar-file-btn': fileMenu,
        'menubar-edit-btn': editMenu,
        'menubar-selection-btn': selectionMenu,
        'menubar-view-btn': viewMenu,
        'menubar-go-btn': goMenu,
        'menubar-run-btn': runMenu,
        'menubar-terminal-btn': terminalMenu, // NEW: Terminal menu
        'menubar-help-btn': helpMenu, // NEW: Help menu
    };

    /**
     * Closes any currently active menu and submenu
     */
    function closeActiveMenu() {
        if (activeSubMenu) {
            activeSubMenu.remove();
            activeSubMenu = null;
        }
        if (activeMenu) {
            activeMenu.remove();
            activeMenu = null;
        }
    }

    // NEW: Listen for other menus opening to close ourselves
    document.addEventListener('menu-opened', (e) => {
        if (e.detail?.source !== 'menubar') {
            closeActiveMenu();
        }
    });

    /**
     * Creates and returns a menu dropdown element from a definition array
     * @param {Array} menuItems - The array of menu item objects
     * @returns {HTMLElement} - The generated menu element
     */
    function createMenu(menuItems, isSubMenu = false) {
        const menu = document.createElement('div');
        menu.className = 'menu-dropdown';

        // Listen for mouse entering the submenu itself to cancel the close timer
        menu.addEventListener('mouseenter', () => {
            if (isSubMenu) clearTimeout(subMenuCloseTimeout);
        });

        menuItems.forEach(item => {
            if (item.type === 'separator') {
                const separator = document.createElement('div');
                separator.className = 'menu-separator';
                menu.appendChild(separator);
            } else {
                const menuItem = document.createElement('div');
                menuItem.className = 'menu-item';
                menuItem.setAttribute('data-action', item.action);

                const label = document.createElement('span');
                label.className = 'menu-item-label';
                label.textContent = item.label;
                menuItem.appendChild(label);

                if (item.shortcut) {
                    const shortcut = document.createElement('span');
                    shortcut.className = 'menu-item-shortcut';

                    // Split by + or space to wrap individual keys
                    const parts = item.shortcut.split(/(\+)|(\s)/).filter(p => p !== undefined && p !== '');
                    parts.forEach(part => {
                        const span = document.createElement('span');
                        if (part === '+') {
                            span.className = 'shortcut-plus';
                            span.textContent = '+';
                        } else if (part === ' ') {
                            span.className = 'shortcut-space';
                            // Just a small spacer
                        } else {
                            span.className = 'shortcut-key';
                            span.textContent = part;
                        }
                        shortcut.appendChild(span);
                    });
                    menuItem.appendChild(shortcut);
                }

                // --- NEW: Submenu Handling Logic ---
                if (item.submenu) {
                    const indicator = document.createElement('i');
                    indicator.className = 'codicon codicon-chevron-right submenu-indicator';
                    menuItem.appendChild(indicator);

                    menuItem.addEventListener('mouseenter', (e) => {
                        // Clear any pending submenu closure and close any existing submenu
                        clearTimeout(subMenuCloseTimeout);
                        if (activeSubMenu) activeSubMenu.remove();

                        // Create and position the new submenu
                        const subMenu = createMenu(item.submenu, true);
                        const parentRect = e.currentTarget.getBoundingClientRect();
                        document.body.appendChild(subMenu);
                        subMenu.style.left = `${parentRect.right - 2}px`; // Position to the right of the parent item
                        subMenu.style.top = `${parentRect.top}px`;

                        setTimeout(() => subMenu.classList.add('visible'), 0);
                        activeSubMenu = subMenu;
                    });

                    menuItem.addEventListener('mouseleave', () => {
                        // Set a timer to close the submenu, allowing the user to move into it
                        subMenuCloseTimeout = setTimeout(() => {
                            if (activeSubMenu) {
                                activeSubMenu.remove();
                                activeSubMenu = null;
                            }
                        }, 200); // 200ms delay
                    });
                }
                // --- END: Submenu Handling Logic ---

                menu.appendChild(menuItem);
            }
        });

        // Event listener for clicks on menu items
        menu.addEventListener('click', (e) => {
            const action = e.target.closest('.menu-item')?.dataset.action;
            if (action) {
                console.log(`Action triggered: ${action}`);

                // --- START: THE FIX IS HERE ---
                // Dispatch a global event for this action so other components can listen
                document.dispatchEvent(new CustomEvent(`${action}-triggered`));
                // --- END: THE FIX ---

                // Handle direct API calls
                if (action === 'toggle-dev-tools') {
                    window.electronAPI.toggleDevTools();
                }
                // --- END: THE FIX ---

                closeActiveMenu();
            }
        });

        return menu;
    }

    // Attach click listeners to all menu bar buttons
    for (const [btnId, menuData] of Object.entries(menuTriggers)) {
        const btn = document.getElementById(btnId);
        if (btn) {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();

                // If the same menu button is clicked again, just close the menu.
                if (activeMenu && activeMenu.dataset.owner === btnId) {
                    closeActiveMenu();
                    return;
                }

                closeActiveMenu();

                // NEW: Notify others that we are opening a menu
                document.dispatchEvent(new CustomEvent('menu-opened', { detail: { source: 'menubar' } }));

                const menu = createMenu(menuData);
                menu.dataset.owner = btnId; // Track which button opened this menu
                const rect = btn.getBoundingClientRect();

                document.body.appendChild(menu);
                menu.style.left = `${rect.left}px`;
                menu.style.top = `${rect.bottom}px`;

                setTimeout(() => menu.classList.add('visible'), 0);
                activeMenu = menu;
            });
        }
    }

    // Global listener to close the menu when clicking outside
    window.addEventListener('click', () => {
        closeActiveMenu();
    });
});
