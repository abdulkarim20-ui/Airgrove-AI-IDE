// Workbench Manager JavaScript Logic with Complete View Management for Both Sidebars
import { workspaceManager } from '../../core/WorkspaceManager.js';
import { ActivityBar } from './index.js';

document.addEventListener('DOMContentLoaded', () => {
  // --- Element References ---
  const workbench = document.querySelector('.workbench');

  // Initialize Component Managers
  const activityBar = new ActivityBar();

  // Primary Sidebar Elements
  const primarySidebarContainer = document.getElementById('primary-sidebar-container');
  const sidebarTitle = document.querySelector('.sidebar-title');
  const sidebarActions = document.querySelector('.sidebar-header-actions');
  const allViews = document.querySelectorAll('#sidebar-view-container .view');
  const primarySidebarToggleBtn = document.getElementById('toggle-primary-sidebar-btn');
  const primarySidebarResizer = document.getElementById('primary-sidebar-resizer');

  // --- START: ADD SECONDARY SIDEBAR ELEMENTS ---
  const secondarySidebarContainer = document.getElementById('secondary-sidebar-container');
  const secondarySidebarToggleBtn = document.getElementById('toggle-secondary-sidebar-btn');
  const secondarySidebarResizer = document.getElementById('secondary-sidebar-resizer');
  // --- END: ADD SECONDARY SIDEBAR ELEMENTS ---

  // --- START: ADD PANEL ELEMENTS ---
  const panelContainer = document.getElementById('panel-container');
  const panelToggleBtn = document.getElementById('toggle-panel-btn');
  const panelCloseBtn = document.getElementById('close-panel-btn');
  const panelMaximizeBtn = document.getElementById('maximize-panel-btn');
  const panelResizer = document.getElementById('panel-resizer');
  // --- END: ADD PANEL ELEMENTS ---

  // --- START: ADD AUX CONTAINER REFERENCE ---
  const auxViewsContainer = document.getElementById('sidebar-auxiliary-container');
  // --- END: ADD AUX CONTAINER REFERENCE ---

  // --- START: ADD LAYOUT CONSTANTS ---
  const ACTIVITY_BAR_WIDTH = 40; // Must match CSS --activity-bar-width
  // --- END: ADD LAYOUT CONSTANTS ---

  const viewMeta = {
    'explorer': { title: 'EXPLORER', showActions: true },
    'search': { title: 'SEARCH', showActions: false },
    'source-control': { title: 'SOURCE CONTROL', showActions: false },
    'run-debug': { title: 'RUN AND DEBUG', showActions: false },
    'extensions': { title: 'EXTENSIONS', showActions: false },
  };

  // --- State Management ---
  let state = {
    sidebarVisible: false, // Closed by default as requested
    activeView: null,
    sidebarWidth: 228,
    secondarySidebarVisible: false,
    secondarySidebarWidth: 370,
    panelVisible: false,
    panelHeight: 250,
    isPanelMaximized: false,
    lastPanelHeight: 250,
    statusBarVisible: true,
    activityBarVisible: true,
    isPreviewActive: false,
  };

  function removePreload() {
    // Reveal everything together
    document.body.classList.remove('preload');
    workbench.classList.add('visible');
    const titleBar = document.getElementById('title-bar');
    if (titleBar) titleBar.classList.add('visible');
  }

  function render() {
    if (!workbench) return;
    // --- START: REVISED GRID TEMPLATE LOGIC ---
    const activityBarWidth = state.activityBarVisible ? ACTIVITY_BAR_WIDTH : 0;
    const primaryWidth = state.sidebarVisible ? `${state.sidebarWidth}px` : '0px';
    const secondaryWidth = state.secondarySidebarVisible ? `${state.secondarySidebarWidth}px` : '0px';
    // --- START: ADD PANEL HEIGHT TO GRID LOGIC ---
    const panelHeight = state.panelVisible ? `${state.panelHeight}px` : '0px';
    const statusBarHeight = state.statusBarVisible ? '22px' : '0px';

    workbench.style.gridTemplateColumns = `${activityBarWidth}px ${primaryWidth} minmax(0, 1fr) ${secondaryWidth}`;
    workbench.style.gridTemplateRows = `1fr ${panelHeight} ${statusBarHeight}`;
    // --- END: ADD PANEL HEIGHT TO GRID LOGIC ---

    // 1. Update primary sidebar visibility
    // Opacity toggle removed for smooth slide animation
    primarySidebarContainer.style.pointerEvents = state.sidebarVisible ? 'auto' : 'none';
    // Toggle class to manage border visibility
    primarySidebarContainer.classList.toggle('sidebar-open', state.sidebarVisible);

    // --- START: ADD SECONDARY SIDEBAR VISIBILITY ---
    // Opacity toggle removed for smooth slide animation
    secondarySidebarContainer.style.pointerEvents = state.secondarySidebarVisible ? 'auto' : 'none';
    // --- END: ADD SECONDARY SIDEBAR VISIBILITY ---

    // --- START: ADD PANEL VISIBILITY ---
    // Use the 'hidden' class to control its display property for performance
    panelContainer.classList.toggle('hidden', !state.panelVisible);
    // --- END: ADD PANEL VISIBILITY ---

    // --- START: TOGGLE ACTIVITY BAR & STATUS BAR ---
    document.getElementById('activity-bar-container').style.display = state.activityBarVisible ? 'flex' : 'none';
    document.getElementById('statusbar-container').style.display = state.statusBarVisible ? 'flex' : 'none';
    // --- END: TOGGLE VISIBILITY ---

    // --- START: REVERSED LOGIC FOR ICON AND BUTTON STATE ---
    // ... rest of the render logic remains the same ...
    const sidebarIcon = primarySidebarToggleBtn ? primarySidebarToggleBtn.querySelector('.codicon') : null;
    const panelIcon = panelToggleBtn ? panelToggleBtn.querySelector('.codicon') : null;

    // Toggle the icon classes based on visibility state (LOGIC IS NOW REVERSED)
    if (sidebarIcon) {
      sidebarIcon.classList.toggle('codicon-layout-sidebar-left', state.sidebarVisible);
      sidebarIcon.classList.toggle('codicon-layout-sidebar-left-off', !state.sidebarVisible);
    }

    if (panelIcon) {
      panelIcon.classList.toggle('codicon-layout-panel', state.panelVisible);
      panelIcon.classList.toggle('codicon-layout-panel-off', !state.panelVisible);
    }

    // --- START: ADD SECONDARY SIDEBAR ICON TOGGLE ---
    const secondaryIcon = secondarySidebarToggleBtn ? secondarySidebarToggleBtn.querySelector('.codicon') : null;
    if (secondaryIcon) {
      secondaryIcon.classList.toggle('codicon-layout-sidebar-right', state.secondarySidebarVisible);
      secondaryIcon.classList.toggle('codicon-layout-sidebar-right-off', !state.secondarySidebarVisible);
    }
    // --- END: ADD SECONDARY SIDEBAR ICON TOGGLE ---

    // Also toggle the 'active' class on the button itself for styling
    if (primarySidebarToggleBtn) primarySidebarToggleBtn.classList.toggle('active', state.sidebarVisible);
    if (panelToggleBtn) panelToggleBtn.classList.toggle('active', state.panelVisible);
    if (secondarySidebarToggleBtn) secondarySidebarToggleBtn.classList.toggle('active', state.secondarySidebarVisible);

    // Update maximize/restore icon
    // THE FIX: recognize that panelMaximizeBtn IS the icon itself (i tag), or contains it.
    const maximizeIcon = panelMaximizeBtn ? (panelMaximizeBtn.classList.contains('codicon') ? panelMaximizeBtn : panelMaximizeBtn.querySelector('.codicon')) : null;

    if (maximizeIcon) {
      if (state.isPanelMaximized) {
        maximizeIcon.classList.remove('codicon-chevron-up');
        maximizeIcon.classList.add('codicon-chevron-down');
      } else {
        maximizeIcon.classList.remove('codicon-chevron-down');
        maximizeIcon.classList.add('codicon-chevron-up');
      }
    }
    // --- END: REVERSED LOGIC ---

    // 2. Update active icon in the activity bar (delegated to component)
    activityBar.updateState(state.activeView, state.sidebarVisible, state.isPreviewActive);

    // 3. Update which view is visible inside the sidebar AND its header
    let currentViewFound = false;

    // Toggle a class on the sidebar container for view-specific styling in the header
    primarySidebarContainer.classList.toggle('explorer-active', state.activeView === 'explorer');
    
    allViews.forEach(view => {
      const viewId = view.id.replace('-view', '');
      const isVisible = viewId === state.activeView && state.sidebarVisible;
      view.classList.toggle('visible', isVisible);

      if (isVisible) {
        sidebarTitle.textContent = viewMeta[viewId]?.title || '';
        if (sidebarActions) {
          sidebarActions.style.display = viewMeta[viewId]?.showActions ? 'flex' : 'none';
        }
        currentViewFound = true;
      }
    });

    // --- START: NEW LOGIC FOR AUX VIEWS ---
    if (auxViewsContainer) {
      const showAuxViews = state.sidebarVisible && state.activeView === 'explorer';
      auxViewsContainer.style.display = showAuxViews ? 'block' : 'none';
    }
    // --- END: NEW LOGIC FOR AUX VIEWS ---

    if (!currentViewFound) {
      sidebarTitle.textContent = '';
      if (sidebarActions) {
        sidebarActions.style.display = 'none';
      }
    }
  }

  // ... (Keep existing handlers) ...

  // --- START: MENU BAR LISTENERS ---
  document.addEventListener('toggle-sidebar-triggered', handlePrimarySidebarToggle);
  document.addEventListener('toggle-secondary-sidebar-triggered', handleSecondarySidebarToggle);
  document.addEventListener('toggle-panel-triggered', handlePanelToggle);

  document.addEventListener('toggle-status-bar-triggered', () => {
    state.statusBarVisible = !state.statusBarVisible;
    render();
    window.dispatchEvent(new CustomEvent('panel-resized'));
  });

  document.addEventListener('toggle-activity-bar-triggered', () => {
    state.activityBarVisible = !state.activityBarVisible;
    render();
    window.dispatchEvent(new CustomEvent('panel-resized'));
  });

  document.addEventListener('toggle-panel-visibility', (e) => {
    // Force panel to be visible (or hidden) based on detail
    if (e.detail && typeof e.detail.visible === 'boolean') {
      if (state.panelVisible !== e.detail.visible) {
        handlePanelToggle();
      }
    }
  });

  document.addEventListener('ensure-secondary-sidebar-visible', () => {
    if (!state.secondarySidebarVisible) {
      handleSecondarySidebarToggle();
    }
  });
  // --- END: MENU BAR LISTENERS ---


  function handleActivityBarClick(viewName) {
    if (viewName === 'preview') {
      if (window.editorGroup) {
        window.editorGroup.openBrowser();
      }
      return;
    }

    if (state.activeView === viewName) {
      state.sidebarVisible = !state.sidebarVisible;
    } else {
      state.sidebarVisible = true;
      state.activeView = viewName;
    }
    document.body.classList.add('resizing');
    render();
    // Dispatch panel-resized after sidebar toggle
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent('panel-resized'));
      document.body.classList.remove('resizing');
    }, 300);
  }

  function handlePrimarySidebarToggle() {
    if (!state.activeView) {
      state.activeView = 'explorer';
    }
    state.sidebarVisible = !state.sidebarVisible;

    // --- START: MODIFICATION ---
    // If we are opening the sidebar, reset its width to the default
    if (state.sidebarVisible) {
      state.sidebarWidth = 220; // Reset width
    }
    // --- END: MODIFICATION ---

    document.body.classList.add('resizing');
    render();
    // Dispatch panel-resized after sidebar toggle
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent('panel-resized'));
      document.body.classList.remove('resizing');
    }, 300);
  }

  // --- START: ADD THIS NEW HANDLER ---
  function handleSecondarySidebarToggle() {
    state.secondarySidebarVisible = !state.secondarySidebarVisible;

    // Reset width to default when opening to match primary sidebar behavior
    if (state.secondarySidebarVisible) {
      state.secondarySidebarWidth = 370;
    }

    document.body.classList.add('resizing');
    render();
    // Dispatch panel-resized after sidebar toggle
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent('panel-resized'));
      document.body.classList.remove('resizing');
    }, 300);
  }
  // --- END: ADD THIS NEW HANDLER ---

  // --- START: ADD PANEL TOGGLE HANDLER ---
  function handlePanelToggle() {
    state.panelVisible = !state.panelVisible;
    // When closing, reset maximized state
    if (!state.panelVisible) {
      state.isPanelMaximized = false;
    }
    document.body.classList.add('resizing');
    render();
    // Dispatch panel-resized after panel toggle
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent('panel-resized'));
      document.body.classList.remove('resizing');
    }, 300);
  }

  // NEW function to handle maximizing/restoring the panel
  function toggleMaximizePanel() {
    if (!state.panelVisible) return; // Don't do anything if panel is closed

    state.isPanelMaximized = !state.isPanelMaximized;
    if (state.isPanelMaximized) {
      state.lastPanelHeight = state.panelHeight; // Save current height
      const workbenchRect = workbench.getBoundingClientRect();
      // Calculate max height minus title bar and status bar
      state.panelHeight = workbenchRect.height - 35;
    } else {
      state.panelHeight = state.lastPanelHeight; // Restore previous height
    }
    document.body.classList.add('resizing');
    render();

    // --- START: ADD THIS BLOCK ---
    // Wait for the panel's animation to finish, then
    // dispatch the event that terminal.js is listening for.
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent('panel-resized'));
      document.body.classList.remove('resizing');
    }, 300); // 300ms to match the CSS transition time
    // --- END: ADD THIS BLOCK ---
  }
  // --- END: ADD PANEL TOGGLE HANDLER ---

  // --- Event Listeners ---
  // --- Event Listeners ---

  // Listen for activity bar events from the component
  window.addEventListener('activity-item-clicked', (e) => {
    handleActivityBarClick(e.detail.viewName);
  });

  document.addEventListener('browser-tabs-changed', (e) => {
    state.isPreviewActive = e.detail.hasBrowserTabs;
    render();
  });

  primarySidebarToggleBtn.addEventListener('click', handlePrimarySidebarToggle);
  // --- START: ADD THIS NEW LISTENER ---
  secondarySidebarToggleBtn.addEventListener('click', handleSecondarySidebarToggle);
  // --- END: ADD THIS NEW LISTENER ---
  panelToggleBtn.addEventListener('click', handlePanelToggle);
  panelCloseBtn.addEventListener('click', () => { // Close button now also toggles
    if (state.panelVisible) handlePanelToggle();
  });
  panelMaximizeBtn.addEventListener('click', toggleMaximizePanel);

  // folder-loaded listener removed as it's redundant with workspace-bootstrapped

  // --- Primary Resizer Logic ---
  let isPrimaryResizing = false;
  // --- START: ADD PANEL RESIZER VARIABLE ---
  let isPanelResizing = false;
  // --- END: ADD PANEL RESIZER VARIABLE ---
  primarySidebarResizer.addEventListener('mousedown', (e) => {
    isPrimaryResizing = true;
    document.body.style.cursor = 'ew-resize';
    document.body.classList.add('resizing', 'resizing-primary');
    e.preventDefault();
  });

  panelResizer.addEventListener('mousedown', (e) => {
    isPanelResizing = true;
    document.body.style.cursor = 'ns-resize';
    document.body.classList.add('resizing', 'resizing-panel');
    e.preventDefault();
  });

  document.addEventListener('mousemove', (e) => {
    if (isPrimaryResizing) {
      const activityBarWidth = state.activityBarVisible ? ACTIVITY_BAR_WIDTH : 0;
      const otherSidebarWidth = state.secondarySidebarVisible ? state.secondarySidebarWidth : 0;
      const maxAvailable = window.innerWidth - activityBarWidth - otherSidebarWidth - 11; // Margin for editor gutter

      const newWidth = e.clientX - activityBarWidth;
      // Buffer logic: Visually clamp to 170px (5 characters), but only close if dragged to < 100px
      if (newWidth < 100) {
        state.sidebarVisible = false;
        isPrimaryResizing = false;
        document.body.style.cursor = '';
        render();
        return;
      }
      // UI remains at least 170px broad, and can't push secondary sidebar off-screen
      state.sidebarWidth = Math.max(170, Math.min(newWidth, maxAvailable));
      render();
    }
    if (isSecondaryResizing) {
      const activityBarWidth = state.activityBarVisible ? ACTIVITY_BAR_WIDTH : 0;
      const otherSidebarWidth = state.sidebarVisible ? state.sidebarWidth : 0;
      const maxAvailable = window.innerWidth - activityBarWidth - otherSidebarWidth - 11; // Margin for editor gutter

      const newWidth = window.innerWidth - e.clientX;
      if (newWidth < 100) {
        state.secondarySidebarVisible = false;
        isSecondaryResizing = false;
        document.body.style.cursor = '';
        render();
        return;
      }
      // UI remains at least 324px broad (standard for AI sidebar), and can't push primary sidebar off-screen
      state.secondarySidebarWidth = Math.max(324, Math.min(newWidth, maxAvailable));
      render();
    }

    // --- START: ADD PANEL RESIZING LOGIC ---
    if (isPanelResizing) {
      const newHeight = window.innerHeight - e.clientY - 22; // 22 is status bar height
      state.panelHeight = Math.max(50, Math.min(newHeight, window.innerHeight / 2));
      render();
      // --- START: ADD THIS LINE ---
      // Tell the rest of the app that the panel was dragged
      window.dispatchEvent(new CustomEvent('panel-resized'));
      // --- END: ADD THIS LINE ---
    }
    // --- END: ADD PANEL RESIZING LOGIC ---
  });

  document.addEventListener('mouseup', () => {
    isPrimaryResizing = false;
    // --- START: ADD THIS ---
    isSecondaryResizing = false;
    // --- END: ADD THIS ---
    // --- START: ADD THIS ---
    isPanelResizing = false;
    // --- END: ADD THIS ---
    document.body.style.cursor = '';
    document.body.classList.remove('resizing', 'resizing-primary', 'resizing-secondary', 'resizing-panel');
  });

  // --- START: ADD SECONDARY RESIZER LOGIC ---
  let isSecondaryResizing = false;
  secondarySidebarResizer.addEventListener('mousedown', (e) => {
    isSecondaryResizing = true;
    document.body.style.cursor = 'ew-resize';
    document.body.classList.add('resizing', 'resizing-secondary');
    e.preventDefault();
  });
  // --- END: ADD SECONDARY RESIZER LOGIC ---

  // --- START: ADD WORKSPACE LIFECYCLE LISTENERS ---
  document.addEventListener('workspace-bootstrapped', (e) => {
    const workspace = e.detail;
    console.log('[WorkbenchManager] Workspace bootstrapped:', workspace.path);

    // Force switch to explorer and make sure sidebar is visible
    state.activeView = 'explorer';
    state.sidebarVisible = true;
    state.secondarySidebarVisible = true;

    // Only render if we're not in the middle of a boot sequence
    // or if the preload class has been removed (meaning we're live)
    render();

    // Notify components that might need a resize
    window.dispatchEvent(new CustomEvent('panel-resized'));
  });

  document.addEventListener('workspace-disposed', () => {
    console.log('[WorkbenchManager] Workspace disposed');
    // Optionally switch to a "Home" or "Welcome" view
    state.activeView = 'explorer'; // Exploration view handles "No Folder" display
    render();
    window.dispatchEvent(new CustomEvent('panel-resized'));
  });
  // --- END: ADD WORKSPACE LIFECYCLE LISTENERS ---

  // --- START: TERMINAL AUTO-CLOSE INTEGRATION ---
  /**
   * Listen for panel close requests from terminal.js
   * This fires when the last terminal is killed (VS Code behavior)
   */
  document.addEventListener('close-panel-requested', () => {
    if (state.panelVisible) {
      console.log('[WorkbenchManager] Auto-closing panel (last terminal killed)');
      handlePanelToggle();
    }
  });
  // --- END: TERMINAL AUTO-CLOSE INTEGRATION ---

  // --- Initial Render ---
  render();
  requestAnimationFrame(() => {
    removePreload();
  });
});
