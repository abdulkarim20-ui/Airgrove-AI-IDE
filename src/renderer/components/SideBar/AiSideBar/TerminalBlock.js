import { Terminal } from 'https://cdn.jsdelivr.net/npm/@xterm/xterm@5.5.0/+esm';
import { FitAddon } from 'https://cdn.jsdelivr.net/npm/@xterm/addon-fit@0.10.0/+esm';
import { WebLinksAddon } from 'https://cdn.jsdelivr.net/npm/@xterm/addon-web-links@0.11.0/+esm';

/**
 * A mini-terminal component for the AI sidebar.
 * - Header: [icon] [folder] [chevron]  ···  [spinner+Cancel | View in Terminal]
 * - Command bar: $ command            (same line, no wrap)
 * - Body: xterm.js — expands live, collapses to 1 row when done
 * - Chevron toggles full output view
 */
export class TerminalBlock {
    constructor(container, options = {}) {
        this.container = container;
        this.command   = options.command  || '';
        this.cwd       = options.cwd      || '';
        this.onCancel  = options.onCancel || null;

        this.terminal   = null;
        this.fitAddon   = null;
        this._running   = true;
        this._expanded  = true;   // body visible while running
        this.currentRows = 4;     // Start with enough height for headers/prompt
        this.maxRows     = 15;


        this.init();
    }

