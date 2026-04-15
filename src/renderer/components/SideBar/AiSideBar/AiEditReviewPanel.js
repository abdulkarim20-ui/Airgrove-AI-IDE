import { getIconForFile } from '../../../utils/file-icons.js';

/**
 * AiEditReviewPanel Class
 * Manages the "Edit Review" UI displayed above the AI sidebar input area.
 */
export class AiEditReviewPanel {
    constructor(parentContainer) {
        this.parentContainer = parentContainer;
        this.panel = null;
        this.sessionIds = []; // Current active sessions
        this.pendingSessions = new Map(); // Store full session data locally for faster rendering
        this.isCollapsed = false;
        
        this._init();
        this._setupListeners();
    }

    _init() {
        this.panel = document.createElement('div');
        this.panel.className = 'ai-edit-review-panel hidden';
        this.panel.id = 'ai-edit-review-panel';
        
        this.parentContainer.prepend(this.panel);
    }

    _setupListeners() {
        document.addEventListener('ai-edit-review-start', async (e) => {
            const { sessionId } = e.detail || {};
            if (sessionId && !this.sessionIds.includes(sessionId)) {
                this.sessionIds.push(sessionId);
                await this._fetchSessionData(sessionId);
                // Wait for the full AI response to finish before showing the sidebar panel
            }
        });

        document.addEventListener('ai-response-complete', () => {
            if (this.sessionIds.length > 0) {
                this._render();
            }
        });

        // Clear UI if session is ended externally (e.g. from editor diff buttons)
        document.addEventListener('ai-edit-session-ended', () => {
            this._clearSessions();
        });
    }

    async _fetchSessionData(sessionId) {
        try {
            const response = await window.electronAPI.aiEditsGetSession(sessionId);
            if (response?.success && response.session) {
                this.pendingSessions.set(sessionId, response.session);
            }
        } catch (error) {
            console.error('[AI Review] Failed to fetch session data:', error);
        }
    }

    _render() {
        if (this.sessionIds.length === 0) {
            this.panel.classList.add('hidden');
            this.panel.innerHTML = '';
            return;
        }

        this.panel.classList.remove('hidden');
        this.panel.innerHTML = '';
        
        if (this.isCollapsed) {
            this.panel.classList.add('collapsed');
        } else {
            this.panel.classList.remove('collapsed');
        }

        // Group files by path across all sessions
        const groupedFiles = new Map();

        for (const sessionId of this.sessionIds) {
            const session = this.pendingSessions.get(sessionId);
            if (!session) continue;

            (session.files || []).forEach(file => {
                if (!file.success) return;
                
                let added = 0;
                let removed = 0;
                
                (file.hunks || []).forEach(hunk => {
                    added += (hunk.added?.length || 0);
                    removed += (hunk.removed?.length || 0);
                });

                const existing = groupedFiles.get(file.filePath);
                if (existing) {
                    existing.added += added;
                    existing.removed += removed;
                } else {
                    groupedFiles.set(file.filePath, {
                        path: file.filePath,
                        name: file.filePath.split(/[\\/]/).pop(),
                        added,
                        removed
                    });
                }
            });
        }

        const totalFiles = groupedFiles.size;
        const fileEntries = Array.from(groupedFiles.values());

        // 1. Create File Boxes (Top Section)
        const fileListContainer = document.createElement('div');
        fileListContainer.className = 'ai-review-file-list';

        fileEntries.forEach(file => {
            const fileBox = document.createElement('div');
            fileBox.className = 'ai-review-file-box';
            
            // Custom Square Dot Icon
            const statusIcon = document.createElement('div');
            statusIcon.className = 'ai-review-status-icon';
            statusIcon.innerHTML = `
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#df925d" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <rect width="18" height="18" x="3" y="3" rx="2"/><circle cx="12" cy="12" r="1.5" fill="#df925d"/>
                </svg>
            `;

            fileBox.innerHTML = `
                <div class="ai-review-status-icon">${statusIcon.innerHTML}</div>
                <div class="ai-review-file-diff">
                    <span class="diff-added">+${file.added}</span>
                    <span class="diff-removed">-${file.removed}</span>
                </div>
                <div class="ai-review-file-info">
                    <span class="ai-review-file-name">${file.name}</span>
                    <span class="ai-review-file-path-prefix">${file.path}</span>
                </div>
            `;
            
            fileBox.onclick = () => {
                document.dispatchEvent(new CustomEvent('open-file', {
                    detail: { filePath: file.path }
                }));
            };
            
            fileListContainer.appendChild(fileBox);
        });

        this.panel.appendChild(fileListContainer);

        // 2. Create Action Bar (Bottom Section)
        const actionBar = document.createElement('div');
        actionBar.className = 'ai-review-action-bar';
        
        const fileCountText = `${totalFiles} File${totalFiles > 1 ? 's' : ''} With Changes`;

        actionBar.innerHTML = `
            <div class="ai-review-nav-group">
                <i class="codicon codicon-arrow-left ai-review-nav-icon"></i>
                <i class="codicon codicon-file ai-review-nav-icon"></i>
                <span class="ai-review-count-text" title="${fileCountText}">${fileCountText}</span>
            </div>
            
            <div class="ai-review-spacer"></div>
            
            <button class="ai-review-reject-all">Reject all</button>
            <button class="ai-review-accept-all">Accept all</button>
            
            <div class="ai-review-chevron">
                <i class="codicon ${this.isCollapsed ? 'codicon-chevron-up' : 'codicon-chevron-down'}"></i>
            </div>
        `;

        actionBar.querySelector('.ai-review-accept-all').onclick = () => this._handleAction('accept');
        actionBar.querySelector('.ai-review-reject-all').onclick = () => this._handleAction('reject');
        
        // Collapse Toggle
        actionBar.querySelector('.ai-review-chevron').onclick = () => {
            this.isCollapsed = !this.isCollapsed;
            this._render();
        };

        this.panel.appendChild(actionBar);
    }

    async _handleAction(action) {
        const sessionIdsToProcess = [...this.sessionIds];
        
        // Hide immediately to feel responsive
        this.panel.classList.add('hidden');
        
        for (const sessionId of sessionIdsToProcess) {
            try {
                if (action === 'accept') {
                    const result = await window.electronAPI.aiEditsAcceptSession(sessionId);
                    if (result?.results) {
                        for (const item of result.results) {
                            if (item.success) {
                                document.dispatchEvent(new CustomEvent('file-content-changed', {
                                    detail: { filePath: item.filePath }
                                }));
                            }
                        }
                    }
                } else {
                    const session = this.pendingSessions.get(sessionId);
                    const touchedFiles = new Set();
                    (session?.files || []).forEach(f => {
                        if (f.success) touchedFiles.add(f.filePath);
                    });
                    
                    await window.electronAPI.aiEditsRejectSession(sessionId);
                    
                    for (const filePath of touchedFiles) {
                        document.dispatchEvent(new CustomEvent('file-content-changed', {
                            detail: { filePath: filePath }
                        }));
                    }
                }
            } catch (error) {
                console.error(`[AI Review] Failed to ${action} session ${sessionId}:`, error);
            }
        }

        if (window.electronAPI.triggerLiveReload) {
            window.electronAPI.triggerLiveReload();
        }

        // Notify other components (like EditorGroup) to clear their inline review widgets
        document.dispatchEvent(new CustomEvent('ai-edit-session-ended'));
        
        this._clearSessions();
    }

    _clearSessions() {
        this.sessionIds = [];
        this.pendingSessions.clear();
        this.isCollapsed = false; // Reset collapse state for next session
        this._render();
    }
}
