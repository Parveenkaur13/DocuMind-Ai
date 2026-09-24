import { supabase } from './supabase';

interface Citation {
  document_id: string;
  document_name: string;
  snippet: string;
}

interface AIResponse {
  answer: string;
  citations: Citation[];
}

const snippetCache: Record<string, string[]> = {};

export function splitIntoChunks(text: string, maxLen = 500): string[] {
  const paragraphs = text.split(/\n{2,}|\r?\n/).filter((p) => p.trim().length > 0);
  const chunks: string[] = [];
  for (const p of paragraphs) {
    if (p.length <= maxLen) chunks.push(p);
    else {
      const sentences = p.match(/[^.!?]+[.!?]+/g) ?? [p];
      let buf = '';
      for (const s of sentences) {
        if ((buf + s).length > maxLen) {
          if (buf) chunks.push(buf);
          buf = s;
        } else buf += s;
      }
      if (buf) chunks.push(buf);
    }
  }
  return chunks.length ? chunks : [text];
}

function findRelevantChunks(question: string, chunks: Array<{ id: string; name: string; text: string }>): Citation[] {
  const qWords = question.toLowerCase().match(/\b[a-z]{3,}\b/g) ?? [];
  if (!qWords.length) return [];
  const stopWords = new Set(['the', 'and', 'for', 'are', 'was', 'what', 'when', 'where', 'which', 'how', 'why', 'who', 'this', 'that', 'with', 'from', 'your', 'have', 'they', 'will', 'been', 'were', 'into']);
  const keywords = qWords.filter((w) => !stopWords.has(w));
  const scores = chunks.map((doc) => {
    const docChunks = snippetCache[doc.id] ?? splitIntoChunks(doc.text);
    snippetCache[doc.id] = docChunks;
    let bestScore = 0;
    let bestSnippet = docChunks[0] ?? doc.text.slice(0, 200);
    for (const chunk of docChunks) {
      const cl = chunk.toLowerCase();
      let score = 0;
      for (const kw of keywords) {
        const matches = cl.split(kw).length - 1;
        score += matches;
      }
      if (score > bestScore) {
        bestScore = score;
        bestSnippet = chunk;
      }
    }
    return { doc, score: bestScore, snippet: bestSnippet.slice(0, 200) };
  });
  return scores
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map((s) => ({ document_id: s.doc.id, document_name: s.doc.name, snippet: s.snippet }));
}

function extractAnswer(question: string, citations: Citation[]): string {
  if (!citations.length) {
    return "I couldn't find information directly answering your question in the uploaded documents. Try rephrasing your question, or upload a document that covers this topic.";
  }
  const top = citations[0];
  const qLower = question.toLowerCase();
  if (qLower.includes('revenue') || qLower.includes('financial') || qLower.includes('growth')) {
    return `Based on ${top.document_name}, here's what I found:\n\n${top.snippet}`;
  }
  if (qLower.includes('launch') || qLower.includes('pricing') || qLower.includes('strategy')) {
    return `According to ${top.document_name}:\n\n${top.snippet}`;
  }
  if (qLower.includes('policy') || qLower.includes('pto') || qLower.includes('benefit') || qLower.includes('handbook')) {
    return `From the ${top.document_name}:\n\n${top.snippet}`;
  }
  if (qLower.includes('customer') || qLower.includes('research') || qLower.includes('pain')) {
    return `Based on ${top.document_name}:\n\n${top.snippet}`;
  }
  return `Based on ${top.document_name}:\n\n${top.snippet}`;
}

export async function askDocuMind(
  question: string,
  documents: Array<{ id: string; name: string; extracted_text: string }>,
): Promise<AIResponse> {
  const citations = findRelevantChunks(
    question,
    documents.map((d) => ({ id: d.id, name: d.name, text: d.extracted_text })),
  );

  const context = citations.map((c) => c.snippet).join('\n\n');

  try {
    const { data, error } = await supabase.functions.invoke('documind-ai', {
      body: { question, context },
    });
    if (error) throw error;
    const result = data as { answer?: string; error?: string };
    if (result.answer) return { answer: result.answer, citations };
  } catch {
    // fall through to local extraction
  }

  return { answer: extractAnswer(question, citations), citations };
}

export function generateSummary(text: string): string {
  if (!text.trim()) return 'No text content available to summarize.';
  const chunks = splitIntoChunks(text, 400);
  const sentences = chunks.join(' ').match(/[^.!?]+[.!?]+/g) ?? [text];
  const wordFreq: Record<string, number> = {};
  const stopWords = new Set(['the', 'and', 'for', 'are', 'was', 'with', 'from', 'this', 'that', 'have', 'they', 'will', 'been', 'were', 'into', 'its', 'our', 'their', 'has', 'had']);
  for (const s of sentences) {
    for (const w of s.toLowerCase().match(/\b[a-z]{4,}\b/g) ?? []) {
      if (!stopWords.has(w)) wordFreq[w] = (wordFreq[w] ?? 0) + 1;
    }
  }
  const scored = sentences.map((s) => {
    let score = 0;
    for (const w of s.toLowerCase().match(/\b[a-z]{4,}\b/g) ?? []) score += wordFreq[w] ?? 0;
    return { s: s.trim(), score: score / Math.max(s.split(/\s+/).length, 1) };
  });
  const top = scored.sort((a, b) => b.score - a.score).slice(0, 3).map((x) => x.s);
  return top.join(' ') || text.slice(0, 300);
}
