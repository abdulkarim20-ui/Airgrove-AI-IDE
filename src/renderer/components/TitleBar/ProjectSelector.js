
import { workspaceManager } from '../../core/WorkspaceManager.js';

let activeWorkspacePath = null; // Track the currently open project path

export function setupProjectSelector() {
    const selector = document.querySelector('.project-selector');
    if (!selector) {
        console.error('Project Selector: Element .project-selector not found.');
        return;
    }

    // click handler
    selector.addEventListener('click', (e) => {
        // Prevent event bubbling so the document click listener doesn't immediately close it
        e.stopPropagation();

        // Toggle logic
        const existingMenu = document.querySelector('.project-dropdown');
        if (existingMenu) {
            closeMenu(existingMenu);
        } else {
            showProjectMenu(selector);
        }
    });

    // Close on click outside
    document.addEventListener('click', (e) => {
        const menu = document.querySelector('.project-dropdown');
        if (menu && !menu.contains(e.target) && !selector.contains(e.target)) {
            closeMenu(menu);
        }
    });

    // NEW: Close if another menu opens
    document.addEventListener('menu-opened', (e) => {
        if (e.detail?.source !== 'project-selector') {
            const menu = document.querySelector('.project-dropdown');
            if (menu) closeMenu(menu);
        }
    });

    // Helper to update UI
    const updateUI = (folderPath) => {
        if (!folderPath) return;
        activeWorkspacePath = folderPath;
        const parts = folderPath.split(/[\\/]/);
        const name = parts.pop() || folderPath;
        const nameSpan = selector.querySelector('.project-name');
        if (nameSpan) nameSpan.textContent = name;
    }

    // 1. Listen for standard Electron event
    if (window.electronAPI?.onFolderOpened) {
        window.electronAPI.onFolderOpened((folderPath) => updateUI(folderPath));
    }

    // 2. Listen for internal WorkspaceManager event
    document.addEventListener('workspace-bootstrapped', (e) => {
        if (e.detail && e.detail.path) {
            updateUI(e.detail.path);
        }
    });

    // 3. Check initial state
    const current = workspaceManager.getWorkspacePath();
    if (current) {
        updateUI(current);
    }
}

function closeMenu(menu) {
    if (!menu) return;
    // Just remove it immediately for snappiness
    menu.remove();
}

function showProjectMenu(anchorElement) {
    const menu = document.createElement('div');
    menu.className = 'project-dropdown';

    // 1. Render Standard Options IMMEDIATELY
    const standardOptions = [
        { label: 'Open Folder', icon: 'codicon-folder-opened', action: 'open-folder' },
        { label: 'Clone Git Repository', icon: 'codicon-source-control', action: 'clone-repo' },
        { label: 'Connect Remote Host', icon: 'codicon-remote', action: 'connect-host' }
    ];

    standardOptions.forEach(opt => {
        const item = document.createElement('div');
        item.className = 'project-dropdown-item';

        const icon = document.createElement('i');
        icon.className = `codicon ${opt.icon}`;

        const label = document.createElement('span');
        label.textContent = opt.label;

        item.appendChild(icon);
        item.appendChild(label);

        item.addEventListener('click', () => {
            document.dispatchEvent(new CustomEvent(`${opt.action}-triggered`));
            closeMenu(menu);
        });
        menu.appendChild(item);
    });

    // 2. Add Separator & Header
    const separator = document.createElement('div');
    separator.className = 'project-dropdown-separator';
    menu.appendChild(separator);

    const recentLabel = document.createElement('div');
    recentLabel.className = 'project-dropdown-header';
    recentLabel.textContent = 'Recent';
    menu.appendChild(recentLabel);

    // 3. Create a container for recents so we can populate it later
    const recentContainer = document.createElement('div');
    recentContainer.id = 'project-dropdown-recents';
    // Add a temporary loading or empty state if desired, or just leave empty
    menu.appendChild(recentContainer);

    // NEW: Notify others that we are opening
    document.dispatchEvent(new CustomEvent('menu-opened', { detail: { source: 'project-selector' } }));

    // 4. Append to DOM and Position
    document.body.appendChild(menu);

    const rect = anchorElement.getBoundingClientRect();
    menu.style.top = `${rect.bottom + 6}px`; // Slight offset
    menu.style.left = `${rect.left}px`;

    // Force reflow for transition (if we want to use the .visible class opacity)
    requestAnimationFrame(() => {
        menu.classList.add('visible');
    });

    // 5. Fetch Recents Asynchronously
    loadRecentProjects(recentContainer, menu);
}

async function loadRecentProjects(container, menuElement) {
    try {
        if (!window.electronAPI?.getRecentFolders) return;

        const recents = await window.electronAPI.getRecentFolders();

        // If menu was closed while fetching, stop
        if (!document.body.contains(menuElement)) return;

        if (!recents || recents.length === 0) {
            const empty = document.createElement('div');
            empty.className = 'project-dropdown-item';
            empty.style.color = '#777';
            empty.style.cursor = 'default';
            empty.textContent = 'No recent folders';
            container.appendChild(empty);
            return;
        }

        // Limit to 5 items
        const displayRecents = recents.slice(0, 5);

        displayRecents.forEach(path => {
            // Extract name
            const parts = path.split(/[\\/]/);
            let name = parts.pop();
            if (!name && parts.length > 0) name = parts.pop();
            if (!name) name = path;

            // Initials
            const initials = (name.substring(0, 1) + (name.length > 1 ? name.match(/[A-Z]/g)?.[1] || '' : '')).toUpperCase() || name.substring(0, 2).toUpperCase();

            // Color Generation
            let hash = 0;
            for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);

            // Curated Palette from Reference Image (Salmon, Green, Blue, Purple)
            const palette = [
                '#FF9B9B', // Salmon/Pink
                '#56E39F', // Bright Green 
                '#6EB4F7', // Blue
                '#D495E4', // Purple
                '#FFB86C', // Orange
                '#64D2C9'  // Teal
            ];
            const bg = palette[Math.abs(hash) % palette.length];

            // DOM Elements
            const item = document.createElement('div');
            item.className = 'project-dropdown-recent-item';

            const iconBox = document.createElement('div');
            iconBox.className = 'project-icon-box';
            iconBox.style.backgroundColor = bg;
            iconBox.textContent = initials.length > 0 ? initials : 'P';

            const details = document.createElement('div');
            details.className = 'project-details';

            const nameSpan = document.createElement('div');
            nameSpan.className = 'project-name-text';
            nameSpan.textContent = name;

            const pathSpan = document.createElement('div');
            pathSpan.className = 'project-path-text';
            pathSpan.textContent = path; // Simplification: showing full path or relative?

            details.appendChild(nameSpan);
            details.appendChild(pathSpan);

            item.appendChild(iconBox);
            item.appendChild(details);

            // CHECK FOR ACTIVE PROJECT
            // Normalize paths for comparison (basic check)
            // Windows robustness: Normalize slashes and casing
            const normalize = (p) => p ? p.replace(/[\\/]/g, '\\').toLowerCase() : '';
            if (activeWorkspacePath && normalize(path) === normalize(activeWorkspacePath)) {
                const tick = document.createElement('i');
                tick.className = 'codicon codicon-check project-active-tick';
                item.appendChild(tick);
            }

            item.addEventListener('click', async () => {
                try {
                    await workspaceManager.bootstrap(path);
                } catch (e) {
                    console.error("Failed to open project", e);
                }
                closeMenu(menuElement);
            });

            container.appendChild(item);
        });

    } catch (err) {
        console.error("Error loading recents:", err);
    }
}
