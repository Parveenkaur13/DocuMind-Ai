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
    const type = body.type || 'short_notes';
    const difficulty = body.difficulty || 'intermediate';

    if (!text || text.length < 20) {
      return res.status(400).json({ error: 'Document text is required and must contain at least 20 readable characters.' });
    }

    const diffInstructions = {
      beginner: 'Keep concepts intuitive, define every technical term clearly, use relatable analogies, and focus on foundational understanding.',
      intermediate: 'Maintain a balance between core principles, practical applications, standard terminology, and analytical depth.',
      advanced: 'Provide rigorous, high-level analysis with architectural nuances, edge cases, quantitative metrics, and systemic implications.',
      exam_oriented: 'Format as high-yield revision material: concise bullet points, exact definitions, expected question patterns, and marking-scheme takeaways.',
    };
    const diffInst = diffInstructions[difficulty] || diffInstructions.intermediate;

    const prompts = {
      summary: `Provide an authoritative, well-structured Executive & Academic Summary of "${filename}".
Level: ${difficulty.toUpperCase()} (${diffInst}).
Structure with:
## Overview & Primary Objectives
## Key Findings & Core Takeaways
## Strategic & Practical Implications`,

      short_notes: `Generate comprehensive, high-retention Short Notes from "${filename}".
Level: ${difficulty.toUpperCase()} (${diffInst}).
Structure with:
## 📌 Core Takeaways & Quick Facts
## 🔑 Critical Definitions & Formulae
## 📊 Key Data Points, Dates & Metrics
## 💡 Important Rules, Principles & Guidelines
Use bold highlights, bullet points, and clean GitHub markdown.`,

      important_questions: `Generate 6-8 High-Yield Important Questions with comprehensive model answers based strictly on "${filename}".
Level: ${difficulty.toUpperCase()} (${diffInst}).
Structure with:
### Question [number]: [High-impact question]
**Model Answer:** [In-depth answer directly citing document facts]
**Key Concept Tested:** [Underlying theme or rule]`,

      viva_questions: `Generate 6-8 challenging Viva / Oral Examination Questions with model answers based strictly on "${filename}".
Level: ${difficulty.toUpperCase()} (${diffInst}).
Format each question as:
### Q[number]: [Clear, conceptual question]
**Model Answer:** [Precise, factual response citing document facts]
**Key Examiner Evaluation Criteria:** [What the interviewer looks for]`,

      exam_questions: `Generate 5 high-yield Academic Examination Questions based on "${filename}".
Level: ${difficulty.toUpperCase()} (${diffInst}).
Include a mix of Short-Answer (2-3 marks) and Long-Answer (5-10 marks) questions.
Format each with:
### Question [number] ([marks] Marks)
[Question statement]
**Model Answer Outline:**
- [Key point 1]
- [Key point 2]
- [Key point 3]
**Expected Keywords:** \`[term1]\`, \`[term2]\`, \`[term3]\``,

      key_concepts: `Generate a structured Glossary & Conceptual Framework of all key concepts from "${filename}".
Level: ${difficulty.toUpperCase()} (${diffInst}).
Format with:
## 🧠 Core Conceptual Framework
[Diagrammatic hierarchy or conceptual breakdown]
## 📖 Concept Glossary
For each concept:
- **[Concept Name]**: [Precise definition and why it matters in this context]`,

      explain_beginner: `Explain "${filename}" using the Feynman Technique (Explain Like I'm 5 / Clear Topic Breakdown).
Level: ${difficulty.toUpperCase()} (${diffInst}).
Use simple everyday language, vivid real-world analogies, and step-by-step intuition.
Structure with:
## 🌟 The Big Picture (In Plain English)
## 🧩 How It Works (A Simple Analogy)
## 🔍 What You Actually Need to Know
## 🚀 Why This Matters in the Real World`,
    };

    const chosenPrompt = prompts[type] || prompts.short_notes;
    const fullPrompt = `You are DocuMind AI, an elite university professor and personalized learning tutor.
Generate high-quality academic study material based strictly on the provided document excerpts.

${chosenPrompt}

DIFFICULTY LEVEL: ${difficulty.toUpperCase()}
${diffInst}

STRICT GROUNDING: Base all assertions, facts, formulas, and data points strictly on the document text. Do not hallucinate external facts.

DOCUMENT TEXT ("${filename}"):
${text.slice(0, 10000)}

STUDY MATERIAL:`;

    const result = await callGeminiApi(fullPrompt, 2400, req);
    return res.status(200).json({ result });
  } catch (error) {
    console.error('[API /api/study Error]:', error);
    return res.status(500).json({
      error: error.message || 'Failed to generate study material from Gemini API.',
      details: String(error),
    });
  }
}
