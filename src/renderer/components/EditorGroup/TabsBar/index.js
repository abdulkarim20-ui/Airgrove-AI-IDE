// 📄 FILE: src/renderer/components/EditorGroup/TabsBar/index.js

import { getIconForFile } from '../../../utils/file-icons.js';

export class TabsBar {
    constructor(container) {
        this.container = container;
        this.container.id = 'tabs-bar-container';

        // Mouse wheel scrolling logic will now be attached to the inner list
    }

    render(openFiles, activeFilePath) {
        // Clear the entire container first
        this.container.innerHTML = '';

        // If there are no open files, do nothing. The bar will be empty.
        if (openFiles.length === 0) {
            return;
        }

        // --- START: REVISED RENDER LOGIC ---

        // 1. Create the container that will hold the actual tabs and be scrollable
        const tabsList = document.createElement('div');
        tabsList.className = 'tabs-list';

        // Attach scroll listener to the new list element
        tabsList.addEventListener('wheel', (e) => {
            if (e.deltaX === 0) {
                e.preventDefault();
                tabsList.scrollLeft += e.deltaY;
            }
        }, { passive: false });

        // Helper function to create the correct icon element (SVG or Codicon)
        const createIconElement = (iconData) => {
            if (iconData.type === 'svg') {
                const img = document.createElement('img');
                img.src = iconData.value;
                img.className = 'file-icon-svg';
                return img;
            } else { // codicon
                const i = document.createElement('i');
                i.className = `codicon ${iconData.value}`;
                return i;
            }
        };

        // 2. Populate the tabsList with the tab items
        openFiles.forEach(file => {
            const tab = document.createElement('div');
            tab.className = 'tab-item';
            tab.dataset.filePath = file.path;

            // START: MODIFICATION
            tab.classList.toggle('dirty', file.isDirty);
            // Preview mode style
            tab.classList.toggle('preview', !!file.isPreview);
            // Browser tab style (280px width) - trigger only after URL is loaded
            tab.classList.toggle('browser-tab', !!file.isUrlLoaded);
            // END: MODIFICATION

            if (file.path === activeFilePath) {
                tab.classList.add('active');
            }

            // --- START: MODIFICATION ---
            const iconData = getIconForFile(file.name, file.path);
            const icon = createIconElement(iconData);
            tab.appendChild(icon);
            // --- END: MODIFICATION ---

            const name = document.createElement('span');
            name.className = 'tab-name';
            name.textContent = file.name;
            tab.appendChild(name);

            const closeBtn = document.createElement('i');
            closeBtn.className = 'codicon codicon-close tab-close-btn';
            closeBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                // Dispatch event instead of callback
                this.container.dispatchEvent(new CustomEvent('tab-closed', {
                    detail: { filePath: file.path },
                    bubbles: true
                }));
            });
            tab.appendChild(closeBtn);

            tab.addEventListener('click', () => {
                this.container.dispatchEvent(new CustomEvent('tab-selected', {
                    detail: { filePath: file.path },
                    bubbles: true
                }));
            });

            // Handle Double-Click (Pin Tab)
            tab.addEventListener('dblclick', () => {
                // We need to notify parent to pin this logic, or we manipulate the file object directly?
                // The file object reference is shared.
                if (file.isPreview) {
                    this.container.dispatchEvent(new CustomEvent('tab-pinned', {
                        detail: { filePath: file.path },
                        bubbles: true
                    }));
                }
            });

            // Handle Middle-Click (Close Tab)
            tab.addEventListener('auxclick', (e) => {
                if (e.button === 1) { // Middle mouse button
                    e.stopPropagation();
                    this.container.dispatchEvent(new CustomEvent('tab-closed', {
                        detail: { filePath: file.path },
                        bubbles: true
                    }));
                }
            });

            // Handle Right-Click (Context Menu)
            tab.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                e.stopPropagation();

                // Define menu template based on the clicked tab
                const menuTemplate = [
                    {
                        label: 'Close',
                        action: () => {
                            this.container.dispatchEvent(new CustomEvent('tab-closed', {
                                detail: { filePath: file.path },
                                bubbles: true
                            }));
                        }
                    },
                    {
                        label: 'Close Others',
                        action: () => {
                            this.container.dispatchEvent(new CustomEvent('close-other-tabs', {
                                detail: { filePath: file.path },
                                bubbles: true
                            }));
                        }
                    },
                    {
                        label: 'Close to the Right',
                        action: () => {
                            this.container.dispatchEvent(new CustomEvent('close-tabs-to-right', {
                                detail: { filePath: file.path },
                                bubbles: true
                            }));
                        }
                    },
                    { type: 'separator' },
                    {
                        label: 'Close Saved',
                        action: () => {
                            this.container.dispatchEvent(new CustomEvent('close-saved-tabs', {
                                bubbles: true
                            }));
                        }
                    },
                    { type: 'separator' },
                    {
                        label: 'Close All',
                        action: () => {
                            this.container.dispatchEvent(new CustomEvent('close-all-tabs', {
                                bubbles: true
                            }));
                        }
                    }
                ];

                // Import ContextMenu dynamically to avoid cyclic dependency issues or early load
                import('../../ContextMenu/index.js').then(({ ContextMenu }) => {
                    new ContextMenu(menuTemplate, e.clientX, e.clientY);
                });
            });

            tabsList.appendChild(tab);
        });

        // 3. Create the container for the action buttons on the right
        const tabActions = document.createElement('div');
        tabActions.className = 'tab-actions';

        // --- START: ADD RUN BUTTON ---
        // Create a wrapper for the run button
        const runButtonWrapper = document.createElement('div');
        tabActions.appendChild(runButtonWrapper);

        // --- START: ADD NEW TAB BUTTON ---
        const plusBtn = document.createElement('div');
        plusBtn.className = 'tab-action-button preview-only';
        plusBtn.title = 'New Preview Tab';
        plusBtn.style.display = 'none'; // Hidden by default
        plusBtn.innerHTML = `
            <img src="../../assets/modified_icons/new-tab.svg" width="16" height="16" />
        `;
        plusBtn.addEventListener('click', () => {
            if (window.editorGroup) window.editorGroup.openPreview();
        });
        tabActions.appendChild(plusBtn);

        // Visibility logic
        const activeFile = openFiles.find(f => f.path === activeFilePath);
        if (activeFile && activeFile.isBrowser) {
            plusBtn.style.display = 'flex';
        }
        // --- END: ADD NEW TAB BUTTON ---

        import('../../RunButton.js').then(({ RunButton }) => {
            // Instantiate RunButton
            // We pass activeFilePath. CWD is inferred as null (file directory) by the service.
            const btn = new RunButton(runButtonWrapper);
            btn.update(activeFilePath, null);
        });
        // --- END: ADD RUN BUTTON ---


        // Create the "Split Editor" button
        const splitBtn = document.createElement('div');
        splitBtn.className = 'tab-action-button';
        splitBtn.title = 'Split Editor Right';
        splitBtn.innerHTML = '<i class="codicon codicon-split-horizontal"></i>';
        splitBtn.addEventListener('click', () => console.log('Split Editor clicked')); // Placeholder action
        tabActions.appendChild(splitBtn);

        // Create the "More Actions..." button
        const moreBtn = document.createElement('div');
        moreBtn.className = 'tab-action-button';
        moreBtn.title = 'More Actions...';
        moreBtn.innerHTML = '<i class="codicon codicon-ellipsis"></i>';
        moreBtn.addEventListener('click', () => console.log('More Actions clicked')); // Placeholder action
        tabActions.appendChild(moreBtn);

        // 4. Append both new containers to the main #tabs-bar-container
        this.container.appendChild(tabsList);
        this.container.appendChild(tabActions);

        // --- END: REVISED RENDER LOGIC ---

        // Scroll the active tab into view within the new tabsList
        const activeTab = tabsList.querySelector('.tab-item.active');
        if (activeTab) {
            // FIXED: Use manual scroll calculation instead of scrollIntoView to prevent
            // the entire workbench from shifting/scrolling unexpectedly.
            const containerWidth = tabsList.clientWidth;
            const tabLeft = activeTab.offsetLeft;
            const tabWidth = activeTab.offsetWidth;

            // Calculate center position
            const targetScrollLeft = tabLeft - (containerWidth / 2) + (tabWidth / 2);

            tabsList.scrollTo({
                left: targetScrollLeft,
                behavior: 'smooth'
            });
        }
    }
}
