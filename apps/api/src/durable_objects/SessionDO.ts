import { DurableObject } from "cloudflare:workers";

export class SessionDO extends DurableObject {
    constructor(state: DurableObjectState, env: Env) {
        super(state, env);
    }

    async fetch(request: Request): Promise<Response> {
        return new Response("Session DO active");
    }
}
