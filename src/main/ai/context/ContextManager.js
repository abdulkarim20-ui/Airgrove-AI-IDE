const MemoryManager = require("../memory/MemoryManager");
const { getSystemPrompt } = require("../system/SystemManager");

class ContextManager {
  constructor(maxHistory = 10) {
    this.maxHistory = maxHistory;
    this.history = [];
    const nvidiaApiKey = process.env.NVIDIA_API_KEY;
    this.memory = new MemoryManager(nvidiaApiKey);
  }

  addUser(input) {
    // Only add if it's the start of a turn, otherwise it might be duplicate
    this.history.push({ role: "user", content: input });
  }

  removeLastUserTurn() {
    if (this.history.length > 0 && this.history[this.history.length - 1].role === 'user') {
      this.history.pop();
    }
  }

  addAssistant(output, tool_calls = null) {
    const message = { role: "assistant", content: output };
    if (tool_calls && tool_calls.length > 0) {
        message.tool_calls = tool_calls;
    }
    this.history.push(message);
    this.trimHistory();
  }

  addToolResult(id, name, content) {
    this.history.push({ 
        role: "tool", 
        tool_call_id: id, 
        name: name,
        content: content 
    });
  }

  async trimHistory() {
    // Trim if we exceed max turns (User + Assistant = 1 turn)
    if (this.history.length > (this.maxHistory * 2)) {
      const excess = this.history.length - (this.maxHistory * 2);
      const toSummarize = this.history.splice(0, excess);
      
      // Update persistent memory with those messages
      await this.memory.update(toSummarize);
    }
  }

  async buildMessages(userInput, context, customSystemPrompt = null) {
    const systemPrompt = customSystemPrompt || getSystemPrompt();
    
    // We start with the system prompt
    const messages = [
      { role: "system", content: systemPrompt }
    ];

    // Add memory if available
    const memory = this.memory.getMemory();
    if (memory) {
      messages.push({
        role: "system",
        content: `PAST CONTEXT SUMMARY:\n${memory}`
      });
    }

    // Add static context (files, tree) - we treat this as a system-level injection for standard LLM behavior
    if (context) {
        messages.push({
            role: "system",
            content: `PROJECT CONTEXT:\nActive File: ${context.editor?.activeFile || 'None'}\nProject Root: ${context.workspace?.root || 'None'}\nProject Structure:\n${JSON.stringify(context.workspace?.tree, null, 2)}\nCurrent File Content:\n${context.editor?.content || 'None'}`
        });
    }

    // Append history (contains previous user/assistant/tool interaction)
    // Note: The current turn's User prompt was added by index.js before calling this.
    return [...messages, ...this.history];
  }

  clear() {
    this.history = [];
    this.memory.clear();
  }
}

// Global instance to persist session state
const globalContextManager = new ContextManager();

module.exports = { ContextManager, globalContextManager };
