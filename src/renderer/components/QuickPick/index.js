import { workspaceManager } from '../../core/WorkspaceManager.js';

class QuickPick {
    constructor() {
        this.overlay = null;
        this.items = [];
        this.filteredItems = [];
        this.onSelect = null;
        this.selectedIndex = 0;
    }

    /**
     * Shows the Quick Pick modal
     * @param {Array<{label: string, description: string, icon: string, shortcut: string, meta: string, type: 'item'|'header'|'separator', value: any}>} items 
     * @param {string} placeholder 
     * @param {function} onSelect
     * @param {function} onInput
     */
    show(items, placeholder = 'Select an item', onSelect, onInput) {
        this.items = items;
        this.onSelect = onSelect;
        this.onInput = onInput;
        this.filteredItems = [...items];
        this.selectedIndex = this._findFirstSelectableIndex();

        this._createDOM(placeholder);
        this._renderList();

        // Focus input
        const input = this.overlay.querySelector('#quick-pick-input');
        input.focus();
    }

    updateItems(items) {
        this.items = items;
        this.filteredItems = items;
        this.selectedIndex = this._findFirstSelectableIndex();
        this._renderList();
    }

    hide() {
        if (this.overlay) {
            this.overlay.remove();
            this.overlay = null;
        }
    }


    _findFirstSelectableIndex() {
        for (let i = 0; i < this.filteredItems.length; i++) {
            if (this.filteredItems[i].type !== 'header' && this.filteredItems[i].type !== 'separator') {
                return i;
            }
        }
        return -1;
    }

