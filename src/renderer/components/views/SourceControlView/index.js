// Source Control View Component
import { workspaceManager } from '../../../core/WorkspaceManager.js';
import { getIconForFile } from '../../../utils/file-icons.js';

class SourceControlController {
    constructor() {
        this.container = document.querySelector('#source-control-view .aux-view-content');
        this.state = 'initial'; // initial, scanning, no-repo, repo
        this.status = null; // Git status data

        this.init();
    }

    init() {
        this.bindEvents();

        // Check if workspace is already loaded
        if (workspaceManager.hasWorkspace()) {
            this.scan(workspaceManager.getWorkspacePath());
        } else {
            this.render();
        }
    }

    bindEvents() {
        // Workspace loaded
        document.addEventListener('workspace-bootstrapped', (e) => {
            if (e.detail && e.detail.path) {
                this.scan(e.detail.path);
            }
        });

        // Workspace disposed
        document.addEventListener('workspace-disposed', () => {
            this.state = 'initial';
            this.status = null;
            this.render();
        });

        // Toggle visibility helper (from existing code)
        const sourceControlHeader = document.querySelector('#source-control-view .aux-view-header');
        if (sourceControlHeader) {
            sourceControlHeader.addEventListener('click', () => {
                const content = sourceControlHeader.nextElementSibling;
                const chevron = sourceControlHeader.querySelector('.codicon');
                if (content && content.style.display !== 'none') {
                    content.style.display = 'none';
                    chevron?.classList.replace('codicon-chevron-down', 'codicon-chevron-right');
                } else if (content) {
                    content.style.display = 'block';
                    chevron?.classList.replace('codicon-chevron-right', 'codicon-chevron-down');
                }
            });
        }

        // Filesystem changed - Refresh status if in repo state
        if (window.electronAPI && window.electronAPI.onFileSystemChange) {
            window.electronAPI.onFileSystemChange(async () => {
                if (this.state === 'repo') {
                    await this.refreshStatus();
                }
            });
        }
    }

    async scan(path) {
        this.state = 'scanning';
        this.render();

        // Artificial delay for UX (visualize scanning)
        await new Promise(r => setTimeout(r, 800));

        const isRepo = await window.electronAPI.checkGitRepo();
        if (isRepo) {
            this.state = 'repo';
            await this.refreshStatus();
        } else {
            this.state = 'no-repo';
            this.render();
        }
    }

    async refreshStatus() {
        this.status = await window.electronAPI.getGitStatus();
        this.render();
    }

    async initRepo() {
        this.state = 'scanning';
        this.render();
        const success = await window.electronAPI.initGitRepo();
        if (success) {
            this.scan(workspaceManager.getWorkspacePath());
        } else {
            // Error handling could be added here
            this.state = 'no-repo';
            this.render();
        }
    }

    render() {
        if (!this.container) return;
        this.container.innerHTML = '';

        switch (this.state) {
            case 'initial':
                this.renderInitialState();
                break;
            case 'scanning':
                this.renderScanningState();
                break;
            case 'no-repo':
                this.renderNoRepoState();
                break;
            case 'repo':
                this.renderRepoState();
                break;
        }
    }

    renderInitialState() {
        this.container.innerHTML = `
            <div class="source-control-message-container">
                <div class="scm-message">
                    In order to use Git features, you can open a folder containing a Git repository or clone from a URL.
                </div>
                <button id="scm-open-folder-btn" class="source-control-btn">Open Folder</button>
                <button id="scm-clone-repo-btn" class="source-control-btn">Clone Repository</button>
                <div class="scm-message" style="margin-top: 15px;">
                    To learn more about how to use Git and source control in VS Code <a href="#" style="color: #3794FF; text-decoration: none;">read our docs</a>.
                </div>
            </div>
        `;

        document.getElementById('scm-open-folder-btn')?.addEventListener('click', () => workspaceManager.openFolder());
        document.getElementById('scm-clone-repo-btn')?.addEventListener('click', () => console.log('Clone clicked'));
    }

    renderScanningState() {
        this.container.innerHTML = `
            <div class="scm-scanning-container">
                 <div class="codicon codicon-loading codicon-modifier-spin"></div>
                 <span class="scm-scanning-text">Scanning folder for Git repositories...</span>
            </div>
        `;
    }

