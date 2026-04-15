// Run and Debug View Component
// [REPLACED ALL CONTENT]

document.addEventListener('DOMContentLoaded', () => {
  const runDebugView = document.getElementById('run-debug-view');
  if (!runDebugView) return;

  const runAndDebugBtn = runDebugView.querySelector('#rd-run-debug-btn');
  // --- START: ADD THIS ---
  const openFileLink = runDebugView.querySelector('#rd-open-file-link');
  // --- END: ADD THIS ---

  if (runAndDebugBtn) {
    runAndDebugBtn.addEventListener('click', () => {
        // TODO: Implement Run and Debug functionality
        console.log('Run and Debug clicked');
    });
  }

  // --- START: ADD THIS ---
  if (openFileLink) {
    openFileLink.addEventListener('click', (e) => {
        e.preventDefault();
        // Dispatch the global event to open a file
        document.dispatchEvent(new CustomEvent('open-file-triggered'));
    });
  }
  // --- END: ADD THIS ---
});
