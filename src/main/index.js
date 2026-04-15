const { app, BrowserWindow, Menu, dialog, ipcMain, shell, nativeImage } = require('electron');
const path = require('node:path');
const fs = require('node:fs');
const chokidar = require('chokidar'); // [ADD THIS LINE]
const os = require('os');
const pty = require('node-pty');
const crypto = require('crypto');
const axios = require('axios');

// Load environment variables
require('dotenv').config();

// Live Server Service
const liveServer = require('./services/liveServer/server');



let mainWindow;
let initialFileToOpen = null;
let rendererReady = false;

// --- START: ADD THIS VARIABLE ---
let currentOpenFolderPath = null;
// --- END: ADD THIS VARIABLE ---

// --- START: ADD THIS VARIABLE ---
let fileWatcher = null; // To hold the chokidar instance
// --- END: ADD THIS VARIABLE ---

// Determine the correct shell for the OS
const ptyShell = process.platform === 'win32' ? 'powershell.exe' : 'bash';
const shellArgs = process.platform === 'win32' ? ['-NoLogo'] : [];

// Use a Map to store all active pty processes by a unique ID
const ptyProcesses = new Map();

// Add a global uncaught exception handler as a safety net for EPIPE errors
process.on('uncaughtException', (err) => {
  if (err.code === 'EPIPE' || err.message.includes('read EPIPE')) {
    // This is likely a pty process dying and is safe to ignore.
  } else {
    // For all other errors, log them
    console.error('Uncaught Exception:', err);
  }
});

// --- START: ADD RECENT FOLDERS LOGIC ---
const recentFoldersPath = path.join(app.getPath('userData'), 'recent-folders.json');
let recentFolders = [];

function loadRecentFolders() {
  try {
    if (fs.existsSync(recentFoldersPath)) {
      const data = fs.readFileSync(recentFoldersPath, 'utf-8');
      recentFolders = JSON.parse(data);
    }
  } catch (error) {
    console.error('Failed to load recent folders:', error);
    recentFolders = []; // Reset on error
  }
}

function saveRecentFolders() {
  try {
    fs.writeFileSync(recentFoldersPath, JSON.stringify(recentFolders, null, 2));
  } catch (error) {
    console.error('Failed to save recent folders:', error);
  }
}

function addFolderToRecents(folderPath) {
  const index = recentFolders.indexOf(folderPath);
  if (index > -1) {
    recentFolders.splice(index, 1);
  }
  recentFolders.unshift(folderPath);
  if (recentFolders.length > 9) { // Keep only the 9 most recent
    recentFolders = recentFolders.slice(0, 9);
  }
  saveRecentFolders();
}
// --- END: ADD RECENT FOLDERS LOGIC ---

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    // THE FIX IS HERE: Add the icon option
    icon: path.join(__dirname, '../../assets/icons/taskbar_logo.png'),

    // --- START: NEW CHANGES ---
    frame: false,
    titleBarStyle: 'hidden',
    // --- START: MODIFICATION ---
    // Replace the boolean with a style object
    titleBarOverlay: {
      color: '#222427', // Matching the new title bar color
      symbolColor: '#cccccc', // Sets the color of the -, 🗖, and X symbols
      height: 35 // Ensures the draggable area matches your CSS height
    },
    // --- END: MODIFICATION ---
    // --- END: NEW CHANGES ---

    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      webviewTag: true,
    },
    backgroundColor: '#1a1b1d', // Prevent white flash on startup
    show: false, // Don't show until ready-to-show to prevent initial visual jump
  });

  mainWindow.maximize(); // Maximize first
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // --- START: ALLOW FRAMING BY STRIPPING RESTRICTIVE HEADERS ---
  const { session } = require('electron');
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    const responseHeaders = { ...details.responseHeaders };

    // Remove headers that prevent framing
    delete responseHeaders['X-Frame-Options'];
    delete responseHeaders['x-frame-options'];
    delete responseHeaders['content-security-policy'];
    delete responseHeaders['Content-Security-Policy'];

    callback({
      cancel: false,
      responseHeaders
    });
  });
  // --- END: ALLOW FRAMING ---

  mainWindow.loadFile('src/renderer/index.html');

  // Clean up all pty processes on window close
  mainWindow.on('closed', () => {
    for (const [id, ptyProcess] of ptyProcesses.entries()) {
      ptyProcess.kill();
    }
    ptyProcesses.clear();
  });

  const isMac = process.platform === 'darwin';

  const menuTemplate = [
    {
      label: 'File',
      submenu: [
        {
          label: 'Open File...',
          accelerator: 'CmdOrCtrl+O',
          click: async () => {
            const { filePaths } = await dialog.showOpenDialog({ properties: ['openFile'] });

            if (filePaths && filePaths.length > 0) {
              const filePath = filePaths[0];
              const content = fs.readFileSync(filePath, 'utf-8');

              if (rendererReady) {
                mainWindow.webContents.send('file-opened', { filePath, content });
              } else {
                initialFileToOpen = { filePath, content };
              }
            }
          },
        },
        { type: 'separator' },
        { role: 'quit' },
      ],
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'delete' },
        { role: 'selectAll' },
      ],
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' },
      ],
    },
    {
      label: 'Window',
      submenu: [
        { role: 'minimize' },
        { role: 'zoom' },
        ...(isMac
          ? [
            { type: 'separator' },
            { role: 'front' },
            { type: 'separator' },
            { role: 'window' },
          ]
          : [{ role: 'close' }]),
      ],
    },
    {
      role: 'help',
      submenu: [
        {
          label: 'Learn More',
          click: async () => {
            const { shell } = require('electron');
            await shell.openExternal('https://electronjs.org');
          },
        },
      ],
    },
  ];

  const menu = Menu.buildFromTemplate(menuTemplate);
  Menu.setApplicationMenu(menu);


}

