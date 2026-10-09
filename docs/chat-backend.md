# Chat backend ("Chat with Uday")

The **Chat** button in the nav bar, and the `chat [message]` terminal command,
open the comms panel (`shared/comms.js`). It needs no server. If no backend is
configured, an offline auto-responder answers simple questions (CV, contact,
GitHub, research, work, blog) and says that the AI isn't connected yet.

## Connecting a backend (RAG, a local LLM, etc.)

Set `endpoint` in `shared/chat-config.json`:

```json
{
  "endpoint": "https://chat.example.com/api/chat",
  "title": "Chat with Uday",
  "greeting": "Hi, I'm Uday. Ask me anything about my work.",
  "timeoutMs": 45000,
  "headers": {}
}
```

### Request

`POST <endpoint>` with `Content-Type: application/json`:

```json
{
  "message": "What did you work on at Tiger Analytics?",
  "history": [{ "role": "user", "content": "..." }, { "role": "assistant", "content": "..." }],
  "context": { "page": "/work/index.html" }
}
```

`history` contains up to the last 12 turns. The current `message` is not
included in it.

### Response (any one of these)

- **JSON** (`application/json`): `{ "reply": "..." }`. The panel also accepts
  an Ollama `/api/chat`-style body `{ "message": { "content": "..." } }` and an
  OpenAI-style body `{ "choices": [{ "message": { "content": "..." } }] }`.
- **Streaming plain text** (`text/plain`, chunked): each chunk is appended to
  the reply as it arrives.

Replies are rendered as text, never as HTML. `http(s)://` and `mailto:` URLs
are turned into links. If the request fails or exceeds `timeoutMs`, the panel
falls back to the offline responder and shows `(Uplink failed — answering
offline.)`.

## Hosting notes

- The site is served over HTTPS, so the endpoint must also be HTTPS. The one
  exception is `http://localhost` / `127.0.0.1`, which browsers allow, but only
  from your own machine. For public visitors, expose the local server through
  a tunnel (for example Cloudflare Tunnel or Tailscale Funnel) or a reverse
  proxy.
- Enable CORS for the site's origin (for example
  `Access-Control-Allow-Origin: https://new.udaygirish.com`) and allow the
  `Content-Type` header (preflight `OPTIONS`).
- Rate-limit the endpoint and cap message length. Anyone who visits the site
  can call it.
- The optional Node gateway in `server/` could also host this route at
  `/api/chat` (same origin, so CORS is not needed).

## Minimal example (FastAPI + Ollama + your own retriever)

```python
# pip install fastapi uvicorn httpx
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import httpx

app = FastAPI()
app.add_middleware(CORSMiddleware, allow_origins=["https://new.udaygirish.com"],
                   allow_methods=["POST"], allow_headers=["Content-Type"])

class Chat(BaseModel):
    message: str
    history: list[dict] = []
    context: dict = {}

def retrieve(q: str) -> str:
    return ""  # plug in your vector store (CV, papers, blog posts) here

@app.post("/api/chat")
async def chat(body: Chat):
    system = ("You are Uday Girish Maradana answering visitors on his portfolio. "
              "Answer only from the context; say so if unsure.\n\nContext:\n"
              + retrieve(body.message))
    msgs = [{"role": "system", "content": system}, *body.history[-12:],
            {"role": "user", "content": body.message[:2000]}]
    async with httpx.AsyncClient(timeout=60) as c:
        r = await c.post("http://localhost:11434/api/chat",
                         json={"model": "llama3.1", "messages": msgs, "stream": False})
    return {"reply": r.json()["message"]["content"]}
```
