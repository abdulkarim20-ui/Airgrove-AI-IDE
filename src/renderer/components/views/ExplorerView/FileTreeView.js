// File Tree View Component
// Renders the interactive file tree with proper icons and expand/collapse functionality

import { getIconForFile, getIconForFolder } from '../../../utils/file-icons.js';
import { explorerState } from './explorer-state.js'; // ADD THIS IMPORT
import { ContextMenu } from '../../ContextMenu/index.js';

export class FileTreeView {
    constructor(container) {
        this.container = container;
        // --- START: MODIFICATION ---
        // This Set will remember the paths of all expanded folders.
        this.expandedFolders = new Set();
        // --- END: MODIFICATION ---
        this.contextMenu = new ContextMenu();

        // --- START: ADD KEYBOARD NAVIGATION LISTENER ---
        this.container.addEventListener('keydown', (e) => this.handleKeyboardNavigation(e));
        // --- END: ADD KEYBOARD NAVIGATION LISTENER ---

        // --- START: CUSTOM DRAG GHOST SETUP ---
        this.dragGhost = document.createElement('div');
        this.dragGhost.className = 'ag-drag-ghost';
        document.body.appendChild(this.dragGhost);
        // --- END: CUSTOM DRAG GHOST SETUP ---
    }

    // --- START: ADD KEYBOARD HANDLING LOGIC ---
    handleKeyboardNavigation(e) {
        // Only handle navigation keys
        const navKeys = ['ArrowDown', 'ArrowUp', 'ArrowRight', 'ArrowLeft', 'Enter', ' '];
        if (!navKeys.includes(e.key)) return;

        e.preventDefault(); // Prevent default scrolling

        const activeItem = this.container.querySelector('.tree-item.active');
        if (!activeItem) return;

        switch (e.key) {
            case 'ArrowDown':
                this.navigateDown(activeItem);
                break;
            case 'ArrowUp':
                this.navigateUp(activeItem);
                break;
            case 'ArrowRight':
                this.navigateRight(activeItem);
                break;
            case 'ArrowLeft':
                this.navigateLeft(activeItem);
                break;
            case 'Enter':
            case ' ':
                const header = activeItem.querySelector('.tree-item-header');
                if (header) header.click(); // Simulate click to toggle or open
                break;
        }
    }

    getAllVisibleItems() {
        // Flatten the tree checking for visibility (parent not collapsed)
        // This is a naive implementation but works for reasonable tree sizes.
        // A robust one stays in DOM.
        const allItems = Array.from(this.container.querySelectorAll('.tree-item'));
        return allItems.filter(item => {
            // Check if any parent ul has 'collapsed' class
            let parent = item.parentElement; // should be ul, or null for root
            while (parent && parent !== this.container) {
                if (parent.classList.contains('collapsed')) return false;
                parent = parent.parentElement; // should be li
                if (parent) parent = parent.parentElement; // should be visible ul
            }
            return true;
        });
    }

    navigateDown(currentItem) {
        const visibleItems = this.getAllVisibleItems();
        const currentIndex = visibleItems.indexOf(currentItem);
        if (currentIndex < visibleItems.length - 1) {
            this.setActiveItem(visibleItems[currentIndex + 1]);
        }
    }

    navigateUp(currentItem) {
        const visibleItems = this.getAllVisibleItems();
        const currentIndex = visibleItems.indexOf(currentItem);
        if (currentIndex > 0) {
            this.setActiveItem(visibleItems[currentIndex - 1]);
        }
    }

    navigateRight(currentItem) {
        if (currentItem.classList.contains('folder')) {
            const childrenUl = currentItem.querySelector('.tree-item-children');

            // If collapsed, expand it
            if (childrenUl && childrenUl.classList.contains('collapsed')) {
                const header = currentItem.querySelector('.tree-item-header');
                if (header) header.click(); // Expand
            } else {
                // If already expanded, go to first child
                this.navigateDown(currentItem);
            }
        }
    }

    navigateLeft(currentItem) {
        if (currentItem.classList.contains('folder')) {
            const childrenUl = currentItem.querySelector('.tree-item-children');
            // If expanded, collapse it
            if (childrenUl && !childrenUl.classList.contains('collapsed')) {
                const header = currentItem.querySelector('.tree-item-header');
                if (header) header.click(); // Collapse
                return;
            }
        }

        // Go to parent folder
        // DOM Structure: li.tree-item > ul.tree-item-children > li.tree-item (current)
        const parentUl = currentItem.parentElement;
        if (parentUl && parentUl.parentElement && parentUl.parentElement.classList.contains('tree-item')) {
            this.setActiveItem(parentUl.parentElement);
        }
    }