ipcMain.on('renderer-ready', () => {
  rendererReady = true;
  if (initialFileToOpen) {
    mainWindow.webContents.send('file-opened', initialFileToOpen);
    initialFileToOpen = null;
  }
});

// --- START: NEW listeners for window controls ---
ipcMain.on('minimize-window', () => {
  if (mainWindow) mainWindow.minimize();
});

ipcMain.on('maximize-window', () => {
  if (mainWindow) {
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow.maximize();
    }
  }
});

ipcMain.on('close-window', () => {
  if (mainWindow) mainWindow.close();
});

ipcMain.on('open-new-window', () => {
  createWindow();
});

ipcMain.on('exit-app', () => {
  app.quit();
});
// --- END: NEW listeners ---

// --- START: ADD THIS RECURSIVE FUNCTION ---
/**
 * Reads a directory (non-recursive) and returns its immediate children.
 * @param {string} dirPath The path to the directory.
 * @returns {object | null}
 */
function readDir(dirPath) {
  try {
    const items = fs.readdirSync(dirPath);
    const children = items.map(item => {
      const fullPath = path.join(dirPath, item);
      try {
        const stats = fs.statSync(fullPath);
        return {
          name: item,
          path: fullPath,
          type: stats.isDirectory() ? 'folder' : 'file',
          // For folders, we'll mark them as not-yet-loaded by setting children to null
          ...(stats.isDirectory() ? { children: null } : {}),
        };
      } catch (e) {
        return null; // Skip items we can't access
      }
    }).filter(Boolean);

    children.sort((a, b) => {
      if (a.type === 'folder' && b.type === 'file') return -1;
      if (a.type === 'file' && b.type === 'folder') return 1;
      return a.name.localeCompare(b.name);
    });

    // Handle drive roots (e.g., C:\) where basename is empty
    let name = path.basename(dirPath);
    if (!name && dirPath.includes(':')) {
      name = dirPath;
    }

    return {
      name: name || dirPath,
      path: dirPath,
      type: 'folder',
      children: children,
    };
  } catch (error) {
    console.error(`[Explorer] Error reading directory ${dirPath}:`, error);
    return null;
  }
}
// --- END: ADD THIS RECURSIVE FUNCTION ---


// --- START: NEW WORKSPACE LIFECYCLE LOGIC ---
function initializeWorkspace(folderPath) {
  if (!folderPath) return null;

  addFolderToRecents(folderPath);
  currentOpenFolderPath = folderPath;

  if (fileWatcher) {
    fileWatcher.close();
  }

  fileWatcher = chokidar.watch(folderPath, {
    ignored: /(^|[\/\\])\../,
    persistent: true,
    ignoreInitial: true,
  });

  fileWatcher
    .on('add', path => mainWindow.webContents.send('filesystem-changed'))
    .on('addDir', path => mainWindow.webContents.send('filesystem-changed'))
    .on('unlink', path => mainWindow.webContents.send('filesystem-changed'))
    .on('unlinkDir', path => mainWindow.webContents.send('filesystem-changed'));

  console.log(`[Workspace] Initializing for: ${folderPath}`);
  return readDir(folderPath);
}

ipcMain.handle('open-folder-dialog', async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory']
  });

  if (canceled || filePaths.length === 0) {
    return null;
  }

  return { folderPath: filePaths[0] };
});

ipcMain.handle('get-folder-data', async (event, folderPath) => {
  if (!folderPath) {
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openDirectory']
    });
    if (result.canceled || result.filePaths.length === 0) return null;
    folderPath = result.filePaths[0];
  }

  return initializeWorkspace(folderPath);
});
// --- END: NEW WORKSPACE LIFECYCLE LOGIC ---

ipcMain.handle('read-directory', async (event, dirPath) => {
  return readDir(dirPath);
});

