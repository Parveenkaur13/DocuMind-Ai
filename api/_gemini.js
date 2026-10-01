import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export function ensureResHelpers(res) {
  if (!res) return;
  if (!res.status) {
    res.status = function (code) {
      res.statusCode = code;
      return res;
    };
  }
  if (!res.json) {
    res.json = function (data) {
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify(data));
      return res;
    };
  }
}

export function setCorsHeaders(res) {
  ensureResHelpers(res);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
}

export async function parseJsonBody(req) {
  if (!req) return {};
  if (req.body) {
    if (typeof req.body === 'string') {
      try {
        return JSON.parse(req.body);
      } catch {
        return {};
      }
    }
    if (typeof req.body === 'object') {
      return req.body;
    }
  }

  return new Promise((resolve) => {
    let data = '';
    req.on('data', (chunk) => {
      data += chunk;
    });
    req.on('end', () => {
      try {
        resolve(data ? JSON.parse(data) : {});
      } catch {
        resolve({});
      }
    });
    req.on('error', () => resolve({}));
  });
}

function loadEnvIfAvailable() {
  if (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim().length > 10) {
    return;
  }
  try {
    if (typeof process.loadEnvFile === 'function') {
      const candidates = [
        path.resolve(process.cwd(), '.env'),
        path.resolve(process.cwd(), '../.env'),
        fileURLToPath(new URL('../.env', import.meta.url)),
      ];
      for (const p of candidates) {
        if (fs.existsSync(p)) {
          process.loadEnvFile(p);
          if (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim().length > 10) {
            break;
          }
        }
      }
    }
  } catch {
    // Ignore in production
  }
}

export function getGeminiKey(req) {
  // 1. If client provided custom key via Authorization header, honor it
  if (req) {
    const auth = req.headers?.authorization || req.headers?.Authorization || '';
    if (typeof auth === 'string' && auth.startsWith('Bearer ')) {
      const customKey = auth.slice(7).trim();
      if (customKey && customKey.length > 10) {
        return customKey;
      }
    }
  }

  // 2. Read GEMINI_API_KEY from the server environment (Vercel production or server process)
  const envKey = (process.env.GEMINI_API_KEY || '').trim();
  if (envKey.length > 10) {
    return envKey;
  }

  // 3. In local node runtime, try loading .env if not loaded yet
  loadEnvIfAvailable();

  const loadedKey = (process.env.GEMINI_API_KEY || '').trim();
  if (loadedKey.length > 10) {
    return loadedKey;
  }

  return '';
}

export const VERIFIED_MODELS = [
  'gemini-3.5-flash-lite',
  'gemini-3.8-flash',
  'gemini-3.5-flash',
  'gemini-3.1-flash-lite'
];

export async function callGeminiApi(prompt, maxTokens = 2400, req = null) {
  const key = getGeminiKey(req);
  if (!key) {
    throw new Error('GEMINI_API_KEY is not configured on the production server. Please configure GEMINI_API_KEY in your Vercel project environment variables.');
  }

  let lastError = '';

  for (const model of VERIFIED_MODELS) {
    const url = 'https://generativelanguage.googleapis.com/v1beta/models/' + model + ':generateContent?key=' + key;
    try {
      console.log('[DocuMind Gemini API] Requesting model ' + model + '...');
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.2,
            maxOutputTokens: maxTokens
          }
        }),
        signal: AbortSignal.timeout(25000)
      });

      if (!response.ok) {
        const errText = await response.text();
        console.error('[DocuMind Gemini API Error] Model ' + model + ' returned HTTP ' + response.status + ':\n', errText);
        lastError = 'HTTP ' + response.status + ': ' + errText;

        let parsed = null;
        try { parsed = JSON.parse(errText); } catch {}
        const errDetail = parsed?.error?.message || errText;

        if (response.status === 429) {
          throw new Error('Google Gemini API rate limit or quota exceeded (HTTP 429). Please wait a moment or try again later.');
        }
        if (response.status === 400 && (errDetail.includes('API key not valid') || errDetail.includes('API_KEY_INVALID'))) {
          throw new Error('Google Gemini API key is invalid or unrecognized. Please check your API key in Settings or Vercel environment variables.');
        }
        if (response.status === 401 || response.status === 403) {
          throw new Error('Google Gemini API authentication failed (HTTP ' + response.status + '). Please check your API key.');
        }
        // If 404/503 (model deprecated / temporary spike), continue to next model in list
        continue;
      }

      const data = await response.json();
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (text && typeof text === 'string') {
        console.log('[DocuMind Gemini API Success] Generated ' + text.length + ' chars using ' + model);
        return text.trim();
      }
    } catch (e) {
      if (e.name === 'TimeoutError' || e.name === 'AbortError') {
        console.error('[DocuMind Gemini API Timeout] Model ' + model + ' timed out after 25s.');
        lastError = 'Request timed out after 25 seconds.';
        continue;
      }
      if (
        e.message?.includes('rate limit') ||
        e.message?.includes('quota') ||
        e.message?.includes('authentication failed') ||
        e.message?.includes('invalid or unrecognized')
      ) {
        throw e;
      }
      lastError = e.message || String(e);
      console.error('[DocuMind Gemini API Exception] Model ' + model + ': ', e);
    }
  }

  throw new Error('Failed to generate response from Gemini API. ' + (lastError || 'All models failed to respond.'));
}

export function extractJsonArray(text) {
  if (!text || typeof text !== 'string') return null;

  const clean = text
    .replace(/^`json\s*/gm, '')
    .replace(/^`\s*/gm, '')
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
