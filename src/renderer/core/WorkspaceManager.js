/**
 * WorkspaceManager
 * Orchestrates the transition between Empty Window and Workspace Window.
 */
import { services } from './ServiceRegistry.js';

class WorkspaceManager {
    constructor() {
        this.currentWorkspace = null; // { path: string, name: string }
        this.isInitialized = false;
        console.log('[WorkspaceManager] Initialized');
    }

    /**
     * Bootstraps a new workspace or reloads the current one.
     * @param {string} folderPath - The absolute path to the directory
     */
    async bootstrap(folderPath) {
        if (!folderPath) return;

        console.log(`[WorkspaceManager] Bootstrapping workspace for: ${folderPath}`);

        // 1. Dispose existing workspace-scoped resources
        await this.dispose();

        // 2. Load folder data and initialize state
        // This tells the main process to open the folder (sets CWD, initializes watcher)
        const fileTreeData = await window.electronAPI.getFolderData(folderPath);

        if (!fileTreeData) {
            console.error('[WorkspaceManager] Failed to load folder data.');
            return;
        }

        // 3. Set the new workspace state
        this.currentWorkspace = {
            path: folderPath,
            name: folderPath.split(/[\\/]/).pop() || folderPath
        };

        // Import explorerState dynamically to initialize the tree
        const { explorerState } = await import('../components/views/ExplorerView/explorer-state.js');
        explorerState.setFileTree(fileTreeData);

        this.isInitialized = true;

        // 4. Notify the system (This triggers UI switches in WorkbenchManager, etc.)
        document.dispatchEvent(new CustomEvent('workspace-bootstrapped', {
            detail: this.currentWorkspace
        }));

        // Trigger the old 'folder-loaded' event for backward compatibility with existing components
        document.dispatchEvent(new CustomEvent('folder-loaded'));

        console.log(`[WorkspaceManager] Workspace "${this.currentWorkspace.name}" is now active.`);
    }

    /**
     * High-level command to open a folder via picker and bootstrap it.
     */
    async openFolder() {
        const folderData = await window.electronAPI.openFolderDialog(); // Assumes this IPC exists or we'll create it
        if (folderData && folderData.folderPath) {
            await this.bootstrap(folderData.folderPath);
        }
    }

    /**
     * Cleans up the current workspace context and returns the IDE to Empty mode.
     */
    async dispose() {
        if (!this.currentWorkspace) return;

        console.log(`[WorkspaceManager] Disposing workspace: ${this.currentWorkspace.name}`);

        // Dispose services via the registry
        await services.disposeWorkspaceServices();

        this.currentWorkspace = null;
        this.isInitialized = false;

        // Notify UI to revert to "Empty" state
        document.dispatchEvent(new CustomEvent('workspace-disposed'));
    }

    /**
     * Check if a workspace is loaded
     */
    hasWorkspace() {
        return !!this.currentWorkspace;
    }

    /**
     * Get the active workspace path
     */
    getWorkspacePath() {
        return this.currentWorkspace?.path || null;
    }
}

export const workspaceManager = new WorkspaceManager();
