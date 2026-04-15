export function initThinkingIndicator(container) {
  const words = [
    "Analyzing", "Processing", "Thinking", "Ideating", 
    "Conceptualizing", "Designing", "Synthesizing", 
    "Generating", "Formulating", "Determining", "Refining"
  ];

  const chars = ["⊶", "⊷", "⊸", "⊹", "⊶", "⊷"];
  const timings = [3, 1, 1, 1, 1, 3]; 

  let ci = 0;
  let fi = 0;
  let wi = Math.floor(Math.random() * words.length);

  // Create HTML structure if container is provided and empty
  if (container && container.innerHTML === '') {
    container.innerHTML = `
      <div class="ai-thinking" id="ai-thinking">
        <div id="ai-spin" class="ai-spin">${chars[ci]}</div>
        <div class="ai-text">
          <span id="ai-word">${words[wi]}</span><span class="ai-dots"></span>
        </div>
      </div>
    `;
  }

  const spinEl = container ? container.querySelector("#ai-spin") : document.getElementById("ai-spin");
  const wordEl = container ? container.querySelector("#ai-word") : document.getElementById("ai-word");

  if (!spinEl || !wordEl) return { stop: () => {} };

  // spinner loop with variable pulsing timing
  const spinInterval = setInterval(() => {
    if (++fi >= timings[ci]) {
      fi = 0;
      ci = (ci + 1) % chars.length;
      spinEl.textContent = chars[ci];
    }
  }, 85);

  let wordTimeout;

  // word cycle loop
  function updateWord() {
    wordTimeout = setTimeout(() => {
      wi = (wi + 1) % words.length;
      wordEl.textContent = words[wi];
      updateWord();
    }, Math.random() * 3000 + 2000); // Random cycle between 2-5 seconds
  }

  updateWord();

  return {
    stop() {
      clearInterval(spinInterval);
      clearTimeout(wordTimeout);
    }
  };
}
