
// Wrapper around window.electronAPI for Run Service
// We do not import ipcRenderer because of ContextIsolation

export const runApi = {
    execute(filePath, cwd, previewContent = undefined) {
        if (window.electronAPI && window.electronAPI.runExecute) {
            const payload = typeof filePath === 'object' && filePath !== null
                ? filePath
                : { filePath, cwd, previewContent };
            return window.electronAPI.runExecute(payload);
        } else {
            console.error("electronAPI.runExecute is not defined");
        }
    },

    onOutput(callback) {
        if (window.electronAPI && window.electronAPI.onRunOutput) {
            window.electronAPI.onRunOutput(callback);
            // Clean up? If the API returned a specialized id, we could use it. 
            // For now, we assume simple registration.
            return () => { }; // No-op cleanup
        }
        return () => { };
    },

    onExit(callback) {
        if (window.electronAPI && window.electronAPI.onRunExit) {
            window.electronAPI.onRunExit(callback);
            return () => { };
        }
        return () => { };
    },

    stop() {
        if (window.electronAPI && window.electronAPI.runStop) {
            return window.electronAPI.runStop();
        }
    }
};
