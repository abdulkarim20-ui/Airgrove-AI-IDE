export default class SearchModel {
    constructor() {
        this.query = "";
        this.replace = "";
        this.regex = false;
        this.caseSensitive = false;
        this.wholeWord = false;
        this.results = {};
    }
}
