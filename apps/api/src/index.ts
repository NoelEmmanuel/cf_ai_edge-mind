import { Hono } from 'hono';
import { ChatRequest, ChatResponse } from '@cf-ai-edge-mind/shared';

type Bindings = {
    AI: any;
    SESSION_DO: DurableObjectNamespace;
}

const app = new Hono<{ Bindings: Bindings }>();

app.get('/', (c) => c.text('Hello Cloudflare Workers!'));
app.get('/health', (c) => c.json({ ok: true }));

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

    try {
        const response: any = await c.env.AI.run('@cf/meta/llama-3-8b-instruct', {
            messages: [
                { role: 'system', content: 'You are a helpful AI assistant.' },
                { role: 'user', content: body.message }
            ]
        });

        return c.json({ reply: response.response } as ChatResponse);
    } catch (error: any) {
        console.error("AI Error:", error);
        return c.json({ error: 'Failed to generate response' }, 500);
    }
});

export default app;
export { SessionDO } from './durable_objects/SessionDO';