// --- NEW HANDLER FOR FILE STATS ---
ipcMain.handle('get-file-stats', async (event, filePath) => {
  try {
      return fs.statSync(filePath);
  } catch (error) {
      return { size: 0 };
  }
});
// --- END: ADD THIS IPC HANDLER ---

// --- START: ADD THESE NEW IPC HANDLERS ---
ipcMain.handle('read-file', async (event, filePath, forceText = false) => {
  try {
    const ext = path.extname(filePath).toLowerCase();
    
    // 1. IMMEDIATE SHORT-CIRCUIT FOR BINARY FILES
    // Adding common binary extensions that should never be read as text
    const binaryExtensions = ['.pdf', '.exe', '.dll', '.zip', '.png', '.jpg', '.jpeg', '.gif', '.mp3', '.mp4'];
    
    if (binaryExtensions.includes(ext) && !forceText) {
       // Return immediately without reading any data
       return { path: filePath, content: '', isBinary: true };
    }

    const docExtensions = ['.docx', '.doc', '.pptx', '.ppt'];

    // 2. Specialized Document Extraction (Keep existing logic)
    if (docExtensions.includes(ext)) {
      try {
        const { parseDocument } = require('./ai/parsers/DocumentParser');
        const content = await parseDocument(filePath);
        return { path: filePath, content, isBinary: false };
      } catch (parseError) {
        return { path: filePath, content: `[Error: ${parseError.message}]`, isBinary: false };
      }
    }

    // 3. Optimized Reading for potential large text files
    const buffer = fs.readFileSync(filePath);

    if (!forceText) {
      let isBinary = false;
      // Only check the first 8KB to determine if it's binary (VS Code standard)
      const checkLength = Math.min(buffer.length, 8192);
      for (let i = 0; i < checkLength; i++) {
        if (buffer[i] === 0) {
          isBinary = true;
          break;
        }
      }

      if (isBinary) {
        return { path: filePath, content: '', isBinary: true };
      }
    }

    const content = buffer.toString('utf-8');
    return { path: filePath, content, isBinary: false };
  } catch (error) {
    console.error(`Error reading file ${filePath}:`, error);
    return null;
  }
});

ipcMain.handle('open-file-dialog', async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile']
  });
  if (canceled || filePaths.length === 0) {
    return null;
  }
  const filePath = filePaths[0];
  const content = fs.readFileSync(filePath, 'utf-8');
  return { filePath, content };
});

// START: ADD SAVE HANDLERS
ipcMain.handle('save-file-dialog', async (event, content) => {
  const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, {
    title: 'Save File',
    defaultPath: currentOpenFolderPath || app.getPath('documents'),
  });

  if (canceled || !filePath) {
    return null;
  }

  try {
    fs.writeFileSync(filePath, content, 'utf-8');
    return filePath;
  } catch (error) {
    console.error(`Error saving file ${filePath}:`, error);
    return null;
  }
});

ipcMain.handle('save-file', async (event, { filePath, content }) => {
  try {
    fs.writeFileSync(filePath, content, 'utf-8');
    return { success: true };
  } catch (error) {
    console.error(`Error saving file ${filePath}:`, error);
    return { success: false, error };
  }
});
// END: ADD SAVE HANDLERS

// --- END: ADD THESE NEW IPC HANDLERS ---

// --- START: ADD THIS IPC HANDLER ---
ipcMain.handle('refresh-folder', async () => {
  if (currentOpenFolderPath) {
    const fileTree = readDir(currentOpenFolderPath);
    return fileTree;
  }
  return null;
});
// --- END: ADD THIS IPC HANDLER ---

// --- START: ADD THESE NEW IPC HANDLERS FOR CREATING FILES/FOLDERS ---
ipcMain.handle('create-file', async (event, filePath) => {
  try {
    fs.writeFileSync(filePath, '', 'utf-8');
    return { success: true, path: filePath };
  } catch (error) {
    console.error(`Error creating file ${filePath}:`, error);
    return { success: false, error };
  }
});

ipcMain.handle('create-folder', async (event, folderPath) => {
  try {
    if (!fs.existsSync(folderPath)) {
      fs.mkdirSync(folderPath);
      return { success: true, path: folderPath };
    }
    return { success: false, error: 'Folder already exists.' };
  } catch (error) {
    console.error(`Error creating folder ${folderPath}:`, error);
    return { success: false, error };
  }
});
// --- END: ADD THESE NEW IPC HANDLERS ---

// --- START: ADD THIS NEW IPC HANDLER ---
let skipConfirmDeletion = false;

