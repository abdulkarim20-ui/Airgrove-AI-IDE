const axios = require("axios");
const BaseProvider = require("./BaseProvider");
const { getSystemPrompt } = require("../system/SystemManager");

class NvidiaProvider extends BaseProvider {
    constructor(apiKey) {
        super();
        this.apiKey = apiKey;
        this.baseUrl = "https://integrate.api.nvidia.com/v1/chat/completions";
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

            const payload = {
                model: options.model || "moonshotai/kimi-k2.5",
                messages: messages,
                temperature: options.temperature || 0.7,
                max_tokens: options.maxTokens || 4096,
                stream: true,
                tools: options.tools || []
            };

            const response = await axios.post(this.baseUrl, payload, {
                headers: {
                    Authorization: `Bearer ${this.apiKey}`,
                    "Content-Type": "application/json",
                    Accept: "text/event-stream"
                },
                responseType: 'stream',
                signal: signal
            });

            return new Promise((resolve, reject) => {
                let buffer = "";
                let fullText = "";
                let finalToolCalls = [];

                response.data.on('data', (chunk) => {
                    if (signal && signal.aborted) {
                        response.data.destroy();
                        resolve({ 
                            text: fullText, 
                            tool_calls: finalToolCalls.filter(tc => tc && (tc.function?.name || tc.function?.arguments)) 
                        });
                        return;
                    }

                    const raw = (buffer + chunk.toString());
                    const lines = raw.split('\n');
                    buffer = lines.pop(); // Keep the last incomplete line

                    for (const line of lines) {
                        const trimmed = line.trim();
                        if (!trimmed || trimmed === 'data: [DONE]') continue;

                        if (trimmed.startsWith('data: ')) {
                            try {
                                const json = JSON.parse(trimmed.slice(6));
                                if (json.choices && json.choices.length > 0) {
                                    const delta = json.choices[0].delta;
                                    
                                    // Handle text content
                                    if (delta.content) {
                                        fullText += delta.content;
                                        onChunk(delta.content);
                                    }

                                    // Handle tool calls in stream
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
                            } catch (e) {
                                // Ignore parse errors for partial chunks
                            }
                        }
                    }
                });

                response.data.on('end', () => {
                    // Try to clean up any remaining buffer if it was a valid line
                    if (buffer.startsWith('data: ')) {
                        // Normally data: [DONE] or another chunk. Incomplete buffers are usually ignored.
                    }
                    resolve({ 
                        text: fullText, 
                        tool_calls: finalToolCalls.filter(tc => tc && (tc.function?.name || tc.function?.arguments)) 
                    });
                });

                response.data.on('error', (err) => reject(err));
            });
        } catch (error) {
            console.error("[NvidiaProvider] Error during streaming:", error);
            throw error;
        }
    }
}

module.exports = NvidiaProvider;
