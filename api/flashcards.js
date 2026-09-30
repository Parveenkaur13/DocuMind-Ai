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
    const count = parseInt(body.count || 6, 10);

    if (!text || text.length < 20) {
      return res.status(400).json({ error: 'Document text is required and must contain at least 20 characters.' });
    }

    const prompt = `You are an elite academic educator. Formulate ${count} high-impact, grounded study flashcards based strictly on "${filename}".
Each flashcard must focus on a core concept, key formula, important term, or quantitative metric found directly in the text.

Return ONLY a valid JSON array of objects with the exact schema:
[
  {
    "id": "1",
    "question": "Clear conceptual or factual question / term?",
    "answer": "Concise, authoritative answer directly from document",
    "sourceSnippet": "Relevant quote or citation from the text"
  }
]

DOCUMENT:
${text.slice(0, 8000)}

JSON ARRAY:`;

    const raw = await callGeminiApi(prompt, 1800);
    const parsed = extractJsonArray(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      const formatted = parsed.map((item, idx) => ({
        id: String(item.id || idx + 1),
        question: String(item.question || ''),
        answer: String(item.answer || ''),
        sourceSnippet: item.sourceSnippet ? String(item.sourceSnippet) : undefined,
      }));
      return res.status(200).json({ flashcards: formatted });
    }

    return res.status(502).json({ error: 'Failed to parse flashcards from AI response', raw });
  } catch (error) {
    console.error('[API /api/flashcards Error]:', error);
    return res.status(500).json({
      error: error.message || 'Failed to generate flashcards from Gemini API.',
      details: String(error),
    });
  }
}