ipcMain.handle('delete-item', async (event, itemPath) => {
  try {
    if (skipConfirmDeletion) {
      await shell.trashItem(itemPath);
      return { success: true };
    }

    const itemName = path.basename(itemPath);
    const { response, checkboxChecked } = await dialog.showMessageBox(mainWindow, {
      type: 'none',
      title: 'Visual Studio Code',
      message: `Are you sure you want to delete '${itemName}'?`,
      detail: 'You can restore this file from the Recycle Bin.',
      buttons: ['Move to Recycle Bin', 'Cancel'],
      defaultId: 0,
      cancelId: 1,
      checkboxLabel: 'Do not ask me again',
      checkboxChecked: false
    });

    if (response === 0) { // User clicked 'Move to Recycle Bin'
      if (checkboxChecked) skipConfirmDeletion = true;
      await shell.trashItem(itemPath);
      return { success: true };
    } else {
      return { success: false, canceled: true }; // User canceled
    }
  } catch (error) {
    console.error(`Error moving item to trash ${itemPath}:`, error);
    return { success: false, error };
  }
});

ipcMain.handle('trash-items', async (event, itemPaths) => {
  try {
    if (!itemPaths || itemPaths.length === 0) return { success: false };
    for (const p of itemPaths) {
      await shell.trashItem(p);
    }
    return { success: true };
  } catch (error) {
    console.error(`Error trashing items:`, error);
    return { success: false, error };
  }
});

ipcMain.handle('delete-items', async (event, itemPaths) => {
  try {
    if (!itemPaths || itemPaths.length === 0) return { success: false, error: 'No items provided' };

    let message = '';
    let detail = '';

    if (itemPaths.length === 1) {
      const itemName = path.basename(itemPaths[0]);
      message = `Are you sure you want to delete '${itemName}'?`;
      detail = 'You can restore this file from the Recycle Bin.';
    } else {
      message = `Are you sure you want to delete the following ${itemPaths.length} files?`;
      detail = 'You can restore these files from the Recycle Bin.';
    }

    const { response } = await dialog.showMessageBox(mainWindow, {
      type: 'none', 
      title: 'Visual Studio Code', 
      message: message,
      detail: detail,
      buttons: ['Move to Recycle Bin', 'Cancel'],
      defaultId: 0,
      cancelId: 1
    });

    if (response === 0) {
      for (const p of itemPaths) {
        await shell.trashItem(p);
      }
      return { success: true };
    }
    return { success: false, canceled: true };
  } catch (error) {
    console.error(`Error deleting items:`, error);
    return { success: false, error };
  }
});
// --- END: ADDED IPC HANDLERS ---

// --- START: ADD THIS NEW IPC HANDLER ---
ipcMain.handle('rename-item', async (event, { oldPath, newPath }) => {
  try {
    fs.renameSync(oldPath, newPath);
    return { success: true, newPath };
  } catch (error) {
    console.error(`Error renaming item from ${oldPath} to ${newPath}:`, error);
    return { success: false, error };
  }
});
// --- END: ADD THIS NEW IPC HANDLER ---

// --- START: ADD REVEAL IN EXPLORER HANDLER ---
ipcMain.handle('reveal-in-explorer', async (event, itemPath) => {
  shell.showItemInFolder(itemPath);
});
// --- END: ADD REVEAL IN EXPLORER HANDLER ---

// --- START: ADD COPY ITEM HANDLER ---
ipcMain.handle('copy-item', async (event, { sourcePath, destPath }) => {
  try {
    // Simple file copy for now. For folders, we'd need recursive copy (fs.cp in Node 16+)
    // Checking if it's a directory
    const stats = fs.statSync(sourcePath);
    if (stats.isDirectory()) {
      fs.cpSync(sourcePath, destPath, { recursive: true });
    } else {
      fs.copyFileSync(sourcePath, destPath);
    }
    return { success: true };
  } catch (error) {
    console.error(`Error copying item: ${error}`);
    return { success: false, error: error.message };
  }
});
// --- END: ADD COPY ITEM HANDLER ---

ipcMain.on('open-external', (event, url) => {
  shell.openExternal(url);
});

// --- START: ADD THIS NEW IPC HANDLER ---
ipcMain.on('toggle-dev-tools', () => {
  if (mainWindow) {
    // THE FIX IS HERE: Use openDevTools with the 'undocked' mode
    if (mainWindow.webContents.isDevToolsOpened()) {
      mainWindow.webContents.closeDevTools();
    } else {
      mainWindow.webContents.openDevTools({ mode: 'undocked' });
    }
  }
});
// --- END: ADD THIS NEW IPC HANDLER ---

// --- START: ADD RECENT FOLDERS IPC ---
ipcMain.handle('get-recent-folders', () => {
  return recentFolders;
});

ipcMain.handle('open-recent-folder', async (event, folderPath) => {
  if (!fs.existsSync(folderPath)) {
    recentFolders = recentFolders.filter(p => p !== folderPath);
    saveRecentFolders();
    dialog.showErrorBox('Folder Not Found', `The folder "${folderPath}" could not be found.`);
    mainWindow.webContents.send('recent-folder-removed'); // Notify renderer
    return null;
  }

  return initializeWorkspace(folderPath);
});
// --- END: ADD RECENT FOLDERS IPC ---

