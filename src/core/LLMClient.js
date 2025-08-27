// OpenAI-compatible client wrapper
// Uses Settings to get endpoint and apiKey. Provides simple prompt API.

import Settings from './Settings';

function buildHeaders(extra = {}) {
  const { apiKey } = Settings.getLLM();
  const headers = {
    'Content-Type': 'application/json',
    ...extra,
  };
  if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`;
  return headers;
}

function normalizeEndpoint(endpoint) {
  if (!endpoint) return '';
  // Allow user to set base like https://api.openai.com/v1 or a full path
  // If it already ends with /chat/completions, keep as-is; else append path
  const e = endpoint.trim();
  if (/\/chat\/completions\/?$/.test(e)) return e;
  return e.replace(/\/$/, '') + '/chat/completions';
}

export async function simplePrompt(prompt, opts = {}) {
  // Contract:
  // input: prompt string
  // opts: { system, model, temperature, stream }
  // returns: { text, raw }
  const { llm } = Settings.get();
  const endpoint = normalizeEndpoint(opts.endpoint || llm.endpoint);
  if (!endpoint) throw new Error('LLM endpoint is not configured');

  const model = opts.model || llm.model || 'gpt-4o-mini';
  const temperature = typeof opts.temperature === 'number' ? opts.temperature : llm.temperature;
  const system = opts.system || 'You are a helpful assistant.';
  const body = {
    model,
    temperature,
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: prompt },
    ],
    stream: !!opts.stream,
  };

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: buildHeaders(),
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(`LLM request failed: ${res.status} ${res.statusText}${errText ? `\n${errText}` : ''}`);
  }
  if (body.stream) {
    // Return a reader for the response stream (SSE or chunked). The consumer can parse.
    return { stream: true, response: res, raw: res };
  }
  const json = await res.json();
  const text = json?.choices?.[0]?.message?.content ?? '';
  return { text, raw: json };
}

const LLMClient = { simplePrompt };
export default LLMClient;
