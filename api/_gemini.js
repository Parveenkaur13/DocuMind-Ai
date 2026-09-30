export function setCorsHeaders(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

export function getGeminiKey() {
  return process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY || '';
}

export const VERIFIED_MODELS = [
  'gemini-flash-latest',
  'gemini-3.5-flash-lite',
  'gemini-2.0-flash',
  'gemini-2.5-flash',
];

export async function callGeminiApi(prompt, maxTokens = 2400) {
  const key = getGeminiKey();
  if (!key) {
    throw new Error('GEMINI_API_KEY is not configured on the production server. Please configure it in your Vercel project environment variables.');
  }

  let lastError = '';

  for (const model of VERIFIED_MODELS) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.2,
            maxOutputTokens: maxTokens,
          },
        }),
        signal: AbortSignal.timeout(40000),
      });

      if (!response.ok) {
        const errText = await response.text();
        console.error(`[DocuMind Gemini API Error] Model ${model} returned HTTP ${response.status}:`, errText);
        lastError = `HTTP ${response.status}: ${errText}`;
        if (response.status === 429) {
          throw new Error('Google Gemini API rate limit or quota exceeded (HTTP 429). Please wait a moment or try again later.');
        }
        if (response.status === 401 || response.status === 403) {
          throw new Error(`Google Gemini API authentication failed (HTTP ${response.status}). Please check your API key.`);
        }
        continue;
      }

      const data = await response.json();
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (text && typeof text === 'string') {
        return text.trim();
      }
    } catch (e) {
      if (e.name === 'TimeoutError' || e.name === 'AbortError') {
        console.error(`[DocuMind Gemini API Timeout] Model ${model} timed out after 40s.`);
        lastError = 'Request timed out after 40 seconds.';
        continue;
      }
      if (e.message?.includes('rate limit') || e.message?.includes('quota') || e.message?.includes('authentication failed')) {
        throw e;
      }
      lastError = e.message || String(e);
      console.error(`[DocuMind Gemini API Exception] Model ${model}:`, e);
    }
  }

  throw new Error(`Failed to generate response from Gemini API. ${lastError}`);
}

export function extractJsonArray(text) {
  const clean = text
    .replace(/^```json\s*/gm, '')
    .replace(/^```\s*/gm, '')
    .trim();

  const start = clean.indexOf('[');
  const end = clean.lastIndexOf(']');
  if (start !== -1 && end !== -1 && end > start) {
    try {
      const parsed = JSON.parse(clean.slice(start, end + 1));
      if (Array.isArray(parsed)) return parsed;
    } catch {
      // ignore
    }
  }

  try {
    const parsed = JSON.parse(clean);
    if (Array.isArray(parsed)) return parsed;
  } catch {
    // ignore
  }

  return null;
}