ipcMain.handle('show-confirm-dialog', async (event, options) => {
  const result = await dialog.showMessageBox(mainWindow, {
    type: options.type || 'info',
    title: options.title || 'Confirm',
    message: options.message || 'Are you sure?',
    detail: options.detail,
    buttons: options.buttons || ['OK', 'Cancel'],
    defaultId: options.defaultId || 0,
    cancelId: options.cancelId || 1,
    noLink: options.noLink,
  });
  return result;
});

// --- START: PTY Process Management ---

// 1. Listen for a request to CREATE a new terminal
ipcMain.on('pty-create', (event, data = {}) => {
  const { isSplit = false, parentId = null, cwd } = data;
  const id = crypto.randomUUID(); // Generate a unique ID
  const defaultCwd = os.homedir() || process.cwd();
  let spawnCwd = cwd || currentOpenFolderPath || defaultCwd;

  // Normalize path for Windows
  if (process.platform === 'win32') {
    spawnCwd = path.resolve(spawnCwd);
  }

  console.log(`[PTY] Creating terminal ${id} within shell ${ptyShell} in ${spawnCwd} (Split: ${isSplit})`);

  // Create a clean environment for the PTY
  const ptyEnv = { ...process.env };
  // Filter out Electron-specific variables that might confuse the child process
  Object.keys(ptyEnv).forEach(key => {
    if (key.startsWith('ELECTRON_')) {
      delete ptyEnv[key];
    }
  });

  try {
    const ptyProcess = pty.spawn(ptyShell, shellArgs, {
      name: 'xterm-256color', // Better color support
      cols: 80,
      rows: 30,
      cwd: spawnCwd,
      env: ptyEnv,
    });

    console.log(`[PTY] Spawning successful for ${id}`);

    // Store the new process
    ptyProcesses.set(id, ptyProcess);

    // Send PTY data TO the renderer (xterm.js) *with its ID*
    ptyProcess.onData((data) => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('pty-reply', { id, data });
      }
    });

    // Handle PTY exit
    ptyProcess.onExit(({ exitCode, signal }) => {
      console.log(`[PTY] Terminal ${id} exited with code ${exitCode}`);
      ptyProcesses.delete(id);
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('pty-killed', id);
      }
    });

    // Handle PTY errors
    ptyProcess.on('error', (err) => {
      console.error(`[PTY] Error in terminal ${id}:`, err);
    });

    // Notify the renderer that the new PTY is ready
    mainWindow.webContents.send('pty-created', { id, shell: ptyShell, isSplit, parentId });
  } catch (err) {
    console.error(`[PTY] Failed to spawn PTY process ${id}:`, err);
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('pty-spawn-failed', { id, error: err.message });
    }
  }
});

// 2. Listen for data FROM the renderer (xterm.js)
ipcMain.on('pty-data', (event, { id, data }) => {
  const ptyProcess = ptyProcesses.get(id);
  if (ptyProcess) {
    // Wrap write() in a try...catch block
    try {
      ptyProcess.write(data);
    } catch (err) {
      // This can happen if the process was killed just before a write.
    }
  }
});

// 3. Listen for resize events from renderer
ipcMain.on('pty-resize', (event, { id, size }) => {
  const ptyProcess = ptyProcesses.get(id);
  if (ptyProcess) {
    ptyProcess.resize(size.cols, size.rows);
  }
});

// 4. Listen for a request to KILL a terminal
ipcMain.on('pty-kill', (event, id) => {
  const ptyProcess = ptyProcesses.get(id);
  if (ptyProcess) {
    ptyProcess.kill();
  }
});

// 5. Modular Command Execution: Send a specific command to a PTY
ipcMain.on('pty-send-command', (event, { id, command }) => {
  const ptyProcess = ptyProcesses.get(id);
  if (ptyProcess) {
    try {
      ptyProcess.write(`${command}\r`);
    } catch (err) {
      console.error('Failed to send command to PTY:', err);
    }
  }
});
// --- END: PTY Process Management ---

// --- Search & Replace IPC ---
ipcMain.handle("search:run", (_, payload) => {
  return require("./search/searchEngine")(payload);
});
ipcMain.handle("search:replace", (_, payload) => {
  return require("./search/replaceEngine")(payload);
});
ipcMain.handle("workspace:get-all-files", () => {
  if (!currentOpenFolderPath) return [];
  return require("./search/fileWalker")(currentOpenFolderPath);
});
// ----------------------------


// --- GIT IPC ---
const gitService = require('./services/GitService');

ipcMain.handle('git:check-repo', async (event, folderPath) => {
  return await gitService.isRepo(folderPath || currentOpenFolderPath);
});

ipcMain.handle('git:init', async (event, folderPath) => {
  return await gitService.initRepo(folderPath || currentOpenFolderPath);
});

ipcMain.handle('git:get-status', async (event, folderPath) => {
  return await gitService.getStatus(folderPath || currentOpenFolderPath);
});

