import { EditorGroup } from './components/EditorGroup/index.js';
import { initializeMonaco } from './components/EditorGroup/monaco-setup.js';
import { initializeKeyboardManager } from './core/KeyboardManager.js';
import { workspaceManager } from './core/WorkspaceManager.js';
import { explorerState } from './components/views/ExplorerView/explorer-state.js';
import './core/TooltipManager.js'; // This initializes the manager

// Configure the AMD loader for Monaco
require.config({
  paths: { 'vs': '../../node_modules/monaco-editor/min/vs' }
});

self.MonacoEnvironment = {
  getWorkerUrl: function (moduleId, label) {
    // Correctly reference the AMD path defined above
    const base = '../../node_modules/monaco-editor/min/vs';
    
    if (label === 'json') return `${base}/language/json/json.worker.js`;
    if (label === 'css') return `${base}/language/css/css.worker.js`;
    if (label === 'html') return `${base}/language/html/html.worker.js`;
    if (label === 'typescript' || label === 'javascript') return `${base}/language/typescript/ts.worker.js`;
    
    return `${base}/editor/editor.worker.js`;
  }
};

// Load the main editor module
require(['vs/editor/editor.main'], function () {
  initializeMonaco();
  const editorContainer = document.getElementById('editor-container');
  const editorGroup = new EditorGroup(editorContainer);
  window.editorGroup = editorGroup; // Expose globally for SideBars (like AI) to access active file

  // START: ADD THIS LINE
  initializeKeyboardManager();
  // END: ADD THIS LINE

  // --- REMOVE THE OLD onFileOpened LISTENER ---
  // window.electronAPI.onFileOpened(({ filePath, content }) => { ... });

  document.addEventListener('open-file', (e) => {
    let { filePath, preview, noFocus } = e.detail;

    // --- ADD THIS GUARD ---
    const binaryExts = ['.pdf', '.exe', '.zip', '.dll']; // Add others as needed
    if (filePath && binaryExts.some(ext => filePath.toLowerCase().endsWith(ext))) {
        // If it's a known binary, immediately tell the EditorGroup to show "Not Supported"
        // instead of invoking window.electronAPI.readFile
        if (window.editorGroup) {
            window.editorGroup.openBinaryFile(filePath); 
        }
        return;
    }
    // --- END GUARD ---

    // Resolve relative paths against the open workspace root
    if (filePath && !filePath.match(/^[a-zA-Z]:[\\\\\/]/) && !filePath.startsWith('/')) {
      const rootPath = explorerState.getRootPath?.();
      if (rootPath) {
        filePath = rootPath.replace(/[\\\\\/ ]$/, '').replace(/\/$/, '') + '\\\\' + filePath.replace(/\//g, '\\\\');
      }
    }

    if (!filePath) return;

    // If already open: reload from disk (AI just edited it)
    const alreadyOpen = editorGroup.openFiles.find(f => f.path === filePath);
    if (alreadyOpen) {
      document.dispatchEvent(new CustomEvent('file-content-changed', { detail: { filePath } }));
      if (!noFocus) {
          editorGroup.setActiveFile(filePath);
      }
    } else {
      editorGroup.openFile(filePath, { preview: preview !== false, noFocus: !!noFocus });
    }
  });
  document.addEventListener('open-folder-triggered', async () => {
    await workspaceManager.openFolder();
  });

  // --- START: ADD THESE LISTENERS ---
  // --- START: ADD THESE LISTENERS ---
  const handleNewFile = () => {
    editorGroup.openNewFile();
  };

  // Debounce wrapper to strictly prevent double-invocations within 50ms
  let isOpeningNewFile = false;
  const safeHandleNewFile = () => {
    if (isOpeningNewFile) return;
    isOpeningNewFile = true;
    handleNewFile();
    setTimeout(() => { isOpeningNewFile = false; }, 100);
  };

  document.addEventListener('new-text-file-triggered', safeHandleNewFile);
  // Removed old listeners: new-file-triggered, command-new-file
  // Legacy listener removal (conceptually, by not carrying it over)
  // document.addEventListener('new-file-triggered', handleNewFile); // Removed to fix duplicate tab issue


  document.addEventListener('open-file-triggered', async () => {
    const fileData = await window.electronAPI.openFileDialog();
    if (fileData) {
      editorGroup.openFile(fileData.filePath);
    }
  });

  // START: ADD THIS LISTENER
  document.addEventListener('save-file-triggered', () => {
    editorGroup.saveActiveFile();
  });

  document.addEventListener('save-as-triggered', () => {
    editorGroup.saveActiveFileAs();
  });

  document.addEventListener('save-all-triggered', () => {
    editorGroup.saveAllFiles();
  });

  document.addEventListener('revert-file-triggered', () => {
    editorGroup.revertActiveFile();
  });

  document.addEventListener('close-editor-triggered', () => {
    editorGroup.closeActiveTab();
  });

  document.addEventListener('close-folder-triggered', async () => {
    await workspaceManager.dispose();
  });

  document.addEventListener('close-window-triggered', () => {
    window.electronAPI.closeWindow();
  });

  document.addEventListener('new-window-triggered', () => {
    window.electronAPI.openNewWindow();
  });

  document.addEventListener('exit-triggered', () => {
    window.electronAPI.quitApp();
  });

  // --- START: EDIT MENU ACTIONS ---
  ['undo', 'redo', 'cut', 'copy', 'paste', 'find', 'replace', 'select-all',
    'toggle-line-comment', 'toggle-block-comment'].forEach(action => {
      document.addEventListener(`${action}-triggered`, () => {
        editorGroup.triggerEditorAction(action);
      });
    });
  // --- END: EDIT MENU ACTIONS ---

  // --- START: VIEW/GO MENU ACTIONS ---
  ['command-palette', 'go-to-line', 'go-to-definition'].forEach(action => {
    document.addEventListener(`${action}-triggered`, () => {
      editorGroup.triggerEditorAction(action);
    });
  });
  // --- END: VIEW/GO MENU ACTIONS ---

  // --- START: TERMINAL ACTIONS ---
  document.addEventListener('new-terminal-triggered', () => {
    // Dispatch specifically for the terminal manager to pick up
    document.dispatchEvent(new CustomEvent('terminal:create-new'));
  });
  // --- END: TERMINAL ACTIONS ---
  // END: ADD THIS LISTENER

  // --- END: ADD THESE LISTENERS ---

  // --- START: Search Integration ---
  document.addEventListener('quick-search-triggered', () => {
    import('./components/QuickPick/QuickSearch.js').then(({ quickSearch }) => {
      quickSearch.show();
    });
  });

  document.addEventListener('file-open-requested', (e) => {

    const { filepath, selection } = e.detail;
    editorGroup.openFile(filepath, { selection });
  });
  // --- END: Search Integration ---

  // --- START: CUSTOM TAB EVENTS ---
  document.addEventListener('close-all-tabs', () => {
    editorGroup.closeAllFiles();
  });

  document.addEventListener('close-other-tabs', (e) => {
    editorGroup.closeOtherFiles(e.detail.filePath);
  });

  document.addEventListener('close-tabs-to-right', (e) => {
    editorGroup.closeFilesToRight(e.detail.filePath);
  });

  document.addEventListener('close-saved-tabs', () => {
    editorGroup.closeSavedFiles();
  });
  // --- END: CUSTOM TAB EVENTS ---

  window.electronAPI.rendererReady();
});
