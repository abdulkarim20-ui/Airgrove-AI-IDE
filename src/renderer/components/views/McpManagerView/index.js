/* 📄 FILE: src/renderer/components/views/McpManagerView/index.js */

export class McpManagerView {
    constructor(container) {
        this.container = container;
        this.element = document.createElement('div');
        this.element.id = 'mcp-manager-view-container';
        this.element.className = 'mcp-manager-container hidden';
        this.container.appendChild(this.element);

        this._render();
        this._setupListeners();
    }

    _render() {
        this.element.innerHTML = `
            <div class="mcp-manager-header">
                <h1 class="mcp-manager-title">
                    Manage MCP servers
                </h1>
                <div class="mcp-manager-actions">
                    <button class="mcp-btn secondary" id="mcp-raw-config-btn">
                        View raw config <i class="codicon codicon-file"></i>
                    </button>
                    <button class="mcp-btn primary" id="mcp-refresh-btn">
                        Refreshing... <i class="codicon codicon-sync"></i>
                    </button>
                </div>
            </div>
            <div class="mcp-manager-content">
                <p class="mcp-empty-text">Loading MCP servers...</p>
            </div>
        `;
    }

    _setupListeners() {
        const refreshBtn = this.element.querySelector('#mcp-refresh-btn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => {
                // Future implementation
            });
        }

        const rawConfigBtn = this.element.querySelector('#mcp-raw-config-btn');
        if (rawConfigBtn) {
            rawConfigBtn.addEventListener('click', () => {
                // Future implementation
            });
        }
    }

    show() {
        this.element.classList.remove('hidden');
    }

    hide() {
        this.element.classList.add('hidden');
    }
}
