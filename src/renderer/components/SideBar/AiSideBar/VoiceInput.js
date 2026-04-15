// src/renderer/components/SideBar/AiSideBar/VoiceInput.js
import { createSpeechRecognition } from '../../../utils/speech.js';

export class VoiceInput {
    constructor(inputTextarea) {
        this.inputTextarea = inputTextarea;
        this.micBtn = document.getElementById('ai-mic-btn');
        this.stopListenBtn = document.getElementById('ai-stop-listen-btn');
        this.listeningUI = document.querySelector('.ai-listening-ui');

        this.isListening = false;
        this.recognition = null;
        this.baseText = "";
        this.silenceTimeout = null;
        this.labelInterval = null;
        this.pendingAutoSend = false;

        this.init();
    }

    // Compatibility for AiSideBar.js
    get isRecording() { return this.isListening; }
    get isStopping() { return false; } 
    stopRecording(force, autoSend) { this.stopListening(autoSend); }

    init() {
        if (!this.micBtn || !this.stopListenBtn) return;

        this.micBtn.addEventListener('click', () => this.toggleListening());
        this.stopListenBtn.addEventListener('click', () => this.stopListening(true));

        try {
            this.recognition = createSpeechRecognition({
                onStart: () => {
                    console.log("🎤 Mic active");
                    this.isListening = true;
                    this.setListeningUI(true);
                },
                onEnd: () => {
                    console.log("🛑 Mic stopped");
                    this.isListening = false;
                    this.setListeningUI(false);
                    
                    if (this.pendingAutoSend) {
                        this.pendingAutoSend = false;
                        const sendBtn = document.querySelector('.send-submit-btn');
                        if (sendBtn && !sendBtn.disabled) {
                            sendBtn.click();
                        }
                    }
                },
                onError: (err) => {
                    console.error("Mic error:", err);
                    if (err !== 'no-speech') {
                        this.stopListening();
                    }
                },
                onResult: ({ final, interim }) => {
                    this.handleSpeechResult(final, interim);
                    
                    // Silence timeout (ChatGPT style)
                    clearTimeout(this.silenceTimeout);
                    this.silenceTimeout = setTimeout(() => {
                        this.stopListening(true);
                    }, 3000); // 3 seconds of silence to stop
                }
            });
        } catch (e) {
            console.warn("Web Speech API not supported in this environment");
            if (this.micBtn) this.micBtn.classList.add('hidden');
        }
    }

    toggleListening() {
        if (this.isListening) {
            this.stopListening();
        } else {
            this.startListening();
        }
    }

    startListening() {
        if (!this.recognition || this.isListening) return;
        this.baseText = this.inputTextarea ? this.inputTextarea.value : "";
        if (this.baseText && !this.baseText.endsWith(' ')) {
            this.baseText += " ";
        }
        this.recognition.start();
    }

    stopListening(autoSend = false) {
        if (!this.recognition || !this.isListening) return;
        
        // Save the intention to auto-send after transcription finishes
        if (autoSend) {
            this.pendingAutoSend = true;
        }

        this.recognition.stop();
        clearTimeout(this.silenceTimeout);
    }

    handleSpeechResult(final, interim) {
        if (!this.inputTextarea) return;

        // We append the final transcript to our baseText
        if (final !== '') {
            this.baseText += final + ' ';
        }
        
        // Update the textarea visually with the final text plus whatever is currently being interpreted
        this.inputTextarea.value = this.baseText + interim;
        
        // Trigger input event for auto-resize and send button state
        this.inputTextarea.dispatchEvent(new Event('input', { bubbles: true }));
        this.inputTextarea.scrollTop = this.inputTextarea.scrollHeight;
    }

    setListeningUI(active) {
        const inputSection = document.querySelector('.ai-input-section');
        if (!inputSection) return;

        const normalUI = inputSection.querySelectorAll('.normal-ui');
        const listeningUI = inputSection.querySelectorAll('.ai-listening-ui, .ai-stop-listen-btn');
        const labelEl = inputSection.querySelector('.ai-listening-text');

        if (active) {
            normalUI.forEach(el => el.classList.add('hidden'));
            listeningUI.forEach(el => el.classList.remove('hidden'));
            
            // Start label rotation
            const labels = ["Hearing You", "Speak Freely", "Listening", "Go On"];
            let idx = 0;
            if (labelEl) labelEl.textContent = labels[0];
            
            if (this.labelInterval) clearInterval(this.labelInterval);
            this.labelInterval = setInterval(() => {
                idx = (idx + 1) % labels.length;
                if (labelEl) labelEl.textContent = labels[idx];
            }, 3000);
        } else {
            normalUI.forEach(el => el.classList.remove('hidden'));
            listeningUI.forEach(el => el.classList.add('hidden'));
            if (this.labelInterval) {
                clearInterval(this.labelInterval);
                this.labelInterval = null;
            }
        }
    }
}
