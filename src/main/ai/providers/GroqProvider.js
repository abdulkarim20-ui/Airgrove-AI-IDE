const OpenAI = require("openai");
const BaseProvider = require("./BaseProvider");
const { getSystemPrompt } = require("../system/SystemManager");

class GroqProvider extends BaseProvider {
    constructor(apiKey) {
        super();
        this.client = new OpenAI({
            apiKey: apiKey,
            baseURL: "https://api.groq.com/openai/v1"
        });
        this.modelName = process.env.GROQ_MODEL || "llama-3.3-70b-versatile";
    }

    async streamChat(prompt, options, onChunk, signal, context = null) {
        try {
            let messages = options.messages || [];

            if (messages.length === 0) {
                const systemPrompt = getSystemPrompt();
                if (context) {
                    messages.push({ role: "system", content: systemPrompt });
                    messages.push({
                        role: "user",
                        content: `Active File: ${context.editor?.activeFile || 'None'}\nProject Root: ${context.workspace?.root || 'None'}\nProject Structure:\n${JSON.stringify(context.workspace?.tree, null, 2)}\nCurrent File Content:\n${context.editor?.content || 'None'}\n\nUser Request:\n${prompt}`
                    });
                } else {
                    messages.push({ role: "system", content: systemPrompt });
                    messages.push({ role: "user", content: prompt });
                }
            }

            const stream = await this.client.chat.completions.create({
                model: options.model || this.modelName,
                messages: messages,
                stream: true,
                temperature: options.temperature || 0.3,
                tools: options.tools || []
            }, { signal });

            let fullText = "";
            let finalToolCalls = [];

            for await (const part of stream) {
                if (signal && signal.aborted) break;
                
                const delta = part.choices[0]?.delta;
                if (!delta) continue;

                if (delta.content) {
                    fullText += delta.content;
                    onChunk(delta.content);
                }

                if (delta.tool_calls) {
                    for (const tc of delta.tool_calls) {
                        const idx = tc.index;
                        if (!finalToolCalls[idx]) {
                            finalToolCalls[idx] = {
                                id: tc.id,
                                type: "function",
                                function: { name: "", arguments: "" }
                            };
                        }
                        if (tc.id) finalToolCalls[idx].id = tc.id;
                        if (tc.function?.name) finalToolCalls[idx].function.name += tc.function.name;
                        if (tc.function?.arguments) finalToolCalls[idx].function.arguments += tc.function.arguments;
                    }
                }
            }

            return {
                text: fullText,
                tool_calls: finalToolCalls.filter(tc => tc && (tc.function?.name || tc.function?.arguments))
            };
        } catch (error) {
            if (error.name === 'AbortError') return null;
            console.error("[GroqProvider] Error during streaming:", error);
            throw error;
        }
    }
}

module.exports = GroqProvider;
