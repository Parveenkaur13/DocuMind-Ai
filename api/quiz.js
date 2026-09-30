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
    const count = parseInt(body.count || 10, 10);

    if (!text || text.length < 20) {
      return res.status(400).json({ error: 'Document text is required and must contain at least 20 characters.' });
    }

    const prompt = `You are a certified university exam creator. Formulate ${count} challenging, high-yield multiple-choice questions based strictly on "${filename}".
CRITICAL REQUIREMENTS:
1. Every question MUST have EXACTLY 4 distinct options.
2. Provide the correctIndex (0 for first option, 1 for second, 2 for third, 3 for fourth).
3. Include an in-depth explanation grounded strictly in the provided document text.
4. Return ONLY a valid JSON array of objects with the exact schema:
[
  {
    "id": "1",
    "question": "Clear question text?",
    "options": ["Option A text", "Option B text", "Option C text", "Option D text"],
    "correctIndex": 0,
    "explanation": "Why this option is correct based on the document facts."
  }
]

DOCUMENT TEXT:
${text.slice(0, 9000)}

JSON ARRAY:`;

    const raw = await callGeminiApi(prompt, 2600);
    const parsed = extractJsonArray(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      const formatted = parsed.map((item, idx) => {
        let opts = Array.isArray(item.options) ? item.options.map(String) : [];
        if (opts.length > 4) opts = opts.slice(0, 4);
        while (opts.length < 4) opts.push('None of the above');

        let cIdx = typeof item.correctIndex === 'number' ? item.correctIndex : 0;
        if (cIdx < 0 || cIdx >= opts.length) cIdx = 0;

        return {
          id: String(item.id || idx + 1),
          question: String(item.question || ''),
          options: opts,
          correctIndex: cIdx,
          explanation: String(item.explanation || 'Directly grounded in the source text.'),
        };
      });
      return res.status(200).json({ questions: formatted });
    }

    return res.status(502).json({ error: 'Failed to parse MCQs from AI response', raw });
  } catch (error) {
    console.error('[API /api/quiz Error]:', error);
    return res.status(500).json({
      error: error.message || 'Failed to generate quiz from Gemini API.',
      details: String(error),
    });
  }
}
