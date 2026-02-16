# Cloudflare AI Edge Mind

A monorepo for an AI-powered application built on Cloudflare Pages + Workers + Workers AI + Durable Objects.

## Structure

*   `apps/web`: Frontend application (Vite + React)
*   `apps/api`: Backend application (Cloudflare Workers + Hono + Durable Objects)
*   `packages/shared`: Shared TypeScript types and schemas

## Features

- **Workers AI**: Llama-3-8b-instruct for chat generation.
- **Durable Objects**: Persistent conversational memory and Plan State management.
- **Plan Mode**: Generate and track structured plans.
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
    - Start message with "plan:" to generate a structured plan.
*   `GET /api/memory/:sessionId`: Retrieve history.
*   `GET /api/plan/:sessionId`: Retrieve current plan.
*   `POST /api/plan/update`: Toggle step status.

### Testing Plan Mode

**1. Create a Plan:**
In the UI or via curl, send a message starting with `plan:`:

```powershell
Invoke-RestMethod -Uri "http://localhost:8787/chat" -Method Post -ContentType "application/json" -Body '{"sessionId": "test-plan", "message": "Plan: Organize a birthday party"}'
```

**2. Check the Plan:**
```powershell
Invoke-RestMethod -Uri "http://localhost:8787/plan/test-plan"
```

**3. Update a Step:**
(Replace `1` with an actual step ID from the previous command)
```powershell
Invoke-RestMethod -Uri "http://localhost:8787/plan/update" -Method Post -ContentType "application/json" -Body '{"sessionId": "test-plan", "stepId": "1", "done": true}'
```