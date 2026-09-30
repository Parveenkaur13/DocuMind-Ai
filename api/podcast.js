import { setCorsHeaders, callGeminiApi, extractJsonArray } from './_gemini.js';

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

    if (!text || text.length < 20) {
      return res.status(400).json({ error: 'Document text is required and must contain at least 20 readable characters.' });
    }

    const prompt = `You are a dynamic podcast producer creating a 2-host audio overview (similar to Google NotebookLM).
Hosts:
- "Alex": Deep, insightful host who introduces key themes, provides context, and synthesizes big-picture implications.
- "Jordan": Sharp, curious co-host who asks piercing questions, highlights nuances, and points out surprising takeaways.

Generate a lively, engaging 5-6 turn back-and-forth dialogue dissecting "${filename}".
Return ONLY a valid JSON array of objects:
[
  {
    "speaker": "Alex",
    "text": "Welcome in everyone! Today we are breaking down...",
    "topic": "Introduction"
  },
  {
    "speaker": "Jordan",
    "text": "Yeah, and what immediately stood out to me was...",
    "topic": "Key Takeaways"
  }
]

DOCUMENT TEXT:
${text.slice(0, 7000)}

JSON ARRAY:`;

    const raw = await callGeminiApi(prompt, 1800, req);
    const parsed = extractJsonArray(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      const dialogue = parsed.map((item) => ({
        speaker: item.speaker === 'Jordan' ? 'Jordan' : 'Alex',
        text: String(item.text || ''),
        topic: item.topic ? String(item.topic) : undefined,
      }));
      return res.status(200).json({ dialogue });
    }

    return res.status(502).json({ error: 'Failed to parse podcast dialogue from AI response', raw });
  } catch (error) {
    console.error('[API /api/podcast Error]:', error);
    return res.status(500).json({
      error: error.message || 'Failed to generate podcast dialogue from Gemini API.',
      details: String(error),
    });
  }
}
