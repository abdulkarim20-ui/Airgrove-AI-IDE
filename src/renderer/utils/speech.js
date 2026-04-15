// src/renderer/utils/speech.js

export function createSpeechRecognition({
  onResult,
  onStart,
  onEnd,
  onError
}) {
  let mediaRecorder = null;
  let audioChunks = [];
  let isRecording = false;
  let interimInterval = null;
  let isTranscribing = false;

  const recognition = {
    start: async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
        audioChunks = [];

        mediaRecorder.addEventListener("dataavailable", event => {
          if (event.data.size > 0) {
            audioChunks.push(event.data);
          }
        });

        mediaRecorder.addEventListener("stop", async () => {
          clearInterval(interimInterval);
          const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
          const arrayBuffer = await audioBlob.arrayBuffer();

          try {
             if (audioChunks.length > 0) {
               const text = await window.electronAPI.aiTranscribe(arrayBuffer);
               // Send the parsed text as purely final to permanently append it 
               onResult({ final: text, interim: "" });
             }
          } catch (e) {
             console.error("Transcription Failed:", e);
             onError && onError('network');
          } finally {
             stream.getTracks().forEach(track => track.stop());
             isRecording = false;
             onEnd && onEnd();
          }
        });

        // ⚡ Start recording, request a chunk of data every 500ms
        mediaRecorder.start(500);
        isRecording = true;
        onStart && onStart();

        // Live typing simulation using Groq
        interimInterval = setInterval(async () => {
          if (audioChunks.length > 0 && !isTranscribing) {
             isTranscribing = true;
             try {
               const currentBlob = new Blob(audioChunks, { type: 'audio/webm' });
               const currentBuffer = await currentBlob.arrayBuffer();
               const text = await window.electronAPI.aiTranscribe(currentBuffer);
               
               // Present the entire accumulated stream accurately as an interim sequence
               onResult({ final: "", interim: text });
             } catch(e) {
               console.warn("Interim transcription error:", e);
             } finally {
               isTranscribing = false;
             }
          }
        }, 1500); // Send interim text requests every 1.5 seconds

      } catch (err) {
        console.error("Speech Init error:", err);
        onError && onError('not-allowed');
      }
    },
    stop: () => {
      if (mediaRecorder && mediaRecorder.state === 'recording') {
        mediaRecorder.stop();
      } else if (isRecording) {
         isRecording = false;
         clearInterval(interimInterval);
         onEnd && onEnd();
      }
    }
  };

  return recognition;
}
