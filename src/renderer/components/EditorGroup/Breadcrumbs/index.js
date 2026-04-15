import { getIconForFile } from '../../../utils/file-icons.js';
import { explorerState } from '../../views/ExplorerView/explorer-state.js';

const WELCOME_PAGE_PATH = 'internal://welcome';

export class Breadcrumbs {
    constructor(containerElement) {
        this.container = containerElement;
    }

    render(filePath) {
        this.container.innerHTML = '';

        if (!filePath || filePath.startsWith(WELCOME_PAGE_PATH) || filePath.startsWith('Untitled-') || filePath.startsWith('preview://') || filePath.startsWith('mcp://')) {
            this.container.style.display = 'none';
            return;
        }

        // Logic: Only show breadcrumbs if the file is IN A SUBFOLDER of the current workspace
        // If it's in the root folder, hide breadcrumbs (like VS Code)
        const rootPath = explorerState.getRootPath();
        let displayPath = filePath;

        if (rootPath && filePath.startsWith(rootPath)) {
            // Get path relative to the root
            const relativePath = filePath.substring(rootPath.length).replace(/^[\\/]/, '');
            const parts = relativePath.split(/[\\/]/);

            if (parts.length <= 1) {
                // File is in the root folder, hide breadcrumbs
                this.container.style.display = 'none';
                return;
            }

            // Otherwise, we show the relative path parts
            displayPath = relativePath;
        } else {
            // Fallback for files outside workspace or if no workspace is loaded:
            // Just show the filename or parent folder
            const fallbackParts = filePath.split(/[\\/]/).filter(p => !p.endsWith(':'));
            if (fallbackParts.length <= 1) {
                this.container.style.display = 'none';
                return;
            }
            displayPath = fallbackParts.join('/');
        }

        this.container.style.display = 'flex';

        // Split the calculated displayPath into parts
        const parts = displayPath.split(/[\\/]/);

        parts.forEach((part, index) => {
            const isLast = index === parts.length - 1;

            const item = document.createElement('div');
            item.className = 'breadcrumb-item';

            // --- START: MODIFICATION ---
            // Only create and add an icon if it's the last part of the path (the file).
            if (isLast) {
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

                const iconData = getIconForFile(part);
                const icon = createIconElement(iconData);
                item.appendChild(icon);
            }
            // --- END: MODIFICATION ---

            const label = document.createElement('span');
            label.textContent = part;
            item.appendChild(label);

            this.container.appendChild(item);

            if (!isLast) {
                const separator = document.createElement('i');
                separator.className = 'codicon codicon-chevron-right breadcrumb-separator';
                this.container.appendChild(separator);
            }
        });
    }
}
