/**
 * Base abstract class for AI Providers.
 * Defines the contract for streaming chat responses.
 */
class BaseProvider {
    /**
     * Stream a chat completion.
     * @param {string} prompt - The user's input prompt.
     * @param {Object} options - Additional options (model, temperature, etc.)
     * @param {Function} onChunk - Callback triggered on each token/chunk received.
     * @param {AbortSignal} signal - Abort signal to stop generation.
     * @returns {Promise<void>}
     */
    async streamChat(prompt, options, onChunk, signal) {
        throw new Error('streamChat method must be implemented by the provider.');
    }
}

module.exports = BaseProvider;
