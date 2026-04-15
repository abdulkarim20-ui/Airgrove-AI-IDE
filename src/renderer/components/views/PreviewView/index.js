/* 📄 FILE: src/renderer/components/views/PreviewView/index.js */

export class PreviewView {
    constructor(container) {
        this.container = container;
        this.element = document.createElement('div');
        this.element.className = 'preview-view-container hidden';
        this.container.appendChild(this.element);

        this.browsers = new Map(); // path -> browser state
        this.activePath = null;

        this._render();
    }

    _render() {
        this.element.innerHTML = `
            <div class="preview-toolbar">
                <div class="toolbar-nav-group">
                    <div class="toolbar-btn disabled" id="preview-back-btn" title="Go Back">
                        <i class="codicon codicon-arrow-left"></i>
                    </div>
                    <div class="toolbar-btn disabled" id="preview-forward-btn" title="Go Forward">
                        <i class="codicon codicon-arrow-right"></i>
                    </div>
                    <div class="toolbar-btn" id="preview-refresh-btn" title="Reload">
                        <i class="codicon codicon-refresh"></i>
                    </div>
                </div>
                
                <div class="url-bar-container">
                    <div class="url-loading-bar" id="preview-progress-bar"></div>
                    <input type="text" class="url-input" id="preview-url-input" placeholder="Enter URL or select a running service" />
                    <i class="codicon codicon-chevron-down" style="font-size: 14px; opacity: 0.6; cursor: pointer;"></i>
                </div>

                <div class="preview-actions">
                    <button class="preview-action-btn" id="preview-open-browser-btn" title="Open in Browser">
                        <img src="../../assets/modified_icons/open-browser.svg" width="14" height="14" />
                    </button>
                    <button class="preview-action-btn" id="preview-device-toolbar-btn" title="Device Toolbar">
                        <img src="../../assets/modified_icons/device-toolbar.svg" width="14" height="14" />
                    </button>
                    <button class="preview-action-btn" id="preview-developer-tools-btn" title="Developer Tools">
                        <img src="../../assets/modified_icons/developer-tools.svg" width="14" height="14" />
                    </button>
                    <button class="preview-select-button" id="preview-select-element-btn" title="Select Element">
                        <img src="../../assets/modified_icons/select-element.svg" width="14" height="14" />
                        <span>Select</span>
                    </button>
                </div>
            </div>
            <div class="preview-content" id="preview-content-area">
                <div class="preview-resize-overlay"></div>
                <div class="preview-empty-state" id="preview-empty-state">
                    <div class="preview-empty-text">Preview Your Web Application Here</div>
                </div>
            </div>

            <div id="preview-external-dialog" class="preview-modal hidden">
                <div class="preview-modal-content">
                    <div class="preview-modal-header">
                        <span class="preview-modal-title">AirGrove</span>
                        <div class="preview-modal-close" id="preview-modal-close-btn">
                            <i class="codicon codicon-close"></i>
                        </div>
                    </div>
                    <div class="preview-modal-body">
                        <div class="preview-modal-info-icon">
                            <i class="codicon codicon-info"></i>
                        </div>
                        <div class="preview-modal-text-group">
                            <div class="preview-modal-message">Do you want AirGrove to open the external website?</div>
                            <div class="preview-modal-url" id="preview-modal-url-text"></div>
                        </div>
                    </div>
                    <div class="preview-modal-footer">
                        <button class="preview-modal-btn primary" id="preview-modal-open-btn">Open</button>
                        <button class="preview-modal-btn" id="preview-modal-copy-btn">Copy</button>
                        <button class="preview-modal-btn" id="preview-modal-cancel-btn">Cancel</button>
                    </div>
                </div>
            </div>
        `;

        this.urlInput = this.element.querySelector('#preview-url-input');
        this.contentArea = this.element.querySelector('#preview-content-area');
        this.emptyState = this.element.querySelector('#preview-empty-state');
        this.backBtn = this.element.querySelector('#preview-back-btn');
        this.forwardBtn = this.element.querySelector('#preview-forward-btn');
        this.refreshBtn = this.element.querySelector('#preview-refresh-btn');
        this.progressBar = this.element.querySelector('#preview-progress-bar');

        // New action buttons
        this.openBrowserBtn = this.element.querySelector('#preview-open-browser-btn');
        this.devToolsBtn = this.element.querySelector('#preview-developer-tools-btn');
        this.deviceToolbarBtn = this.element.querySelector('#preview-device-toolbar-btn');

        // Modal elements
        this.externalDialog = this.element.querySelector('#preview-external-dialog');
        this.modalUrlText = this.element.querySelector('#preview-modal-url-text');
        this.modalOpenBtn = this.element.querySelector('#preview-modal-open-btn');
        this.modalCopyBtn = this.element.querySelector('#preview-modal-copy-btn');
        this.modalCancelBtn = this.element.querySelector('#preview-modal-cancel-btn');
        this.modalCloseBtn = this.element.querySelector('#preview-modal-close-btn');

        this._setupListeners();
    }

