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
};

export type ChatResponse = {
    reply: string;
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
