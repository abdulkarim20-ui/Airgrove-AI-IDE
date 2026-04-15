// Import Xterm.js and its addons
import { Terminal } from 'https://cdn.jsdelivr.net/npm/@xterm/xterm@5.5.0/+esm';
import { FitAddon } from 'https://cdn.jsdelivr.net/npm/@xterm/addon-fit@0.10.0/+esm';

// --- Global State ---
const terminalInstances = new Map(); // Stores { id: Terminal }
const fitAddons = new Map(); // Stores { id: FitAddon }
let activeTerminalId = null;
let pendingTerminals = 0; // Tracks invalid terminal creations to prevent premature panel closing

// --- DOM Elements ---
const terminalContainer = document.getElementById('terminal-container');
const newTermBtn = document.getElementById('new-terminal-btn');
const terminalList = document.getElementById('terminal-list');
const panelBody = document.getElementById('panel-content');
const sidebar = document.querySelector('.terminal-sidebar');
const resizer = document.getElementById('sidebar-resizer');

// --- Core Functions ---

/**
 * Sends a request to the main process to create a new PTY.
 * @param {boolean} isSplit Whether this terminal should be a split of the active one.
 * @param {string} parentId The ID of the terminal being split.
 */
function createNewTerminal(isSplit = false, parentId = null) {
  pendingTerminals++;
  window.electronAPI.ptyCreate({ isSplit, parentId });
}

/**
 * Sends a request to the main process to kill a specific PTY.
 */
function killTerminal(id) {
  window.electronAPI.ptyKill(id);
}

/**
 * Disposes all active terminals (VS Code-style workspace reload behavior).
 * This is called when the workspace changes to ensure terminals start fresh in the new directory.
 */
function disposeAllTerminals() {
  console.log('[Terminal] Disposing all terminals for workspace change...');

  // Kill all PTY processes in the main process
  for (const id of terminalInstances.keys()) {
    window.electronAPI.ptyKill(id);
  }

  // Clear the frontend state
  terminalInstances.clear();
  fitAddons.clear();
  activeTerminalId = null;

  // Clear the UI
  terminalContainer.innerHTML = '';
  terminalList.innerHTML = '';

  // Hide the sidebar since there are no terminals
  updateSidebarVisibility();
}

/**
 * Switches the visible terminal in the main container.
 */
function switchToTerminal(id) {
  if (id === activeTerminalId) return; // Already active

  const newTerm = terminalInstances.get(id);
  if (!newTerm) return;

  // Hide all terminal wrappers
  terminalContainer.childNodes.forEach(wrapper => {
    if (wrapper.nodeType === Node.ELEMENT_NODE) { // Ensure it's an element
      wrapper.style.display = 'none';
    }
  });

  // Show the wrapper for the terminal we want
  const activeWrapper = terminalContainer.querySelector(`.terminal-instance-wrapper[data-id="${id}"]`);
  if (activeWrapper) {
    activeWrapper.style.display = 'block';
  }

  activeTerminalId = id;

  // Focus the new terminal
  newTerm.focus();

  // Fit the terminal to the container
  fitActiveTerminal();

  // Update the '.active' class in the sidebar
  document.querySelectorAll('#terminal-list .terminal-list-item').forEach(li => {
    if (li.dataset.id === id) {
      li.classList.add('active');
    } else {
      li.classList.remove('active');
    }
  });
}

// Cache to track terminal dimensions and avoid redundant ptyResize calls
const lastSizePerId = new Map();

/**
 * Fits the *currently active* terminal to its container.
 */
function fitActiveTerminal() {
  const panelContent = document.getElementById('panel-content');
  // If the panel isn't visible or has no height, just stop.
  if (!panelContent || panelContent.clientHeight === 0) {
    return;
  }

  const addon = fitAddons.get(activeTerminalId);
  const term = terminalInstances.get(activeTerminalId);

  if (addon && term) {
    try {
      addon.fit();
      
      const newSize = { cols: term.cols, rows: term.rows };
      const lastSize = lastSizePerId.get(activeTerminalId);

      // Only resize PTY if the dimensions have actually changed
      if (lastSize && lastSize.cols === newSize.cols && lastSize.rows === newSize.rows) {
        return;
      }

      lastSizePerId.set(activeTerminalId, newSize);
      window.electronAPI.ptyResize({
        id: activeTerminalId,
        size: newSize,
      });
    } catch (e) {
      console.error("Error resizing terminal:", e);
    }
  }
}