    _createDOM(placeholder) {
        // Remove existing if any
        this.hide();

        this.overlay = document.createElement('div');
        this.overlay.id = 'quick-pick-overlay';

        // Close on background click
        this.overlay.addEventListener('mousedown', (e) => {
            if (e.target === this.overlay) {
                this.hide();
            }
        });

        const container = document.createElement('div');
        container.id = 'quick-pick-container';

        const inputWrapper = document.createElement('div');
        inputWrapper.id = 'quick-pick-input-wrapper';

        const input = document.createElement('input');
        input.id = 'quick-pick-input';
        input.type = 'text';
        input.placeholder = placeholder;
        input.autocomplete = 'off';

        input.addEventListener('input', (e) => {
            if (this.onInput) {
                this.onInput(e.target.value);
            } else {
                this._filter(e.target.value);
            }
        });


        input.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.hide();
            } else if (e.key === 'ArrowDown') {
                e.preventDefault();
                this._moveSelection(1);
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                this._moveSelection(-1);
            } else if (e.key === 'Enter') {
                e.preventDefault();
                const selectedItem = this.filteredItems[this.selectedIndex];
                if (selectedItem && selectedItem.type !== 'header' && selectedItem.type !== 'separator') {
                    this._select(selectedItem);
                }
            }
        });

        inputWrapper.appendChild(input);

        const list = document.createElement('ul');
        list.id = 'quick-pick-list';

        container.appendChild(inputWrapper);
        container.appendChild(list);
        this.overlay.appendChild(container);

        document.body.appendChild(this.overlay);
    }

    _moveSelection(direction) {
        let newIndex = this.selectedIndex + direction;

        while (newIndex >= 0 && newIndex < this.filteredItems.length) {
            const item = this.filteredItems[newIndex];
            if (item.type !== 'header' && item.type !== 'separator') {
                this.selectedIndex = newIndex;
                this._renderList();
                this._scrollToSelected();
                return;
            }
            newIndex += direction;
        }
    }

    _scrollToSelected() {
        const list = this.overlay.querySelector('#quick-pick-list');
        const activeItem = list.querySelector('.quick-pick-item.active');
        if (activeItem) {
            activeItem.scrollIntoView({ block: 'nearest' });
        }
    }

    _filter(query) {
        const selectableItems = this.items.filter(item => item.type !== 'header' && item.type !== 'separator');

        if (!query) {
            this.filteredItems = [...this.items];
        } else {
            const lowerQuery = query.toLowerCase();
            const filtered = selectableItems.filter(item =>
                item.label.toLowerCase().includes(lowerQuery) ||
                (item.description && item.description.toLowerCase().includes(lowerQuery))
            );
            this.filteredItems = filtered;
        }

        this.selectedIndex = this._findFirstSelectableIndex();
        this._renderList();
    }

    _select(item) {
        if (this.onSelect) {
            this.onSelect(item.value);
        }
        this.hide();
    }

    _renderList() {
        const list = this.overlay.querySelector('#quick-pick-list');
        list.innerHTML = '';

        this.filteredItems.forEach((item, index) => {
            if (item.type === 'separator') {
                const sep = document.createElement('div');
                sep.className = 'quick-pick-separator';
                list.appendChild(sep);
                return;
            }

            if (item.type === 'header') {
                const header = document.createElement('div');
                header.className = 'quick-pick-header-text';

                const label = document.createElement('span');
                label.textContent = item.label;
                header.appendChild(label);

                if (item.meta) {
                    const meta = document.createElement('div');
                    meta.className = 'quick-pick-header-meta';
                    meta.innerHTML = item.meta; // Allow HTML for icons etc
                    header.appendChild(meta);
                }

                list.appendChild(header);
                return;
            }

            const li = document.createElement('li');
            li.className = 'quick-pick-item';
            if (index === this.selectedIndex) {
                li.classList.add('active');
            }

            // Icon container
            const iconContainer = document.createElement('div');
            iconContainer.className = 'quick-pick-item-icon-container';

            if (item.icon && typeof item.icon === 'object') {
                if (item.icon.type === 'svg') {
                    const img = document.createElement('img');
                    img.src = item.icon.value;
                    img.className = 'file-icon-svg'; // Match Explorer class
                    iconContainer.appendChild(img);
                } else {
                    const i = document.createElement('i');
                    i.className = `codicon ${item.icon.value}`; // Use primary codicon class
                    iconContainer.appendChild(i);
                }
            } else {
                const i = document.createElement('i');
                const extClass = this._getExtClass(item.label);
                i.className = `codicon ${item.icon || 'codicon-file'} ${extClass}`;
                iconContainer.appendChild(i);
            }



            // Content
            const content = document.createElement('div');
            content.className = 'quick-pick-item-content';

            const main = document.createElement('div');
            main.className = 'quick-pick-item-main';

            const label = document.createElement('span');
            label.className = 'quick-pick-item-label';

            // Set highlighted label
            if (this.searchQuery && item.label) {
                label.innerHTML = this._highlightText(item.label, this.searchQuery);
            } else {
                label.textContent = item.label;
            }

            const desc = document.createElement('span');
            desc.className = 'quick-pick-item-description';
            desc.textContent = item.description || '';

            main.appendChild(label);
            main.appendChild(desc);
            content.appendChild(main);

            li.appendChild(iconContainer);
            li.appendChild(content);


            // Shortcut (if any)
            if (item.shortcut) {
                const shortcut = document.createElement('div');
                shortcut.className = 'quick-pick-item-shortcut';

                const keys = item.shortcut.split('+');
                keys.forEach((key, kIndex) => {
                    const span = document.createElement('span');
                    span.textContent = key.trim();
                    shortcut.appendChild(span);
                    if (kIndex < keys.length - 1) {
                        const plus = document.createTextNode(' + ');
                        shortcut.appendChild(plus);
                    }
                });
                li.appendChild(shortcut);
            }

            // Meta (e.g., "recently opened")
            if (item.meta) {
                const meta = document.createElement('div');
                meta.className = 'quick-pick-item-meta';
                meta.textContent = item.meta;
                li.appendChild(meta);
            }

            li.addEventListener('mousedown', (e) => {
                e.preventDefault(); // Prevent focus loss from input
                this._select(item);
            });

            li.addEventListener('mouseenter', () => {
                this.selectedIndex = index;
                const items = list.querySelectorAll('.quick-pick-item');
                items.forEach(el => el.classList.remove('active'));
                li.classList.add('active');
            });

            list.appendChild(li);
        });
    }

    _highlightText(text, query) {
        if (!query) return text;
        const lowerText = text.toLowerCase();
        const lowerQuery = query.toLowerCase();
        let result = '';
        let lastPos = 0;
        let pos = lowerText.indexOf(lowerQuery);

        while (pos !== -1) {
            result += text.substring(lastPos, pos);
            result += `<span class="quick-pick-highlight">${text.substring(pos, pos + query.length)}</span>`;
            lastPos = pos + query.length;
            pos = lowerText.indexOf(lowerQuery, lastPos);
        }
        result += text.substring(lastPos);
        return result;
    }

    _getExtClass(fileName) {
        if (!fileName) return '';
        const ext = fileName.split('.').pop().toLowerCase();
        if (ext === 'js' || ext === 'ts') return 'icon-js';
        if (ext === 'css' || ext === 'scss') return 'icon-css';
        if (ext === 'html') return 'icon-html';
        if (ext === 'json') return 'icon-json';
        if (ext === 'md') return 'icon-md';
        if (ext === 'svg') return 'icon-svg';
        if (fileName.startsWith('.')) return 'icon-config';
        return '';
    }

}

export const quickPick = new QuickPick();
