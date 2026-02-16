import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { ChatRequest, ChatResponse, ChatMessage, HistoryResponse } from '@cf-ai-edge-mind/shared';

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

    // 2. Prepare AI context
    const userMessage: ChatMessage = { role: 'user', content: body.message };
    const systemMessage: ChatMessage = { role: 'system', content: 'You are a helpful AI assistant.' };

    // Construct messages array: System + History + New User Message
    const messagesForAI = [
        systemMessage,
        ...history.map((m: ChatMessage) => ({ role: m.role, content: m.content })),
        { role: 'user', content: body.message }
    ];

    try {
        // 3. Run AI
        const aiResponse: any = await c.env.AI.run('@cf/meta/llama-3-8b-instruct', {
            messages: messagesForAI
        });

        const replyContent = aiResponse.response;

        // 4. Save User Message AND Assistant Reply to DO
        // We do this in parallel to save time, or sequential to ensure order. Sequential is safer for order.
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

export default app;
export { SessionDO } from './durable_objects/SessionDO';
