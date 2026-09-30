"""
DocuMind AI - Python RAG Backend Server
Implements conversational RAG document intelligence using Google Gemini and Starlette.
Provides endpoints for Chat, Summarization, Study Material, Flashcards, and MCQs.
"""

import os
import json
import re
from pathlib import Path
from dotenv import load_dotenv
from starlette.applications import Starlette
from starlette.middleware import Middleware
from starlette.middleware.cors import CORSMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse
from starlette.routing import Route

# Load .env from project root
env_path = Path(__file__).resolve().parent.parent / '.env'
load_dotenv(dotenv_path=env_path)

GEMINI_API_KEY = (
    os.getenv('VITE_GEMINI_API_KEY')
    or os.getenv('GEMINI_API_KEY')
    or ''
)

MODELS = [
    'gemini-3.5-flash-lite',
    'gemini-flash-latest',
    'gemini-3.8-flash',
    'gemini-3.6-flash',
    'gemini-3.5-flash',
    'gemini-3.1-flash-lite',
    'gemini-flash-lite-latest',
    'gemini-3-flash-preview',
    'gemini-2.5-flash',
]

def call_gemini_rest(prompt: str, max_tokens: int = 1500, system_instruction: str = "") -> str:
    """Calls Gemini REST API directly with active models failover."""
    import urllib.request
    import urllib.error

    if not GEMINI_API_KEY:
        return "Gemini API key is not configured. Please set GEMINI_API_KEY in your .env file."

    for model in MODELS:
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={GEMINI_API_KEY}"
        payload_dict = {
            "contents": [{"role": "user", "parts": [{"text": prompt}]}],
            "generationConfig": {"temperature": 0.2, "maxOutputTokens": max_tokens}
        }
        if system_instruction:
            payload_dict["systemInstruction"] = {"parts": [{"text": system_instruction}]}

        payload = json.dumps(payload_dict).encode('utf-8')
        req = urllib.request.Request(
            url,
            data=payload,
            headers={'Content-Type': 'application/json'},
            method='POST'
        )

        try:
            with urllib.request.urlopen(req, timeout=15) as response:
                result = json.loads(response.read().decode('utf-8'))
                text = result.get('candidates', [{}])[0].get('content', {}).get('parts', [{}])[0].get('text', '')
                if text:
                    return text.strip()
        except Exception:
            continue

    return "Unable to generate an AI response at this moment. Please verify your API key and connection."

def extract_json_array(text: str):
    """Safely extracts JSON array from markdown or commentary."""
    text = re.sub(r'^```json\s*', '', text.strip(), flags=re.MULTILINE)
    text = re.sub(r'^```\s*', '', text.strip(), flags=re.MULTILINE)
    text = text.strip()

    start_idx = text.find('[')
    end_idx = text.rfind(']')
    if start_idx != -1 and end_idx != -1 and end_idx > start_idx:
        json_str = text[start_idx:end_idx + 1]
        try:
            return json.loads(json_str)
        except Exception:
            pass

    try:
        return json.loads(text)
    except Exception:
        return None

async def health(request: Request):
    return JSONResponse({
        "status": "healthy",
        "service": "DocuMind AI Python Backend",
        "model": "gemini-3.5-flash-lite",
        "api_key_configured": bool(GEMINI_API_KEY)
    })

async def chat(request: Request):
    try:
        body = await request.json()
        question = body.get('question', '').strip()
        context = body.get('context', '').strip()
        citations = body.get('citations', [])

        if not question:
            return JSONResponse({"error": "Question is required"}, status_code=400)

        prompt = f"""You are DocuMind AI, an intelligent document and knowledge assistant.
Answer the following question accurately based on the provided document excerpts.

GUIDELINES:
1. Base your answer strictly on the context.
2. If context does not contain the answer, say: 'Based on the provided documents, I could not find information regarding this.'
3. Be concise, structured, and factual.

DOCUMENT EXCERPTS:
{context or 'No excerpts available.'}

QUESTION:
{question}

ANSWER:"""

        answer = call_gemini_rest(prompt, max_tokens=1500)
        return JSONResponse({
            "answer": answer,
            "citations": citations,
            "backend": "python-rag-gemini"
        })
    except Exception as e:
        return JSONResponse({"error": str(e)}, status_code=500)

