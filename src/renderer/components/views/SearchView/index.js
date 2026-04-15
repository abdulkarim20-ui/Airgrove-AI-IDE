import controller from "../../../search/SearchController.js";
import { renderResults } from "../../../search/SearchRenderer.js";

// Inject CSS
const link = document.createElement('link');
link.rel = 'stylesheet';
link.href = './search/search.css';
document.head.appendChild(link);

let currentRoot = null;

// Helper to update UI state based on workspace
function updateViewVisibility() {
    const message = document.querySelector('.search-no-folder-message');
    // If we have a root, hide the message. If not, show it.
    // Note: VS Code Search works on open files even without a folder, 
    // but the message "You have not opened a folder" usually implies "Open Folder" call to action.
    // However, the user specifically complained that "in the search it still saying open the folder" when a dir IS loaded.
    // So if currentRoot is present, we MUST hide it.

    if (message) {
        if (currentRoot) {
            message.style.display = 'none';
        } else {
            message.style.display = 'block';
        }
    }
}

// Track workspace root changes
document.addEventListener('workspace-bootstrapped', (e) => {
    currentRoot = e.detail?.path;
    console.log('[Search] Workspace bootstrapped with path:', currentRoot);

    // Update UI visibility
    updateViewVisibility();

    // 1. Reset Controller State
    controller.reset();

    // 2. Clear UI - Results
    const resultsContainer = document.querySelector('.search-results-container');
    if (resultsContainer) resultsContainer.innerHTML = '';

    // 3. Clear UI - Inputs
    const searchInput = document.querySelector('.search-input');
    const replaceInput = document.querySelector('.replace-input');

    if (searchInput) searchInput.value = '';
    if (replaceInput) replaceInput.value = '';

    // 4. Reset replace container visibility (optional, but "fresh" implies hiding it)
    const replaceContainer = document.querySelector('.replace-input-container');
    const replaceToggleBtn = document.getElementById('search-replace-toggle');

    // Default state: collapsed
    if (replaceContainer && !replaceContainer.classList.contains('hidden')) {
        replaceContainer.classList.add('hidden');
    }
    if (replaceToggleBtn) {
        replaceToggleBtn.classList.remove('codicon-chevron-down', 'expanded');
        replaceToggleBtn.classList.add('codicon-chevron-right');
        // Reset rotation if using inline styles or transform classes
        replaceToggleBtn.style.transform = '';
    }
});

