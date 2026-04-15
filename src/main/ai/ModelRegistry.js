const MODEL_REGISTRY = {
  // --- NVIDIA MODELS ---
  "kimi": {
    provider: "nvidia",
    model: "moonshotai/kimi-k2.5",
    name: "Kimi K2.5 (NVIDIA)",
    tools: true
  },
  "nemotron": {
    provider: "nvidia",
    model: "nvidia/nemotron-3-super-120b-a12b",
    name: "Nemotron 120B (NVIDIA)",
    tools: true,
    reasoning: true
  },
  "gpt-oss": {
    provider: "nvidia",
    model: "openai/gpt-oss-120b",
    name: "GPT-OSS 120B (NVIDIA)",
    tools: true,
    reasoning: true
  }
};

module.exports = { MODEL_REGISTRY };
