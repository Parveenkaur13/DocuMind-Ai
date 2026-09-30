import { setCorsHeaders, callGeminiApi } from './_gemini.js';

export default async function handler(req, res) {
  setCorsHeaders(res);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    const text = (body.text || '').trim();
    const filename = body.filename || 'document';

    if (!text) {
      return res.status(400).json({ error: 'Text is required' });
    }

    const prompt = `Provide a concise 2-3 sentence executive summary of the document '${filename}':\n\n${text.slice(0, 6000)}`;
    const summary = await callGeminiApi(prompt, 400, req);
    return res.status(200).json({ summary });
  } catch (error) {
    console.error('[API /api/summarize Error]:', error);
    return res.status(500).json({
      error: error.message || 'Failed to summarize document.',
      details: String(error),
    });
  }
}
