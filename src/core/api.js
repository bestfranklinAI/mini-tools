// Single entry for tools to access cloud LLM via OpenAI-compatible API
// Exposes: prompt(text, options) -> { text, raw } or stream response

import LLMClient from './LLMClient';

export async function prompt(text, options = {}) {
  return LLMClient.simplePrompt(text, options);
}

const api = { prompt };
export default api;
