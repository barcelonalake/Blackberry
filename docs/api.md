# AI Gateway API

## Health

```http
GET /health
```

## Models

```http
GET /v1/models
```

## App message entrypoint

```http
POST /v1/sessions/{session_id}/messages
Content-Type: application/json

{
  "messages": [
    { "role": "user", "content": "hello" }
  ],
  "stream": true
}
```

Current v0.1 implementation returns a mock assistant message. Next step: route through provider adapters and persist user/assistant messages to Supabase.

## SSE development endpoint

```http
GET /v1/sessions/{session_id}/messages/stream?prompt=hello
```

Emits `token` events and then `done`.
