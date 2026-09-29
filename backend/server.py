"""
DocuMind AI - Python RAG Backend Server
Implements conversational RAG document intelligence using Google Gemini and LangChain.
Compatible with Starlette and Uvicorn.
"""

import os
import json
from pathlib import Path
from dotenv import load_dotenv
from starlette.applications import Starlette
from starlette.middleware import Middleware
from starlette.middleware.cors import CORSMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse, Response
from starlette.routing import Route

# Load .env from project root
env_path = Path(__file__).resolve().parent.parent / '.env'
load_dotenv(dotenv_path=env_path)

GEMINI_API_KEY = (
    os.getenv('VITE_GEMINI_API_KEY')
    or os.getenv('GEMINI_API_KEY')
    or ''
)

def call_gemini_rest(prompt: str, max_tokens: int = 1000) -> str:
    """Calls Gemini REST API directly with model failover."""
    import urllib.request
    import urllib.error

    models = [
        'gemini-2.5-flash',
        'gemini-2.0-flash',
        'gemini-1.5-flash',
        'gemini-flash-latest',
        'gemini-3.5-flash-lite',
        'gemini-3.1-flash-lite',
        'gemini-flash-lite-latest',
        'gemini-3-flash-preview',
        'gemini-3.8-flash',
        'gemini-3.6-flash',
        'gemini-3.5-flash'
    ]
    
    for model in models:
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={GEMINI_API_KEY}"
        payload = json.dumps({
            "contents": [{"role": "user", "parts": [{"text": prompt}]}],
            "generationConfig": {"temperature": 0.2, "maxOutputTokens": max_tokens}
        }).encode('utf-8')

        req = urllib.request.Request(
            url,
            data=payload,
            headers={'Content-Type': 'application/json'},
            method='POST'
        )

        try:
            with urllib.request.urlopen(req, timeout=12) as response:
                result = json.loads(response.read().decode('utf-8'))
                text = result.get('candidates', [{}])[0].get('content', {}).get('parts', [{}])[0].get('text', '')
                if text:
                    return text.strip()
        except Exception:
            continue

    return "Unable to generate an AI response at this moment. Please verify your API key and connection."

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

        answer = call_gemini_rest(prompt)
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

        prompt = f"""Provide a concise 2-3 sentence executive summary of the document '{filename}':\n\n{text[:4000]}"""
        summary = call_gemini_rest(prompt, max_tokens=250)
        return JSONResponse({"summary": summary})
    except Exception as e:
        return JSONResponse({"error": str(e)}, status_code=500)

routes = [
    Route("/api/health", health, methods=["GET"]),
    Route("/api/chat", chat, methods=["POST"]),
    Route("/api/summarize", summarize, methods=["POST"]),
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
    print(f"Starting DocuMind AI Python Backend on http://localhost:8000")
    print(f"Gemini API Key configured: {'Yes' if GEMINI_API_KEY else 'No'}")
    uvicorn.run(app, host="0.0.0.0", port=8000)
