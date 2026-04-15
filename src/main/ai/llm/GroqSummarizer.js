const OpenAI = require("openai");

class GroqSummarizer {
  constructor(apiKey) {
    this.client = new OpenAI({
      apiKey: apiKey,
      baseURL: "https://api.groq.com/openai/v1"
    });
  }

  async summarize(messages) {
    try {
      const response = await this.client.chat.completions.create({
        model: "llama-3.1-8b-instant",
        messages: messages,
        temperature: 0.3,
        max_tokens: 150
      });

      return response.choices[0].message.content;
    } catch (error) {
      console.error("[GroqSummarizer] Error summarizing with Groq:", error);
      return "";
    }
  }
}

module.exports = GroqSummarizer;
