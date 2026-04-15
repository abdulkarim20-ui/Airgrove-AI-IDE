/**
 * CodeBlock.js
 * Handles syntax highlighting and code block generation for the AI sidebar.
 * Extracted into a modular structure for better maintainability and cleaner responses.
 */

export class CodeBlock {
    /**
     * Highlights the provided code string based on simple regex rules.
     * Supports common tokens for JS, Python, HTML/CSS and C-style languages.
     */
    static highlight(code, lang) {
        if (!code) return '';
        // Decode common HTML entities back to characters before highlighting
        const decoded = code.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
        
        // Comprehensive regex-based tokenizer
        // Order matters: comments > strings > keywords > numbers > constants
        const tokenRegex = new RegExp(
            `(?<comment>\\/\\/.*$|\\/\\*[\\s\\S]*?\\*\\/|#.*$)|` +
            `(?<string>".*?"|'.*?'|\`[\\s\\S]*?\`)|` +
            `(?<keyword>\\b(const|let|var|function|return|if|else|for|while|import|export|from|class|extends|new|try|catch|finally|async|await|print|def|elif|with|except|raise|yield|lambda|assert|pass|break|continue|type|interface|enum|public|private|static|void|bool|int|float|double|main|style|link|script|html|body|div|span|button|input|label|table|tr|td|th|thead|tbody|tfoot|section|article|nav|aside|header|footer|ul|ol|li|p|h[1-6]|a|img|svg|path|circle|rect|line|polyline|polygon|ellipse|text|meta|title|head|npm|install)\\b)|` +
            `(?<number>\\b\\d+(\\.\\d+)?\\b)|` +
            `(?<constant>\\b(true|false|null|undefined|this|super|self|window|global|document|process|os)\\b)`,
            'gm'
        );

        return decoded.replace(tokenRegex, (match, ...args) => {
             const groups = args[args.length - 1]; // Groups object is the last argument
             if (groups.comment) return `<span class="token comment">${groups.comment}</span>`;
             if (groups.string) return `<span class="token string">${groups.string}</span>`;
             if (groups.keyword) return `<span class="token keyword">${groups.keyword}</span>`;
             if (groups.number) return `<span class="token number">${groups.number}</span>`;
             if (groups.constant) return `<span class="token constant">${groups.constant}</span>`;
             return match;
        });
    }

    /**
     * Generates the full HTML structure for a code block,
     * including the header and copy actions.
     */
    static create(lang, code) {
        const language = (lang || 'plaintext').toLowerCase();
        const highlighted = this.highlight(code, language);
        
        return `
            <div class="ai-code-block">
                <pre><code class="language-${language}">${highlighted}</code></pre>
            </div>
        `;
    }
}
