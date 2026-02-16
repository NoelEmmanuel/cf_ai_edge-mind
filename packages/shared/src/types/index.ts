export type UserSession = {
    id: string;
    createdAt: number;
};

export type ChatRequest = {
    sessionId: string;
    message: string;
};

export type ChatResponse = {
    reply: string;
};