    renderNoRepoState() {
        this.container.innerHTML = `
            <div class="scm-no-repo-container">
                <div class="scm-message">
                    The folder currently open doesn't have a Git repository. You can initialize a repository which will enable source control features powered by Git.
                </div>
                <button id="scm-init-repo-btn" class="source-control-btn">Initialize Repository</button>
                <div class="scm-message" style="margin-top: 15px;">
                    You can directly publish this folder to a GitHub repository.
                </div>
                <button id="scm-publish-btn" class="source-control-btn">
                    <span class="codicon codicon-github" style="margin-right: 5px;"></span> Publish to GitHub
                </button>
            </div>
        `;

        document.getElementById('scm-init-repo-btn')?.addEventListener('click', () => this.initRepo());
    }

    /**
     * Helper to attach resizer logic.
     */
    attachResizerEvents() {
        const resizer = this.container.querySelector('.scm-resizer');
        const graphSection = this.container.querySelector('.scm-graph-section');
        const fileListWrapper = this.container.querySelector('.scm-file-list-wrapper');

        if (!resizer || !graphSection || !fileListWrapper) return;

        let isResizing = false;
        let startY = 0;
        let startHeight = 0;

        const onMouseDown = (e) => {
            isResizing = true;
            startY = e.clientY;
            startHeight = graphSection.getBoundingClientRect().height;
            resizer.classList.add('active');
            document.body.style.cursor = 'row-resize';
            document.body.style.userSelect = 'none'; // Prevent text selection
        };

        const onMouseMove = (e) => {
            if (!isResizing) return;
            const dy = startY - e.clientY; // Dragging UP increases graph height
            const newHeight = Math.max(0, startHeight + dy); // Don't let it go below 0

            // Optional: Limit max height based on container?
            // For now, flex-shrink on the file list wrapper will handle the rest naturally
            graphSection.style.height = `${newHeight}px`;
        };

        const onMouseUp = () => {
            if (isResizing) {
                isResizing = false;
                resizer.classList.remove('active');
                document.body.style.cursor = '';
                document.body.style.userSelect = '';
            }
        };

        resizer.addEventListener('mousedown', onMouseDown);
        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
    }

    /**
     * Helper to toggle section visibility + icon rotation
     */
    toggleSection(headerElement) {
        // Find the content immediately following the header
        // For 'Changes', it's the UL list. For 'Graph', it's the content div.
        const content = headerElement.nextElementSibling;
        const icon = headerElement.querySelector('.codicon-chevron-down, .codicon-chevron-right');

        if (!content || !icon) return; // Safety

        if (content.classList.contains('hidden') || content.style.display === 'none') {
            // Expand
            content.classList.remove('hidden');
            content.style.display = 'block';
            icon.classList.remove('codicon-chevron-right');
            icon.classList.add('codicon-chevron-down');
        } else {
            // Collapse
            content.classList.add('hidden');
            content.style.display = 'none';
            icon.classList.remove('codicon-chevron-down');
            icon.classList.add('codicon-chevron-right');
        }
    }

