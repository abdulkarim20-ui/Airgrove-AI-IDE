const fs = require("fs");
const walk = require("./fileWalker");

/**
 * Builds a RegExp object based on the search query and options.
 * Accurately handles "Whole Word" for both word characters and symbols.
 */
function buildRegex(query, options) {
    let source = query;

    // 1. Handle Non-Regex (Literal) Mode
    if (!options.regex) {
        // Escape all regex special characters
        source = source.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    // 2. Handle Whole Word
    if (options.wholeWord) {
        if (!options.regex) {
            // Smart boundary detection for literal strings
            // If the start char is a word char, allow \b (word boundary).
            // If it's a symbol, force \B (non-word boundary) to ensure it's not touching a word.
            const isWordChar = (char) => /\w/.test(char);

            const startToken = (source.length > 0 && isWordChar(query[0])) ? "\\b" : "\\B";
            const endToken = (source.length > 0 && isWordChar(query[query.length - 1])) ? "\\b" : "\\B";

            source = `${startToken}${source}${endToken}`;
        } else {
            // For regex mode, simply wrapping in \b is the standard convention,
            // though user regexes can be complex.
            source = `\\b${source}\\b`;
        }
    }

    const flags = options.caseSensitive ? "g" : "gi";
    return new RegExp(source, flags);
}

function searchWorkspace(payload) {
    const { root, query, options } = payload;
    if (!query) return {};

    try {
        const regex = buildRegex(query, options);
        // If the query was empty or invalid, regex might be odd, but we check query length above.

        const files = walk(root);
        const results = {};

        for (const file of files) {
            try {
                const content = fs.readFileSync(file, "utf8");
                const lines = content.split("\n");

                lines.forEach((line, index) => {
                    // Remove \r if present (CRLF support)
                    const cleanLine = line.replace(/\r$/, '');

                    // Check if line matches
                    if (regex.test(cleanLine)) {
                        // Reset lastIndex because calling test() on a global regex advances it
                        regex.lastIndex = 0;

                        const matches = [];
                        let m;
                        // Use exec or matchAll loop
                        while ((m = regex.exec(cleanLine)) !== null) {
                            matches.push({
                                start: m.index,
                                length: m[0].length
                            });
                            // Prevent infinite loop if match is zero-width
                            if (m.index === regex.lastIndex) {
                                regex.lastIndex++;
                            }
                        }

                        if (matches.length > 0) {
                            results[file] ??= [];
                            results[file].push({
                                line: index + 1,
                                text: cleanLine,
                                matches: matches
                            });
                        }
                    }
                });
            } catch (e) {
                // Ignore file read errors (permissions, binary, etc.)
            }
        }

        return results;
    } catch (err) {
        console.error("Search error:", err);
        return {};
    }
}

module.exports = searchWorkspace;