ipcMain.handle('git:stage', async (event, files) => {
  return await gitService.stage(currentOpenFolderPath, files);
});

ipcMain.handle('git:unstage', async (event, files) => {
  return await gitService.unstage(currentOpenFolderPath, files);
});

ipcMain.handle('git:stage-all', async (event) => {
  return await gitService.stageAll(currentOpenFolderPath);
});

ipcMain.handle('git:unstage-all', async (event) => {
  return await gitService.unstageAll(currentOpenFolderPath);
});

ipcMain.handle('git:discard', async (event, files) => {
  return await gitService.discardChanges(currentOpenFolderPath, files);
});

ipcMain.handle('git:commit', async (event, message) => {
  return await gitService.commit(currentOpenFolderPath, message);
});

ipcMain.handle('git:push', async (event) => {
  return await gitService.push(currentOpenFolderPath);
});

ipcMain.handle('git:pull', async (event) => {
  return await gitService.pull(currentOpenFolderPath);
});

ipcMain.handle('git:fetch', async (event) => {
  return await gitService.fetch(currentOpenFolderPath);
});

ipcMain.handle('git:get-log', async (event) => {
  return await gitService.getLog(currentOpenFolderPath);
});
// ----------------------------

const aiManager = require('./ai/AIManager');
const { globalToolManager } = require('./ai/tools/ToolManager');
const { getSystemPrompt } = require('./ai/system/SystemManager');
const { globalContextManager } = require('./ai/context/ContextManager');
const abortControllers = new Map();
const partiallyFulfilledRequests = new Set();

const isCasual = (input) => {
  const casualWords = ["hi", "hello", "hey", "cool", "ok", "nice", "thanks", "wow", "got it", "nice 👍", "👍"];
  return casualWords.includes(input.toLowerCase().trim());
};

// New Helper to load elite skills
async function getEliteSkills() {
    const skillsPath = path.join(__dirname, 'ai/system/skills.md');
    if (fs.existsSync(skillsPath)) {
        return fs.readFileSync(skillsPath, 'utf-8');
    }
    return "";
}

ipcMain.on('ai:clear-history', () => {
  globalContextManager.clear();
  console.log("[AI] User cleared Chat History.");
});

