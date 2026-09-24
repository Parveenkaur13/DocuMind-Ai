const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 200, headers: corsHeaders });

  try {
    const body = await req.json() as { question?: string; context?: string; history?: Array<{ role: string; content: string }> };
    const question = body.question?.trim();
    if (!question) return new Response(JSON.stringify({ error: 'A question is required.' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    const apiKey = Deno.env.get('GEMINI_API_KEY');
    if (!apiKey) return new Response(JSON.stringify({ answer: '', citations: [], provider: 'fallback' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    const prompt = `You are DocuMind, a careful document assistant. Answer only from the provided context. If the context does not contain the answer, say so clearly. Be concise and use short paragraphs.\n\nContext:\n${body.context ?? ''}\n\nQuestion: ${question}`;
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: prompt }] }] }),
    });
    if (!response.ok) throw new Error('AI provider request failed');
    const result = await response.json() as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
    const answer = result.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    if (!answer) throw new Error('AI provider returned no answer');
    return new Response(JSON.stringify({ answer, citations: [], provider: 'gemini' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to answer right now.';
    return new Response(JSON.stringify({ error: message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
