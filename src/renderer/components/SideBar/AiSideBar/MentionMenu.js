import { explorerState } from '../../views/ExplorerView/explorer-state.js';
import { getIconForFile } from '../../../utils/file-icons.js';

export class MentionMenu {
    constructor(container, textarea) {
        this.menu = container;
        this.textarea = textarea;
        this.active = false;
        this.query = '';
        this.index = 0;
        this.items = [];

        // Configuration for allowed categories
        this.categories = [
            { id: 'files', name: 'Files', icon: 'codicon-file' },
            { id: 'dirs', name: 'Directories', icon: 'codicon-folder' }
        ];

        this.init();
    }

    init() {
        if (!this.menu) return;
        this.menu.classList.add('ai-mention-menu');
        this.hide();
    }

    handleSearch(query) {
        console.log('[MentionMenu] handleSearch:', query);
        this.active = true;
        this.query = query;
        if (this.menu) this.menu.classList.remove('hidden');

        // Build flat cache if this is the start of a mention sequence
        if (!query || !this.flatCache) {
            this.buildFlatCache();
        }

        if (!query) {
            this.renderInitialItems();
            return;
        }

        this.searchProject(query);
    }

    buildFlatCache() {
        const root = explorerState.fileTree;
        if (!root) return;

        this.flatCache = [];
        const traverse = (node) => {
            this.flatCache.push({
                id: node.path,
                name: node.name,
                path: this.getRelativePath(node.path),
                type: node.type,
                isResult: true
            });
            if (node.children) {
                node.children.forEach(traverse);
            }
        };

        if (root.children) root.children.forEach(traverse);
    }

    renderInitialItems() {
        this.items = this.categories;
        this.index = 0;
        this.render();
    }

    searchProject(query) {
        if (!this.flatCache) {
            this.buildFlatCache();
        }

        const q = query.toLowerCase();

        // Use flatCache for instant matching
        const results = (this.flatCache || []).filter(item =>
            item.name.toLowerCase().includes(q)
        );

        // Advanced Sorting Logic: 
        // 1. Exact Name Matches first
        // 2. Starts-with Matches second
        // 3. Includes Matches third
        // 4. Shorter names first (most likely to be the file the user wants)
        results.sort((a, b) => {
            const aName = a.name.toLowerCase();
            const bName = b.name.toLowerCase();

            const aExact = aName === q;
            const bExact = bName === q;
            if (aExact && !bExact) return -1;
            if (!aExact && bExact) return 1;

            const aStarts = aName.startsWith(q);
            const bStarts = bName.startsWith(q);
            if (aStarts && !bStarts) return -1;
            if (!aStarts && bStarts) return 1;

            // Otherwise, sort by length (shorter names first)
            if (aName.length !== bName.length) {
                return aName.length - bName.length;
            }

            return aName.localeCompare(bName);
        });

        this.items = results.slice(0, 5);
        this.index = 0;

        if (this.items.length === 0) {
            this.hide();
        } else {
            this.render();
        }
    }

    getRelativePath(fullPath) {
        const rootPath = explorerState.getRootPath();
        if (!rootPath) return fullPath;
        let rel = fullPath.replace(rootPath, '').replace(/^[\\\/]/, '');
        if (rel.length > 30) rel = '...' + rel.substring(rel.length - 27);
        return rel;
    }

    render() {
        if (!this.menu) return;
        this.menu.innerHTML = '';

        if (!this.query) {
            // Render basic categories
            this.items.forEach((item, index) => {
                const el = this.createElement(item, index);
                this.menu.appendChild(el);
            });
        } else {
            // Render file matches
            const header = document.createElement('div');
            header.className = 'ai-mention-section-header';
            header.textContent = 'Matching Files';
            this.menu.appendChild(header);

            this.items.forEach((item, index) => {
                const el = this.createElement(item, index);
                this.menu.appendChild(el);
            });
        }
    }

    createElement(item, index) {
        const div = document.createElement('div');
        div.className = `ai-mention-item ${index === this.index ? 'selected' : ''}`;

        const iconContainer = document.createElement('div');
        iconContainer.className = 'item-icon';

        if (item.isResult) {
            if (item.type === 'directory') {
                const i = document.createElement('i');
                i.className = 'codicon codicon-folder';
                i.style.color = '#dcb67a';
                iconContainer.appendChild(i);
            } else {
                const iconData = getIconForFile(item.name);
                if (iconData.type === 'svg') {
                    const img = document.createElement('img');
                    img.src = iconData.value;
                    img.className = 'item-icon-img';
                    iconContainer.appendChild(img);
                } else {
                    const i = document.createElement('i');
                    i.className = `codicon ${iconData.value}`;
                    iconContainer.appendChild(i);
                }
            }
        } else {
            const i = document.createElement('i');
            i.className = `codicon ${item.icon}`;
            iconContainer.appendChild(i);
        }

        const nameSpan = document.createElement('span');
        nameSpan.className = 'item-name';

        // Highlight matching text if searching
        if (this.query && item.isResult) {
            const q = this.query.toLowerCase();
            const n = item.name.toLowerCase();
            const startIdx = n.indexOf(q);
            if (startIdx !== -1) {
                const before = item.name.substring(0, startIdx);
                const match = item.name.substring(startIdx, startIdx + q.length);
                const after = item.name.substring(startIdx + q.length);

                nameSpan.innerHTML = `${before}<span class="mention-highlight">${match}</span>${after}`;
            } else {
                nameSpan.textContent = item.name;
            }
        } else {
            nameSpan.textContent = item.name;
        }

        div.appendChild(iconContainer);
        div.appendChild(nameSpan);

        if (item.path) {
            const pathSpan = document.createElement('span');
            pathSpan.className = 'item-path';
            pathSpan.textContent = item.path;
            div.appendChild(pathSpan);
        }

        div.onclick = (e) => {
            e.stopPropagation();
            this.index = index;
            this.select();
        };

        return div;
    }

    moveSelection(delta) {
        if (!this.active) return;
        this.index += delta;
        if (this.index < 0) this.index = this.items.length - 1;
        if (this.index >= this.items.length) this.index = 0;
        this.render();

        const selected = this.menu.querySelector('.selected');
        if (selected) {
            selected.scrollIntoView({ block: 'nearest' });
        }
    }

    select() {
        const item = this.items[this.index];
        if (!item) return;

        const value = this.textarea.value;
        const cursor = this.textarea.selectionStart;
        const lastAt = value.lastIndexOf('@', cursor - 1);

        if (lastAt !== -1) {
            const before = value.substring(0, lastAt);
            const after = value.substring(cursor);
            const insert = `@${item.name} `;

            this.textarea.value = before + insert + after;
            this.textarea.selectionStart = this.textarea.selectionEnd = lastAt + insert.length;
        }

        this.hide();
        this.textarea.focus();
        this.textarea.dispatchEvent(new Event('input', { bubbles: true }));
    }

    hide() {
        this.active = false;
        if (this.menu) this.menu.classList.add('hidden');
    }
}