    /* ── helpers ─────────────────────────────────────────── */
    _folderName(cwdPath) {
        if (!cwdPath) return 'Terminal';
        const parts = cwdPath.replace(/\\/g, '/').split('/').filter(Boolean);
        return parts[parts.length - 1] || 'Terminal';
    }

    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /* ── build UI ────────────────────────────────────────── */
    init() {
        const folderName = this._folderName(this.cwd);

        /* ── TOP HEADER ───────────────────────────────────── */
        this._headerEl = document.createElement('div');
        this._headerEl.className = 'ag-terminal-top-header';
        this._headerEl.innerHTML = `
            <div class="ag-terminal-left">
                <img src="../../assets/modified_icons/square-terminal.svg"
                     width="14" height="14" alt="Terminal" class="ag-terminal-icon" />
                <span class="ag-terminal-title">${this.escapeHtml(folderName)}</span>
                <button class="ag-terminal-chevron" title="Toggle output" aria-expanded="true">
                    <img src="../../assets/modified_icons/chevrons-up-down.svg"
                         width="12" height="12" alt="expand"
                         class="ag-chevron-expand" style="display:none" />
                    <img src="../../assets/modified_icons/chevrons-down-up.svg"
                         width="12" height="12" alt="collapse"
                         class="ag-chevron-collapse" />
                </button>
            </div>
            <div class="ag-terminal-right">
                <button class="ag-terminal-cancel-btn">Cancel</button>
                <span class="ag-terminal-spinner" title="Running"></span>
            </div>
        `;
        this.container.appendChild(this._headerEl);

        /* refs */
        this._chevronEl = this._headerEl.querySelector('.ag-terminal-chevron');
        this._chevronExpandImg  = this._headerEl.querySelector('.ag-chevron-expand');
        this._chevronCollapseImg = this._headerEl.querySelector('.ag-chevron-collapse');
        this._spinnerEl   = this._headerEl.querySelector('.ag-terminal-spinner');
        this._cancelBtnEl = this._headerEl.querySelector('.ag-terminal-cancel-btn');
        this._rightEl     = this._headerEl.querySelector('.ag-terminal-right');

        /* cancel */
        this._cancelBtnEl.addEventListener('click', () => {
            if (typeof this.onCancel === 'function') this.onCancel();
            this._setFinished(true);
        });

        /* chevron toggle */
        this._chevronEl = this._headerEl.querySelector('.ag-terminal-chevron');
        this._chevronExpandImg  = this._headerEl.querySelector('.ag-chevron-expand');
        this._chevronCollapseImg = this._headerEl.querySelector('.ag-chevron-collapse');
        this._chevronEl.addEventListener('click', () => this._toggleBody());

        /* ── COMMAND BAR ──────────────────────────────────────────────────────────
           Layout: [$ command (wraps)]   [copy btn pinned top-right]
           The outer bar is flex; command-text takes remaining space and wraps;
           copy button is self-aligned to flex-start so it stays on the first row.
        */
        this._cmdBarEl = document.createElement('div');
        this._cmdBarEl.className = 'ag-terminal-command-bar';
        this._cmdBarEl.innerHTML = `
            <div class="ag-terminal-command-text">
                <span class="ag-terminal-dollar">$</span><span class="ag-terminal-cmd">${this.escapeHtml(this.command)}</span>
            </div>
            <button class="ag-terminal-copy-btn" title="Copy command">
                <i class="codicon codicon-copy"></i>
            </button>
        `;
        this.container.appendChild(this._cmdBarEl);

        /* copy — reads the displayed text from the DOM so it's always accurate */
        const copyBtn = this._cmdBarEl.querySelector('.ag-terminal-copy-btn');
        const cmdSpan = this._cmdBarEl.querySelector('.ag-terminal-cmd');
        copyBtn.addEventListener('click', async () => {
            const textToCopy = cmdSpan?.textContent?.trim() || this.command || '';
            if (!textToCopy) return;

            try {
                await navigator.clipboard.writeText(textToCopy);
            } catch (_) {
                /* Fallback for restricted Electron contexts */
                const ta = document.createElement('textarea');
                ta.value = textToCopy;
                ta.style.cssText = 'position:fixed;opacity:0;top:0;left:0';
                document.body.appendChild(ta);
                ta.select();
                document.execCommand('copy');
                document.body.removeChild(ta);
            }

            const icon = copyBtn.querySelector('i');
            icon.className = 'codicon codicon-check';
            setTimeout(() => { icon.className = 'codicon codicon-copy'; }, 2000);
        });

        /* ── BODY (xterm) ─────────────────────────────────── */
        this._bodyEl = document.createElement('div');
        this._bodyEl.className = 'ag-terminal-body';
        this.container.appendChild(this._bodyEl);

        /* ── XTERM ────────────────────────────────────────── */
        this.terminal = new Terminal({
            cursorBlink: false,
            disableStdin: true,
            fontSize: 12,
            lineHeight: 1.45,
            fontFamily: '"Cascadia Code", "Consolas", monospace',
            theme: {
                background:          '#181818',
                foreground:          '#cccccc',   /* lighter for readability */
                selectionBackground: '#37373d',
                cursor:              '#cccccc',
                /* standard palette */
                black:         '#21262d',
                red:           '#fa7e7e',
                green:         '#7ee787',
                yellow:        '#ffca28',         /* bright yellow */
                blue:          '#4daafc',         /* vivid blue for links */
                magenta:       '#bc8cff',
                cyan:          '#39c5cf',
                white:         '#cccccc',
                brightBlack:   '#484f58',
                brightRed:     '#ffa198',
                brightGreen:   '#aff5b4',
                brightYellow:  '#ffca28',
                brightBlue:    '#79c0ff',
                brightMagenta: '#d2a8ff',
                brightCyan:    '#56d4dd',
                brightWhite:   '#ffffff'
            },
            allowTransparency: true,
            scrollback: 5000,
            rows: 4,

            linkHandler: {
                activate: (_, uri) => {
                    if (window.electronAPI?.openExternal) window.electronAPI.openExternal(uri);
                }
            }
        });

        this.fitAddon = new FitAddon();
        this.terminal.loadAddon(this.fitAddon);

        /* Web links — renders URLs in blue and underlined */
        try {
            const linksAddon = new WebLinksAddon((_, uri) => {
                if (window.electronAPI?.openExternal) window.electronAPI.openExternal(uri);
            });
            this.terminal.loadAddon(linksAddon);
        } catch (_) { /* addon may not be available in all envs */ }

        this.terminal.open(this._bodyEl);
        this._bodyEl.querySelector('.xterm-viewport').style.overflowY = 'auto';

        setTimeout(() => { this.fitAddon.fit(); }, 50);

        this._resizeObs = new ResizeObserver(() => {
            if (this.container.clientWidth > 0) this.fitAddon.fit();
        });
        this._resizeObs.observe(this.container);
    }

