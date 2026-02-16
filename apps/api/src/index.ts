import { Hono } from 'hono';

type Bindings = {
    AI: any;
    SESSION_DO: DurableObjectNamespace;
}

const app = new Hono<{ Bindings: Bindings }>();

app.get('/', (c) => c.text('Hello Cloudflare Workers!'));
app.get('/health', (c) => c.json({ ok: true }));

export default app;
export { SessionDO } from './durable_objects/SessionDO';
