import { DurableObject } from "cloudflare:workers";
import { ChatMessage, Plan } from "@cf-ai-edge-mind/shared";

export class SessionDO extends DurableObject {
    private state: DurableObjectState;
    private messages: ChatMessage[] = [];
    private plan: Plan | null = null;

    constructor(state: DurableObjectState, env: Env) {
        super(state, env);
        this.state = state;
        // Restore state on initialization
        this.state.blockConcurrencyWhile(async () => {
            const storedMessages = await this.state.storage.get<ChatMessage[]>("messages");
            this.messages = storedMessages || [];

            const storedPlan = await this.state.storage.get<Plan>("plan");
            this.plan = storedPlan || null;
        });
    }

    async fetch(request: Request): Promise<Response> {
        const url = new URL(request.url);
        const path = url.pathname;

        // Messages Handling
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
            this.plan = null;
            await this.state.storage.delete(["messages", "plan"]);
            return new Response(JSON.stringify({ ok: true }), {
                headers: { "Content-Type": "application/json" }
            });
        }

        // Plan Handling
        if (path === "/plan" && request.method === "GET") {
            return new Response(JSON.stringify({ plan: this.plan }), {
                headers: { "Content-Type": "application/json" }
            });
        }

        if (path === "/plan" && request.method === "POST") {
            const newPlan = await request.json() as Plan;
            this.plan = newPlan;
            await this.state.storage.put("plan", this.plan);
            return new Response(JSON.stringify({ ok: true, plan: this.plan }), {
                headers: { "Content-Type": "application/json" }
            });
        }

        if (path === "/plan/update" && request.method === "POST") {
            const { stepId, done } = await request.json() as { stepId: string, done: boolean };
            if (this.plan) {
                const step = this.plan.steps.find(s => s.id === stepId);
                if (step) {
                    step.done = done;
                    await this.state.storage.put("plan", this.plan);
                }
            }
            return new Response(JSON.stringify({ ok: true, plan: this.plan }), {
                headers: { "Content-Type": "application/json" }
            });
        }

        return new Response("Not found", { status: 404 });
    }
}
