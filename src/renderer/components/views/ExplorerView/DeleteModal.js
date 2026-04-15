/**
 * Custom VS Code style deletion modal for AirGrove.
 * This provides a consistent UI across platforms and gives full control over button layout.
 */
export async function showDeleteModal(paths) {
    return new Promise((resolve) => {
        // 1. Create Overlay
        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay';

        const itemName = paths.length === 1 ? ` '${paths[0].split(/[\\\/]/).pop()}'` : ` the following ${paths.length} files`;
        
        const fileList = paths.length > 1 
            ? paths.slice(0, 10).map(p => p.split(/[\\\/]/).pop()).join('\n') + (paths.length > 10 ? `\n...and ${paths.length - 10} more.` : '')
            : '';

        const detailText = paths.length > 1 
            ? `${fileList}\n\nYou can restore these files from the Recycle Bin.`
            : 'You can restore this file from the Recycle Bin.';

        // 2. Create Modal Template (Matching user's specific request for alignment)
        overlay.innerHTML = `
            <div class="modal-container">
                <div class="modal-header">
                    <i class="codicon codicon-info modal-icon"></i>
                    <div class="modal-title">Are you sure you want to delete${itemName}?</div>
                </div>
                <div class="modal-body">
                    <div class="modal-detail">${detailText}</div>
                </div>
                <div class="modal-footer">
                    <label class="modal-checkbox">
                        <input type="checkbox" id="modal-dont-ask">
                        <span>Do not ask me again</span>
                    </label>
                    <div class="modal-actions">
                         <button class="modal-btn secondary" id="modal-cancel">Cancel</button>
                         <button class="modal-btn primary" id="modal-delete">Move to Recycle Bin</button>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(overlay);

        // 3. Focus the primary button
        const deleteBtn = overlay.querySelector('#modal-delete');
        const cancelBtn = overlay.querySelector('#modal-cancel');
        const checkbox = overlay.querySelector('#modal-dont-ask');

        deleteBtn.focus();

        // 4. Handle Actions
        const cleanup = (confirmed) => {
            const dontAskAgain = checkbox.checked;
            document.body.removeChild(overlay);
            resolve({ confirmed, dontAskAgain });
        };

        deleteBtn.addEventListener('click', () => cleanup(true));
        cancelBtn.addEventListener('click', () => cleanup(false));

        // Close on escape
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                window.removeEventListener('keydown', handleKeyDown);
                cleanup(false);
            } else if (e.key === 'Enter' && document.activeElement !== cancelBtn) {
                window.removeEventListener('keydown', handleKeyDown);
                cleanup(true);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        
        // Close on clicking overlay background
        overlay.addEventListener('mousedown', (e) => {
            if (e.target === overlay) {
                window.removeEventListener('keydown', handleKeyDown);
                cleanup(false);
            }
        });
    });
}