document.addEventListener('DOMContentLoaded', () => {
    const searchView = document.getElementById('search-view');
    if (!searchView) return;

    // Check if we need to inject the results container
    // We look for where to put it. Usually inside `.search-view-content`, after `.search-inputs-wrapper`
    const searchContent = searchView.querySelector('.search-view-content');
    let resultsContainer = searchView.querySelector('.search-results-container');

    if (searchContent && !resultsContainer) {
        resultsContainer = document.createElement('div');
        resultsContainer.className = 'search-results-container search-results'; // Dual classes to match CSS
        searchContent.appendChild(resultsContainer);
    }

    // Initial visibility check (in case workspace loaded before DOM)
    updateViewVisibility();

    const searchInput = searchView.querySelector('.search-input');
    const replaceInput = searchView.querySelector('.replace-input');

    // Toggles
    const caseSensitiveBtn = searchView.querySelector('.codicon-case-sensitive');
    const wholeWordBtn = searchView.querySelector('.codicon-whole-word');
    const regexBtn = searchView.querySelector('.codicon-regex');

    const replaceToggleBtn = document.getElementById('search-replace-toggle');
    const replaceContainer = searchView.querySelector('.replace-input-container');
    const replaceAllBtn = searchView.querySelector('.replace-all-action');

    // 1. Bind Search Input
    if (searchInput) {
        let debounceTimer;
        searchInput.addEventListener('input', (e) => {
            controller.model.query = e.target.value;

            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(async () => {
                if (!currentRoot) return;

                const results = await controller.search(currentRoot);
                if (resultsContainer) {
                    renderResults(resultsContainer, results, (file, match) => {
                        // Dispatch event to open file and select match
                        const event = new CustomEvent('file-open-requested', {
                            detail: {
                                filepath: file,
                                selection: match ? {
                                    startLineNumber: match.line,
                                    startColumn: match.matches[0].start + 1,
                                    endLineNumber: match.line,
                                    endColumn: match.matches[0].start + match.matches[0].length + 1
                                } : null
                            }
                        });
                        document.dispatchEvent(event);
                    }, controller.model.replace); // Pass replace text
                }
            }, 300);
        });
    }

    // 2. Bind Replace Input
    if (replaceInput) {
        replaceInput.addEventListener('input', (e) => {
            controller.model.replace = e.target.value;

            // Re-render to show/hide replace preview immediately
            const results = controller.model.results;
            if (resultsContainer && results) {
                renderResults(resultsContainer, results, (file, match) => {
                    const event = new CustomEvent('file-open-requested', {
                        detail: {
                            filepath: file,
                            selection: match ? {
                                startLineNumber: match.line,
                                startColumn: match.matches[0].start + 1,
                                endLineNumber: match.line,
                                endColumn: match.matches[0].start + match.matches[0].length + 1
                            } : null
                        }
                    });
                    document.dispatchEvent(event);
                }, controller.model.replace);
            }
        });
    }

    // 3. Bind Toggles
    const toggleOption = (btn, prop) => {
        if (!btn) return;
        btn.addEventListener('click', async () => {
            // Visual toggle
            const isActive = btn.classList.toggle('active');
            // Update model
            controller.model[prop] = isActive;

            // Re-run search immediately
            if (currentRoot && controller.model.query) {
                const results = await controller.search(currentRoot);
                if (resultsContainer) {
                    renderResults(resultsContainer, results, (file, match) => {
                        const event = new CustomEvent('file-open-requested', {
                            detail: {
                                filepath: file,
                                selection: match ? {
                                    startLineNumber: match.line,
                                    startColumn: match.matches[0].start + 1,
                                    endLineNumber: match.line,
                                    endColumn: match.matches[0].start + match.matches[0].length + 1
                                } : null
                            }
                        });
                        document.dispatchEvent(event);
                    }, controller.model.replace);
                }
            }
        });
    };

    toggleOption(caseSensitiveBtn, 'caseSensitive');
    toggleOption(wholeWordBtn, 'wholeWord');
    toggleOption(regexBtn, 'regex');

    // Shortcuts (Alt+C, Alt+W, Alt+R)
    if (searchInput) {
        searchInput.addEventListener('keydown', (e) => {
            if (e.altKey) {
                let btnToClick = null;
                switch (e.code) {
                    case 'KeyC':
                        btnToClick = caseSensitiveBtn;
                        break;
                    case 'KeyW':
                        btnToClick = wholeWordBtn;
                        break;
                    case 'KeyR':
                        btnToClick = regexBtn;
                        break;
                }
                if (btnToClick) {
                    e.preventDefault();
                    btnToClick.click();
                }
            }
        });
    }

    // 4. Bind Replace Toggle UI
    if (replaceToggleBtn && replaceContainer) {
        replaceToggleBtn.addEventListener('click', () => {
            const isHidden = replaceContainer.classList.toggle('hidden');
            replaceToggleBtn.classList.toggle('codicon-chevron-right', isHidden);
            replaceToggleBtn.classList.toggle('codicon-chevron-down', !isHidden);

            // If hidden, technically we should clear the preview? 
            // VS Code keeps the input value but hides it. 
            // If the input value exists, my logic will show preview. 
            // Maybe we should only show preview if !isHidden?
            // User can just clear the text if they don't want preview, or we can check visibility.
            // For now, let's keep it simple: if text is there, show preview.
        });
    }

    // 5. Bind Replace All
    if (replaceAllBtn) {
        replaceAllBtn.addEventListener('click', async () => {
            if (!currentRoot) return;
            await controller.replaceAll(currentRoot);
            const results = controller.model.results; // Updated results
            if (resultsContainer) {
                renderResults(resultsContainer, results, (file, match) => {
                    const event = new CustomEvent('file-open-requested', {
                        detail: {
                            filepath: file,
                            selection: match ? {
                                startLineNumber: match.line,
                                startColumn: match.matches[0].start + 1,
                                endLineNumber: match.line,
                                endColumn: match.matches[0].start + match.matches[0].length + 1
                            } : null
                        }
                    });
                    document.dispatchEvent(event);
                }, controller.model.replace);
            }
        });
    }
});
