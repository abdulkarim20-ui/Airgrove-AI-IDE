import SearchModel from "./SearchModel.js";

class SearchController {
    constructor() {
        this.model = new SearchModel();
    }

    async search(root) {
        if (!root) {
            console.warn("No root for search");
            return {};
        }
        console.log("Searching in", root, "for", this.model.query);
        const res = await window.electronAPI.searchRun({
            root,
            query: this.model.query,
            options: {
                regex: this.model.regex,
                caseSensitive: this.model.caseSensitive,
                wholeWord: this.model.wholeWord
            }
        });
        this.model.results = res;
        return res;
    }

    reset() {
        this.model.query = "";
        this.model.replace = "";
        this.model.results = {};
        // We generally keep the flags (regex, case, etc) as per user preference across sessions,
        // unless explicitly asked to clear those too. "Fresh search section" typically means clear input.
    }

    async replaceAll(root) {
        if (this.model.replace === undefined || this.model.replace === null) return;

        // 1. Calculate stats (files and occurrences)
        const files = Object.keys(this.model.results);
        const fileCount = files.length;
        if (fileCount === 0) return;

        let matchCount = 0;
        files.forEach(f => {
            matchCount += this.model.results[f].reduce((sum, line) => sum + line.matches.length, 0);
        });

        // 2. Show Confirmation Dialog
        const replaceText = this.model.replace === '' ? "''" : `'${this.model.replace}'`;
        const { response } = await window.electronAPI.showConfirmDialog({
            type: 'question',
            title: 'Replace All',
            message: `Replace ${matchCount} occurrence${matchCount !== 1 ? 's' : ''} across ${fileCount} file${fileCount !== 1 ? 's' : ''} with ${replaceText}?`,
            buttons: ['Replace', 'Cancel'],
            defaultId: 0,
            cancelId: 1,
            noLink: true
        });

        if (response !== 0) return; // User cancelled

        // 3. Execute Replacement
        await window.electronAPI.searchReplace({
            results: this.model.results,
            replaceValue: this.model.replace
        });

        // 4. Notify Editor to reload modified files
        // We assume all files in `this.model.results` were modified.
        files.forEach(filePath => {
            document.dispatchEvent(new CustomEvent('file-content-changed', {
                detail: { filePath }
            }));
        });

        // 5. Re-run search (which should now be empty)
        return this.search(root);
    }
}

export default new SearchController();
