import { workspaceManager } from '../../../core/WorkspaceManager.js';
import { quickPick } from '../../QuickPick/index.js';
import { getIconForFolder } from '../../../utils/file-icons.js';

document.addEventListener('DOMContentLoaded', () => {
    // Buttons
    const newFileBtn = document.getElementById('welcome-new-file');
    const openFolderBtn = document.getElementById('welcome-open-folder');
    const cloneRepoBtn = document.getElementById('welcome-clone-repo');

    // Recent Folders
    const recentFoldersList = document.getElementById('recent-folders-list');
    const noRecentFoldersMsg = document.getElementById('no-recent-folders');

    // Footer Controls
    const showOnStartupCheckbox = document.getElementById('show-welcome-startup');
    const showOnStartupLabel = document.getElementById('show-welcome-label');

    async function loadRecentFolders() {
        const recents = await window.electronAPI.getRecentFolders();
        recentFoldersList.innerHTML = '';

        if (recents && recents.length > 0) {
            if (noRecentFoldersMsg) noRecentFoldersMsg.style.display = 'none';

            // Limit to 3 for a cleaner initial view
            const LIMIT = 3;
            const displayRecents = recents.slice(0, LIMIT);

            displayRecents.forEach(folderPath => {
                const parts = folderPath.split(/[\\/]/);
                const folderName = parts.pop() || folderPath;
                let parentPath = parts.join('\\') || '';
                if (parts.length === 1 && parentPath.endsWith(':')) parentPath += '\\';

                // Get the folder icon
                const iconData = getIconForFolder(folderName, false, true);

                const item = document.createElement('div');
                item.className = 'recent-item';
                item.innerHTML = `
                    <div class="recent-icon">
                        <img src="${iconData.value}" class="file-icon-svg" />
                    </div>
                    <div class="recent-name">${folderName}</div>
                    <div class="recent-path">${parentPath}</div>
                `;

                item.addEventListener('click', async () => {
                    await workspaceManager.bootstrap(folderPath);
                });

                recentFoldersList.appendChild(item);
            });

            if (recents.length > LIMIT) {
                const showMore = document.createElement('div');
                showMore.className = 'show-more-link';
                showMore.textContent = 'Show more...';
                showMore.style.marginTop = '12px';
                showMore.addEventListener('click', () => {
                    _openQuickPickForWorkspaces(recents);
                });
                recentFoldersList.appendChild(showMore);
            }

        } else {
            if (noRecentFoldersMsg) noRecentFoldersMsg.style.display = 'flex';
        }
    }

    function _openQuickPickForWorkspaces(allRecents) {
        const items = allRecents.map(path => {
            const parts = path.split(/[\\/]/);
            const name = parts.pop() || path;
            let parent = parts.join('\\');
            if (parts.length === 1 && parent.endsWith(':')) parent += '\\';

            return {
                label: name,
                description: parent,
                icon: 'codicon-folder',
                value: path
            };
        });

        quickPick.show(
            items,
            'Recent Workspaces',
            async (selectedPath) => {
                await workspaceManager.bootstrap(selectedPath);
            }
        );
    }

    // --- EVENT LISTENERS ---

    if (newFileBtn) {
        newFileBtn.addEventListener('click', () => {
            document.dispatchEvent(new CustomEvent('new-text-file-triggered'));
        });
    }

    if (openFolderBtn) {
        openFolderBtn.addEventListener('click', () => {
            document.dispatchEvent(new CustomEvent('open-folder-triggered'));
        });
    }

    if (cloneRepoBtn) {
        cloneRepoBtn.addEventListener('click', () => {
            console.log("Clone Repository clicked");
            // Future: Open clone dialog
        });
    }



    // Initial fade setup to prevent jumps before content is ready
    const welcomeContent = document.querySelector('.welcome-content');
    if (welcomeContent) welcomeContent.style.opacity = '0';

    loadRecentFolders().finally(() => {
        if (welcomeContent) {
            // Short timeout to ensure layout is measured correctly
            setTimeout(() => {
                welcomeContent.style.opacity = '1';
            }, 50);
        }
    });

    window.electronAPI.onRecentFolderRemoved(() => {
        loadRecentFolders();
    });

    // --- WORKSPACE LISTENERS ---
    document.addEventListener('workspace-bootstrapped', () => {
        const container = document.getElementById('welcome-view-container');
        if (container) container.classList.add('watermark');
    });

    document.addEventListener('workspace-disposed', () => {
        const container = document.getElementById('welcome-view-container');
        if (container) container.classList.remove('watermark');
    });
});
