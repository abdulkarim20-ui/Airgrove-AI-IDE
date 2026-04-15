
export class ActivityBar {
    constructor() {
        this.items = document.querySelectorAll('#activity-bar-container .action-item[data-view]');
        this.attachListeners();
    }

    attachListeners() {
        this.items.forEach(item => {
            item.addEventListener('click', (e) => {
                e.stopPropagation(); // Prevent bubbling if needed
                const view = item.getAttribute('data-view');
                if (view) {
                    // Dispatch Custom Event to be handled by WorkbenchManager
                    window.dispatchEvent(new CustomEvent('activity-item-clicked', {
                        detail: { viewName: view }
                    }));
                }
            });
        });
    }

    /**
     * Updates the visual state of activity bar items
     * @param {string} activeViewName - The ID of the currently active view
     * @param {boolean} isSidebarVisible - Whether the sidebar is currently visible
     */
    updateState(activeViewName, isSidebarVisible, isPreviewOpen = false) {
        this.items.forEach(item => {
            const view = item.getAttribute('data-view');
            let isActive = false;

            if (view === 'preview') {
                isActive = isPreviewOpen;
            } else {
                // Item is active only if it matches current view AND sidebar is open
                isActive = (view === activeViewName) && isSidebarVisible;
            }

            item.classList.toggle('active', isActive);
        });
    }
}
