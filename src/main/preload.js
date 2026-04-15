const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  onFileOpened: (callback) => ipcRenderer.on('file-opened', (_event, value) => callback(value)),
  rendererReady: () => ipcRenderer.send('renderer-ready'),

  // --- START: ADD THIS NEW FUNCTION ---
  onFileSystemChange: (callback) => ipcRenderer.on('filesystem-changed', () => callback()),
  // --- END: ADD THIS NEW FUNCTION ---

  // --- START: NEW functions for window controls ---
  minimizeWindow: () => ipcRenderer.send('minimize-window'),
  maximizeWindow: () => ipcRenderer.send('maximize-window'),
  closeWindow: () => ipcRenderer.send('close-window'),
  openNewWindow: () => ipcRenderer.send('open-new-window'),
  quitApp: () => ipcRenderer.send('exit-app'),
  // --- END: NEW functions ---

  getFolderData: (folderPath) => ipcRenderer.invoke('get-folder-data', folderPath),
  // --- START: ADD THESE TWO FUNCTIONS ---
  readFile: (filePath, forceText = false) => ipcRenderer.invoke('read-file', filePath, forceText),
  openFileDialog: () => ipcRenderer.invoke('open-file-dialog'),
  openFolderDialog: () => ipcRenderer.invoke('open-folder-dialog'),

  // START: ADD SAVE FUNCTIONS
  saveFileDialog: (content) => ipcRenderer.invoke('save-file-dialog', content),
  saveFile: (fileData) => ipcRenderer.invoke('save-file', fileData),
  // END: ADD SAVE FUNCTIONS

  // --- START: ADD THESE NEW FUNCTIONS ---
  refreshFolder: () => ipcRenderer.invoke('refresh-folder'),
  readDirectory: (dirPath) => ipcRenderer.invoke('read-directory', dirPath),
  createFile: (filePath) => ipcRenderer.invoke('create-file', filePath),
  createFolder: (folderPath) => ipcRenderer.invoke('create-folder', folderPath),

  // --- START: ADD THIS NEW FUNCTION ---
  deleteItem: (itemPath) => ipcRenderer.invoke('delete-item', itemPath),
  deleteItems: (paths) => ipcRenderer.invoke('delete-items', paths),
  trashItems: (paths) => ipcRenderer.invoke('trash-items', paths),
  // --- END: ADD THIS NEW FUNCTION ---

  // --- START: ADD THIS NEW FUNCTION FOR RENAMING ---
  renameItem: (paths) => ipcRenderer.invoke('rename-item', paths),
  // --- END: ADD THIS NEW FUNCTION ---

  // --- START: ADD NEW FILESYSTEM HELPERS ---
  revealInExplorer: (path) => ipcRenderer.invoke('reveal-in-explorer', path),
  copyItem: (paths) => ipcRenderer.invoke('copy-item', paths),
  // --- END: ADD NEW FILESYSTEM HELPERS ---

  // --- START: ADD THIS NEW FUNCTION ---
  toggleDevTools: () => ipcRenderer.send('toggle-dev-tools'),
  // --- END: ADD THIS NEW FUNCTION ---

  // --- START: ADD RECENT FOLDERS FUNCTIONS ---
  getRecentFolders: () => ipcRenderer.invoke('get-recent-folders'),
  openRecentFolder: (folderPath) => ipcRenderer.invoke('open-recent-folder', folderPath),
  onRecentFolderRemoved: (callback) => ipcRenderer.on('recent-folder-removed', () => callback()),
  // --- END: ADD RECENT FOLDERS FUNCTIONS ---

  // --- START: ADD PTY (TERMINAL) FUNCTIONS ---
  ptyCreate: (data) => ipcRenderer.send('pty-create', data),
  getFileStats: (filePath) => ipcRenderer.invoke('get-file-stats', filePath),
  ptyData: (data) => ipcRenderer.send('pty-data', data),
  ptyResize: (data) => ipcRenderer.send('pty-resize', data),
  ptyKill: (id) => ipcRenderer.send('pty-kill', id),
  ptySendCommand: (data) => ipcRenderer.send('pty-send-command', data),

  onPtyCreated: (callback) => ipcRenderer.on('pty-created', (_event, value) => callback(value)),
  onPtyReply: (callback) => ipcRenderer.on('pty-reply', (_event, value) => callback(value)),
  onPtyKilled: (callback) => ipcRenderer.on('pty-killed', (_event, value) => callback(value)),
  onPtySpawnFailed: (callback) => ipcRenderer.on('pty-spawn-failed', (_event, value) => callback(value)),
  // --- END: ADD PTY (TERMINAL) FUNCTIONS ---

  // --- START: Search ---
  searchRun: (payload) => ipcRenderer.invoke('search:run', payload),
  searchReplace: (payload) => ipcRenderer.invoke('search:replace', payload),
  showConfirmDialog: (options) => ipcRenderer.invoke('show-confirm-dialog', options),
  // --- END: Search ---

  // --- GIT ---
  checkGitRepo: () => ipcRenderer.invoke('git:check-repo'),
  initGitRepo: () => ipcRenderer.invoke('git:init'),
  getGitStatus: () => ipcRenderer.invoke('git:get-status'),
  gitStage: (files) => ipcRenderer.invoke('git:stage', files),
  gitUnstage: (files) => ipcRenderer.invoke('git:unstable', files),
  gitStageAll: () => ipcRenderer.invoke('git:stage-all'),
  gitUnstageAll: () => ipcRenderer.invoke('git:unstage-all'),
  gitDiscard: (files) => ipcRenderer.invoke('git:discard', files),
  gitCommit: (message) => ipcRenderer.invoke('git:commit', message),
  gitPush: () => ipcRenderer.invoke('git:push'),
  gitPull: () => ipcRenderer.invoke('git:pull'),
  gitFetch: () => ipcRenderer.invoke('git:fetch'),
  getGitLog: () => ipcRenderer.invoke('git:get-log'),
  // --- END: GIT ---

  // --- RUN SERVICE ---
  runExecute: (data) => ipcRenderer.invoke('run:execute', data),
  runStop: () => ipcRenderer.invoke('run:stop'),
  onRunOutput: (callback) => {
    const listener = (_event, value) => callback(value);
    ipcRenderer.on('run:output', listener);
    // Return a way to unsubscribe? 
    // Functions returned from preload across context bridge are stripped or limited.
    // We'll trust the caller to manage subscriptions or just add.
  },
  onRunExit: (callback) => ipcRenderer.on('run:exit', (_event, value) => callback(value)),
  // --- END: RUN SERVICE ---



  // --- Workspace ---
  getWorkspaceFiles: () => ipcRenderer.invoke('workspace:get-all-files'),
  // --- END: Workspace ---

  openExternal: (url) => ipcRenderer.send('open-external', url),

  // --- AI ---
  aiStream: (data) => ipcRenderer.send('ai:stream', data),
  aiAbort: (requestId) => ipcRenderer.send('ai:abort', requestId),
  aiTranscribe: (audioBuffer) => ipcRenderer.invoke('ai:transcribe', audioBuffer),
  onAiChunk: (requestId, callback) => {
    const listener = (_event, chunk) => callback(chunk);
    ipcRenderer.on(`ai:chunk:${requestId}`, listener);
    return listener;
  },
  onAiDone: (requestId, callback) => {
    const listener = () => callback();
    ipcRenderer.on(`ai:done:${requestId}`, listener);
    return listener;
  },
  onAiError: (requestId, callback) => {
    const listener = (_event, error) => callback(error);
    ipcRenderer.on(`ai:error:${requestId}`, listener);
    return listener;
  },
  offAiChunk: (requestId, listener) => ipcRenderer.removeListener(`ai:chunk:${requestId}`, listener),
  offAiDone: (requestId, listener) => ipcRenderer.removeListener(`ai:done:${requestId}`, listener),
  offAiError: (requestId, listener) => ipcRenderer.removeListener(`ai:error:${requestId}`, listener),
  onAiToolStart: (requestId, callback) => {
    const listener = (_event, data) => callback(data);
    ipcRenderer.on(`ai:tool-start:${requestId}`, listener);
    return listener;
  },
  onAiToolUpdate: (requestId, callback) => {
    const listener = (_event, data) => callback(data);
    ipcRenderer.on(`ai:tool-update:${requestId}`, listener);
    return listener;
  },
  onAiToolResult: (requestId, callback) => {
    const listener = (_event, data) => callback(data);
    ipcRenderer.on(`ai:tool-result:${requestId}`, listener);
    return listener;
  },
  offAiToolStart: (requestId, listener) => ipcRenderer.removeListener(`ai:tool-start:${requestId}`, listener),
  offAiToolUpdate: (requestId, listener) => ipcRenderer.removeListener(`ai:tool-update:${requestId}`, listener),
  offAiToolResult: (requestId, listener) => ipcRenderer.removeListener(`ai:tool-result:${requestId}`, listener),
  onAiStatus: (requestId, callback) => {
    const listener = (_event, data) => callback(data);
    ipcRenderer.on(`ai:status:${requestId}`, listener);
    return listener;
  },
  offAiStatus: (requestId, listener) => ipcRenderer.removeListener(`ai:status:${requestId}`, listener),
  aiContinue: (requestId) => ipcRenderer.send('ai:continue', requestId),
  aiClearHistory: () => ipcRenderer.send('ai:clear-history'),
  saveTempImage: (buffer) => ipcRenderer.invoke('save-temp-image', buffer),
  aiEditsGetSession: (sessionId) => ipcRenderer.invoke('ai:edits:get-session', sessionId),
  aiEditsGetVirtualContent: (filePath) => ipcRenderer.invoke('ai:edits:get-virtual-content', filePath),
  aiEditsAcceptSession: (sessionId) => ipcRenderer.invoke('ai:edits:accept-session', sessionId),
  aiEditsRejectSession: (sessionId) => ipcRenderer.invoke('ai:edits:reject-session', sessionId),
  // --- END: AI ---

  // --- LIVE SERVER ---
  startLiveServer: (projectPath, activeFilePath) => ipcRenderer.invoke('live-server:start', projectPath, activeFilePath),
  stopLiveServer: () => ipcRenderer.invoke('live-server:stop'),
  getLiveServerPort: () => ipcRenderer.invoke('live-server:get-port'),
  triggerLiveReload: () => ipcRenderer.invoke('live-server:reload'),
  // --- END: LIVE SERVER ---
});