async def summarize(request: Request):
    try:
        body = await request.json()
        text = body.get('text', '').strip()
        filename = body.get('filename', 'document')

        if not text:
            return JSONResponse({"error": "Text is required"}, status_code=400)

        prompt = f"""Provide a concise 2-3 sentence executive summary of the document '{filename}':\n\n{text[:6000]}"""
        summary = call_gemini_rest(prompt, max_tokens=300)
        return JSONResponse({"summary": summary})
    except Exception as e:
        return JSONResponse({"error": str(e)}, status_code=500)

async def study(request: Request):
    try:
        body = await request.json()
        text = body.get('text', '').strip()
        filename = body.get('filename', 'document')
        study_type = body.get('type', 'short_notes')
        difficulty = body.get('difficulty', 'intermediate')

        if not text:
            return JSONResponse({"error": "Text is required"}, status_code=400)

        diff_instructions = {
            'beginner': 'Keep concepts intuitive, define every technical term clearly, use relatable analogies, and focus on foundational understanding.',
            'intermediate': 'Maintain a balance between core principles, practical applications, standard terminology, and analytical depth.',
            'advanced': 'Provide rigorous, high-level analysis with architectural nuances, edge cases, quantitative metrics, and systemic implications.',
            'exam_oriented': 'Format as high-yield revision material: concise bullet points, exact definitions, expected question patterns, and marking-scheme takeaways.'
        }
        diff_inst = diff_instructions.get(difficulty, diff_instructions['intermediate'])

        prompts = {
            'summary': f"""Provide an authoritative, well-structured Executive & Academic Summary of "{filename}".
Level: {difficulty.upper()} ({diff_inst}).
Structure with:
## Overview & Primary Objectives
## Key Findings & Core Takeaways
## Strategic & Practical Implications""",

            'short_notes': f"""Generate comprehensive, high-retention Short Notes from "{filename}".
Level: {difficulty.upper()} ({diff_inst}).
Structure with:
## 📌 Core Takeaways & Quick Facts
## 🔑 Critical Definitions & Formulae
## 📊 Key Data Points, Dates & Metrics
## 💡 Important Rules, Principles & Guidelines
Use bold highlights, bullet points, and clean markdown.""",

            'important_questions': f"""Generate 6-8 High-Yield Important Questions with comprehensive model answers based strictly on "{filename}".
Level: {difficulty.upper()} ({diff_inst}).
Format each question as:
### Question [number]: [High-impact question]
**Model Answer:** [In-depth answer directly citing document facts]
**Key Concept Tested:** [Underlying theme or rule]""",

            'viva_questions': f"""Generate 6-8 challenging Viva / Oral Examination Questions with model answers based strictly on "{filename}".
Level: {difficulty.upper()} ({diff_inst}).
Format each question as:
### Q[number]: [Clear, conceptual question]
**Model Answer:** [Precise, factual response citing document facts]
**Key Examiner Evaluation Criteria:** [What the interviewer looks for]""",

            'exam_questions': f"""Generate 5 high-yield Academic Examination Questions based on "{filename}".
Level: {difficulty.upper()} ({diff_inst}).
Include a mix of Short-Answer (2-3 marks) and Long-Answer (5-10 marks) questions.
Format each with:
### Question [number] ([marks] Marks)
[Question statement]
**Model Answer Outline:**
- [Key point 1]
- [Key point 2]
**Expected Keywords:** `[term1]`, `[term2]`""",

            'key_concepts': f"""Generate a structured Glossary & Conceptual Framework of all key concepts from "{filename}".
Level: {difficulty.upper()} ({diff_inst}).
Format with:
## 🧠 Core Conceptual Framework
## 📖 Concept Glossary
For each concept:
- **[Concept Name]**: [Precise definition and why it matters in this context]""",

            'explain_beginner': f"""Explain "{filename}" using the Feynman Technique (Explain Like I'm 5 / Clear Topic Breakdown).
Level: {difficulty.upper()} ({diff_inst}).
Structure with:
## 🌟 The Big Picture (In Plain English)
## 🧩 How It Works (A Simple Analogy)
## 🔍 What You Actually Need to Know
## 🚀 Why This Matters in the Real World"""
        }

        chosen_prompt = prompts.get(study_type, prompts['short_notes'])

        full_prompt = f"""You are DocuMind AI, an elite university professor and personalized learning tutor.
Generate high-quality academic study material based strictly on the provided document text.

{chosen_prompt}

DIFFICULTY LEVEL: {difficulty.upper()}
{diff_inst}

STRICT GROUNDING: Base all assertions, facts, formulas, and data points strictly on the document text. Do not hallucinate external facts.

DOCUMENT TEXT ("{filename}"):
{text[:8000]}

STUDY MATERIAL:"""

        result = call_gemini_rest(full_prompt, max_tokens=2200)
        return JSONResponse({"result": result})
    except Exception as e:
        return JSONResponse({"error": str(e)}, status_code=500)

