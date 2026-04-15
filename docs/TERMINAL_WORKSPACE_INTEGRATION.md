# Terminal Workspace Integration

## How It Works (VS Code Style)

### The Problem
When you switch folders/workspaces, old terminals would remain tied to the previous directory's path. This creates confusion where `cd` shows the old project path even though you've loaded a new one.

### The Solution
We've implemented **VS Code's Terminal Disposal Pattern** with smart workspace tracking:

1. **Workspace Bootstrapping**: When `WorkspaceManager.bootstrap(path)` is called:
   - Main process updates `currentOpenFolderPath` to the new workspace
   - `workspace-bootstrapped` event is fired with the workspace details

2. **Smart Terminal Lifecycle**: The terminal module tracks workspace changes:
   ```javascript
   let lastWorkspacePath = null;
   
   document.addEventListener('workspace-bootstrapped', (e) => {
     const newWorkspacePath = e.detail?.path;
     
     // Only dispose if workspace is CHANGING (not initial load)
     if (lastWorkspacePath && lastWorkspacePath !== newWorkspacePath) {
       disposeAllTerminals(); // Kill existing terminals
     }
     
     lastWorkspacePath = newWorkspacePath;
   });
   ```

3. **Fresh Terminal Creation**: Any new terminal created automatically uses the updated `currentOpenFolderPath` from the main process.

### Key Files
- **`src/renderer/components/Panel/terminal.js`**: Workspace change detection and terminal disposal
- **`src/main/index.js`**: PTY creation uses `currentOpenFolderPath` as working directory
- **`src/renderer/core/WorkspaceManager.js`**: Orchestrates workspace transitions

### Behavior
- ✅ **Initial load**: Terminals work normally
- ✅ **Switch workspace**: Old terminals are killed, new ones start in fresh path
- ✅ **No stale paths**: Terminals are always in sync with current workspace
- ✅ **Matches VS Code**: Clean workspace isolation without breaking initial use

### Testing
1. Open folder → Create terminal → Should work in that folder's path
2. Switch to different folder → Old terminal disappears
3. Create new terminal → Starts in new folder's path
