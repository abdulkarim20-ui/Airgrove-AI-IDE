/**
 * ContextManager
 * Manages the AI context: Workspace State and Editor State.
 */
import { explorerState } from '../components/views/ExplorerView/explorer-state.js';

class ContextManager {
    constructor() {
        this.activeFile = null;
        this.activeContent = '';
        this.cursorPosition = { lineNumber: 1, column: 1 };

        this.init();
    }

    init() {
        // Listen for active file changes
        document.addEventListener('active-file-changed', (e) => {
            this.handleActiveFileChange(e.detail.filePath);
        });

        // We also need to track content changes if we want real-time context
        // But for now, we can pull it from window.editorGroup when needed.
    }

    handleActiveFileChange(filePath) {
        this.activeFile = filePath;
        console.log('[ContextManager] Active file changed:', filePath);
    }

    /**
     * Builds the full context object for AI
     */
    async getFullContext() {
        const workspaceRoot = explorerState.getRootPath();
        const fileTree = explorerState.fileTree;

        let activeFile = this.activeFile;
        let content = '';
        let cursor = { line: 1, col: 1 };

        if (window.editorGroup) {
            const currentFile = window.editorGroup.openFiles.find(f => f.path === this.activeFile);
            if (currentFile && currentFile.model) {
                content = currentFile.model.getValue();
                const pos = window.editorGroup.editor.getPosition();
                if (pos) {
                    cursor = { line: pos.lineNumber, col: pos.column };
                }
            }
        }

        return {
            workspace: {
                root: workspaceRoot,
                tree: this._simplifyTree(fileTree)
            },
            editor: {
                activeFile,
                content,
                cursor
            }
        };
    }

    /**
     * Simplifies the file tree for AI context (reduces token usage)
     */
    _simplifyTree(node, depth = 0) {
        if (!node || depth > 3) return null; // Limit depth for context

        const simplified = {
            name: node.name,
            type: node.type
        };

        if (node.children && depth < 3) {
            simplified.children = node.children
                .map(child => this._simplifyTree(child, depth + 1))
                .filter(Boolean);
        }

        return simplified;
    }
}

export const contextManager = new ContextManager();
