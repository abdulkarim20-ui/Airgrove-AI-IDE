import { keybindings } from './Keybindings.js';

// Singleton checker
let instance = null;

class KeyboardManager {
    constructor() {
        if (instance) return instance;
        instance = this;

        this.chordTimeout = null;
        this.firstKeyOfChord = null;
        this.init();
    }

    init() {
        window.addEventListener('keydown', this.handleKeyDown.bind(this));
    }

    handleKeyDown(e) {
        if (e.repeat) return; // Ignore hold-down repeats

        // Don't trigger shortcuts if the user is typing in an input field
        if (e.target.tagName === 'INPUT') {
            return;
        }

        const keyString = this.getKeyString(e);
        if (!keyString) return;

        let fullBinding = keyString;

        // Check if we are in the middle of a chord (e.g., after Ctrl+K)
        if (this.firstKeyOfChord) {
            fullBinding = `${this.firstKeyOfChord} ${keyString}`;
        }

        const binding = keybindings.find(b => b.key === fullBinding);

        if (binding) {
            e.preventDefault();
            e.stopPropagation(); // Stop propagation to prevent others from handling it
            document.dispatchEvent(new CustomEvent(binding.action));
            this.resetChord();
        } else {
            // Check if this key could be the *start* of a chord
            const isChordStart = keybindings.some(b => b.key.startsWith(`${keyString} `));
            if (isChordStart) {
                e.preventDefault();
                e.stopPropagation();
                this.firstKeyOfChord = keyString;
                // Set a timeout to reset the chord if the second key isn't pressed
                this.chordTimeout = setTimeout(() => this.resetChord(), 1000); // 1-second window
            } else {
                this.resetChord();
            }
        }
    }

    getKeyString(e) {
        let parts = [];
        if (e.ctrlKey) parts.push('Ctrl');
        if (e.metaKey) parts.push('Meta'); // For macOS Command key
        if (e.shiftKey) parts.push('Shift');
        if (e.altKey) parts.push('Alt');

        // Check for alphabetical keys
        if (e.keyCode >= 65 && e.keyCode <= 90) {
            parts.push(e.key.toUpperCase());
            return parts.join('+');
        }
        // Could add more specific key checks here if needed
        return null;
    }

    resetChord() {
        clearTimeout(this.chordTimeout);
        this.firstKeyOfChord = null;
    }
}

export function initializeKeyboardManager() {
    new KeyboardManager();
}
