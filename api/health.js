import { setCorsHeaders, getGeminiKey, VERIFIED_MODELS } from './_gemini.js';

export default async function handler(req, res) {
  setCorsHeaders(res);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const key = getGeminiKey(req);
  return res.status(200).json({
    status: 'healthy',
    service: 'DocuMind AI Production API',
    gemini_key_configured: Boolean(key && key.length > 10),
    supported_models: VERIFIED_MODELS,
    runtime: 'vercel-serverless-nodejs',
  });
}
