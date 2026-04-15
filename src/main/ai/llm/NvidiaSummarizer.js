const axios = require("axios");

class NvidiaSummarizer {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.baseUrl = "https://integrate.api.nvidia.com/v1/chat/completions";
  }

  async summarize(messages) {
    try {
      const response = await axios.post(this.baseUrl, {
        model: "openai/gpt-oss-120b",
        messages: messages,
        temperature: 0.3,
        max_tokens: 150
      }, {
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json"
        }
      });

      return response.data.choices[0].message.content;
    } catch (error) {
      console.error("[NvidiaSummarizer] Error summarizing with Nvidia:", error);
      return "";
    }
  }
}

module.exports = NvidiaSummarizer;
