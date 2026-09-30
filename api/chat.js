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
    const question = (body.question || '').trim();
    const context = (body.context || '').trim();
    const citations = body.citations || [];

    if (!question) {
      return res.status(400).json({ error: 'Question is required' });
    }

    const prompt = `You are DocuMind AI, an intelligent document and knowledge assistant.
Answer the following question accurately based on the provided document excerpts.

GUIDELINES:
1. Base your answer strictly on the context.
2. If context does not contain the answer, say: 'Based on the provided documents, I could not find information regarding this.'
3. Be concise, structured, and factual.

DOCUMENT EXCERPTS:
${context || 'No excerpts available.'}

QUESTION:
${question}

ANSWER:`;

    const answer = await callGeminiApi(prompt, 1800);
    return res.status(200).json({
      answer,
      citations,
      backend: 'vercel-serverless-gemini',
    });
  } catch (error) {
    console.error('[API /api/chat Error]:', error);
    return res.status(500).json({
      error: error.message || 'Failed to process chat query.',
      details: String(error),
    });
  }
}
