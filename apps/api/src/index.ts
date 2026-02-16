import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { ChatRequest, ChatResponse, ChatMessage, HistoryResponse, Plan, PlanUpdateRequest } from '@cf-ai-edge-mind/shared';

type Bindings = {
    AI: any;
    SESSION_DO: DurableObjectNamespace;
}

const app = new Hono<{ Bindings: Bindings }>();

app.use('/*', cors());

app.get('/', (c) => c.text('Hello Cloudflare Workers!'));
app.get('/health', (c) => c.json({ ok: true }));

// Helper to get DO stub
const getSessionStub = (c: any, sessionId: string) => {
    const id = c.env.SESSION_DO.idFromName(sessionId);
    return c.env.SESSION_DO.get(id);
};

app.post('/chat', async (c) => {
    let body: ChatRequest;
    try {
        body = await c.req.json();
    } catch (e) {
        return c.json({ error: 'Invalid JSON' }, 400);
    }

    if (!body.sessionId || !body.message) {
        return c.json({ error: 'Missing sessionId or message' }, 400);
    }

    const stub = getSessionStub(c, body.sessionId);

    // 1. Get current history
    const historyRes = await stub.fetch(new Request('http://internal/history'));
    const historyData = await historyRes.json() as HistoryResponse;
    const history = historyData.messages || [];

    // Check for Plan Mode
    if (body.message.toLowerCase().startsWith('plan:')) {
        const planPrompt = body.message.substring(5).trim();

        try {
            console.log("Generating plan for:", planPrompt);
            const planResponse: any = await c.env.AI.run('@cf/meta/llama-3-8b-instruct', {
                messages: [
                    { role: 'system', content: 'You are a planning assistant. Output ONLY valid JSON. Max 5 steps. EXAMPLE: { "title": "My Plan", "steps": [{ "id": "1", "text": "Step 1", "done": false }] }. Do not include any conversational text.' },
                    { role: 'user', content: `Create a plan for: ${planPrompt}` }
                ]
            });

            const raw = planResponse.response;
            console.log("Raw AI Plan Response:", raw);

            // Parse valid JSON from response
            let plan: Plan;
            try {
                // improved parsing: find the first { and last }
                const jsonMatch = raw.match(/\{[\s\S]*\}/);
                if (!jsonMatch) {
                    throw new Error("No JSON found in response");
                }
                const jsonStr = jsonMatch[0];
                plan = JSON.parse(jsonStr);

                // Ensure IDs if missing
                if (plan.steps) {
                    plan.steps.forEach((s, i) => { if (!s.id) s.id = String(i + 1); s.done = false; });
                }
            } catch (e) {
                console.error("Plan Parse Error:", e, "Raw:", raw);
                return c.json({ reply: `I failed to generate a structured plan. Internal Error: ${e}. Raw output: ${raw.substring(0, 500)}` } as ChatResponse);
            }

            // Save Plan to DO
            await stub.fetch(new Request('http://internal/plan', {
                method: 'POST',
                body: JSON.stringify(plan)
            }));

            // Save interaction to history
            const userMessage: ChatMessage = { role: 'user', content: body.message, timestamp: Date.now() };
            const assistantMessage: ChatMessage = { role: 'assistant', content: `I've created a plan: "${plan.title}". Check the plan tab/section.`, timestamp: Date.now() };

            await stub.fetch(new Request('http://internal/append', { method: 'POST', body: JSON.stringify(userMessage) }));
            await stub.fetch(new Request('http://internal/append', { method: 'POST', body: JSON.stringify(assistantMessage) }));

            return c.json({ reply: assistantMessage.content } as ChatResponse);

        } catch (error) {
            console.error("Plan Generation Error", error);
            return c.json({ error: "Failed to generate plan" }, 500);
        }
    }

    // Normal Chat Flow
    const userMessage: ChatMessage = { role: 'user', content: body.message };
    const systemMessage: ChatMessage = { role: 'system', content: 'You are a helpful AI assistant.' };

    const messagesForAI = [
        systemMessage,
        ...history.map((m: ChatMessage) => ({ role: m.role, content: m.content })),
        { role: 'user', content: body.message }
    ];

    try {
        const aiResponse: any = await c.env.AI.run('@cf/meta/llama-3-8b-instruct', {
            messages: messagesForAI
        });

        const replyContent = aiResponse.response;

        await stub.fetch(new Request('http://internal/append', {
            method: 'POST',
            body: JSON.stringify(userMessage)
        }));

        const assistantMessage: ChatMessage = { role: 'assistant', content: replyContent };
        await stub.fetch(new Request('http://internal/append', {
            method: 'POST',
            body: JSON.stringify(assistantMessage)
        }));

        return c.json({ reply: replyContent } as ChatResponse);

    } catch (error: any) {
        console.error("AI Error:", error);
        return c.json({ error: 'Failed to generate response' }, 500);
    }
});

app.get('/memory/:sessionId', async (c) => {
    const sessionId = c.req.param('sessionId');
    const stub = getSessionStub(c, sessionId);
    const res = await stub.fetch(new Request('http://internal/history'));
    return c.json(await res.json());
});

app.post('/memory/clear', async (c) => {
    const body = await c.req.json() as { sessionId: string };
    if (!body.sessionId) return c.json({ error: 'Missing sessionId' }, 400);

    const stub = getSessionStub(c, body.sessionId);
    await stub.fetch(new Request('http://internal/clear', { method: 'POST' }));
    return c.json({ ok: true });
});

// Plan specific endpoints
app.get('/plan/:sessionId', async (c) => {
    const sessionId = c.req.param('sessionId');
    const stub = getSessionStub(c, sessionId);
    const res = await stub.fetch(new Request('http://internal/plan'));
    return c.json(await res.json());
});

app.post('/plan/update', async (c) => {
    const body = await c.req.json() as PlanUpdateRequest;
    if (!body.sessionId || !body.stepId) return c.json({ error: 'Missing data' }, 400);

    const stub = getSessionStub(c, body.sessionId);
    const res = await stub.fetch(new Request('http://internal/plan/update', {
        method: 'POST',
        body: JSON.stringify({ stepId: body.stepId, done: body.done })
    }));
    return c.json(await res.json());
});

export default app;
export { SessionDO } from './durable_objects/SessionDO';
