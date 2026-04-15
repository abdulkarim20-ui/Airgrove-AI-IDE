
import { runApi } from "../ipc/runApi.js";

export class RunButton {
    constructor(container) {
        this.container = container;
        this.element = document.createElement('div');
        this.element.className = 'run-split-button';
        // Split button container style
        this.element.style.cssText = `
        display: flex;
        align-items: center;
        background-color: #4caf50; /* Green background for entire button? VS Code style is green play, separate chevron */
        /* Actually VS Code: Transparent background usually, but here we want unified or split */
        /* Let's mimic the screenshot: Looks like a play icon, and a chevron next to it. */
        /* If we want it to look like a single unit: */
        border-radius: 3px;
        overflow: hidden;
    `;

        // We will use a transparent background to match current toolbar style 
        // unless user hovers. For now, let's keep it clean.
        this.element.style.backgroundColor = 'transparent';

        this.filePath = null;
        this.cwd = null;
        this.isRunning = false;

        // Track our specific listener
        this.exitHandler = (code) => {
            if (this.element.isConnected) {
                this.isRunning = false;
                this.updateUI();
            }
        };
        runApi.onExit(this.exitHandler);

        this.render();
        if (this.container) {
            this.container.appendChild(this.element);
        }
    }

    update(filePath, cwd) {
        this.filePath = filePath;
        this.cwd = cwd;
    }

    updateUI() {
        // Toggle Stop button visibility only
        // Run Group (Play + Chevron) ALWAYS stays visible
        const stopGroup = this.element.querySelector('.stop-group');

        if (stopGroup) {
            if (this.isRunning) {
                stopGroup.style.display = 'flex';
            } else {
                stopGroup.style.display = 'none';
            }
        }
    }

    getRunCommand(filePath) {
        if (!filePath) return "";
        const ext = filePath.split('.').pop().toLowerCase();
        // Simple map for now. Ideally this comes from RunService or similar logic.
        if (ext === 'py') return `python -u "${filePath}"`;
        if (ext === 'js') return `node "${filePath}"`;
        if (ext === 'ts') return `npx ts-node "${filePath}"`;
        return `"${filePath}"`;
    }

    openMenu(x, y) {
        const menuTemplate = [
            {
                label: 'Run Code',
                icon: 'codicon-play',
                shortcut: 'Ctrl+Alt+N',
                action: () => {
                    document.dispatchEvent(new CustomEvent('show-output-panel'));
                    this.runInOutput();
                }
            },
            {
                label: 'Run Python File',
                icon: 'codicon-play',
                action: () => {
                    const cmd = this.getRunCommand(this.filePath);
                    if (cmd) {
                        document.dispatchEvent(new CustomEvent('show-terminal-panel'));
                        window.terminalManager.sendText(cmd);
                    }
                }
            },
            {
                label: 'Run Python File in Dedicated Terminal',
                icon: 'codicon-play',
                action: () => {
                    const cmd = this.getRunCommand(this.filePath);
                    if (cmd) {
                        document.dispatchEvent(new CustomEvent('show-terminal-panel'));
                        window.terminalManager.createAndSend(cmd, this.cwd);
                    }
                }
            }
        ];

        // Use dynamic import for ContextMenu
        import('./ContextMenu/index.js').then(({ ContextMenu }) => {
            // NEW: Notify others that a menu is opening
            document.dispatchEvent(new CustomEvent('menu-opened', { detail: { source: 'run-button' } }));
            new ContextMenu(menuTemplate, x, y);
        });
    }

    runInOutput() {
        if (this.filePath) {
            console.log('[RunButton] Running in Output:', this.filePath);
            this.isRunning = true;
            this.updateUI();

            const previewContent = window.editorGroup?.getPreviewRunContentForRun?.(this.filePath) ?? null;
            runApi.execute({ filePath: this.filePath, cwd: this.cwd, previewContent })
                .catch(err => {
                    console.error("[RunButton] Failed to execute:", err);
                    this.isRunning = false;
                    this.updateUI();
                });
        }
    }

    render() {
        this.element.innerHTML = '';

        // --- RUN GROUP ---
        const runGroup = document.createElement('div');
        runGroup.className = 'run-group';
        runGroup.style.display = 'flex';
        runGroup.style.alignItems = 'center';

        // Play Button
        const playBtn = document.createElement('div');
        playBtn.className = 'tab-action-button';
        playBtn.title = 'Run Code';
        playBtn.innerHTML = '<i class="codicon codicon-play" style="color: #ffffff;"></i>'; // White
        playBtn.style.cursor = 'pointer';
        playBtn.onclick = (e) => {
            e.stopPropagation();
            document.dispatchEvent(new CustomEvent('show-output-panel'));
            this.runInOutput();
        };

        // Chevron Button
        const chevronBtn = document.createElement('div');
        chevronBtn.className = 'tab-action-button';
        chevronBtn.title = 'More Run Options...';
        chevronBtn.innerHTML = '<i class="codicon codicon-chevron-down" style="font-size: 12px; color: #ffffff;"></i>';
        chevronBtn.style.cursor = 'pointer';
        chevronBtn.style.marginLeft = '-8px';

        chevronBtn.onclick = (e) => {
            e.stopPropagation();
            const rect = chevronBtn.getBoundingClientRect();
            this.openMenu(rect.left, rect.bottom);
        };

        runGroup.appendChild(playBtn);
        runGroup.appendChild(chevronBtn);

        // --- STOP GROUP ---
        // When running, we show just the stop button (or maybe still split? VS Code shows stop usually replacement)
        const stopGroup = document.createElement('div');
        stopGroup.className = 'stop-group';
        stopGroup.style.display = 'none'; // Hidden by default
        stopGroup.style.alignItems = 'center';

        const stopBtn = document.createElement('div');
        stopBtn.className = 'tab-action-button';
        stopBtn.title = 'Stop Run';
        stopBtn.innerHTML = '<i class="codicon codicon-debug-stop" style="color: #f44336;"></i>'; // Red
        stopBtn.style.cursor = 'pointer';

        stopBtn.onclick = (e) => {
            e.stopPropagation();
            runApi.stop();
        };

        stopGroup.appendChild(stopBtn);

        this.element.appendChild(runGroup);
        this.element.appendChild(stopGroup);
    }
}
