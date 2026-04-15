/**
 * TooltipManager handles showing custom tooltips for elements with a 'title' or 'data-tooltip' attribute.
 */
class TooltipManager {
    constructor() {
        this.tooltipEl = document.createElement('div');
        this.tooltipEl.id = 'custom-tooltip';
        document.body.appendChild(this.tooltipEl);

        this.showTimer = null;
        this._init();
    }

    _init() {
        document.addEventListener('mouseover', (e) => {
            const el = e.target.closest('[title], [data-tooltip]');
            if (el) {
                // If it has a title, convert to data-tooltip to prevent default browser tooltip
                if (el.hasAttribute('title')) {
                    el.setAttribute('data-tooltip', el.getAttribute('title'));
                    el.removeAttribute('title');
                }

                const text = el.getAttribute('data-tooltip');
                if (text) {
                    clearTimeout(this.showTimer);
                    this.showTimer = setTimeout(() => this.show(el, text), 500); // 500ms delay like VS Code
                }
            }
        });

        document.addEventListener('mouseout', (e) => {
            const el = e.target.closest('[data-tooltip]');
            if (el) {
                clearTimeout(this.showTimer);
                this.hide();
            }
        });

        // Also hide on click/move
        document.addEventListener('mousedown', () => {
            clearTimeout(this.showTimer);
            this.hide();
        });
    }

    show(targetEl, text) {
        this.tooltipEl.textContent = text;

        // Temporarily show to get dimensions
        this.tooltipEl.style.visibility = 'hidden';
        this.tooltipEl.style.opacity = '1';
        this.tooltipEl.style.display = 'block';
        const tooltipRect = this.tooltipEl.getBoundingClientRect();

        const rect = targetEl.getBoundingClientRect();

        // Position: Bottom
        let top = rect.bottom + 8;
        let left = rect.left + (rect.width / 2) - (tooltipRect.width / 2);

        // Ensure within horizontal viewport
        if (left < 10) left = 10;
        if (left + tooltipRect.width > window.innerWidth - 10) {
            left = window.innerWidth - tooltipRect.width - 10;
        }

        this.tooltipEl.style.top = `${top}px`;
        this.tooltipEl.style.left = `${left}px`;
        this.tooltipEl.className = 'bottom';
        this.tooltipEl.style.visibility = 'visible';
        this.tooltipEl.style.opacity = '1';
    }

    hide() {
        this.tooltipEl.style.opacity = '0';
        // Delay display none to allow transition
        setTimeout(() => {
            if (this.tooltipEl.style.opacity === '0') {
                this.tooltipEl.style.display = 'none';
            }
        }, 100);
    }
}

export const tooltipManager = new TooltipManager();