    _setupListeners() {
        this.urlInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                let url = this.urlInput.value.trim();
                if (url) {
                    if (!url.startsWith('http://') && !url.startsWith('https://')) {
                        url = 'http://' + url;
                    }
                    this.loadUrl(url);
                }
            }
        });

        this.refreshBtn.addEventListener('click', () => {
            const current = this._getCurrentBrowser();
            if (current && current.webview.src) {
                this.loadUrl(current.webview.src);
            }
        });

        this.backBtn.addEventListener('click', () => this._handleBack());
        this.forwardBtn.addEventListener('click', () => this._handleForward());

        // Basic iframe nav simulation (we can't easily detect internal iframe nav due to SOP,
        // unless it's the same origin, but for a general "browser" this is limited in a renderer)
        // In a real IDE this might use Webview tags or BrowserView in Electron main.

        // --- NEW ACTION BUTTON LISTENERS ---
        this.openBrowserBtn.addEventListener('click', () => {
            const url = this.urlInput.value.trim();
            if (url) {
                this.modalUrlText.textContent = url;
                this.externalDialog.classList.remove('hidden');
            }
        });

        this.devToolsBtn.addEventListener('click', () => {
            const current = this._getCurrentBrowser();
            if (current && current.webview) {
                current.webview.openDevTools({ mode: 'detach' });
            }
        });

        // --- MODAL LISTENERS ---
        this.modalCancelBtn.addEventListener('click', () => {
            this.externalDialog.classList.add('hidden');
        });

        this.modalCloseBtn.addEventListener('click', () => {
            this.externalDialog.classList.add('hidden');
        });

        this.modalOpenBtn.addEventListener('click', () => {
            const url = this.modalUrlText.textContent;
            window.electronAPI.openExternal(url);
            this.externalDialog.classList.add('hidden');
        });

        this.modalCopyBtn.addEventListener('click', () => {
            const url = this.modalUrlText.textContent;
            navigator.clipboard.writeText(url).then(() => {
                this.externalDialog.classList.add('hidden');
            });
        });

        // Global click listener to close modal if clicking outside content
        this.externalDialog.addEventListener('click', (e) => {
            if (e.target === this.externalDialog) {
                this.externalDialog.classList.add('hidden');
            }
        });

        // --- NEW: Select Element Integration ---
        this.selectElementBtn = this.element.querySelector('#preview-select-element-btn');
        this.selectModeActive = false;

        this.selectElementBtn.addEventListener('click', () => {
            this.toggleSelectMode();
        });

        // Listen for messages from the webview
        window.addEventListener('message', (event) => {
            if (event.data.type === 'ELEMENT_SELECTED') {
                this.handleElementSelected(event.data);
            } else if (event.data.type === 'INSPECTOR_DISABLED') {
                this.selectModeActive = false;
                this._updateSelectButtonState();
            }
        });
    }

    toggleSelectMode() {
        const current = this._getCurrentBrowser();
        if (!current || !current.webview) return;

        this.selectModeActive = !this.selectModeActive;
        this._updateSelectButtonState();

        // Send message to webview to toggle inspector
        current.webview.executeJavaScript(`
            window.postMessage({
                type: 'TOGGLE_SELECT_MODE',
                enabled: ${this.selectModeActive}
            }, '*');
        `);
    }

    _updateSelectButtonState() {
        if (this.selectModeActive) {
            this.selectElementBtn.classList.add('active');
        } else {
            this.selectElementBtn.classList.remove('active');
        }
    }

    handleElementSelected(data) {
        console.log('[PreviewView] Element selected:', data);

        // Forward to the AI Sidebar via a global event
        document.dispatchEvent(new CustomEvent('ai:element-selected', {
            detail: data
        }));

        // Turn off select mode after selection is made (optional, depends on UX)
        // this.selectModeActive = false;
        // this._updateSelectButtonState();
    }

    async _loadInspectorScript() {
        if (this.inspectorScript) return this.inspectorScript;
        try {
            const response = await window.electronAPI.readFile('src/renderer/core/inspector.js', true);
            if (response && response.content) {
                this.inspectorScript = response.content;
            }
        } catch (e) {
            console.error('Failed to load inspector script:', e);
        }
        return this.inspectorScript;
    }

    async _loadInspectorStyles() {
        if (this.inspectorStyles) return this.inspectorStyles;
        try {
            const response = await window.electronAPI.readFile('src/renderer/core/inspector.css', true);
            if (response && response.content) {
                this.inspectorStyles = response.content;
            }
        } catch (e) {
            console.error('Failed to load inspector styles:', e);
        }
        return this.inspectorStyles;
    }

    async _injectInspector(webview) {
        const script = await this._loadInspectorScript();
        const styles = await this._loadInspectorStyles();

        if (styles) {
            webview.insertCSS(styles);
        }

        if (script) {
            webview.executeJavaScript(script);
            // If select mode was already active, sync it
            if (this.selectModeActive) {
                webview.executeJavaScript(`
                    window.postMessage({
                        type: 'TOGGLE_SELECT_MODE',
                        enabled: true
                    }, '*');
                `);
            }
        }
    }

    loadUrl(url) {
        const current = this._getCurrentBrowser();
        if (!current) return;

        this._startLoading();
        this.urlInput.value = url;
        current.webview.src = url;
        current.webview.classList.remove('hidden');
        this.emptyState.classList.add('hidden');

        // Dispatch event so TabsBar can increase width
        this.element.dispatchEvent(new CustomEvent('preview-url-loaded', {
            detail: { path: this.activePath },
            bubbles: true
        }));
    }

    _getCurrentBrowser() {
        return this.browsers.get(this.activePath);
    }

    _startLoading() {
        this.progressBar.classList.add('loading');
        const icon = this.refreshBtn.querySelector('i');
        if (icon) icon.className = 'codicon codicon-loading codicon-modifier-spin';
    }

    _stopLoading() {
        this.progressBar.classList.remove('loading');
        const icon = this.refreshBtn.querySelector('i');
        if (icon) icon.className = 'codicon codicon-refresh';
    }

    show(path) {
        this.element.classList.remove('hidden');
        this.activePath = path;

        // Hide all webviews
        this.browsers.forEach(b => b.webview.classList.add('hidden'));

        let current = this.browsers.get(path);
        if (!current) {
            // Create new browser instance for this path using webview
            const webview = document.createElement('webview');
            webview.className = 'preview-webview hidden'; // Class name change for better clarity
            webview.setAttribute('allowpopups', '');
            this.contentArea.appendChild(webview);

            current = { webview };
            this.browsers.set(path, current);

            // --- START: CHROME-LIKE NAVIGATION LOGIC ---
            webview.addEventListener('did-start-loading', () => {
                if (this.activePath === path) this._startLoading();
            });

            webview.addEventListener('did-stop-loading', () => {
                if (this.activePath === path) {
                    this._stopLoading();
                    this._updateNavButtons();
                    this._injectStyles(webview);
                    // Add a small delay to ensure the DOM is ready for script injection
                    setTimeout(() => this._injectInspector(webview), 100);
                }
            });

            webview.addEventListener('console-message', (e) => {
                const parts = e.message.split('AIRGROVE_INSPECTOR:');
                if (parts.length > 1) {
                    const msg = parts[1];
                    if (msg.startsWith('ELEMENT_SELECTED')) {
                        try {
                            const data = JSON.parse(msg.substring('ELEMENT_SELECTED'.length).trim());
                            this.handleElementSelected(data);
                        } catch (err) {
                            console.error('Failed to parse inspector data:', err);
                        }
                    } else if (msg === 'DISABLED') {
                        this.selectModeActive = false;
                        this._updateSelectButtonState();
                    }
                }
            });

            webview.addEventListener('did-navigate', (e) => {
                if (this.activePath === path) {
                    this.urlInput.value = e.url;
                }
            });

            webview.addEventListener('did-navigate-in-page', (e) => {
                if (this.activePath === path) {
                    this.urlInput.value = e.url;
                }
            });

            webview.addEventListener('page-title-updated', (e) => {
                this.element.dispatchEvent(new CustomEvent('preview-title-updated', {
                    detail: { path, title: e.title },
                    bubbles: true
                }));
            });
            // --- END: NAVIGATION LOGIC ---
        }

        if (current.webview.src) {
            current.webview.classList.remove('hidden');
            this.emptyState.classList.add('hidden');
            this.urlInput.value = current.webview.src;
            this._updateNavButtons();
        } else {
            this.emptyState.classList.remove('hidden');
            this.urlInput.value = '';
            this._updateNavButtons();
        }
    }

    hide() {
        this.element.classList.add('hidden');
        this.activePath = null;
    }

    dispose(path) {
        const browser = this.browsers.get(path);
        if (browser) {
            browser.webview.remove();
            this.browsers.delete(path);
        }
    }

    _updateNavButtons() {
        const current = this._getCurrentBrowser();
        if (!current) {
            this.backBtn.classList.add('disabled');
            this.forwardBtn.classList.add('disabled');
            return;
        }

        // webview methods aren't available immediately, check if ready
        try {
            this.backBtn.classList.toggle('disabled', !current.webview.canGoBack());
            this.forwardBtn.classList.toggle('disabled', !current.webview.canGoForward());
        } catch (e) {
            // Re-check after a short delay if webview isn't fully ready
            setTimeout(() => this._updateNavButtons(), 100);
        }
    }

    _handleBack() {
        const current = this._getCurrentBrowser();
        if (current && current.webview.canGoBack()) {
            current.webview.goBack();
        }
    }

    _handleForward() {
        const current = this._getCurrentBrowser();
        if (current && current.webview.canGoForward()) {
            current.webview.goForward();
        }
    }

    _injectStyles(webview) {
        const css = `
            ::-webkit-scrollbar {
                width: 12px;
                height: 12px;
            }
            ::-webkit-scrollbar-track {
                background: transparent;
            }
            ::-webkit-scrollbar-thumb {
                background: rgba(137, 137, 137, 0.4);
                border-radius: 12px;
                border: 3px solid transparent;
                background-clip: padding-box;
            }
            ::-webkit-scrollbar-thumb:hover {
                background: rgba(137, 137, 137, 0.6);
                background-clip: padding-box;
            }
        `;
        webview.insertCSS(css);
    }
}