/**
 * NEW: Shows or hides the terminal sidebar based on the number of active terminals.
 */
function updateSidebarVisibility() {
  const count = terminalInstances.size;

  if (count > 1) {
    panelBody.classList.add('sidebar-visible');
  } else {
    panelBody.classList.remove('sidebar-visible');
  }

  // Refit the terminal *after* the sidebar state has changed
  // This accounts for the container changing size
  fitActiveTerminal();
}

// --- IPC Event Listeners ---

/**
 * Called when the main process confirms a PTY has been created.
 */
window.electronAPI.onPtyCreated(({ id, shell, isSplit, parentId }) => {
  pendingTerminals = Math.max(0, pendingTerminals - 1);
  // 1. Create the new xterm.js instance
  const newTerm = new Terminal({
    cursorBlink: true,
    fontFamily: '"Cascadia Code", "Fira Code", monospace',
    fontSize: 13,
    allowTransparency: true,
    theme: {
      background: '#1e1e1e', // Matches --bg-panel in main.css
      foreground: '#cccccc',
      cursor: '#cccccc',
      selectionBackground: '#555555',
    },
  });

  // 2. Create and load its FitAddon
  const newFitAddon = new FitAddon();
  newTerm.loadAddon(newFitAddon);

  // 3. Store them in our maps
  terminalInstances.set(id, newTerm);
  fitAddons.set(id, newFitAddon);

  // 4. Wire up its 'onData' to send to main process *with its ID*
  newTerm.onData((data) => {
    window.electronAPI.ptyData({ id, data });
  });

  // 5. Create the UI element for the sidebar
  const li = document.createElement('li');
  li.className = 'terminal-list-item';
  li.dataset.id = id; // IMPORTANT: for finding it later

  const icon = document.createElement('i');
  icon.className = 'codicon codicon-terminal';

  const span = document.createElement('span');
  span.textContent = shell;
  span.className = 'terminal-name';

  // --- START: RENAME LOGIC ---
  span.addEventListener('dblclick', (e) => {
    e.stopPropagation();
    const currentName = span.textContent;
    const input = document.createElement('input');
    input.type = 'text';
    input.value = currentName;
    input.className = 'terminal-rename-input';

    const saveRename = () => {
      const newName = input.value.trim() || currentName;
      span.textContent = newName;
      input.replaceWith(span);
    };

    input.addEventListener('blur', saveRename);
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') saveRename();
      if (e.key === 'Escape') {
        input.replaceWith(span);
      }
    });

    span.replaceWith(input);
    input.focus();
    input.select();
  });
  // --- END: RENAME LOGIC ---

  // --- Create a container for the icons ---
  const actionsDiv = document.createElement('div');
  actionsDiv.className = 'terminal-list-item-actions';

  const splitBtn = document.createElement('i');
  splitBtn.className = 'codicon codicon-split-horizontal';
  splitBtn.title = 'Split Terminal';

  const trashBtn = document.createElement('i');
  trashBtn.className = 'codicon codicon-trash';
  trashBtn.title = 'Kill Terminal';

  // 6. Add click listeners
  splitBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    createNewTerminal(true, id);
  });

  trashBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    killTerminal(id);
  });

  li.addEventListener('click', () => {
    switchToTerminal(id);
  });

  actionsDiv.append(splitBtn, trashBtn);
  li.append(icon, span, actionsDiv);

  terminalList.appendChild(li);

  // 7. Create a wrapper for this terminal
  const termWrapper = document.createElement('div');
  termWrapper.className = 'terminal-instance-wrapper';
  termWrapper.dataset.id = id;
  termWrapper.style.display = 'none'; // Hide by default

  // --- START: SPLIT LOGIC ---
  if (isSplit && parentId) {
    li.classList.add('split-item'); // Style it in the sidebar
    // Indent the name if it's a split
    span.style.paddingLeft = '20px';
  }
  // --- END: SPLIT LOGIC ---

  // 8. Add the wrapper to the main container first
  terminalContainer.appendChild(termWrapper);

  // 9. Switch to the new terminal (makes it display: block)
  switchToTerminal(id);

  // 10. Open the terminal *inside* its visible wrapper
  newTerm.open(termWrapper);

  // 11. ADDED: Update sidebar visibility based on new count
  updateSidebarVisibility();

  // 12. CHECK FOR PENDING STARTUP COMMANDS
  if (pendingStartupCommands.length > 0) {
    const cmd = pendingStartupCommands.shift(); // FIFO
    if (cmd && cmd.text) {
      console.log(`[Terminal] Executing pending startup command on new terminal ${id}`);
      // Slight delay ensures the terminal is totally ready/mounted in UI if needed, 
      // though backend PTY is ready immediately.
      setTimeout(() => {
        window.electronAPI.ptySendCommand({ id: id, command: cmd.text });
      }, 100);
    }
  }
});

