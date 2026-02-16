import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { ChatRequest, ChatResponse, ChatMessage, HistoryResponse, Plan, PlanUpdateRequest, DebugMetrics } from '@cf-ai-edge-mind/shared';

type Bindings = {
    AI: any;
    SESSION_DO: DurableObjectNamespace;
}

const app = new Hono<{ Bindings: Bindings }>();

app.use('/*', cors());

app.get('/', (c) => c.text('Hello Cloudflare Workers!'));
app.get('/health', (c) => c.json({ ok: true }));

const getSessionStub = (c: any, sessionId: string) => {
    const id = c.env.SESSION_DO.idFromName(sessionId);
    return c.env.SESSION_DO.get(id);
};

app.post('/chat', async (c) => {
    const startTime = Date.now();
    const metrics: DebugMetrics = { total_ms: 0 };

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
    const t0 = Date.now();
    const historyRes = await stub.fetch(new Request('http://internal/history'));
    const historyData = await historyRes.json() as HistoryResponse;
    const history = historyData.messages || [];
    metrics.do_read_ms = Date.now() - t0;
    metrics.history_count = history.length;

    // Plan Mode
    if (body.message.toLowerCase().startsWith('plan:')) {
        const planPrompt = body.message.substring(5).trim();

        try {
            console.log("Generating plan for:", planPrompt);
            const tAI = Date.now();
            const planResponse: any = await c.env.AI.run('@cf/meta/llama-3-8b-instruct', {
                messages: [
                    { role: 'system', content: 'You are a planning assistant. Output ONLY valid JSON. Max 5 steps. EXAMPLE: { "title": "My Plan", "steps": [{ "id": "1", "text": "Step 1", "done": false }] }. Do not include any conversational text.' },
                    { role: 'user', content: `Create a plan for: ${planPrompt}` }
                ]
            });
            metrics.ai_ms = Date.now() - tAI;

            const raw = planResponse.response;
            console.log("Raw AI Plan Response:", raw);

            let plan: Plan;
            try {
                const jsonMatch = raw.match(/\{[\s\S]*\}/);
                if (!jsonMatch) throw new Error("No JSON found in response");
                plan = JSON.parse(jsonMatch[0]);
                if (plan.steps) {
                    plan.steps.forEach((s, i) => { if (!s.id) s.id = String(i + 1); s.done = false; });
                }
            } catch (e) {
                console.error("Plan Parse Error:", e, "Raw:", raw);
                return c.json({ reply: `I failed to generate a structured plan. Internal Error: ${e}. Raw output: ${raw.substring(0, 500)}` } as ChatResponse);
            }

            const tWrite = Date.now();
            await stub.fetch(new Request('http://internal/plan', {
                method: 'POST',
                body: JSON.stringify(plan)
            }));
            const userMessage: ChatMessage = { role: 'user', content: body.message, timestamp: Date.now() };
            const assistantMessage: ChatMessage = { role: 'assistant', content: `I've created a plan: "${plan.title}". Check the plan tab/section.`, timestamp: Date.now() };

            await stub.fetch(new Request('http://internal/append', { method: 'POST', body: JSON.stringify(userMessage) }));
            await stub.fetch(new Request('http://internal/append', { method: 'POST', body: JSON.stringify(assistantMessage) }));
            metrics.do_write_ms = Date.now() - tWrite;

            metrics.total_ms = Date.now() - startTime;
            const responseData: ChatResponse = {
                reply: assistantMessage.content
            };
            if (body.debug) responseData.debug = metrics;

            return c.json(responseData);

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
        const tAI = Date.now();
        const aiResponse: any = await c.env.AI.run('@cf/meta/llama-3-8b-instruct', {
            messages: messagesForAI
        });
        metrics.ai_ms = Date.now() - tAI;

        const replyContent = aiResponse.response;

        const tWrite = Date.now();
        await stub.fetch(new Request('http://internal/append', {
            method: 'POST',
            body: JSON.stringify(userMessage)
        }));

        const assistantMessage: ChatMessage = { role: 'assistant', content: replyContent };
        await stub.fetch(new Request('http://internal/append', {
            method: 'POST',
            body: JSON.stringify(assistantMessage)
        }));
        metrics.do_write_ms = Date.now() - tWrite;

        metrics.total_ms = Date.now() - startTime;
        const responseData: ChatResponse = { reply: replyContent };
        if (body.debug) responseData.debug = metrics;

        return c.json(responseData);

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