    setActiveItem(item) {
        const currentActive = this.container.querySelector('.tree-item.active');
        if (currentActive) currentActive.classList.remove('active');
        item.classList.add('active');
        item.scrollIntoView({ block: 'nearest' });
    }
    // --- END: ADD KEYBOARD HANDLING LOGIC ---

    render(treeData) {
        this.container.innerHTML = '';
        if (treeData) {
            // Automatically add the root path to expanded folders so it starts open
            this.expandedFolders.add(treeData.path);

            const rootUl = document.createElement('ul');
            rootUl.className = 'tree-root';

            const rootLi = this._createNode(treeData, true);
            rootUl.appendChild(rootLi);
            this.container.appendChild(rootUl);
        }
    }

    // START: ADD THIS NEW METHOD
    /**
     * Updates which file is highlighted in the tree.
     * @param {string | null} filePath - The path of the file to highlight, or null to clear.
     */
    setActiveFileHighlight(filePath) {
        // Remove any existing highlight
        const currentActive = this.container.querySelector('.tree-item.active');
        if (currentActive) {
            currentActive.classList.remove('active');
        }

        // Add highlight to the new file if a path is provided
        if (filePath) {
            // QuerySelector needs backslashes to be escaped.
            const safeFilePath = filePath.replace(/\\/g, '\\\\');
            const newActive = this.container.querySelector(`.tree-item[data-path="${safeFilePath}"]`);
            if (newActive) {
                newActive.classList.add('active');
            }
        }
    }
    // END: ADD THIS NEW METHOD

    // --- START: ADD REVEAL PATH METHOD ---
    /**
     * Expands all parent folders of the given path and highlights it.
     */
    revealPath(filePath) {
        if (!filePath) return;

        // Add all parents to expandedFolders
        let currentPath = filePath;
        // Simple loop to walk up the path
        while (currentPath.includes('\\') || currentPath.includes('/')) {
            const separatorIndex = Math.max(currentPath.lastIndexOf('\\'), currentPath.lastIndexOf('/'));
            if (separatorIndex === -1) break;

            const parentPath = currentPath.substring(0, separatorIndex);
            if (!parentPath) break;

            this.expandedFolders.add(parentPath);
            currentPath = parentPath;
        }

        // We assume render() will be called shortly after this update, OR we need to trigger re-render if done externally.
        // Since this is called typically within a refresh flow, the render happens after state update.
        // However, if called standalone, we might need to force something. 
        // For now, this just updates state; the caller (ExplorerView refresh) calls render().
    }
    // --- END: ADD REVEAL PATH METHOD ---

