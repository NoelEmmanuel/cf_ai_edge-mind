export type UserSession = {
    id: string;
    createdAt: number;
};

export type ChatMessage = {
    role: 'system' | 'user' | 'assistant';
    content: string;
    timestamp?: number;
};

export type ChatRequest = {
    sessionId: string;
    message: string;
    debug?: boolean;
};

export type DebugMetrics = {
    total_ms: number;
    do_read_ms?: number;
    ai_ms?: number;
    do_write_ms?: number;
    history_count?: number;
};

export type ChatResponse = {
    reply: string;
    debug?: DebugMetrics;
};

export type HistoryResponse = {
    messages: ChatMessage[];
};

export type PlanStep = {
    id: string;
    text: string;
    done: boolean;
};

export type Plan = {
    title: string;
    steps: PlanStep[];
};

export type PlanUpdateRequest = {
    sessionId: string;
    stepId: string;
    done: boolean;
};
