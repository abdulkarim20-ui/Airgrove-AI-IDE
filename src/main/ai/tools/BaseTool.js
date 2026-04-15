/**
 * Base abstract-like class for all AI tools.
 */
class BaseTool {
    constructor() {
        this.name = "";
        this.description = "";
        this.parameters = {
            type: "object",
            properties: {},
            required: []
        };
    }

    /**
     * Executes the tool's core logic.
     * @param {Object} args - Arguments passed by the LLM.
     * @returns {Object} result - { text: String, data: Object }
     */
    execute(args) {
        throw new Error("Execute method must be implemented");
    }

    /**
     * Returns the tool definition in OpenAI format.
     */
    toJSON() {
        return {
            type: "function",
            function: {
                name: this.name,
                description: this.description,
                parameters: this.parameters
            }
        };
    }
}

module.exports = BaseTool;
