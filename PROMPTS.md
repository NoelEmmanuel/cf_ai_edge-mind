# PROMPTS

## 2026-02-16 Setup PROMPTS.md logging standard

**Goal/Intent**: Establish a standardized logging mechanism for tracking high-level prompts and meaningful changes to the codebase.

**Prompt**: "Your job includes maintaining a PROMPTS.md file at the root of the repo... Log only high-level prompts that result in meaningful changes to the codebase... For each logged item, append a new section to PROMPTS.md with: Date, Goal / Intent, Prompt, Result."

**Result**: Created `PROMPTS.md` and documented the logging policy itself as the first entry, establishing the convention for future changes.

## 2026-02-16 Define Project Architecture

**Goal / Intent**: Design a scalable, production-ready monorepo structure for Cloudflare Workers + Pages + AI + Durable Objects.

**Prompt**: "Set up a production-ready file and folder structure for an AI-powered application built on Cloudflare Pages + Workers + Workers AI + Durable Objects... Monorepo style... Clear separation... Propose a complete directory tree."

**Result**: Proposed a monorepo structure (`apps/web`, `apps/api`, `packages/shared`) ensuring separation of frontend/backend while centralizing AI logic and Durable Objects within the API worker service.

## 2026-02-16 Implement Base Monorepo Structure

**Goal / Intent**: Initialize the physical directories and configuration files for the proposed monorepo architecture.

**Prompt**: "implement the base files and structure for this proposed file structure"

**Result**: Created `apps/web` (Vite + React), `apps/api` (Hono + Workers), and `packages/shared` directories. Configured root `package.json` workspaces, `create-react-app` boilerplates manually, and established `wrangler.toml` for the backend with placeholder bindings.

## 2026-02-16 Verify Local Development Environment

**Goal / Intent**: Ensure the monorepo is correctly configured for local development, enabling concurrent frontend and backend execution with proxy support.

**Prompt**: "make sure local dev works end-to-end and document it... Ensure root install works... Ensure npm run dev:web starts the Vite app... Ensure the web app can call the worker... Add the smallest possible GET /api/health route"

**Result**: Verified `npm install` and script execution. Added `/health` endpoint to `apps/api` and updated `apps/web` to consume it. Updated `README.md` with explicit local development instructions.

## 2026-02-16 Implement Chat with Workers AI

**Goal / Intent**: Create the first functional AI feature by connecting the frontend chat UI to the backend Workers AI (Llama model).

**Prompt**: "implement real chat with Workers AI... POST /api/chat... response with Llama model... update chat UI"

**Result**: Implemented `POST /chat` in `apps/api` using `@cf/meta/llama-3-8b-instruct`. Added a React chat interface in `apps/web` with session ID management. Updated `packages/shared` with request/response types.