/**
 * Called when the main process sends data from a PTY.
 */
window.electronAPI.onPtyReply(({ id, data }) => {
  terminalInstances.get(id)?.write(data);
});

/**
 * Called when the main process confirms a PTY has been killed.
 */
window.electronAPI.onPtyKilled((id) => {
  // 1. Clean up the xterm.js instance
  terminalInstances.get(id)?.dispose();

  // 2. Remove from our maps
  terminalInstances.delete(id);
  fitAddons.delete(id);

  // 3. Remove from the sidebar UI
  document.querySelector(`li[data-id="${id}"]`)?.remove();

  // 4. Remove the terminal's wrapper from the DOM
  document.querySelector(`.terminal-instance-wrapper[data-id="${id}"]`)?.remove();

  // 5. If the active terminal was killed, switch to another one
  if (activeTerminalId === id) {
    const firstRemainingId = terminalInstances.keys().next().value;
    if (firstRemainingId) {
      switchToTerminal(firstRemainingId);
    } else {
      activeTerminalId = null;
    }
  }

  // 6. Update sidebar visibility based on new count
  updateSidebarVisibility();

  // 7. VS Code behavior: If this was the last terminal, close the panel
  // We check 'pendingTerminals' to ensure we don't close the panel if a new one is on the way
  if (terminalInstances.size === 0 && pendingTerminals === 0) {
    console.log('[Terminal] Last terminal killed, auto-closing panel...');
    // Dispatch event to close the panel (WorkbenchManager handles this)
    document.dispatchEvent(new CustomEvent('close-panel-requested'));
  }
});

/**
 * Called when the main process reports a PTY spawn failure.
 */
window.electronAPI.onPtySpawnFailed(({ id, error }) => {
  pendingTerminals = Math.max(0, pendingTerminals - 1);
  const term = terminalInstances.get(id);
  if (term) {
    term.write(`\r\n\x1b[31m[Error] Failed to spawn terminal process:\x1b[0m\r\n`);
    term.write(`\x1b[31m${error}\x1b[0m\r\n`);
    term.write(`\r\nPlease check if the shell path is correct and you have necessary permissions.\r\n`);
  }
});


// --- Initial Setup ---

// --- Initial Setup ---

// Fit the active terminal when the window is resized
// window.addEventListener('resize', fitActiveTerminal); // Superseded by ResizeObserver

// --- START: ADD THIS LINE ---
// Fit the active terminal when the panel is dragged
window.addEventListener('panel-resized', fitActiveTerminal);
// --- END: ADD THIS LINE ---

// --- ROBUST RESIZING (VS Code Style) ---
// Use ResizeObserver to detect ALL size changes (window resize, split resize, panel toggle)
const resizeObserver = new ResizeObserver(entries => {
  // Debounce slightly if needed, or just call fit. fit-addon is usually fast.
  // We use requestAnimationFrame to ensure we don't resize during a layout pass
  window.requestAnimationFrame(() => {
    fitActiveTerminal();
  });
});

if (terminalContainer) {
  resizeObserver.observe(terminalContainer);
}

// Handle the "New Terminal" button click
newTermBtn.addEventListener('click', createNewTerminal);

// Request the first terminal on load
createNewTerminal();

// --- Sidebar Resizer Logic ---
let isResizing = false;

resizer.addEventListener('mousedown', (e) => {
  isResizing = true;
  document.body.style.userSelect = 'none';

  document.addEventListener('mousemove', handleMouseMove);
  document.addEventListener('mouseup', stopResize);
});

function handleMouseMove(e) {
  if (!isResizing) return;
  e.preventDefault();

  const panelRight = panelBody.getBoundingClientRect().right;
  let newWidth = panelRight - e.clientX;

  if (newWidth < 150) newWidth = 150;
  if (newWidth > panelBody.clientWidth - 300) {
    newWidth = panelBody.clientWidth - 300;
  }

  sidebar.style.width = `${newWidth}px`;

  fitActiveTerminal();
}