    // --- START: ADD THIS ENTIRE NEW METHOD ---
    showCreationInput(type) {
        // Prevent creating multiple inputs
        if (this.container.querySelector('.creation-input-item')) return;

        const rootPath = explorerState.getRootPath();
        if (!rootPath) return; // Can't create if no folder is open

        const li = document.createElement('li');
        li.className = 'tree-item creation-input-item';

        const input = document.createElement('input');
        input.type = 'text';
        input.className = 'creation-input';
        input.placeholder = `Enter ${type} name...`;

        const icon = document.createElement('i');
        icon.className = `codicon ${type === 'file' ? 'codicon-file' : 'codicon-folder'}`;

        li.appendChild(icon);
        li.appendChild(input);

        // Prepend to the first level of the tree
        const rootUl = this.container.querySelector('ul');
        if (rootUl) {
            rootUl.prepend(li);
        } else {
            this.container.appendChild(li);
        }

        input.focus();

        const finish = async () => {
            const name = input.value.trim();
            if (name) {
                const newPath = `${rootPath}\\${name}`; // Note: Use path.join in main process for robustness
                if (type === 'file') {
                    await window.electronAPI.createFile(newPath);
                } else {
                    await window.electronAPI.createFolder(newPath);
                }
                // Trigger a refresh
                document.dispatchEvent(new CustomEvent('explorer-refresh-triggered'));
            } else {
                li.remove(); // Remove if input is empty
            }
        };

        input.addEventListener('blur', () => li.remove());
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                input.blur(); // Trigger the blur event to finish
                finish();
            } else if (e.key === 'Escape') {
                input.value = ''; // Clear value to ensure removal on blur
                input.blur();
            }
        });
    }
    // --- END: ADD THIS ENTIRE NEW METHOD ---

    // --- START: ADD THIS ENTIRE NEW METHOD ---
    showRenameInput(itemElement) {
        const header = itemElement.querySelector('.tree-item-header');
        const nameSpan = header.querySelector('.item-name');
        const oldName = nameSpan.textContent;
        const oldPath = itemElement.dataset.path;

        const input = document.createElement('input');
        input.type = 'text';
        input.className = 'creation-input';
        input.value = oldName;

        header.replaceChild(input, nameSpan);
        input.focus();
        input.select();

        const finishRename = async () => {
            const newName = input.value.trim();
            if (!newName || newName === oldName) {
                header.replaceChild(nameSpan, input);
                return;
            }

            const parentPath = oldPath.substring(0, oldPath.lastIndexOf('\\'));
            const newPath = `${parentPath}\\${newName}`;

            const result = await window.electronAPI.renameItem({ oldPath, newPath });

            if (result.success) {
                // Dispatch event to notify other components (like EditorGroup) that a file was renamed
                document.dispatchEvent(new CustomEvent('file-renamed', {
                    detail: { oldPath, newPath }
                }));
            }
        };

        input.addEventListener('blur', finishRename);
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') input.blur();
            if (e.key === 'Escape') {
                header.replaceChild(nameSpan, input);
                input.blur();
            }
        });
    }
    // --- END: ADD THIS ENTIRE NEW METHOD ---

    // MODIFIED: Replace the entire _createNode method with this updated version
    _createNode(item, isRoot = false) {
        const li = document.createElement('li');
        li.className = `tree-item ${item.type}`;
        li.dataset.path = item.path;
        li.dataset.name = item.name;

        // --- START: DRAG AND DROP MODIFICATION ---
        li.draggable = true;
        li.addEventListener('dragstart', (e) => {
            e.stopPropagation(); // STOP BUBBLING so parent folders don't overwrite child data
            // We set the data as @filename or @foldername
            const mentionData = `@${item.name}`;
            e.dataTransfer.setData('text/plain', mentionData);

            // --- START: CUSTOM DRAG IMAGE ---
            const iconOriginal = header.querySelector('.codicon, .file-icon-svg');
            if (iconOriginal && this.dragGhost) {
                 this.dragGhost.innerHTML = '';
                 const iconClone = iconOriginal.cloneNode(true);
                 this.dragGhost.appendChild(iconClone);
                 const nameSpan = document.createElement('span');
                 nameSpan.textContent = item.name;
                 this.dragGhost.appendChild(nameSpan);
                 
                 // Display the ghostly pill while dragging (offset slightly from mouse)
                 e.dataTransfer.setDragImage(this.dragGhost, 10, 10);
            }
            // --- END: CUSTOM DRAG IMAGE ---
            
            // Use setTimeout so the browser captures the drag ghost of the original element before we dim it
            setTimeout(() => li.classList.add('dragging'), 0);
            e.dataTransfer.effectAllowed = 'copy';
            
            // Helpful for debugging or identifying the drag source
            e.dataTransfer.setData('application/airgrove-item-path', item.path);
        });

        li.addEventListener('dragend', () => {
            li.classList.remove('dragging');
        });
        // --- END: DRAG AND DROP MODIFICATION ---

        // NEW: Add a specific class for the root folder for easier CSS targeting
        if (isRoot) {
            li.classList.add('root-folder');
        }

        const header = document.createElement('div');
        header.className = 'tree-item-header';

        // Helper function to create the correct icon element (SVG or Codicon)
        const createIconElement = (iconData) => {
            if (iconData.type === 'svg') {
                const img = document.createElement('img');
                img.src = iconData.value;
                img.className = 'file-icon-svg';
                return img;
            } else { // codicon
                const i = document.createElement('i');
                i.className = `codicon ${iconData.value}`;
                return i;
            }
        };

        const name = document.createElement('span');
        name.className = 'item-name';
        name.textContent = item.name;

        // This helper function handles selecting an item
        const handleSelection = (e) => {
            if (e && (e.ctrlKey || e.metaKey)) {
                // Multi-select toggle
                li.classList.toggle('active');
            } else {
                // Single select - clear all other active items
                const activeItems = this.container.querySelectorAll('.tree-item.active');
                activeItems.forEach(activeItem => {
                    if (activeItem !== li) {
                        activeItem.classList.remove('active');
                    }
                });
                li.classList.add('active');
            }
            this.container.focus({ preventScroll: true });
        };

        header.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (!li.classList.contains('active')) {
                handleSelection(e);
            }
            this.contextMenu.show(e.clientX, e.clientY, item.type, item.path, li);
        });

        if (item.type === 'folder') {
            const isExpanded = this.expandedFolders.has(item.path);
            const chevron = document.createElement('i');
            chevron.className = `codicon ${isExpanded ? 'codicon-chevron-down' : 'codicon-chevron-right'}`;

            let iconData = getIconForFolder(item.name, isExpanded, isRoot);
            let icon = createIconElement(iconData);

            header.appendChild(chevron);
            header.appendChild(icon);
            header.appendChild(name);
            li.appendChild(header);

            // --- START: ADD ACTION ICONS TO ROOT FOLDER PER USER PREFERENCE ---
            if (isRoot) {
                const actionsContainer = document.createElement('div');
                actionsContainer.className = 'tree-item-actions';

                const actions = [
                    { event: 'new-file-triggered', title: 'New File...', icon: 'codicon-new-file' },
                    { event: 'new-folder-triggered', title: 'New Folder...', icon: 'codicon-new-folder' },
                    { event: 'refresh-triggered', title: 'Refresh Explorer', icon: 'codicon-refresh' },
                    { event: 'collapse-all-triggered', title: 'Collapse Folders in Explorer', icon: 'codicon-collapse-all' }
                ];

                actions.forEach(action => {
                    const actionIcon = document.createElement('div');
                    actionIcon.className = 'action-icon';
                    actionIcon.title = action.title;
                    actionIcon.innerHTML = `<i class="codicon ${action.icon}"></i>`;

                    actionIcon.addEventListener('click', (e) => {
                        e.stopPropagation();
                        document.dispatchEvent(new CustomEvent(action.event));
                    });

                    actionsContainer.appendChild(actionIcon);
                });

                header.appendChild(actionsContainer);
            }
            // --- END: ADD ACTION ICONS ---
            // This UL will hold the folder's children
            const childrenUl = document.createElement('ul');
            li.appendChild(childrenUl);

            // --- START: LAZY LOADING LOGIC ---
            if (item.children) {
                item.children.forEach(child => {
                    childrenUl.appendChild(this._createNode(child, false));
                });
            } else {
                // If children are null, it means we need to load them on demand
                li.classList.add('not-loaded');

                // If it should be expanded, load it right away
                if (isExpanded) {
                    // We use an IIFE because we can't make _createNode async easily
                    (async () => {
                        const updatedData = await window.electronAPI.readDirectory(item.path);
                        if (updatedData && updatedData.children) {
                            item.children = updatedData.children;
                            li.classList.remove('not-loaded');
                            childrenUl.innerHTML = '';
                            item.children.forEach(child => {
                                childrenUl.appendChild(this._createNode(child, false));
                            });
                        }
                    })();
                }
            }
            // --- END: LAZY LOADING LOGIC ---



            // Set the correct initial classes based on the expanded state
            childrenUl.className = `tree-item-children ${isExpanded ? '' : 'collapsed'}`;

            header.addEventListener('click', async (e) => {
                handleSelection(e);

                // If this was a multi-select click (Ctrl/Cmd), don't expand/collapse the folder
                if (e.ctrlKey || e.metaKey) return;

                // If not loaded, fetch data from main process
                if (li.classList.contains('not-loaded')) {
                    li.classList.remove('not-loaded');
                    // Add a loading indicator? (Optional, maybe later)
                    const updatedData = await window.electronAPI.readDirectory(item.path);
                    if (updatedData && updatedData.children) {
                        item.children = updatedData.children;
                        childrenUl.innerHTML = ''; // Clear any placeholders
                        item.children.forEach(child => {
                            childrenUl.appendChild(this._createNode(child, false));
                        });
                    }
                }

                const isNowExpanded = !childrenUl.classList.toggle('collapsed');
                if (isNowExpanded) {
                    this.expandedFolders.add(item.path);
                } else {
                    this.expandedFolders.delete(item.path);
                }

                chevron.className = `codicon ${isNowExpanded ? 'codicon-chevron-down' : 'codicon-chevron-right'}`;

                // Update folder icon on expand/collapse
                const newIconData = getIconForFolder(item.name, isNowExpanded, isRoot);
                const newIcon = createIconElement(newIconData);
                header.replaceChild(newIcon, icon);
                icon = newIcon; // Keep reference to the new icon
            });

        } else { // This is for files
            const iconData = getIconForFile(item.name);
            const icon = createIconElement(iconData);

            // Add the dot indicator in the chevron position for consistency
            const dot = document.createElement('div');
            dot.className = 'tree-item-chevron-placeholder-dot';

            header.appendChild(dot);
            header.appendChild(icon);
            header.appendChild(name);
            li.appendChild(header);

            header.addEventListener('click', (e) => {
                handleSelection(e); // Select the file
                
                // If this was a multi-select click (Ctrl/Cmd), don't open the file in the editor
                if (e.ctrlKey || e.metaKey) return;

                // Dispatch the event to open the file in the editor IN PREVIEW MODE
                document.dispatchEvent(new CustomEvent('open-file', {
                    detail: { filePath: item.path, preview: true }
                }));
            });

            // Add double click to open pinned
            header.addEventListener('dblclick', (e) => {
                // Ignore double click if holding modifiers
                if (e.ctrlKey || e.metaKey) return;

                document.dispatchEvent(new CustomEvent('open-file', {
                    detail: { filePath: item.path, preview: false }
                }));
            });
        }
        return li;
    }
    // --- END: REPLACE THE ENTIRE _createNode METHOD ---
}
