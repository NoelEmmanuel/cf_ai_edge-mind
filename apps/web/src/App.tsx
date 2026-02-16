import { useState, useEffect, useRef } from 'react'
import { ChatRequest, ChatResponse, ChatMessage, HistoryResponse, Plan, PlanUpdateRequest, DebugMetrics } from '@cf-ai-edge-mind/shared'

const API_BASE = import.meta.env.VITE_API_URL || '/api';

function App() {
    const [messages, setMessages] = useState<ChatMessage[]>([])
    const [input, setInput] = useState("")
    const [sessionId, setSessionId] = useState<string>("")
    const [isLoading, setIsLoading] = useState(false)
    const [plan, setPlan] = useState<Plan | null>(null)
    const [debugMode, setDebugMode] = useState(false)
    const [lastMetrics, setLastMetrics] = useState<DebugMetrics | null>(null)
    const messagesEndRef = useRef<HTMLDivElement>(null)
    const inputRef = useRef<HTMLTextAreaElement>(null)

    // Initial setup
    useEffect(() => {
        let storedSessionId = localStorage.getItem('chat_session_id')
        if (!storedSessionId) {
            storedSessionId = crypto.randomUUID()
            localStorage.setItem('chat_session_id', storedSessionId)
        }
        setSessionId(storedSessionId)
        loadHistory(storedSessionId)
        loadPlan(storedSessionId)
    }, [])

    // Scroll to bottom
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
    }, [messages, lastMetrics, isLoading])

    useEffect(() => {
        if (!isLoading) {
            inputRef.current?.focus();
        }
    }, [isLoading]);

    const loadHistory = async (id: string) => {
        try {
            const res = await fetch(`${API_BASE}/memory/${id}`)
            if (res.ok) {
                const data: HistoryResponse = await res.json()
                setMessages(data.messages)
            }
        } catch (e) {
            console.error("Failed to load history", e)
        }
    }

    const loadPlan = async (id: string) => {
        try {
            const res = await fetch(`${API_BASE}/plan/${id}`)
            if (res.ok) {
                const data: { plan: Plan | null } = await res.json()
                setPlan(data.plan)
            }
        } catch (e) {
            console.error("Failed to load plan", e)
        }
    }

    const sendMessage = async (overrideContent?: string) => {
        const contentToSend = overrideContent || input.trim();
        if (!contentToSend || isLoading) return

        if (!overrideContent) setInput("");

        // Optimistic update
        const userMsg: ChatMessage = { role: 'user', content: contentToSend }
        setMessages(prev => [...prev, userMsg])
        setIsLoading(true)
        setLastMetrics(null)

        try {
            const req: ChatRequest = { sessionId, message: contentToSend, debug: debugMode }
            const res = await fetch(`${API_BASE}/chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(req)
            })

            if (!res.ok) throw new Error("Failed to send message")

            const data: ChatResponse = await res.json()
            const assistantMsg: ChatMessage = { role: 'assistant', content: data.reply }
            setMessages(prev => [...prev, assistantMsg])

            if (data.debug) {
                setLastMetrics(data.debug)
            }

            // Re-fetch plan to see if it changed
            loadPlan(sessionId)

        } catch (err) {
            console.error(err)
            setMessages(prev => [...prev, { role: 'assistant', content: "Error: Could not get response." }])
        } finally {
            setIsLoading(false)
        }
    }

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    };

    const toggleStep = async (stepId: string, currentDone: boolean) => {
        if (!plan) return;

        // Optimistic update
        setPlan({
            ...plan,
            steps: plan.steps.map(s => s.id === stepId ? { ...s, done: !currentDone } : s)
        });

        try {
            const req: PlanUpdateRequest = { sessionId, stepId, done: !currentDone }
            await fetch(`${API_BASE}/plan/update`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(req)
            });
            loadPlan(sessionId);
        } catch (e) {
            console.error("Failed to update step", e);
            loadPlan(sessionId);
        }
    }

    const clearMemory = async () => {
        if (!confirm("Are you sure you want to clear the conversation memory?")) return;
        try {
            await fetch(`${API_BASE}/memory/clear`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sessionId })
            });
            setMessages([]);
            setPlan(null);
            setLastMetrics(null);
        } catch (e) {
            alert("Failed to clear memory");
        }
    }

    const exportMemory = async () => {
        window.open(`${API_BASE}/memory/${sessionId}`, '_blank');
    }

    const runDemo = (type: 'plan' | 'chat') => {
        if (type === 'plan') {
            sendMessage("Plan: Build a moon base");
        } else {
            sendMessage("What is the capital of Mars?");
        }
    }

    return (
        <div className="layout-wrapper">
            <header className="app-header">
                <div className="brand-section">
                    <h1>AI Edge Mind</h1>
                    <span className="session-badge" title={sessionId}>ID: {sessionId.slice(0, 6)}</span>
                </div>

                <div className="toolbar">
                    <div className="demo-controls">
                        <button className="btn-small" onClick={() => runDemo('plan')}>Test Plan</button>
                        <button className="btn-small" onClick={() => runDemo('chat')}>Test Chat</button>
                    </div>
                    <div className="divider"></div>
                    <label className="toggle-label">
                        <input type="checkbox" checked={debugMode} onChange={e => setDebugMode(e.target.checked)} />
                        Debug
                    </label>
                    <button className="btn-secondary" onClick={exportMemory}>Export</button>
                    <button className="btn-danger" onClick={clearMemory}>Clear</button>
                </div>
            </header>

            <main className="main-content">
                <div className="chat-area">
                    <div className="messages-container">
                        {messages.length === 0 && (
                            <div className="empty-state">
                                <h2>Welcome to AI Edge Mind</h2>
                                <p>Start chatting or ask to create a plan.</p>
                                <div className="suggestion-chips">
                                    <button onClick={() => sendMessage("Plan: Launch a marketing campaign")}>Plan: Launch a campaign</button>
                                    <button onClick={() => sendMessage("Explain quantum computing")}>Explain quantum computing</button>
                                </div>
                            </div>
                        )}

                        {messages.map((m, i) => (
                            <div key={i} className={`message-row ${m.role}`}>
                                <div className={`message-bubble ${m.role}`}>
                                    {m.role === 'assistant' && <div className="avatar">AI</div>}
                                    <div className="message-text">{m.content}</div>
                                </div>
                            </div>
                        ))}

                        {isLoading && (
                            <div className="message-row assistant">
                                <div className="message-bubble assistant typing">
                                    <span className="dot"></span><span className="dot"></span><span className="dot"></span>
                                </div>
                            </div>
                        )}

                        {debugMode && lastMetrics && (
                            <div className="metrics-card">
                                <h4>Request Metrics</h4>
                                <div className="metrics-grid">
                                    <div className="metric"><span>Total</span> <strong>{lastMetrics.total_ms}ms</strong></div>
                                    <div className="metric"><span>AI</span> <strong>{lastMetrics.ai_ms}ms</strong></div>
                                    <div className="metric"><span>DO Read</span> <strong>{lastMetrics.do_read_ms}ms</strong></div>
                                    <div className="metric"><span>DO Write</span> <strong>{lastMetrics.do_write_ms}ms</strong></div>
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    <div className="input-compositor">
                        <textarea
                            ref={inputRef}
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="Type a message... (Shift+Enter for new line)"
                            disabled={isLoading}
                            rows={1}
                        />
                        <button
                            className="send-btn"
                            onClick={() => sendMessage()}
                            disabled={isLoading || !input.trim()}
                        >
                            ➤
                        </button>
                    </div>
                </div>

                {plan && (
                    <aside className="plan-sidebar">
                        <div className="plan-header">
                            <h3>{plan.title || "Current Plan"}</h3>
                            <span className="plan-status">{plan.steps.filter(s => s.done).length}/{plan.steps.length}</span>
                        </div>
                        <div className="plan-steps">
                            {plan.steps.map(step => (
                                <div
                                    key={step.id}
                                    className={`plan-step ${step.done ? 'is-done' : ''}`}
                                    onClick={() => toggleStep(step.id, step.done)}
                                >
                                    <div className={`checkbox ${step.done ? 'checked' : ''}`}>
                                        {step.done && '✓'}
                                    </div>
                                    <span className="step-label">{step.text}</span>
                                </div>
                            ))}
                        </div>
                    </aside>
                )}
            </main>
        </div>
    )
}

export default App