async def flashcards(request: Request):
    try:
        body = await request.json()
        text = body.get('text', '').strip()
        filename = body.get('filename', 'document')
        count = int(body.get('count', 6))

        if not text:
            return JSONResponse({"error": "Text is required"}, status_code=400)

        prompt = f"""You are an expert educator. Formulate {count} high-impact study flashcards based strictly on "{filename}".
Each card must test a core concept, key metric, term, or definition found directly in the text.

Return ONLY a valid JSON array of objects with the exact schema:
[
  {{
    "id": "1",
    "question": "Clear conceptual or factual question / term?",
    "answer": "Concise, authoritative answer directly from document",
    "sourceSnippet": "Short exact excerpt or citation from document"
  }}
]

DOCUMENT:
{text[:6000]}

JSON ARRAY:"""

        raw = call_gemini_rest(prompt, max_tokens=1800)
        cards = extract_json_array(raw)
        if isinstance(cards, list) and len(cards) > 0:
            formatted = []
            for idx, c in enumerate(cards):
                formatted.append({
                    "id": str(c.get("id", idx + 1)),
                    "question": str(c.get("question", "")),
                    "answer": str(c.get("answer", "")),
                    "sourceSnippet": str(c.get("sourceSnippet", ""))
                })
            return JSONResponse({"flashcards": formatted})

        return JSONResponse({"error": "Failed to parse flashcards from AI response", "raw": raw}, status_code=502)
    except Exception as e:
        return JSONResponse({"error": str(e)}, status_code=500)

async def quiz(request: Request):
    try:
        body = await request.json()
        text = body.get('text', '').strip()
        filename = body.get('filename', 'document')
        count = int(body.get('count', 10))

        if not text:
            return JSONResponse({"error": "Text is required"}, status_code=400)

        prompt = f"""You are a certified university exam creator. Formulate {count} challenging, high-yield multiple-choice questions based strictly on "{filename}".
Each question MUST have EXACTLY 4 options, a correctIndex (0, 1, 2, or 3), and a thorough explanation citing the document facts.

Return ONLY a valid JSON array of objects with the exact schema:
[
  {{
    "id": "1",
    "question": "Question text here?",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correctIndex": 0,
    "explanation": "Why this option is correct based strictly on the text."
  }}
]

DOCUMENT:
{text[:7000]}

JSON ARRAY:"""

        raw = call_gemini_rest(prompt, max_tokens=2600)
        qs = extract_json_array(raw)
        if isinstance(qs, list) and len(qs) > 0:
            formatted = []
            for idx, q in enumerate(qs):
                opts = q.get("options", [])
                if not isinstance(opts, list) or len(opts) < 2:
                    opts = ["True", "False", "Partially True", "Not Mentioned"]
                elif len(opts) > 4:
                    opts = opts[:4]
                while len(opts) < 4:
                    opts.append("None of the above")

                correct_idx = q.get("correctIndex", 0)
                if not isinstance(correct_idx, int) or correct_idx < 0 or correct_idx >= len(opts):
                    correct_idx = 0

                formatted.append({
                    "id": str(q.get("id", idx + 1)),
                    "question": str(q.get("question", "")),
                    "options": [str(o) for o in opts],
                    "correctIndex": correct_idx,
                    "explanation": str(q.get("explanation", "Based directly on the source document."))
                })
            return JSONResponse({"questions": formatted})

        return JSONResponse({"error": "Failed to parse MCQs from AI response", "raw": raw}, status_code=502)
    except Exception as e:
        return JSONResponse({"error": str(e)}, status_code=500)

routes = [
    Route("/api/health", health, methods=["GET"]),
    Route("/api/chat", chat, methods=["POST"]),
    Route("/api/summarize", summarize, methods=["POST"]),
    Route("/api/study", study, methods=["POST"]),
    Route("/api/flashcards", flashcards, methods=["POST"]),
    Route("/api/quiz", quiz, methods=["POST"]),
]

middleware = [
    Middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_methods=["*"],
        allow_headers=["*"],
    )
]

app = Starlette(debug=True, routes=routes, middleware=middleware)

if __name__ == "__main__":
    import uvicorn
    print("Starting DocuMind AI Python Backend on http://localhost:8000")
    print(f"Gemini API Key configured: {'Yes' if GEMINI_API_KEY else 'No'}")
    uvicorn.run(app, host="0.0.0.0", port=8000)
