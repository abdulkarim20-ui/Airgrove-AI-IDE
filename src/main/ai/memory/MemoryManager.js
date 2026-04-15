const NvidiaSummarizer = require("../llm/NvidiaSummarizer");

class MemoryManager {
  constructor(apiKey) {
    this.summarizer = new NvidiaSummarizer(apiKey);
    this.summary = "";
  }

  async summarize(oldMessages) {
    if (!oldMessages.length) return "";

    const text = oldMessages
      .map(m => {
        let line = `${m.role}: ${m.content || ""}`;
        if (m.tool_calls) {
          line += ` [Tool Calls: ${JSON.stringify(m.tool_calls.map(tc => tc.function))}]`;
        }
        if (m.role === 'tool') {
          line += ` [Tool: ${m.name}]`;
        }
        return line;
      })
      .join("\n");

    const prompt = `
Summarize important facts and coding context from the conversation below. 

STRICT RULES:
1. Preserve all specific FILE NAMES and PATHS exactly as they appear (e.g., "XYZ.pdf", "src/index.js"). Never summarize or shorten a path.
2. Keep the summary under 120 words.
3. Maintain the current state of task completion.

Conversations:
${text}
`;

    return await this.summarizer.summarize([
      { role: "system", content: "You are a concise summarizer for a coding assistant's memory." },
      { role: "user", content: prompt }
    ]);
  }

  async update(oldMessages) {
    try {
      const newSummary = await this.summarize(oldMessages);

      if (!newSummary) return;

      this.summary = this.summary
        ? this.summary + "\n\n--- Past Summary Upgrade ---\n" + newSummary
        : newSummary;
        
      console.log("[MemoryManager] Conversation summary updated successfully.");
    } catch (e) {
      console.error("[MemoryManager] Failed to update memory:", e);
    }
  }

  getMemory() {
    return this.summary;
  }
  
  clear() {
    this.summary = "";
  }
}

module.exports = MemoryManager;