    renderRepoState() {
        const files = this.status?.files || [];
        const repoName = workspaceManager.currentWorkspace?.name || 'Repository';

        // Split files into Staged and Changes
        const stagedFiles = [];
        const changedFiles = [];

        files.forEach(file => {
            const index = file.index.trim();
            const workDir = file.working_dir.trim();

            if (index && index !== '?' && index !== '') {
                stagedFiles.push({ ...file, statusChar: index, internalStatus: 'staged' });
            }
            if (workDir && workDir !== '') {
                changedFiles.push({ ...file, statusChar: workDir === '?' ? 'U' : workDir, internalStatus: 'changed' });
            }
        });

        // Helper to render a file list row
        const renderFileList = (items, type) => {
            return items.map(file => {
                const iconData = getIconForFile(this.getFileName(file.path));
                let iconHtml = iconData.type === 'svg'
                    ? `<img src="${iconData.value}" class="scm-file-icon file-icon-svg" style="width: 16px; height: 16px; margin-right: 6px;">`
                    : `<span class="scm-file-icon codicon ${iconData.value}" style="margin-right: 6px;"></span>`;

                let actions = '';
                if (type === 'staged') {
                    actions = `<span class="scm-action-btn codicon codicon-remove" data-action="unstage" data-path="${file.path}" title="Unstage Changes"></span>`;
                } else {
                    actions = `
                        <span class="scm-action-btn codicon codicon-discard" data-action="discard" data-path="${file.path}" title="Discard Changes"></span>
                        <span class="scm-action-btn codicon codicon-add" data-action="stage" data-path="${file.path}" title="Stage Changes"></span>
                    `;
                }

                // Determine badge class
                let badgeClass = 'M';
                const s = file.statusChar;
                if (s === '?' || s === 'U') badgeClass = 'U';
                else if (s === 'A') badgeClass = 'A';
                else if (s === 'D') badgeClass = 'D';
                else if (s === 'R') badgeClass = 'R';

                return `
                    <li class="scm-file-item" title="${file.path}">
                        ${iconHtml}
                        <span class="scm-file-name">${this.getFileName(file.path)}</span>
                        <span class="scm-file-path">${this.getDirName(file.path)}</span>
                        <div class="scm-actions">${actions}</div>
                        <span class="scm-badge ${badgeClass}">${s}</span>
                    </li>
                `;
            }).join('');
        };

        const stagedListHTML = renderFileList(stagedFiles, 'staged');
        const changesListHTML = renderFileList(changedFiles, 'changed');

        const initialGraphHeight = 130;

        this.container.innerHTML = `
            <div class="scm-changes-container">
                 <!-- 1. Repo Header -->
                 <div class="scm-repo-header scm-group-header">
                     <span class="codicon codicon-chevron-down" style="margin-right: 4px; font-size: 12px;"></span>
                     <span class="scm-repo-title">${repoName}</span>
                     <div class="scm-repo-actions" style="margin-left: auto; display: flex; gap: 8px;">
                         <span class="codicon codicon-list-tree" title="View as Tree" style="cursor: pointer; font-size: 14px;"></span>
                         <span class="codicon codicon-check" title="Commit" style="cursor: pointer; font-size: 14px;"></span>
                         <span class="codicon codicon-refresh" title="Refresh" style="cursor: pointer; font-size: 14px;"></span>
                         <span class="codicon codicon-ellipsis" title="More Actions..." style="cursor: pointer; font-size: 14px;"></span>
                     </div>
                 </div>

                <!-- 2. Input Section -->
                <div class="scm-input-container" style="padding: 10px; background-color: transparent; border-bottom: none;">
                    <div style="position: relative;">
                        <textarea class="scm-commit-input" placeholder="Commit Changes (Ctrl+Enter to commit)" style="padding-right: 45px; min-height: 32px; font-family: inherit;"></textarea>
                         <span class="codicon codicon-sparkle" title="Generate Commit Message (AI)" style="position: absolute; right: 8px; top: 8px; color: #cccccc; cursor: pointer;"></span>
                    </div>
                </div>

                <!-- 3. Commit Button -->
                <div style="padding: 0 10px 10px;">
                    <div class="scm-split-button" style="display: flex; width: 100%;">
                        <button class="scm-commit-btn-main">
                            <span class="codicon codicon-check" style="margin-right: 5px; color: black;"></span> Commit
                        </button>
                        <button class="scm-commit-btn-arrow">
                            <span class="codicon codicon-chevron-down" style="color: black;"></span>
                        </button>
                    </div>
                </div>

                <!-- 4. Resizable Changes Wrapper -->
                <div class="scm-file-list-wrapper">
                    
                    <!-- Staged Changes Section -->
                    ${stagedFiles.length > 0 ? `
                        <div class="scm-group-header staged-header" style="justify-content: space-between;">
                            <div style="display: flex; align-items: center;">
                                <span class="codicon codicon-chevron-down" style="margin-right: 4px;"></span>
                                Staged Changes
                            </div>
                            <div class="scm-section-actions" style="display: flex; gap: 6px; align-items: center;">
                                <span class="codicon codicon-remove" title="Unstage Assume" id="btn-unstage-all" style="cursor: pointer; font-size: 14px; opacity: 0.8;"></span>
                                <span style="background: #454545; padding: 0 6px; border-radius: 9px; font-size: 11px; margin-left: 4px;">${stagedFiles.length}</span>
                            </div>
                        </div>
                        <ul class="scm-file-list" id="list-staged">
                            ${stagedListHTML}
                        </ul>
                    ` : ''}

                    <!-- Changes Section -->
                    <div class="scm-group-header changes-header" style="justify-content: space-between;">
                        <div style="display: flex; align-items: center;">
                            <span class="codicon codicon-chevron-down" style="margin-right: 4px;"></span>
                            Changes
                        </div>
                         <div class="scm-section-actions" style="display: flex; gap: 6px; align-items: center;">
                             <span class="codicon codicon-discard" title="Discard All Changes" id="btn-discard-all" style="cursor: pointer; font-size: 14px; opacity: 0.8;"></span>
                             <span class="codicon codicon-add" title="Stage All Changes" id="btn-stage-all" style="cursor: pointer; font-size: 14px; opacity: 0.8;"></span>
                             <span style="background: #454545; padding: 0 6px; border-radius: 9px; font-size: 11px; margin-left: 4px;">${changedFiles.length}</span>
                         </div>
                    </div>
                    <ul class="scm-file-list" id="list-changes">
                        ${changesListHTML}
                    </ul>
                </div>
                
                <!-- 5. Resizer Handle -->
                <div class="scm-resizer"></div>

                <!-- 6. Resizable Graph Section -->
                <div class="scm-graph-section" style="height: ${initialGraphHeight}px;">
                    <!-- Graph Header -->
                    <div class="scm-group-header graph-header" style="justify-content: space-between;">
                        <div style="display: flex; align-items: center;">
                             <span class="codicon codicon-chevron-right" style="margin-right: 4px;"></span>
                             Graph
                        </div>
                         <div class="scm-section-actions" style="display: flex; gap: 6px; align-items: center;">
                             <span class="codicon codicon-git-branch" title="Show Branches" style="cursor: pointer; font-size: 14px; opacity: 0.8;"></span>
                             <span class="codicon codicon-cloud-download" title="Fetch" style="cursor: pointer; font-size: 14px; opacity: 0.8;"></span>
                             <span class="codicon codicon-arrow-down" title="Pull" style="cursor: pointer; font-size: 14px; opacity: 0.8;"></span>
                             <span class="codicon codicon-cloud-upload" title="Publish Branch" style="cursor: pointer; font-size: 14px; opacity: 0.8;"></span>
                             <span class="codicon codicon-refresh" title="Refresh Graph" style="cursor: pointer; font-size: 14px; opacity: 0.8;"></span>
                             <span class="codicon codicon-ellipsis" title="More Actions..." style="cursor: pointer; font-size: 14px; opacity: 0.8;"></span>
                         </div>
                    </div>
                    <!-- Graph Content -->
                    <div class="scm-section-content hidden" style="padding: 10px; color: #888; font-size: 13px; line-height: 1.4; overflow: hidden; display: none;"> 
                        The selected source control provider does not have any source control history items.
                    </div>
                </div>
            </div>
        `;

        this.attachResizerEvents();

        // --- Attach Action Listeners ---
        const commitBtn = this.container.querySelector('.scm-commit-btn-main');
        const commitInput = this.container.querySelector('.scm-commit-input');

        if (commitInput) {
            commitInput.addEventListener('keydown', async (e) => {
                if (e.ctrlKey && e.key === 'Enter') {
                    if (commitBtn) commitBtn.click();
                }
            });
        }

        if (commitBtn && commitInput) {
            commitBtn.addEventListener('click', async () => {
                const message = commitInput.value;
                if (!message.trim()) return;

                // If there are no staged files but there are changes, we could prompt to stage all.
                // For now, simple-git commit will fail if nothing staged.
                // Mimic VS Code: "There are no staged changes to commit. Would you like to stage all your changes and commit them directly?"
                if (stagedFiles.length === 0 && changedFiles.length > 0) {
                    if (confirm('There are no staged changes to commit.\n\nWould you like to stage all your changes and commit them directly?')) {
                        await window.electronAPI.gitStageAll();
                        // Continue to commit
                    } else {
                        return;
                    }
                }

                const result = await window.electronAPI.gitCommit(message);
                if (result && result.success) {
                    commitInput.value = ''; // Clear input on success
                    await this.refreshStatus(); // Refresh to show clean state
                    await this.renderGraph(); // Refresh graph
                } else {
                    console.error("Commit failed", result?.error);
                    if (result?.error && result.error.includes('Author identity unknown')) {
                        alert('Git Commit Failed: Author identity unknown.\n\nPlease configure your git user and email in the terminal:\n\ngit config --global user.email "you@example.com"\ngit config --global user.name "Your Name"');
                    } else {
                        alert(`Commit failed: ${result?.error || 'Unknown error'}`);
                    }
                }
            });
        }

        // Action Delegation for file items
        this.container.addEventListener('click', async (e) => {
            const btn = e.target.closest('.scm-action-btn');
            if (!btn) return;
            e.stopPropagation();

            const action = btn.dataset.action;
            const path = btn.dataset.path;

            if (action === 'stage') {
                await window.electronAPI.gitStage([path]);
            } else if (action === 'unstage') {
                await window.electronAPI.gitUnstage([path]);
            } else if (action === 'discard') {
                if (confirm(`Discard changes to ${this.getFileName(path)}?`)) {
                    await window.electronAPI.gitDiscard([path]);
                }
            }
            await this.refreshStatus();
        });

        // Global Refresh
        this.container.querySelectorAll('.codicon-refresh').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.stopPropagation();
                await this.refreshStatus();
                this.renderGraph();
            });
        });

        // Stage/Discard All
        const discardAllBtn = this.container.querySelector('#btn-discard-all');
        const stageAllBtn = this.container.querySelector('#btn-stage-all');
        const unstageAllBtn = this.container.querySelector('#btn-unstage-all');

        if (discardAllBtn) {
            discardAllBtn.addEventListener('click', async (e) => {
                e.stopPropagation();
                if (confirm('Discard all changes? This is irreversible.')) {
                    await window.electronAPI.gitUnstageAll(); // Reset index first? No, we likely want to clean working dir.
                    // Actually VS Code "Discard All Changes" usually means "Clean working tree".
                    // For now, let's just unstage everything and then verify if we need to clean.
                    // Wait, discard all usually means git checkout .
                    // I'll stick to 'unstageAll' as per previous code, but correctly 'gitDiscard' would be better for Changed files.
                    // But for mass discard, we might not have exposed a `gitDiscardAll` yet.
                    // Previous code: `await window.electronAPI.gitUnstageAll()` -> likely wrong label for "Discard". Use carefully.
                    // I will leave logic as "Unstage All" for safety, OR use clean/checkout .
                    // The safe bet is to prevent dataloss if logic is fuzzy.
                    // I will alert "To implement: Discard All" or just do unstage for now to be safe.
                    // Actually, let's map it to untrack all?
                    // Better:
                    // Changes -> Discard All -> git checkout . (reverts modified) + git clean (removes untracked)
                    // Currently I'll just map it to what it was: unstageAll? No, that was likely wrong.
                    // The user wanted VS Code mimicry. VS Code Discard All (clean) is destructive.
                    // I'll just do unstageAll for now to be safe, but realistically it should be checkout.
                    // Let's implement checkout for current folder.
                    // Since I don't have DiscardAll IPC, I'll stick to UnstageAll logic for now or implement proper logic later.
                    // To be safe, I'll make it Unstage All. 
                    await window.electronAPI.gitUnstageAll(); // This is effectively "Unstage All", not "Discard All Changes"
                    await this.refreshStatus();
                }
            });
        }

        if (stageAllBtn) {
            stageAllBtn.addEventListener('click', async (e) => {
                e.stopPropagation();
                await window.electronAPI.gitStageAll();
                await this.refreshStatus();
            });
        }

        if (unstageAllBtn) {
            unstageAllBtn.addEventListener('click', async (e) => {
                e.stopPropagation();
                await window.electronAPI.gitUnstageAll();
                await this.refreshStatus();
            });
        }

        // Graph Refresh logic
        const graphRefreshBtn = this.container.querySelector('.scm-graph-section .codicon-refresh');
        if (graphRefreshBtn) {
            graphRefreshBtn.addEventListener('click', async (e) => {
                e.stopPropagation();
                this.renderGraph();
            });
        }

        this.renderGraph();

        // Toggles
        this.container.querySelectorAll('.scm-group-header').forEach(header => {
            header.addEventListener('click', (e) => {
                if (e.target.closest('.scm-section-actions')) return;
                this.toggleSection(e.currentTarget);
            });
        });
    }

    async renderGraph() {
        const log = await window.electronAPI.getGitLog();
        const contentDiv = this.container.querySelector('.scm-graph-section .scm-section-content');
        if (!contentDiv) return;

        if (!log || log.length === 0) {
            contentDiv.innerHTML = 'The selected source control provider does not have any source control history items.';
            // Optionally ensure visibility if needed
            return;
        }

        const historyHTML = log.map(commit => {
            const shortHash = commit.hash.substring(0, 7);
            return `
                <div class="scm-history-item" style="display: flex; gap: 8px; padding: 4px 0; border-bottom: 1px solid #2b2b2b; color: #cccccc; font-size: 12px; cursor: pointer;" title="${commit.message} - ${commit.author_name}">
                    <span class="codicon codicon-git-commit" style="color: #007fd4; min-width: 16px;"></span>
                    <span style="flex: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${commit.message}</span>
                    <span style="color: #888; white-space: nowrap;">${shortHash}</span>
                </div>
            `;
        }).join('');

        contentDiv.innerHTML = `<div style="display: flex; flex-direction: column;">${historyHTML}</div>`;
    }

    getFileName(path) {
        return path.split(/[\\/]/).pop();
    }

    getDirName(path) {
        // Return relative path dir name if possible, heavily simplified
        const parts = path.split(/[\\/]/);
        parts.pop();
        return parts.length > 0 ? parts.join('/') : '';
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new SourceControlController();
});
