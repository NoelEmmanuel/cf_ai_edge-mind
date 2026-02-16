# Cloudflare AI Edge Mind

A monorepo for an AI-powered application built on Cloudflare Pages + Workers + Workers AI + Durable Objects.

## Structure

*   `apps/web`: Frontend application (Vite + React)
*   `apps/api`: Backend application (Cloudflare Workers + Hono + Durable Objects)
*   `packages/shared`: Shared TypeScript types and schemas

## Features

- **Workers AI**: Llama-3-8b-instruct for chat generation.
- **Durable Objects**: Persistent conversational memory (last 25 messages) per session.
- **Vite Proxy**: Seamless local development proxying `/api` to the worker.

## Local Development

1.  **Install dependencies**:
    ```bash
    npm install
    ```

2.  **Start the Backend (API)**:
    ```bash
    npm run dev:api
    ```

3.  **Start the Frontend (Web)**:
    ```bash
    npm run dev:web
    ```

## API Endpoints

*   `POST /api/chat`: Send a message. Returns AI reply.
    - Body: `{ sessionId: string, message: string }`
*   `GET /api/memory/:sessionId`: Retrieve full chat history for a session.
*   `POST /api/memory/clear`: Clear history for a session.
    - Body: `{ sessionId: string }`

### Testing Memory

**1. Send a message (tell it your name):**
```powershell
Invoke-RestMethod -Uri "http://localhost:8787/chat" -Method Post -ContentType "application/json" -Body '{"sessionId": "test-mem", "message": "Hi, I am Noel"}'
```

**2. Send a follow-up (ask it to recall):**
```powershell
Invoke-RestMethod -Uri "http://localhost:8787/chat" -Method Post -ContentType "application/json" -Body '{"sessionId": "test-mem", "message": "What is my name?"}'
```

**3. Check History:**
```powershell
Invoke-RestMethod -Uri "http://localhost:8787/memory/test-mem"
```

**4. Clear History:**
```powershell
Invoke-RestMethod -Uri "http://localhost:8787/memory/clear" -Method Post -ContentType "application/json" -Body '{"sessionId": "test-mem"}'
```