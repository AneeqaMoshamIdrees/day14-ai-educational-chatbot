import os
import json
import time
import asyncio
import logging
from datetime import datetime
from pathlib import Path
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from dotenv import load_dotenv

from google import genai
from google.genai import types

# ---------------------------------------------------------------------------
# Setup
# ---------------------------------------------------------------------------
load_dotenv()

GEMINI_MODEL = "gemini-3.5-flash-lite"
SESSION_TIMEOUT = 60   # seconds of inactivity before a session is considered dead
SWEEP_INTERVAL = 20    # how often the background sweep checks for expired sessions
MAX_EXCHANGES = 6      # one exchange = one user message + one model reply

client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))


async def sweep_expired_sessions():
    """Background task: proactively deletes any session nobody explicitly
    ended (closed tab, crashed client, failed network call) once it's been
    idle past SESSION_TIMEOUT."""
    while True:
        await asyncio.sleep(SWEEP_INTERVAL)
        now = time.time()
        expired = [sid for sid, s in sessions.items() if now - s["last_active"] > SESSION_TIMEOUT]
        for sid in expired:
            sessions.pop(sid, None)


@asynccontextmanager
async def lifespan(app: FastAPI):
    task = asyncio.create_task(sweep_expired_sessions())
    yield
    task.cancel()


