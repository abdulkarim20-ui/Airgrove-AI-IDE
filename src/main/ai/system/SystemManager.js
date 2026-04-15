const fs = require("fs");
const path = require("path");

let cachedPrompt = null;

/**
 * Retrieves the system prompt, loading it from file if not cached.
 */
function getSystemPrompt() {
    // We don't want to use cachedPrompt simply because tools might've been added.
    // However, tool registry is static at runtime here usually.
    // For simplicity, let's keep it fresh.
    
    const filePath = path.join(__dirname, "system_prompt.md");
    let prompt = "";
    try {
        prompt = fs.readFileSync(filePath, "utf-8");
    } catch (error) {
        console.error("[SystemManager] Error loading system prompt:", error);
        return "You are AirGrove AI — a Cursor-like coding assistant with tool access.";
    }

    // Inject tool descriptions if placeholder exists
    if (prompt.includes("{{TOOLS_DESCRIPTION}}")) {
        try {
            const { globalToolManager } = require("../tools/ToolManager");
            const toolDesc = globalToolManager.getToolSchemas().map(t => {
                const f = t.function;
                return `- ${f.name}: ${f.description}\n  Parameters: ${JSON.stringify(f.parameters.properties)}`;
            }).join("\n\n");
            prompt = prompt.replace("{{TOOLS_DESCRIPTION}}", toolDesc);
        } catch (e) {
            console.error("[SystemManager] Failed to inject tool descriptions:", e);
        }
    }

    return prompt;
}

module.exports = {
    getSystemPrompt
};
