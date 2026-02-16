# Cloudflare AI Edge Mind

A monorepo for an AI-powered application built on Cloudflare Pages + Workers + Workers AI + Durable Objects.

## Structure

*   `apps/web`: Frontend application (Vite + React)
*   `apps/api`: Backend application (Cloudflare Workers + Hono)
*   `packages/shared`: Shared TypeScript types and schemas

## Local Development

1.  **Install dependencies**:
    ```bash
    npm install
    ```

2.  **Start the Backend (API)**:
    Open a terminal and run:
    ```bash
    npm run dev:api
    ```
    This will start the Worker on `http://localhost:8787`.

3.  **Start the Frontend (Web)**:
    Open a second terminal and run:
    ```bash
    npm run dev:web
    ```
    This will start the Vite server slightly on a random port (usually `http://localhost:5173`).

4.  **Verification**:
    *   Open the frontend URL (e.g., `http://localhost:5173`).
    *   It should verify connection to the backend and display "Backend says: Hello Cloudflare Workers!".
    *   Check the browser console; you should see "Health check: { ok: true }".

## Endpoints

*   `GET /api`: Proxies to backend `/`. Returns "Hello Cloudflare Workers!".
*   `GET /api/health`: Proxies to backend `/health`. Returns `{ "ok": true }`.