function stopResize() {
  isResizing = false;
  document.body.style.userSelect = '';

  document.removeEventListener('mousemove', handleMouseMove);
  document.removeEventListener('mouseup', stopResize);
}

// --- START: Add "Glue" Logic for Header Buttons ---

// This button is handled by WorkbenchManager.js, but we'll
// make sure it fits the terminal when the panel is toggled.
const panelToggleBtn = document.getElementById('toggle-panel-btn');
if (panelToggleBtn) {
  panelToggleBtn.addEventListener('click', () => {
    // Use a small timeout to let the panel animation finish
    setTimeout(() => fitActiveTerminal(), 200);
  });
}

// Handle the panel's main "Kill Terminal" button
const killBtn = document.getElementById('kill-panel-btn');
if (killBtn) {
  killBtn.addEventListener('click', () => {
    if (activeTerminalId) {
      killTerminal(activeTerminalId);
    }
  });
}

// Handle the panel's main "Split Terminal" button
const splitPanelBtn = document.getElementById('split-panel-btn');
if (splitPanelBtn) {
  splitPanelBtn.addEventListener('click', () => {
    if (activeTerminalId) {
      createNewTerminal(true, activeTerminalId);
    }
  });
}
// --- END: Add "Glue" Logic ---

// --- START: WORKSPACE LIFECYCLE INTEGRATION ---
/**
 * Track the last workspace to detect actual changes vs initial load.
 * We only want to dispose terminals when SWITCHING workspaces, not on first load.
 */
let lastWorkspacePath = null;

/**
 * Listen for workspace changes and dispose all terminals.
 * This ensures that when you switch projects, old terminals don't linger
 * with stale paths. New terminals will automatically use the fresh workspace path.
 */
document.addEventListener('workspace-bootstrapped', (e) => {
  const newWorkspacePath = e.detail?.path;

  // Check if the workspace path actually changed
  if (lastWorkspacePath === newWorkspacePath) return;

  console.log(`[Terminal] Workspace set to ${newWorkspacePath} (was ${lastWorkspacePath}). Resetting terminals...`);

  // 1. Dispose existing terminals (which might be in the Home dir or old workspace)
  disposeAllTerminals();

  // 2. Create a new terminal in the new workspace
  // Since we use 'pendingTerminals' logic, we can just call this immediately.
  // The 'pendingTerminals' count will prevent onPtyKilled from closing the panel.
  createNewTerminal();

  // Update tracking
  lastWorkspacePath = newWorkspacePath;
});

document.addEventListener('workspace-disposed', () => {
  console.log('[Terminal] Workspace disposed, clearing terminals...');
  disposeAllTerminals();
  lastWorkspacePath = null;
});
// --- END: WORKSPACE LIFECYCLE INTEGRATION ---

// --- START: GLOBAL TERMINAL MANAGER ---
// Using a queue for commands that need to run immediately after terminal creation
const pendingStartupCommands = [];

// Expose methods for other components (like Context Menu) to use
window.terminalManager = {
  createNewTerminal: (cwd) => {
    window.electronAPI.ptyCreate({ isSplit: false, parentId: null, cwd: cwd });
  },

  sendText: (text) => {
    // Send text to active terminal
    if (activeTerminalId) {
      window.electronAPI.ptySendCommand({ id: activeTerminalId, command: text });
    } else {
      // If no terminal, create one and then send
      console.log("[TerminalManager] No active terminal, creating new one...");
      window.terminalManager.createAndSend(text, null);
    }
  },

  createAndSend: (text, cwd) => {
    // Queue the command to be run once the next terminal is created
    pendingStartupCommands.push({ text, cwd });

    // Request the new terminal
    window.electronAPI.ptyCreate({ isSplit: false, parentId: null, cwd: cwd });
  }
};
// --- END: GLOBAL TERMINAL MANAGER ---

// --- START: MENU BAR INTEGRATION ---
document.addEventListener('new-terminal-triggered', () => {
  // Ensure panel is visible when creating a terminal
  document.dispatchEvent(new CustomEvent('toggle-panel-visibility', { detail: { visible: true } }));
  createNewTerminal();
});

document.addEventListener('split-terminal-triggered', () => {
  if (activeTerminalId) {
    document.dispatchEvent(new CustomEvent('toggle-panel-visibility', { detail: { visible: true } }));
    createNewTerminal(true, activeTerminalId);
  }
});
// --- END: MENU BAR INTEGRATION ---