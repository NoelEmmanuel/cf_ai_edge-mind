import { DurableObject } from "cloudflare:workers";
import { ChatMessage } from "@cf-ai-edge-mind/shared";

export class SessionDO extends DurableObject {
    private state: DurableObjectState;
    private messages: ChatMessage[] = [];

    constructor(state: DurableObjectState, env: Env) {
        super(state, env);
        this.state = state;
        // Restore state on initialization
        this.state.blockConcurrencyWhile(async () => {
            const stored = await this.state.storage.get<ChatMessage[]>("messages");
            this.messages = stored || [];
        });
    }

    async fetch(request: Request): Promise<Response> {
        const url = new URL(request.url);
        const path = url.pathname;

        if (path === "/append" && request.method === "POST") {
            const message = await request.json() as ChatMessage;
            message.timestamp = Date.now();
            this.messages.push(message);

            // Keep only last 25 messages to manage context window
            if (this.messages.length > 25) {
                this.messages = this.messages.slice(-25);
            }

            await this.state.storage.put("messages", this.messages);
            return new Response(JSON.stringify({ ok: true, messages: this.messages }), {
                headers: { "Content-Type": "application/json" }
            });
        }

        if (path === "/history" && request.method === "GET") {
            return new Response(JSON.stringify({ messages: this.messages }), {
                headers: { "Content-Type": "application/json" }
            });
        }

        if (path === "/clear" && request.method === "POST") {
            this.messages = [];
            await this.state.storage.delete("messages");
            return new Response(JSON.stringify({ ok: true }), {
                headers: { "Content-Type": "application/json" }
            });
        }

        return new Response("Not found", { status: 404 });
    }
}
