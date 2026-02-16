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
- **Observability**: Built-in debug metrics for latency tracing.
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

## Deployment & Evaluation

This project is designed for easy deployment on Cloudflare.

### 1. Deploy the API (Worker)

```bash
cd apps/api
npx wrangler deploy
```
*Note the URL of the deployed worker (e.g., `https://cf-ai-edge-mind-api.your-subdomain.workers.dev`).*

### 2. Deploy the Frontend (Pages)

Build the web app, pointing it to your deployed API:

```bash
cd apps/web
# Replace with your actual API URL from step 1
export VITE_API_URL=https://cf-ai-edge-mind-api.your-subdomain.workers.dev
npm run build
npx wrangler pages deploy dist
```

### 3. Quick Demo Script

Once deployed (or running locally), follow this script to verify all features:

1.  **Check Memory & AI**:
    - Click **"Demo Chat"** (or type "What is the capital of Mars?").
    - Result: AI responds. Reload the page. The chat history should persist (Durable Object Memory).

2.  **Check Plan Mode**:
    - Click **"Demo Plan"** (or type "Plan: Build a moon base").
    - Result: AI generates a structured plan. A "Current Plan" panel appears on the right.
    - Click a checkbox to mark a step as done. Reload the page. The state is preserved.

3.  **Check Observability**:
    - Toggle the **"Debug"** checkbox in the top right.
    - Send a new message.
    - Result: A diagnostics panel appears below the chat showing latency for AI and DO operations.

## Evaluation Checklist

- [x] **LLM Integration**: Uses `@cf/meta/llama-3-8b-instruct`.
- [x] **Workflow/Coordination**: "Plan Mode" orchestrates structured task generation and state management.
- [x] **Input**: Text chat + Interactive Plan Checklist.
- [x] **Memory/State**: Durable Objects store chat history and plan state per session.
- [x] **Observability**: Debug mode surfaces performance metrics.

## API Endpoints

*   `POST /api/chat`: Send a message. Returns AI reply.
    - Start message with "plan:" to generate a structured plan.
    - Add `"debug": true` to request body to receive performance metrics.
*   `GET /api/memory/:sessionId`: Retrieve history.
*   `GET /api/plan/:sessionId`: Retrieve current plan.
*   `POST /api/plan/update`: Toggle step status.