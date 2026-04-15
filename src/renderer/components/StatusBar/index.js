/**
 * Live Server Status Bar — AirGrove
 *
 * States:
 *  idle       → go_live.svg   + "Go Live"
 *  starting   → activity.svg  + "Starting…"
 *  active     → block.svg     + "Port: XXXX"
 *  disposing  → activity.svg  + "Disposing…"
 */

const ICONS = {
    go_live: '../../assets/modified_icons/go_live.svg',
    block: '../../assets/modified_icons/block.svg',
    activity: '../../assets/modified_icons/activity.svg',
};

class LiveServerUI {
    constructor() {
        this.state = 'idle';   // idle | starting | active | disposing
        this.port = null;
        this.btn = null;
        this._init();
    }

    // ── Bootstrap ────────────────────────────────────────────────────────────
    async _init() {
        const right = document.querySelector('.statusbar-right');
        if (!right) { setTimeout(() => this._init(), 100); return; }

        this.btn = document.createElement('div');
        this.btn.className = 'statusbar-item live-server-btn';
        this.btn.addEventListener('click', () => this._handleClick());

        // Insert before the notification bell if present
        const bell = right.querySelector('.codicon-bell')?.parentElement;
        bell ? right.insertBefore(this.btn, bell) : right.appendChild(this.btn);

        // Recover state if server was already running (e.g. hot reload of renderer)
        const currentPort = await window.electronAPI.getLiveServerPort();
        if (currentPort) {
            this.port = currentPort;
            this.state = 'active';
        }

        this._render();
    }

    // ── Click handler ─────────────────────────────────────────────────────────
    async _handleClick() {
        if (this.state === 'idle') {
            const activeFile = window.editorGroup?.activeFilePath;
            await this._startServer(activeFile);
        } else if (this.state === 'active') {
            await this._stopServer();
        }
        // Ignore clicks while starting / disposing
    }

    // ── Start flow ────────────────────────────────────────────────────────────
    async _startServer(activeFile) {
        this.state = 'starting';
        this._render();
        
        // Short delay for UI feel
        await new Promise(r => setTimeout(r, 1000));

        const result = await window.electronAPI.startLiveServer(null, activeFile);

        if (result.success) {
            this.port = result.port;
            this.state = 'active';
        } else {
            console.error('[Live Server] Failed to start:', result.error);
            alert('Failed to start Live Server: ' + result.error);
            this.state = 'idle';
            this.port = null;
        }

        this._render();
    }

    // ── Stop flow ─────────────────────────────────────────────────────────────
    async _stopServer() {
        this.state = 'disposing';
        this._render();

        // Show the animation for 2s before actually stopping
        await new Promise(r => setTimeout(r, 2000));

        await window.electronAPI.stopLiveServer();

        this.state = 'idle';
        this.port = null;
        this._render();
    }

    // ── Render ────────────────────────────────────────────────────────────────
    _render() {
        const { icon, label, title } = this._getStateConfig();

        this.btn.setAttribute('data-state', this.state);
        this.btn.setAttribute('title', title);
        this.btn.style.pointerEvents = (this.state === 'starting' || this.state === 'disposing') ? 'none' : '';
        this.btn.style.opacity = (this.state === 'starting' || this.state === 'disposing') ? '0.85' : '';
        this.btn.style.color = '#cccccc'; // always white

        this.btn.innerHTML = `
            <img
                src="${icon}"
                class="statusbar-icon-svg"
                width="14" height="14"
            />
            <span>${label}</span>
        `;
    }

    _getStateConfig() {
        switch (this.state) {
            case 'starting':
                return { icon: ICONS.activity, label: 'Starting...', title: 'Live Server is starting…' };
            case 'active':
                return { icon: ICONS.block, label: `Port: ${this.port}`, title: 'Live Server running — click to stop' };
            case 'disposing':
                return { icon: ICONS.activity, label: 'Disposing...', title: 'Live Server is stopping…' };
            case 'idle':
            default:
                return { icon: ICONS.go_live, label: 'Go Live', title: 'Start Live Server for active file' };
        }
    }
}

// ── Singleton guard ───────────────────────────────────────────────────────────
export function initLiveServerUI() {
    if (window.__liveServerUI) return window.__liveServerUI;
    window.__liveServerUI = new LiveServerUI();
    return window.__liveServerUI;
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => initLiveServerUI(), { once: true });
} else {
    initLiveServerUI();
}
