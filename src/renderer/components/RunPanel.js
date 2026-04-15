
import { runApi } from "../ipc/runApi.js";

export class RunPanel {
    constructor(container) {
        this.container = container;
        this.element = document.createElement('div');
        this.element.className = 'run-panel';
        this.element.style.cssText = `
      font-family: Consolas, 'Courier New', monospace;
      white-space: pre-wrap;
      padding: 4px 10px;
      height: 100%;
      width: 100%;
      overflow-y: auto;
      background-color: transparent;
      color: #cccccc;
      font-size: 13px;
      line-height: 20px;
      box-sizing: border-box;
      outline: none;
      cursor: text;
    `;

        if (this.container) {
            this.container.appendChild(this.element);
        }

        this.logs = [];
        this.mount();
    }

    mount() {
        // Listen for output
        this.removeOutputListener = runApi.onOutput((text) => {
            this.appendLog(text);
            // Auto-switch to Output tab? Maybe implemented in PanelManager
        });

        this.removeExitListener = runApi.onExit((code) => {
            // Log handled by TerminalService now for rich output
            // this.appendLog(`\n[Done] exited with code=${code}\n`);
        });
    }

    unmount() {
        if (this.removeOutputListener) this.removeOutputListener();
        if (this.removeExitListener) this.removeExitListener();
    }

    appendLog(text) {
        const span = document.createElement('span');
        span.textContent = text;
        this.element.appendChild(span);
        this.element.scrollTop = this.element.scrollHeight;
    }

    clear() {
        this.element.innerHTML = '';
    }
}