    /* ── chevron expand / collapse ───────────────────────── */
    _toggleBody() {
        this._expanded = !this._expanded;

        if (this._expanded) {
            /* body now visible — show COLLAPSE icon (chevrons-down-up) */
            this._bodyEl.style.display = '';
            this._chevronEl.setAttribute('aria-expanded', 'true');
            if (this._chevronExpandImg)   this._chevronExpandImg.style.display   = 'none';
            if (this._chevronCollapseImg) this._chevronCollapseImg.style.display = '';
            setTimeout(() => this.fitAddon.fit(), 30);
        } else {
            /* body now hidden — show EXPAND icon (chevrons-up-down) */
            this._bodyEl.style.display = 'none';
            this._chevronEl.setAttribute('aria-expanded', 'false');
            if (this._chevronExpandImg)   this._chevronExpandImg.style.display   = '';
            if (this._chevronCollapseImg) this._chevronCollapseImg.style.display = 'none';
        }
    }

    /* ── update title with resolved absolute path ────────── */
    updateTitle(cwdPath) {
        if (!cwdPath || this._titleUpdated) return;
        this._titleUpdated = true;
        const name = this._folderName(cwdPath);
        const titleEl = this._headerEl?.querySelector('.ag-terminal-title');
        if (titleEl) titleEl.textContent = name;
    }

    /* ── write output ────────────────────────────────────── */
    write(data) {
        if (!this.terminal) return;

        /* make sure body is visible while output comes in */
        if (!this._expanded) this._toggleBody();

        this.terminal.write(data);

        /* dynamically grow rows */
        const buffer    = this.terminal.buffer.active;
        const totalLines = buffer.baseY + buffer.cursorY + 1;
        const targetRows = Math.min(Math.max(totalLines, 1), this.maxRows);

        if (targetRows > this.currentRows) {
            this.currentRows = targetRows;
            this.terminal.resize(this.terminal.cols, this.currentRows);
            // Throttle fit logic to prevent layout jitter
            if (this._fitTimeout) clearTimeout(this._fitTimeout);
            this._fitTimeout = setTimeout(() => this.fitAddon.fit(), 50);
        }

    }

    /* ── finish (exit code received) ─────────────────────── */
    setExitCode(code) {
        this._setFinished(false, code);
    }

    _setFinished(cancelled = false, code = undefined) {
        if (!this._running) return;
        this._running = false;

        /* 1. collapse body — command bar stays visible, show EXPAND icon */
        this._bodyEl.style.display = 'none';
        this._expanded = false;
        this._chevronEl.setAttribute('aria-expanded', 'false');
        if (this._chevronExpandImg)   this._chevronExpandImg.style.display   = '';
        if (this._chevronCollapseImg) this._chevronCollapseImg.style.display = 'none';

        /* 2. swap spinner+cancel → "View in Terminal ↗" */
        this._rightEl.innerHTML = `
            <button class="ag-terminal-view-btn" title="Open in integrated terminal">
                View in terminal
                <img src="../../assets/modified_icons/arrow-up-right.svg"
                     width="12" height="12" alt="↗" class="ag-terminal-view-icon" />
            </button>
        `;

        this._rightEl.querySelector('.ag-terminal-view-btn')
            .addEventListener('click', () => {
                document.dispatchEvent(new CustomEvent('show-panel-terminal-requested'));
                document.dispatchEvent(new CustomEvent('terminal:send-command', {
                    detail: { command: this.command, cwd: this.cwd }
                }));
            });
    }

    /* ── dispose ─────────────────────────────────────────── */
    dispose() {
        if (this.terminal)  this.terminal.dispose();
        if (this._resizeObs) this._resizeObs.disconnect();
        this.container.innerHTML = '';
    }
}
