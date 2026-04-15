// 📄 FILE: src/renderer/components/SideBar/PrimarySideBar/AuxViews.js

document.addEventListener('DOMContentLoaded', () => {
    const auxViewHeaders = document.querySelectorAll('.aux-view-header');

    auxViewHeaders.forEach(header => {
        header.addEventListener('click', () => {
            const parentView = header.parentElement;
            const content = header.nextElementSibling;
            const chevron = header.querySelector('.codicon');

            // Toggle the 'expanded' state
            const isExpanded = parentView.classList.toggle('expanded');

            // Toggle the chevron icon
            chevron.classList.toggle('codicon-chevron-right', !isExpanded);
            chevron.classList.toggle('codicon-chevron-down', isExpanded);

            // Toggle the content visibility
            if (content) {
                content.style.display = isExpanded ? 'block' : 'none';
            }
        });
    });
});
