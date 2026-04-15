// Explorer State Management
// Centralizes the file tree data and provides reactive updates

export const explorerState = {
    fileTree: null,
    _listeners: [],

    getRootPath() {
        return this.fileTree ? this.fileTree.path : null;
    },

    setFileTree(data) {
        console.log('[State] Setting file tree:', data ? data.path : 'null');
        this.fileTree = data;
        this._notify();
    },

    onUpdate(callback) {
        this._listeners.push(callback);
        // Immediately call with current state if available
        if (this.fileTree) {
            callback(this.fileTree);
        }
    },

    _notify() {
        this._listeners.forEach(callback => callback(this.fileTree));
    }
};
