import { quickPick } from './index.js';
import { workspaceManager } from '../../core/WorkspaceManager.js';
import { getIconForFile } from '../../utils/file-icons.js';

class QuickSearch {
    constructor() {
        this.recentlyOpened = [];
        this.allFiles = [];
        this.isSearchingFiles = false;
    }

    async show() {
        // Fetch all files for search
        try {
            if (window.electronAPI?.getWorkspaceFiles) {
                this.allFiles = await window.electronAPI.getWorkspaceFiles();
            }
        } catch (err) {
            console.error('Failed to fetch workspace files:', err);
        }

        this._showInitialItems();
    }

    _showInitialItems() {
        const items = [
            { label: 'Search files by name (append : to go to line or @ to go to symbol)', type: 'header' },
            {
                label: 'Go to File',
                icon: { type: 'codicon', value: 'codicon-file' },
                shortcut: 'Ctrl + P',
                value: 'go-to-file'
            },
            {
                label: 'Show and Run Commands',
                icon: { type: 'codicon', value: 'codicon-chevron-right' },
                shortcut: 'Ctrl + Shift + P',
                value: 'commands'
            },
            {
                label: 'Search for Text',
                description: '%',
                icon: { type: 'codicon', value: 'codicon-search' },
                value: 'search-text'
            },
            {
                label: 'Go to Symbol in Editor',
                description: '@',
                icon: { type: 'codicon', value: 'codicon-symbol-method' },
                shortcut: 'Ctrl + Shift + O',
                value: 'go-to-symbol'
            },
            {
                label: 'Start Debugging',
                description: 'debug',
                icon: { type: 'codicon', value: 'codicon-debug-start' },
                value: 'debug'
            },
            {
                label: 'Run Task',
                description: 'task',
                icon: { type: 'codicon', value: 'codicon-tasklist' },
                value: 'task'
            },
            { type: 'separator' }
        ];

        // Add recently opened (mocked or real)
        const recent = this.recentlyOpened.length > 0 ? this.recentlyOpened : this._getMockRecent();
        recent.forEach(file => {
            items.push({
                label: file.name,
                description: file.relPath || file.path,
                icon: getIconForFile(file.name),
                meta: 'recently opened',
                value: { type: 'file', path: file.path }
            });
        });

        quickPick.show(items, 'Search files by name (append : to go to line or @ to go to symbol)', (v) => {
            this._onSelect(v);
        }, (query) => {
            this._onQuery(query);
        });
    }

    _getMockRecent() {
        const root = workspaceManager.getWorkspacePath();
        if (!root) return [];
        return [
            { name: 'AiService.js', path: root + '/src/main/services/AiService.js', relPath: 'src/main/services' },
            { name: '.env', path: root + '/.env', relPath: '.' },
            { name: 'AiSideBar.js', path: root + '/src/renderer/components/SideBar/AiSideBar/AiSideBar.js', relPath: 'src/renderer/components/SideBar/AiSideBar' }
        ];
    }

    _onQuery(query) {
        if (!query) {
            this._showInitialItems();
            return;
        }

        // Filter files
        const lowerQuery = query.toLowerCase();
        const root = workspaceManager.getWorkspacePath();

        const filteredFiles = this.allFiles
            .map(fullPath => {
                const name = fullPath.split(/[\\/]/).pop();
                const relPath = root ? fullPath.replace(root, '').replace(/^[\\/]/, '') : fullPath;
                // Get parent directory for description
                let parentDir = relPath.substring(0, relPath.lastIndexOf(name)).replace(/[\\/]$/, '');
                if (!parentDir) parentDir = ''; // Root folder

                return { name, fullPath, relPath, parentDir };
            })
            .filter(f => f.name.toLowerCase().includes(lowerQuery) || f.relPath.toLowerCase().includes(lowerQuery))
            .slice(0, 50); // Limit results for performance

        const items = [];

        if (filteredFiles.length > 0) {
            items.push({
                label: 'file results',
                type: 'header',
                meta: '<i class="codicon codicon-split-horizontal"></i> file results'
            });

            filteredFiles.forEach(f => {
                items.push({
                    label: f.name,
                    description: f.parentDir,
                    icon: getIconForFile(f.name),
                    value: { type: 'file', path: f.fullPath }
                });
            });
        }

        if (items.length === 0) {
            items.push({ label: 'No matching files found', type: 'header' });
        }

        quickPick.updateItems(items, query);
    }


    _onSelect(v) {
        console.log('Selected:', v);
        if (typeof v === 'string') {
            this._handleAction(v);
        } else if (v && v.type === 'file') {
            this._openFile(v.path);
        }
    }

    _handleAction(action) {
        switch (action) {
            case 'go-to-file':
                // Focus input and clear it to show files?
                // Currently clicking "Go to File" doesn't do much if we are already in the mode
                break;
            case 'commands':
                // Command palette logic
                break;
            default:
                console.log('Action not implemented:', action);
        }
    }

    _openFile(path) {
        // Record as recently opened
        const name = path.split(/[\\/]/).pop();
        this.recentlyOpened = this.recentlyOpened.filter(f => f.path !== path);
        this.recentlyOpened.unshift({ name, path });
        if (this.recentlyOpened.length > 5) this.recentlyOpened.pop();

        document.dispatchEvent(new CustomEvent('open-file', {
            detail: { filePath: path, preview: false }
        }));
    }

}

export const quickSearch = new QuickSearch();