app = FastAPI(title="Curio Kids API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[os.getenv("FRONTEND_ORIGIN", "http://localhost:5173")],
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(
    filename="requests.log",
    level=logging.INFO,
    format="%(message)s",
)

# ---------------------------------------------------------------------------
# Load prompts from disk once at startup
# ---------------------------------------------------------------------------
PROMPTS_DIR = Path(__file__).parent / "prompts"


def load_prompt(name: str) -> str:
    return (PROMPTS_DIR / f"{name}.md").read_text(encoding="utf-8")


SAFETY_BLOCK = load_prompt("common_safety")

SYSTEM_PROMPTS = {
    "brain_buster": load_prompt("brain_buster") + "\n\n" + SAFETY_BLOCK,
    "quick_fire": load_prompt("quick_fire") + "\n\n" + SAFETY_BLOCK,
    "ask_explore": load_prompt("ask_explore") + "\n\n" + SAFETY_BLOCK,
}

# JSON_ACTIVITIES still get response_mime_type=application/json — Gemini
# streams the JSON text in pieces same as any other text, the frontend just
# buffers those pieces silently and only parses/displays once the stream
# finishes (see ActivityChat.jsx's onDone handler), instead of showing raw
# JSON fragments to the child mid-stream.
JSON_ACTIVITIES = {"brain_buster", "quick_fire"}

USED_PROMPT_FIELD = {
    "brain_buster": "new_riddle_text",
    "quick_fire": "new_question_text",
}

# ---------------------------------------------------------------------------
# In-memory session store
# ---------------------------------------------------------------------------
sessions: dict = {}


def get_or_create_session(session_id: str, activity: str) -> dict:
    now = time.time()
    existing = sessions.get(session_id)
    expired = existing and (now - existing["last_active"] > SESSION_TIMEOUT)

    if existing is None or expired:
        sessions[session_id] = {
            "activity": activity,
            "history": [],
            "last_active": now,
            "used_prompts": [],
        }

    sessions[session_id]["last_active"] = now
    return sessions[session_id]


def trim_history(history: list) -> list:
    """Keep only the latest MAX_EXCHANGES exchanges (user + model pairs)."""
    return history[-(MAX_EXCHANGES * 2):]


def build_system_instruction(activity: str, session: dict) -> str:
    """Base system prompt + a reminder of what's already been used this
    session — lives outside the trimmed history, so it survives even once
    the original riddle/question has scrolled out of trim_history()."""
    base = SYSTEM_PROMPTS[activity]
    used = session.get("used_prompts") or []
    if not used:
        return base
    used_list = "\n".join(f"- {item}" for item in used)
    return f"{base}\n\nAlready used this session — do NOT repeat any of these:\n{used_list}"


def record_used_prompt(activity: str, session: dict, parsed: dict) -> None:
    field = USED_PROMPT_FIELD.get(activity)
    if not field:
        return
    new_item = parsed.get(field)
    if new_item and new_item not in session["used_prompts"]:
        session["used_prompts"].append(new_item)


def log_request(session_id, activity, prompt, start, first_token_time, end, response_text, usage=None):
    entry = {
        "timestamp": datetime.utcnow().isoformat(),
        "session_id": session_id,
        "activity": activity,
        "prompt": prompt,
        "ttft_ms": round((first_token_time - start) * 1000, 1) if first_token_time else None,
        "total_ms": round((end - start) * 1000, 1),
        "input_tokens": getattr(usage, "prompt_token_count", None) if usage else None,
        "output_tokens": getattr(usage, "candidates_token_count", None) if usage else None,
        "total_tokens": getattr(usage, "total_token_count", None) if usage else None,
    }
    logging.info(json.dumps(entry))


class ChatRequest(BaseModel):
    session_id: str
    activity: str
    message: str


@app.get("/api/sessions")
def list_sessions():
    now = time.time()
    return [
        {
            "session_id": sid,
            "activity": s["activity"],
            "message_count": len(s["history"]),
            "idle_seconds": round(now - s["last_active"], 1),
        }
        for sid, s in sessions.items()
    ]


@app.post("/api/chat")
async def chat(req: ChatRequest):
    if req.activity not in SYSTEM_PROMPTS:
        raise HTTPException(status_code=400, detail="Unknown activity")

    session = get_or_create_session(req.session_id, req.activity)
    session["history"].append({"role": "user", "parts": [{"text": req.message}]})
    session["history"] = trim_history(session["history"])

    config_kwargs = {"system_instruction": build_system_instruction(req.activity, session)}
    if req.activity in JSON_ACTIVITIES:
        config_kwargs["response_mime_type"] = "application/json"

    start = time.time()

    # One unified streaming path for ALL activities. For Brain Buster/Quick
    # Fire, the frontend buffers every piece silently and only parses +
    # displays once the stream completes — it never shows raw JSON to the
    # child mid-stream. Ask & Explore displays pieces live as they arrive.
    def event_stream():
        first_token_time = None
        full_response = ""
        last_chunk = None

        try:
            stream = client.models.generate_content_stream(
                model=GEMINI_MODEL,
                contents=session["history"],
                config=types.GenerateContentConfig(**config_kwargs),
            )

            for chunk in stream:
                last_chunk = chunk
                if chunk.text:
                    if first_token_time is None:
                        first_token_time = time.time()
                    full_response += chunk.text
                    yield f"data: {json.dumps({'token': chunk.text})}\n\n"

            session["history"].append({"role": "model", "parts": [{"text": full_response}]})
            session["history"] = trim_history(session["history"])

            if req.activity in JSON_ACTIVITIES:
                try:
                    parsed = json.loads(full_response)
                    record_used_prompt(req.activity, session, parsed)
                except json.JSONDecodeError:
                    logging.warning("Model returned non-JSON for %s: %s", req.activity, full_response[:200])

            end = time.time()
            usage = getattr(last_chunk, "usage_metadata", None) if last_chunk else None
            log_request(req.session_id, req.activity, req.message, start, first_token_time, end,
                        full_response, usage=usage)
            yield "data: [DONE]\n\n"

        except Exception as error:
            logging.exception("Streaming error: %s", error)
            yield f"data: {json.dumps({'error': 'Something went wrong.'})}\n\n"

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@app.delete("/api/session/{session_id}")
def end_session(session_id: str):
    sessions.pop(session_id, None)
    return {"deleted": session_id}


@app.get("/")
def health():
    return {"status": "ok"}