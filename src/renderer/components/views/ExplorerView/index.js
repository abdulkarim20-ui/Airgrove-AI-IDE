// Explorer View Component - Complete File Tree Implementation
// This component handles the complete explorer functionality with file tree rendering

import { explorerState } from './explorer-state.js';
import { FileTreeView } from './FileTreeView.js';
import { workspaceManager } from '../../../core/WorkspaceManager.js';
import { showDeleteModal } from './DeleteModal.js';

let skipConfirmDeletion = false;

document.addEventListener('DOMContentLoaded', () => {
    const openFolderBtn = document.querySelector('.open-folder-btn');
    const noFolderMessage = document.querySelector('.no-folder-message');
    const noFolderMessageWrapper = document.getElementById('no-folder-view');
    const explorerViewContainer = document.getElementById('explorer-view');

    // Create a container for the tree if it doesn't exist
    let treeContainer = document.getElementById('file-tree-container');
    if (!treeContainer) {
        treeContainer = document.createElement('div');
        treeContainer.id = 'file-tree-container';
        explorerViewContainer.appendChild(treeContainer);
    }

    // --- START: MAKE THE CONTAINER FOCUSABLE ---
    // This allows it to receive keyboard events, -1 prevents it from being tabbed to.
    treeContainer.setAttribute('tabindex', '-1');
    // --- END: MAKE THE CONTAINER FOCUSABLE ---

    const fileTreeView = new FileTreeView(treeContainer);

    // --- START: CREATE THE REFRESH FUNCTION ---
    async function refreshExplorer(e) {
        const updatedFileTree = await window.electronAPI.refreshFolder();
        if (updatedFileTree) {
            // Check if we have a specific file to highlight from the event event detail
            const requestHighlight = e?.detail?.activeFileToHighlight;

            // If not, fall back to current selection
            const currentActiveFile = requestHighlight || document.querySelector('.tree-item.active')?.dataset.path;

            explorerState.setFileTree(updatedFileTree);

            // Ensure parents are expanded if we have a target
            if (currentActiveFile) {
                fileTreeView.revealPath(currentActiveFile);
            }

            try {
                fileTreeView.render(updatedFileTree);
            } catch (err) {
                console.error('ExplorerView: Render failed', err);
            }

            // Re-apply highlight explicitly after render
            if (currentActiveFile) {
                fileTreeView.setActiveFileHighlight(currentActiveFile);
            }
        }
    }
    // --- END: CREATE THE REFRESH FUNCTION ---

    // Function to handle opening a folder - NOW USES WORKSPACE MANAGER
    async function openFolder() {
        await workspaceManager.openFolder();
    }

    // Update the UI when the state changes
    explorerState.onUpdate(fileTree => {
        if (fileTree) {
            // --- START: MODIFICATION ---
            if (noFolderMessageWrapper) {
                noFolderMessageWrapper.style.display = 'none';
            }
            // --- END: MODIFICATION ---

            try {
                fileTreeView.render(fileTree);
            } catch (err) {
                console.error('ExplorerView: Render failed', err);
            }
        } else {
            // --- START: MODIFICATION ---
            if (noFolderMessageWrapper) {
                noFolderMessageWrapper.style.display = 'block';
            }
            // --- END: MODIFICATION ---
            treeContainer.style.display = 'none';
        }
    });

    // Initial state check for rendering, also hide actions if no folder is open
    if (explorerState.fileTree) {
        fileTreeView.render(explorerState.fileTree);
        // --- START: MODIFICATION ---
        if (noFolderMessageWrapper) {
            noFolderMessageWrapper.style.display = 'none';
        }
        // --- END: MODIFICATION ---
        // treeContainer display will be handled by the update listener and CSS
    } else {
        // --- START: MODIFICATION ---
        if (noFolderMessageWrapper) {
            noFolderMessageWrapper.style.display = 'block';
        }
        // --- END: MODIFICATION ---
    }

    // Event listeners
    openFolderBtn.addEventListener('click', openFolder);

    // --- START: ADD CLONE REPO BUTTON LISTENER ---
    const cloneRepoBtn = document.getElementById('explorer-clone-repo-btn');
    if (cloneRepoBtn) {
        cloneRepoBtn.addEventListener('click', () => {
            // Placeholder: This could open a dialog to get a Git URL
            console.log("Clone Git Repository clicked");
        });
    }
    // --- END: ADD CLONE REPO BUTTON LISTENER ---


    // --- START: ADD THIS LISTENER ---
    // Listen for changes to the active editor file and update the highlight
    document.addEventListener('active-file-changed', (e) => {
        const { filePath } = e.detail;
        fileTreeView.setActiveFileHighlight(filePath);
    });
    // --- END: ADD THIS LISTENER ---

    // --- START: ADD THIS LISTENER FOR AUTO-REFRESH ---
    document.addEventListener('explorer-refresh-triggered', refreshExplorer);
    // --- END: ADD THIS LISTENER ---

  // Explorer Global Header Click Handlers (Connecting the new buttons in the sidebar header)
  document.addEventListener('new-file-triggered', () => fileTreeView.showCreationInput('file'));
  document.addEventListener('new-folder-triggered', () => fileTreeView.showCreationInput('folder'));
  document.addEventListener('refresh-triggered', () => refreshExplorer());
  document.addEventListener('collapse-all-triggered', () => {
    fileTreeView.expandedFolders.clear();
    refreshExplorer();
  });

  // --- START: ADD THIS LISTENER FOR REAL-TIME UPDATES ---
  // This listens for the event from the main process and refreshes the tree
  window.electronAPI.onFileSystemChange(() => {
    console.log('File system change detected, refreshing explorer...');
    refreshExplorer();
  });
  // --- END: ADD THIS LISTENER ---

    // --- START: CREATE HELPER FOR MULTI-SELECT ---
    const getActivePaths = () => {
        const activeItems = treeContainer.querySelectorAll('.tree-item.active');
        return Array.from(activeItems).map(item => item.dataset.path);
    };
    // --- END: CREATE HELPER FOR MULTI-SELECT ---

    // Delete handler is consolidated below in the main keydown listener

    // --- START: REMOVE OR COMMENT OUT THIS ENTIRE OLD BLOCK ---
    /*
    const newFileBtn = document.getElementById('explorer-new-file');
    const newFolderBtn = document.getElementById('explorer-new-folder');
    const refreshBtn = document.getElementById('explorer-refresh');
    const collapseAllBtn = document.getElementById('explorer-collapse-all');

    if (newFileBtn) newFileBtn.addEventListener('click', () => fileTreeView.showCreationInput('file'));
    if (newFolderBtn) newFolderBtn.addEventListener('click', () => fileTreeView.showCreationInput('folder'));
    if (refreshBtn) refreshBtn.addEventListener('click', refreshExplorer); // Use the fixed function
    if (collapseAllBtn) collapseAllBtn.addEventListener('click', () => {
      // Find all open folders and collapse them
      document.querySelectorAll('#file-tree-container .folder > .tree-item-children:not(.collapsed)').forEach(ul => {
        ul.classList.add('collapsed');
      });
      document.querySelectorAll('#file-tree-container .folder > .tree-item-header .codicon-chevron-down').forEach(chevron => {
        chevron.classList.remove('codicon-chevron-down');
        chevron.classList.add('codicon-chevron-right');
      });
       document.querySelectorAll('#file-tree-container .folder > .tree-item-header .codicon-folder-opened').forEach(folderIcon => {
        folderIcon.classList.remove('codicon-folder-opened');
        folderIcon.classList.add('codicon-folder');
      });
    });
    */
    // --- END: REMOVE OR COMMENT OUT THIS ENTIRE OLD BLOCK ---


    // --- START: ADD THIS NEW BLOCK TO LISTEN FOR DYNAMIC ACTIONS ---
    document.addEventListener('new-file-triggered', () => {
        // CHANGED: Instead of showing input in tree, open an Untitled tab in editor
        // fileTreeView.showCreationInput('file'); 
        document.dispatchEvent(new CustomEvent('command-new-file'));
    });
    document.addEventListener('new-folder-triggered', () => fileTreeView.showCreationInput('folder'));
    document.addEventListener('refresh-triggered', refreshExplorer);
    document.addEventListener('collapse-all-triggered', () => {
        // Find all open folders and collapse them
        document.querySelectorAll('#file-tree-container .folder > .tree-item-children:not(.collapsed)').forEach(ul => {
            const header = ul.previousElementSibling;
            const chevron = header.querySelector('.codicon-chevron-down');
            if (chevron) {
                chevron.click(); // Simulate a click to properly toggle state
            }
        });
    });
    // --- END: ADD THIS NEW BLOCK ---

    // --- START: ADD LISTENERS FOR CONTEXT MENU ACTIONS ---
    document.addEventListener('rename-triggered', (e) => {
        if (e.detail.element) {
            fileTreeView.showRenameInput(e.detail.element);
        }
    });

    document.addEventListener('delete-triggered', async () => {
        const paths = getActivePaths();
        if (paths.length === 0) return;

        let confirmed = false;

        if (skipConfirmDeletion) {
            confirmed = true;
        } else {
            const result = await showDeleteModal(paths);
            confirmed = result.confirmed;
            if (result.dontAskAgain) {
                skipConfirmDeletion = true;
            }
        }

        if (confirmed) {
            const trashResult = await window.electronAPI.trashItems(paths);
            if (trashResult.success) {
                // Dispatch specifically for each file
                paths.forEach(itemPath => {
                    document.dispatchEvent(new CustomEvent('file-deleted', {
                        detail: { filePath: itemPath }
                    }));
                });
                await refreshExplorer();
            }
        }
    });

    document.addEventListener('new-file-context-triggered', (e) => {
        if (e.detail.element) {
            fileTreeView.showCreationInput('file', e.detail.element);
        }
    });

    document.addEventListener('new-folder-context-triggered', (e) => {
        if (e.detail.element) {
            fileTreeView.showCreationInput('folder', e.detail.element);
        }
    });

    document.addEventListener('open-context-triggered', (e) => {
        if (e.detail.path) {
            document.dispatchEvent(new CustomEvent('open-file', {
                detail: { filePath: e.detail.path }
            }));
        }
    });

    document.addEventListener('open-to-side-triggered', (e) => {
        if (e.detail.path) {
            // For now, just open in the current tab - can be extended later for split view
            document.dispatchEvent(new CustomEvent('open-file', {
                detail: { filePath: e.detail.path }
            }));
        }
    });

    document.addEventListener('copy-triggered', async (e) => {
        const paths = getActivePaths();
        if (paths.length > 0 && navigator.clipboard) {
            try {
                // If only one file is selected, copy its literal content
                if (paths.length === 1) {
                    const fileContent = await window.electronAPI.readFile(paths[0]);
                    if (fileContent && fileContent.content) {
                        await navigator.clipboard.writeText(fileContent.content);
                    }
                }
            } catch (error) {
                console.error('Failed to copy file content:', error);
            }
        }
    });

    document.addEventListener('copy-path-triggered', async (e) => {
        const paths = getActivePaths();
        if (paths.length > 0 && navigator.clipboard) {
            try {
                await navigator.clipboard.writeText(paths.join('\n'));
            } catch (error) {
                console.error('Failed to copy paths:', error);
            }
        }
    });

    document.addEventListener('copy-relative-path-triggered', async (e) => {
        const paths = getActivePaths();
        if (paths.length > 0 && navigator.clipboard) {
            try {
                const currentFolder = explorerState.getRootPath();
                const relativePaths = paths.map(p => {
                    if (currentFolder) {
                        return p.replace(currentFolder + '\\', '').replace(currentFolder + '/', '');
                    }
                    return p;
                });
                await navigator.clipboard.writeText(relativePaths.join('\n'));
            } catch (error) {
                console.error('Failed to copy relative paths:', error);
            }
        }
    });

    // --- START: ADD NEW CONTEXT MENU ACTION HANDLERS ---
    document.addEventListener('reveal-in-os-triggered', (e) => {
        if (e.detail.path) {
            window.electronAPI.revealInExplorer(e.detail.path);
        }
    });

    // Cut/Copy/Paste logic supporting multi-selection
    let internalClipboard = { type: null, paths: [] };

    const handleCut = (paths) => {
        if (!paths || paths.length === 0) return;
        internalClipboard = { type: 'cut', paths: paths };
        console.log('Cut files:', paths);
    };

    const handleCopy = (paths) => {
        if (!paths || paths.length === 0) return;
        internalClipboard = { type: 'copy', paths: paths };
        console.log('Copy files:', paths);
    };

    const handlePaste = async (destFolder) => {
        if (destFolder && internalClipboard.paths.length > 0) {
            for (const sourcePath of internalClipboard.paths) {
                const fileName = sourcePath.split(/[\\/]/).pop();
                const newPath = destFolder + '\\' + fileName; // Basic path join

                if (internalClipboard.type === 'cut') {
                    // Move
                    await window.electronAPI.renameItem({ oldPath: sourcePath, newPath });
                } else if (internalClipboard.type === 'copy') {
                    // Copy
                    await window.electronAPI.copyItem({ sourcePath, destPath: newPath });
                }
            }
            if (internalClipboard.type === 'cut') {
                internalClipboard = { type: null, paths: [] }; // Clear after cut-paste
            }
            document.dispatchEvent(new CustomEvent('explorer-refresh-triggered'));
        }
    };

    document.addEventListener('cut-file-triggered', () => handleCut(getActivePaths()));
    document.addEventListener('copy-file-triggered', () => handleCopy(getActivePaths()));
    document.addEventListener('paste-file-triggered', (e) => { if (e.detail.path) handlePaste(e.detail.path); });
    // --- END: ADD NEW CONTEXT MENU ACTION HANDLERS ---

    // --- START: ADD KEYBOARD SHORTCUTS FOR EXPLORER ---
    treeContainer.addEventListener('keydown', async (e) => {
        const paths = getActivePaths();
        if (paths.length === 0) return;
        
        // Use the first active item for single-item specific actions (e.g., F2, Paste target, Reveal)
        const activeItem = treeContainer.querySelector('.tree-item.active');
        const itemPath = activeItem.dataset.path;

        // Delete
        if (e.key === 'Delete') {
            document.dispatchEvent(new CustomEvent('delete-triggered'));
            return;
        }

        // F2: Rename
        if (e.key === 'F2') {
            fileTreeView.showRenameInput(activeItem);
        }

        // Ctrl+C: Copy
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'c') {
            handleCopy(paths);
        }

        // Ctrl+X: Cut
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'x') {
            handleCut(paths);
        }

        // Ctrl+V: Paste
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'v') {
            // Check if active item is a folder, if so paste into it
            // If it's a file, paste into its parent folder
            const isFolder = activeItem.classList.contains('folder');
            let destPath = itemPath;
            if (!isFolder) {
                destPath = itemPath.substring(0, itemPath.lastIndexOf('\\'));
            }
            handlePaste(destPath);
        }

        // Shift+Alt+R: Reveal in Explorer
        if (e.shiftKey && e.altKey && e.key.toLowerCase() === 'r') {
            window.electronAPI.revealInExplorer(itemPath);
        }
    });

    document.addEventListener('open-terminal-context-triggered', (e) => {
        if (e.detail.path) {
            // Use the exposed terminal manager to invoke a new terminal at the path
            if (window.terminalManager && window.terminalManager.createNewTerminal) {
                window.terminalManager.createNewTerminal(e.detail.path);

                // Also ensure the panel is visible and switched to terminal tab
                // This requires a bit of "glue" event
                document.dispatchEvent(new CustomEvent('show-panel-terminal-requested'));
            }
        }
    });

    document.addEventListener('find-in-folder-context-triggered', (e) => {
        if (e.detail.path) {
            // Log for now, as Search View integration is complex 
            // (need to switch sidebar view and pre-fill input)
            console.log('Find in Folder not fully implemented yet, path:', e.detail.path);

            // Just for "Senior Dev" polish, let's try to switch to search view if possible
            // Assuming there is a switcher event
            // document.dispatchEvent(new CustomEvent('switch-sidebar-view', { detail: { viewId: 'search' } }));
        }
    });

    // --- END: ADD KEYBOARD SHORTCUTS FOR EXPLORER ---

    // --- END: ADD LISTENERS FOR CONTEXT MENU ACTIONS ---

    // --- START: ADD THIS NEW CODE FOR HOVER EFFECT ---
    // This logic adds a class to the tree container when the mouse is over
    // the explorer, which the CSS will use to show the indent guides.
    explorerViewContainer.addEventListener('mouseenter', () => {
        treeContainer.classList.add('show-indent-guides');
    });

    explorerViewContainer.addEventListener('mouseleave', () => {
        treeContainer.classList.remove('show-indent-guides');
    });
    // --- END: ADD THIS NEW CODE FOR HOVER EFFECT ---
});
