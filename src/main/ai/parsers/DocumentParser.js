const fs = require('fs/promises');
const path = require('path');

// Lazily-loaded pdfjs-dist instance (cached after first use)
let _pdfjsLib = null;

/**
 * Returns an initialised pdfjs-dist instance, mocking the minimal set of
 * DOM globals that pdfjs requires when running inside Node.js.
 */
async function getPdfjsLib() {
    if (_pdfjsLib) return _pdfjsLib;

    // Minimal DOM stubs required by pdfjs-dist in a Node.js environment
    if (!global.DOMMatrix)  global.DOMMatrix  = class {};
    if (!global.ImageData)  global.ImageData  = class {};
    if (!global.Path2D)     global.Path2D     = class {};

    try {
        // Prefer the legacy build for broadest CJS/Node compatibility
        _pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs');
    } catch {
        _pdfjsLib = await import('pdfjs-dist/build/pdf.mjs');
    }
    return _pdfjsLib;
}

/**
 * Extracts text content from various document formats.
 * Supports: .pdf, .docx, .doc, .pptx, .ppt, and plain text files.
 *
 * @param {string} filePath - Absolute path to the file
 * @returns {Promise<string>} - Extracted text content
 */
async function parseDocument(filePath) {
    const ext = path.extname(filePath).toLowerCase();

    try {
        switch (ext) {
            case '.pdf': {
                // Use pdfjs-dist for page-by-page extraction.
                // Reading into a Buffer then wrapping in Uint8Array avoids the
                // "garbage characters" issue caused by interpreting binary data as UTF-8.
                const lib = await getPdfjsLib();
                const buffer  = await fs.readFile(filePath);
                const uint8   = new Uint8Array(buffer);
                const loadingTask = lib.getDocument({ data: uint8 });
                const pdfDoc  = await loadingTask.promise;

                let text = '';
                for (let i = 1; i <= pdfDoc.numPages; i++) {
                    const page    = await pdfDoc.getPage(i);
                    const content = await page.getTextContent();
                    text += content.items.map(item => item.str).join(' ') + '\n';
                }
                return text;
            }

            case '.docx': {
                // mammoth cleanly converts .docx → plain text
                const mammoth = require('mammoth');
                const result = await mammoth.extractRawText({ path: filePath });
                if (result.messages && result.messages.length > 0) {
                    result.messages.forEach(m => console.warn('[DocumentParser] mammoth:', m.message));
                }
                return result.value;
            }

            case '.doc':
            case '.ppt':
            case '.pptx': {
                // officeparser handles legacy .doc, modern .pptx and legacy .ppt
                const officeParser = require('officeparser');
                return await officeParser.parseOfficeAsync(filePath);
            }

            default:
                // Fallback: treat as plain text (UTF-8)
                return await fs.readFile(filePath, 'utf-8');
        }
    } catch (error) {
        console.error(`[DocumentParser] Error parsing "${filePath}":`, error);
        throw new Error(`Failed to read document (${ext}): ${error.message}`);
    }
}

module.exports = { parseDocument };
