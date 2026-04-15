
import { RunPanel } from '../RunPanel.js';

export class PanelManager {
    constructor() {
        this.tabs = document.querySelectorAll('.panel-tabs .tab');
        this.terminalContainer = document.getElementById('terminal-container');
        this.panelContent = document.getElementById('panel-content');

        // Create container for RunPanel (Output)
        this.runPanelContainer = document.createElement('div');
        this.runPanelContainer.id = 'run-panel-container';
        this.runPanelContainer.style.display = 'none';
        this.runPanelContainer.style.height = '100%';
        this.runPanelContainer.style.width = '100%';

        // Append to panel content. Note: terminal-container is already there.
        this.panelContent.appendChild(this.runPanelContainer);

        this.runPanel = new RunPanel(this.runPanelContainer);

        this.init();

        // If Output was default active (unlikely), set it. 
        // Currently HTML has Terminal as active.
        const activeTab = document.querySelector('.panel-tabs .tab.active');
        if (activeTab) {
            this.switchTab(activeTab.textContent.trim());
        }

        // Listen for run output to auto-switch to output tab?
        // Maybe later.
    }

    init() {
        this.tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const tabName = tab.textContent.trim();
                this.setActiveTabUI(tab);
                this.switchTab(tabName);
            });
        });

        // Listen for requests to show output
        document.addEventListener('show-output-panel', () => {
            const outputTab = Array.from(this.tabs).find(t => t.textContent.trim() === 'Output');
            if (outputTab) {
                this.setActiveTabUI(outputTab);
                this.switchTab('Output');
                // Ensure panel is visible
                document.dispatchEvent(new CustomEvent('toggle-panel-visibility', { detail: { visible: true } }));
            }
        });

        // Listen for requests to show terminal
        document.addEventListener('show-terminal-panel', () => {
            const termTab = Array.from(this.tabs).find(t => t.textContent.trim() === 'Terminal');
            if (termTab) {
                this.setActiveTabUI(termTab);
                this.switchTab('Terminal');
                // Ensure panel is visible
                document.dispatchEvent(new CustomEvent('toggle-panel-visibility', { detail: { visible: true } }));
            }
        });
    }

    setActiveTabUI(activeTab) {
        this.tabs.forEach(t => t.classList.remove('active'));
        activeTab.classList.add('active');
    }

    switchTab(tabName) {
        // Hide all content containers first
        if (this.terminalContainer) this.terminalContainer.style.display = 'none';
        if (this.runPanelContainer) this.runPanelContainer.style.display = 'none';

        // Toggle Action Groups
        const termActions = document.getElementById('terminal-actions');
        const outputActions = document.getElementById('output-actions');

        if (termActions) termActions.classList.add('hidden');
        if (outputActions) outputActions.classList.add('hidden');

        if (tabName === 'Terminal') {
            if (this.terminalContainer) this.terminalContainer.style.display = 'block';
            if (termActions) termActions.classList.remove('hidden');
            window.dispatchEvent(new Event('panel-resized')); // Trigger xterm fit
        } else if (tabName === 'Output') {
            if (this.runPanelContainer) this.runPanelContainer.style.display = 'block';
            if (outputActions) outputActions.classList.remove('hidden');
        } else {
            // Problems, Debug Console, etc. - Empty for now
        }
    }
}

// Initialize when DOM is ready or module loaded
// Since this is imported as module, we can wait for DOMContentLoaded or run immediately if at bottom of body
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => new PanelManager());
} else {
    new PanelManager();
}