ipcMain.on('ai:stream', async (event, { requestId, provider, prompt, context, options }) => {
  const controller = new AbortController();
  abortControllers.set(requestId, controller);
  
  // Use ToolManager to get schemas
  const availableTools = globalToolManager.getToolSchemas();
  const activeTools = isCasual(prompt) ? [] : availableTools;

  try {
    // Add current user prompt to history
    globalContextManager.addUser(prompt);
    
    let iteration = 0;
    const maxIterations = 20;

    while (iteration < maxIterations) {
      iteration++;

      // Summarize at step 10 to keep context fresh
      if (iteration === 10) {
        console.log(`[AI] Deep summary triggered at iteration 10 for ${requestId}`);
        await globalContextManager.trimHistory();
      }

      // Checkpoint at step 15 - Ask for permission to continue
      if (iteration === 15) {
        if (!mainWindow.isDestroyed()) {
          mainWindow.webContents.send(`ai:status:${requestId}`, {
            message: "I've taken 15 steps. I'm still working on the task. Should I continue?",
            requiresPermission: true
          });
        }

        // Pause the loop until user clicks "Continue"
        await new Promise((resolve) => {
          const continueHandler = (event, rId) => {
            if (rId === requestId) {
              ipcMain.removeListener('ai:continue', continueHandler);
              resolve();
            }
          };
          ipcMain.on('ai:continue', continueHandler);
          
          // Also handle if user aborts the request while waiting
          controller.signal.addEventListener('abort', () => {
             ipcMain.removeListener('ai:continue', continueHandler);
             resolve();
          }, { once: true });
        });

        if (controller.signal.aborted) break;
      }
      
      let currentResult = null;

      // NEW: Elite Skill Injection Architecture
      const devKeywords = [
          'build', 'create', 'website', 'app', 'ui', 'frontend', 'design', 'make',
          'landing page', 'dashboard', 'portfolio', 'modern', 'beautiful', 'interface', 
          'react', 'next.js', 'ecommerce', 'e-commerce', 'saas', 'business', 'startup'
      ];
      const isBuilding = devKeywords.some(kw => prompt.toLowerCase().includes(kw));

      let systemPrompt = getSystemPrompt(); // Load base system_prompt.md
      
      if (isBuilding) {
          const eliteSkills = await getEliteSkills();
          // Inject elite skills at the top of the context for maximum priority
          systemPrompt = `${eliteSkills}\n\n${systemPrompt}`;
          console.log(`[AI] Injected Elite Engineering Skills for request ${requestId}`);
      }

      // Build context-aware messages list
      // Modified: Accept custom systemPrompt
      const messages = await globalContextManager.buildMessages(prompt, context, systemPrompt);

      let partialText = '';
      let streamBuffer = ''; // Buffer for tag detection
      let streamThinking = false;

      try {
        currentResult = await aiManager.stream(
          provider,
          null, // All content is in messages
          { ...options, messages: messages, tools: activeTools },
          (chunk) => {
            if (!mainWindow.isDestroyed()) {
              streamBuffer += chunk;
              
              let outputChunk = '';
              while (streamBuffer.length > 0) {
                if (!streamThinking) {
                  const thinkStartIdx = streamBuffer.indexOf('<think>');
                  if (thinkStartIdx !== -1) {
                    // We found the start tag. Send everything before it.
                    outputChunk += streamBuffer.substring(0, thinkStartIdx);
                    streamThinking = true;
                    // Shrink the buffer to everything after <think>
                    streamBuffer = streamBuffer.substring(thinkStartIdx + 7);
                  } else {
                    /** 
                     * Check for partial tag at the end of the buffer. 
                     * We don't want to output the start of a tag like "<thi"
                     */
                    const potentialTagStart = streamBuffer.lastIndexOf('<');
                    if (potentialTagStart !== -1 && '<think>'.startsWith(streamBuffer.substring(potentialTagStart))) {
                        // Output everything before the potential tag start
                        outputChunk += streamBuffer.substring(0, potentialTagStart);
                        // Only keep the potential tag in the buffer
                        streamBuffer = streamBuffer.substring(potentialTagStart);
                        break; 
                    } else {
                        // No tags or potential tags, send it all
                        outputChunk += streamBuffer;
                        streamBuffer = '';
                    }
                  }
                } else {
                  // We are in thinking mode, look for end tag
                  const thinkEndIdx = streamBuffer.indexOf('</think>');
                  if (thinkEndIdx !== -1) {
                    streamThinking = false;
                    // Skip the think content and tag, look for more output
                    streamBuffer = streamBuffer.substring(thinkEndIdx + 8);
                  } else {
                    /**
                     * Check for partial end tag like "</thi"
                     */
                    const potentialEndTagStart = streamBuffer.lastIndexOf('</');
                    if (potentialEndTagStart !== -1 && '</think>'.startsWith(streamBuffer.substring(potentialEndTagStart))) {
                        // Keep only the potential end tag in the buffer
                        streamBuffer = streamBuffer.substring(potentialEndTagStart);
                        break;
                    } else {
                        // Not an end tag and not a partial one, just dump it from buffer (we ignore it because we're thinking)
                        streamBuffer = '';
                    }
                  }
                }
              }

              if (outputChunk && !mainWindow.isDestroyed()) {
                partialText += outputChunk;
                mainWindow.webContents.send(`ai:chunk:${requestId}`, outputChunk);
              }
            }
          },
          controller.signal,
          context
        );
      } catch (err) {
        if (err.name === 'AbortError' || err.message === 'canceled' || err.code === 'ERR_CANCELED' || axios.isCancel(err)) {
          console.log(`[AI] Interrupted turn for ${requestId}. Saving progress...`);
          // Mark in history so next model knows this turn was cut off
          if (partialText.trim().length > 0) {
            globalContextManager.addAssistant(partialText + "\n\n[Interrupted by User]");
            partiallyFulfilledRequests.add(requestId);
          }
          break;
        }
        throw err;
      }

      if (!currentResult) break;

      const { text, tool_calls } = currentResult;
      
      // Save assistant response to history
      globalContextManager.addAssistant(text, tool_calls);

      if (!tool_calls || tool_calls.length === 0) {
        break; 
      }

      // Process tools
      for (const toolCall of tool_calls) {
        if (controller.signal.aborted) break;

        const { name, arguments: argsJson } = toolCall.function;
        let args = {};
        try { args = JSON.parse(argsJson); } catch (e) {}

        if (!mainWindow.isDestroyed()) {
          mainWindow.webContents.send(`ai:tool-start:${requestId}`, { name, args, toolCallId: toolCall.id });
        }

        const result = await globalToolManager.execute(name, { ...args, rootPath: context?.workspace?.root, requestId, toolCallId: toolCall.id });

        if (!mainWindow.isDestroyed()) {
          mainWindow.webContents.send(`ai:tool-result:${requestId}`, {
            name,
            args,
            toolCallId: toolCall.id,
            result: result.text,
            data: result.data
          });
        }

        // Add tool result to history
        globalContextManager.addToolResult(toolCall.id, name, result.text);

        // Add a smooth visual delay so rapid agent tools display clearly in the UI
        await new Promise(resolve => setTimeout(resolve, 1500));

        // After every file-touching tool, ensure we trigger a reload for the user
        if (['write_file', 'edit_file', 'terminal_run', 'imageGen_tool'].includes(name)) {
            const { triggerReload } = require('./services/liveServer/server');
            triggerReload();
        }
      }

      if (controller.signal.aborted) break;
    }

    if (!mainWindow.isDestroyed()) {
      mainWindow.webContents.send(`ai:done:${requestId}`);
    }
  } catch (error) {
    if (!mainWindow.isDestroyed()) {
      mainWindow.webContents.send(`ai:error:${requestId}`, error.message);
    }
  } finally {
    abortControllers.delete(requestId);
  }
});

