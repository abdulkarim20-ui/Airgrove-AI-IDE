export class InlineEditReviewController {
    constructor(editorGroup) {
        this.editorGroup = editorGroup;
        this.editor = editorGroup.editor;
        this.pendingSessions = new Map();
        this.sessionOrder = [];
        this.activeFilePath = null;
        this.zoneIds = [];
        this.decorationIds = [];
        this.widget = null;

        // Ensure we re-render decorations whenever the user switches tabs
        document.addEventListener('active-file-changed', (e) => {
            const { filePath } = e.detail;
            if (this.sessionOrder.length > 0) {
                this.renderForFile(filePath);
            }
        });

        // Listen for external session completion (e.g. from Sidebar)
        document.addEventListener('ai-edit-session-ended', () => {
            this._finishReview();
        });
    }

    async startSession(sessionId) {
        const response = await window.electronAPI.aiEditsGetSession(sessionId);
        if (!response?.success || !response.session) return;

        this.pendingSessions.set(response.session.sessionId, response.session);
        if (!this.sessionOrder.includes(response.session.sessionId)) {
            this.sessionOrder.push(response.session.sessionId);
        }
        const firstFile = response.session.files.find(f => f.success);
        if (!firstFile) return;

        this.activeFilePath = firstFile.filePath;

        const activeFileAtStart = this.editorGroup?.openFiles.find(f => f.path === this.editorGroup.activeFilePath);
        const isPreviewActive = activeFileAtStart && (activeFileAtStart.isBrowser || activeFileAtStart.path?.match(/^(https?|preview|http):\/\//));

        await this.editorGroup.openFile(firstFile.filePath, { preview: false, noFocus: !!isPreviewActive });
        const virtual = await window.electronAPI.aiEditsGetVirtualContent(firstFile.filePath);
        await this.editorGroup.setPreviewContent(firstFile.filePath, virtual?.content ?? firstFile.proposedContent);
        this.renderForFile(firstFile.filePath);
        this._attachWidget();
    }

    clearDecorations() {
        if (!this.editor) return;
        if (this.decorationIds.length) {
            this.decorationIds = this.editor.deltaDecorations(this.decorationIds, []);
        }
        if (this.zoneIds.length) {
            this.editor.changeViewZones((accessor) => {
                this.zoneIds.forEach((id) => accessor.removeZone(id));
            });
            this.zoneIds = [];
        }
    }

    renderForFile(filePath) {
        this.clearDecorations();
        const model = this.editor.getModel();
        if (!model) return;

        // 🐛 BUG FIX: Check if this file has any pending edits before showing widget
        const allHunks = [];
        let hasEditsForCurrentFile = false;
        
        for (const sessionId of this.sessionOrder) {
            const session = this.pendingSessions.get(sessionId);
            if (!session) continue;
            const fileData = (session.files || []).find((f) => f.success && this._pathsEqual(f.filePath, filePath));
            if (fileData?.hunks?.length) {
                allHunks.push(...fileData.hunks);
                hasEditsForCurrentFile = true;
            }
        }

        // 🔧 FIX: Only show the widget if the current file has edits
        // Hide the widget if no edits for this file
        if (!hasEditsForCurrentFile) {
            this._hideWidget();
            return; // Don't render decorations if no edits for this file
        } else {
            this._showWidget();
        }

        const decorations = [];
        this.editor.changeViewZones((accessor) => {
            for (const hunk of allHunks) {
                if ((hunk.added || []).length > 0) {
                    const startLine = Math.max(1, hunk.newStart);
                    const endLine = Math.max(startLine, hunk.newStart + hunk.newLines - 1);
                    decorations.push({
                        range: new monaco.Range(startLine, 1, endLine, 1),
                        options: { isWholeLine: true, className: 'ag-inline-added-line' }
                    });
                }
                if ((hunk.removed || []).length > 0) {
                    const anchor = Math.max(1, hunk.newStart);
                    const domNode = document.createElement('div');
                    domNode.className = 'ag-inline-removed-zone';
                    const removedText = (hunk.removed || []).join('\n');
                    const languageId = model.getLanguageId();
                    
                    // Force the removed text to perfectly mirror the editor's typography and dimensions
                    const fontInfo = this.editor.getOptions().get(monaco.editor.EditorOption.fontInfo);
                    domNode.style.fontFamily = fontInfo.fontFamily;
                    domNode.style.fontSize = fontInfo.fontSize + 'px';
                    domNode.style.fontWeight = fontInfo.fontWeight;
                    domNode.style.lineHeight = fontInfo.lineHeight + 'px';

                    monaco.editor.colorize(removedText, languageId, {})
                        .then((html) => {
                            domNode.innerHTML = html;
                        })
                        .catch(() => {
                            domNode.innerHTML = hunk.removed
                                .map((line) => `<div class="ag-inline-removed-line">${this._escapeHtml(line)}</div>`)
                                .join('');
                        });

                    const id = accessor.addZone({
                        afterLineNumber: anchor - 1,
                        heightInLines: hunk.removed.length,
                        domNode
                    });
                    this.zoneIds.push(id);
                }
            }
        });
        this.decorationIds = this.editor.deltaDecorations(this.decorationIds, decorations);
    }

    _attachWidget() {
        if (this.widget) {
            // Widget already exists
            return;
        }

        const domNode = document.createElement('div');
        domNode.className = 'ag-inline-review-widget';
        domNode.innerHTML = `
            <button class="ag-review-btn ag-review-accept">
                Accept <span class="ag-review-shortcut">Alt+↵</span>
            </button>
            <button class="ag-review-btn ag-review-reject">
                Reject <span class="ag-review-shortcut">Shift+Alt+⌫</span>
            </button>
            <div class="ag-review-icon-toggle">
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M10 3H13V6M13 10V13H10M6 13H3V10M3 6V3H6" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
            </div>
        `;

        const handleAction = async (action) => {
            if (!this.sessionOrder.length) return;
            const sessionIds = [...this.sessionOrder];
            
            for (const sessionId of sessionIds) {
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
                        await window.electronAPI.aiEditsRejectSession(sessionId);
                    }
                    this.pendingSessions.delete(sessionId);
                } catch (err) {
                    console.error('Failed to handle action', action, sessionId, err);
                }
            }

            this._finishReview();
            // Notify Sidebar to clear its UI
            document.dispatchEvent(new CustomEvent('ai-edit-session-ended'));
        };

        domNode.querySelector('.ag-review-accept').addEventListener('click', () => handleAction('accept'));
        domNode.querySelector('.ag-review-reject').addEventListener('click', () => handleAction('reject'));

        this.widget = {
            getId: () => 'ag.inline.review.widget',
            getDomNode: () => domNode,
            getPosition: () => null
        };
        this.editor.addOverlayWidget(this.widget);
    }

    // 🆕 NEW METHOD: Hide the widget without destroying it
    _hideWidget() {
        if (this.widget) {
            const domNode = this.widget.getDomNode();
            if (domNode) {
                domNode.style.display = 'none';
            }
        }
    }

    // 🆕 NEW METHOD: Show the widget
    _showWidget() {
        if (this.widget) {
            const domNode = this.widget.getDomNode();
            if (domNode) {
                domNode.style.display = 'flex';
            }
        }
    }

    _finishReview() {
        this.clearDecorations();
        if (this.widget) {
            this.editor.removeOverlayWidget(this.widget);
            this.widget = null;
        }
        this.pendingSessions.clear();
        this.sessionOrder = [];
        this.activeFilePath = null;
    }

    _escapeHtml(text) {
        return (text || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
    }

    _pathsEqual(a, b) {
        if (!a || !b) return false;
        const normalize = (p) => p.replace(/\\/g, '/').toLowerCase();
        return normalize(a) === normalize(b);
    }
}
