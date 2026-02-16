# Cloudflare AI Edge Mind

> **A latency-aware, AI-powered task planner built on Cloudflare Workers, Durable Objects, and Workers AI.**

This project demonstrates how to build a stateful, intelligent agent at the edge. It combines **LLM reasoning** (Llama 3 via Workers AI) with **persistent memory** (Durable Objects) and a **lightweight workflow engine** ("Plan Mode") to orchestrate complex tasks—all with sub-second coordination overhead.

---

## 🚀 Why This Architecture?

Traditional AI agents are slow and stateless. Most rely on heavy servers, external vector databases, and long round-trips.

**AI Edge Mind** proves a different approach is possible:
1.  **Zero-Cold-Start Logic**: Cloudflare Workers handle requests instantly.
2.  **State at the Edge**: Durable Objects give each user session a dedicated, consistent "brain" that remembers context and plans instantly, without external DB latency.
3.  **Local Inference**: Using Workers AI keeps the LLM close to the logic and data, minimizing network hops.

### Architecture Diagram

```ascii
User (Browser)
   │
   ▼
[ Cloudflare Pages (Vite + React) ]
   │
   │ (HTTPS /api/chat)
   ▼
[ Cloudflare Worker (API Gateway) ]
   │
   ├───► [ Workers AI (@cf/meta/llama-3-8b-instruct) ]
   │       (Generates chat replies & structured plans)
   │
   └───► [ Durable Object (SessionDO) ]
           (Stores Chat History + Plan State)
```

---

## ✅ Feature Checklist

This project fulfills all assignment requirements:

| Requirement | Implementation |
| :--- | :--- |
| **LLM Integration** | Uses `@cf/meta/llama-3-8b-instruct` for all text generation and reasoning. |
| **Workflow / Coordination** | **"Plan Mode"**: Detects complex requests, generates a structured JSON plan, and tracks execution state. |
| **Inputs** | **Text Chat**: Natural language interface.<br>**Interactive UI**: Clickable plan checklist updates state in real-time. |
| **Memory / State** | **Durable Objects**: Every session has a persistent `SessionDO` that stores message history and the active plan. State survives refreshments. |

---

## 🛠️ Local Development

### Prerequisites
- Node.js (v18+)
- npm

### 1. Install Dependencies
```bash
npm install
```

### 2. Start the Backend (API)
Runs the Worker locally on port `8787`.
```bash
npm run dev:api
```

### 3. Start the Frontend (Web)
Runs the React app locally on port `5173`.
```bash
npm run dev:web
```

Access the app at **[http://localhost:5173](http://localhost:5173)**.

---

## 🧪 Demo Script

Follow this script to verify all functionality in under 2 minutes.

### 1. Test Chat & Memory
*Action:* Click **"Demo Chat"** (or type "What is the capital of Mars?").
*Expected:*
- AI responds (e.g., "Mars has no capital...").
- **Refresh the page.**
- The conversation history reloads instantly (Durable Object persistence).

### 2. Test Plan Mode (Workflow)
*Action:* Click **"Demo Plan"** (or type "Plan: Build a moon base").
*Expected:*
- AI detects the `Plan:` prefix.
- Generates a structured JSON plan (e.g., "1. Site Selection", "2. Life Support").
- A **Plan Sidebar** appears on the right.
- *Action:* Click a checkbox to mark a step as "Done".
- *Action:* Refresh the page. The plan and its checked state persist.

### 3. Test Observability
*Action:* Toggle the **"Debug"** checkbox in the header.
*Action:* Send a new message (e.g., "Hello").
*Expected:*
- A **Metrics Card** appears below the chat.
- Shows exact latency for:
    - **Total**: End-to-end request time.
    - **AI**: Time spent waiting for Llama 3 inference.
    - **DO Read/Write**: Time spent loading/saving state to the Durable Object.

---

## 🚢 Deployment

### 1. Deploy API (Worker)
```bash
cd apps/api
npx wrangler deploy
```
*Take note of the worker URL (e.g., `https://api.your-name.workers.dev`).*

### 2. Deploy Frontend (Pages)
```bash
cd apps/web
# Point to your production API
# Windows (PowerShell):
$env:VITE_API_URL="https://api.your-name.workers.dev"
# Mac/Linux:
# export VITE_API_URL=https://api.your-name.workers.dev

npm run build
npx wrangler pages deploy dist
```

---

## 📂 Repository Structure

*   **`apps/api`**: The backend logic.
    *   `src/index.ts`: Main Worker entry point (Router, AI calls).
    *   `src/durable_objects/SessionDO.ts`: The stateful "brain" of the session.
*   **`apps/web`**: The frontend UI.
    *   `src/App.tsx`: Main React component (Chat UI, Plan Sidebar, Logic).
    *   `src/index.css`: Modern dark-theme styling.
*   **`packages/shared`**: Shared TypeScript definitions (`ChatRequest`, `Plan`, `DebugMetrics`) to ensure type safety across the monorepo.