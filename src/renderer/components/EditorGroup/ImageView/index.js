export class ImageView {
    constructor(container, filePath, updateStatusCallback) {
        this.container = container;
        this.filePath = filePath;
        this.updateStatus = updateStatusCallback; // Function to send data to status bar
        this.zoom = 100;
        this.imgElement = null;
        this.render();
    }

    render() {
        // Convert backward slashes to forward slashes for the file protocol
        const safeFilePath = this.filePath.replace(/\\/g, '/');
        // Encode URI components except slashes and colons (for Windows drive letters)
        const encodedPath = encodeURI(safeFilePath).replace(/#/g, '%23').replace(/\?/g, '%3F');
        
        this.container.innerHTML = `
            <div class="image-viewer-container" tabindex="0">
                <img src="file://${encodedPath}" class="image-preview" id="preview-img" draggable="false" />
            </div>
        `;

        this.imgElement = this.container.querySelector('#preview-img');
        const viewContainer = this.container.querySelector('.image-viewer-container');

        // Get Metadata once image loads
        this.imgElement.onload = () => {
            this.updateMetadata();
        };

        // Zoom functionality via Mouse Wheel
        viewContainer.addEventListener('wheel', (e) => {
            if (e.ctrlKey || e.metaKey) { // Zoom on Ctrl + Scroll
                e.preventDefault();
                const delta = e.deltaY > 0 ? -10 : 10;
                this.setZoom(this.zoom + delta);
            }
        });
    }

    setZoom(value) {
        this.zoom = Math.max(10, Math.min(value, 1000)); // Limit zoom 10% to 1000%
        this.imgElement.style.transform = `scale(${this.zoom / 100})`;
        this.updateMetadata();
    }

    async updateMetadata() {
        // Get File Size via IPC
        const stats = await window.electronAPI.getFileStats(this.filePath);
        const size = (stats.size / 1024).toFixed(2) + ' KB';
        
        const dimensions = `${this.imgElement.naturalWidth}x${this.imgElement.naturalHeight}`;
        
        // Send to Status Bar
        if (this.updateStatus) {
            this.updateStatus({
                size: size,
                dimensions: dimensions,
                zoom: `${this.zoom}%`
            });
        }
    }

    dispose() {
        this.container.innerHTML = '';
        if (this.updateStatus) {
            this.updateStatus(null); // Clear status
        }
    }
}
