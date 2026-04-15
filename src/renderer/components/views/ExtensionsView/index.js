// Extensions View Component
// [REPLACED ALL CONTENT]

document.addEventListener('DOMContentLoaded', () => {
    const extensionsView = document.getElementById('extensions-view');
    if (!extensionsView) return;

    // 1. Handle Search Input
    const searchInput = extensionsView.querySelector('.search-input');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            // TODO: Implement extension search functionality
            console.log('Searching extensions:', e.target.value);
        });
    }

    // 2. Handle Collapsible Sections
    const auxViewHeaders = extensionsView.querySelectorAll('.extensions-list-container .aux-view-header');

    auxViewHeaders.forEach(header => {
        const parentView = header.parentElement;
        const content = header.nextElementSibling;
        const chevron = header.querySelector('.codicon');

        // REMOVED: Logic that set initial state differently

        header.addEventListener('click', () => {
            // Toggle the 'expanded' state
            const isNowExpanded = parentView.classList.toggle('expanded');

            // Toggle the chevron icon (Standard logic)
            if (chevron) {
                chevron.classList.toggle('codicon-chevron-down', isNowExpanded);
                chevron.classList.toggle('codicon-chevron-right', !isNowExpanded);
            }

            // Toggle the content visibility
            if (content) {
                content.style.display = isNowExpanded ? 'block' : 'none';
            }
        });
    });
});