ipcMain.on('ai:abort', (event, requestId) => {
  const controller = abortControllers.get(requestId);
  if (controller) {
    controller.abort();
    abortControllers.delete(requestId);
    if (!partiallyFulfilledRequests.has(requestId)) {
        globalContextManager.removeLastUserTurn();
    }
    partiallyFulfilledRequests.delete(requestId);
  }
});

ipcMain.handle('ai:transcribe', async (event, audioBuffer) => {
  const tempFilePath = path.join(os.tmpdir(), `audio_${Date.now()}_${Math.random().toString(36).substring(7)}.webm`);
  try {
    fs.writeFileSync(tempFilePath, Buffer.from(audioBuffer));

    const groqProvider = aiManager.getProvider('groq');
    if (!groqProvider || !groqProvider.client) {
      throw new Error("Groq provider not initialized properly");
    }

    const transcription = await groqProvider.client.audio.transcriptions.create({
      file: fs.createReadStream(tempFilePath),
      model: "whisper-large-v3",
    });

    if (fs.existsSync(tempFilePath)) fs.unlinkSync(tempFilePath);
    return transcription.text;
  } catch (e) {
    if (fs.existsSync(tempFilePath)) fs.unlinkSync(tempFilePath);
    console.error("[AI Transcribe] Failed:", e);
    throw e;
  }
});

ipcMain.handle('save-temp-image', async (event, buffer) => {
    try {
        const tempDir = path.join(os.tmpdir(), 'airgrove-attachments');
        if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

        const fileName = `img_${Date.now()}.png`;
        const filePath = path.join(tempDir, fileName);
        fs.writeFileSync(filePath, Buffer.from(buffer));
        return filePath;
    } catch (error) {
        console.error('Failed to save temp image:', error);
        return null;
    }
});
// ----------------------------

// --- LIVE SERVER IPC ---
ipcMain.handle('live-server:start', async (event, projectPath, activeFilePath = null) => {
  const targetPath = projectPath || currentOpenFolderPath;
  if (!targetPath) {
    return { success: false, error: 'No folder is currently open. Please open a folder to use Live Server.' };
  }
  try {
    const port = await liveServer.startServer(targetPath, activeFilePath);
    return { success: true, port };
  } catch (error) {
    console.error('[Live Server] Failed to start:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('live-server:stop', () => {
  liveServer.stopServer();
  return { success: true };
});

ipcMain.handle('live-server:get-port', () => {
  return liveServer.getPort();
});

ipcMain.handle('live-server:reload', () => {
  liveServer.triggerReload();
  return { success: true };
});
// ----------------------------

// --- START: REGISTER RUN HANDLERS ---
const { registerRunHandlers } = require("./ipcHandlers/runHandlers.js");
registerRunHandlers();
// --- END: REGISTER RUN HANDLERS ---
const { registerEditReviewHandlers } = require("./ipcHandlers/editReviewHandlers.js");
registerEditReviewHandlers();

const BRAND_ICON_PATH = path.join(__dirname, '../../assets/icons/taskbar_logo.png');
const brandIcon = nativeImage.createFromPath(BRAND_ICON_PATH);

// --- START: FORCE BRAND LOGO ON ALL WINDOWS (INCLUDING DEVTOOLS) ---
app.on('browser-window-created', (event, window) => {
  window.setIcon(brandIcon);
});

// Extra enforcement for DevTools specifically
app.on('web-contents-created', (event, contents) => {
  contents.on('devtools-opened', () => {
    const devToolsWebContents = contents.devToolsWebContents;
    if (devToolsWebContents) {
      const devToolsWindow = BrowserWindow.fromWebContents(devToolsWebContents);
      if (devToolsWindow) {
        devToolsWindow.setIcon(brandIcon);
      }
    }
  });
});
// --- END: FORCE BRAND LOGO ---

app.whenReady().then(() => {
  const { session } = require('electron');
  session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => {
    if (permission === 'media') {
      callback(true);
    } else {
      callback(false);
    }
  });

  session.defaultSession.setPermissionCheckHandler((webContents, permission) => {
    if (permission === 'media') {
      return true;
    }
    return false;
  });

  loadRecentFolders();
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  // --- START: ADD CLEANUP LOGIC ---
  // Close the watcher and live server when the app closes
  if (fileWatcher) {
    fileWatcher.close();
  }
  liveServer.stopServer();
  // --- END: ADD CLEANUP LOGIC ---
  if (process.platform !== 'darwin') app.quit();
});
