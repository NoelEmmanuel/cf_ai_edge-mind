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
    }, [messages, lastMetrics])

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

            // Check if plan changed
            loadPlan(sessionId)

        } catch (err) {
            console.error(err)
            setMessages(prev => [...prev, { role: 'assistant', content: "Error: Could not get response." }])
        } finally {
            setIsLoading(false)
        }
    }

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
            // Background re-fetch to ensure consistency
            loadPlan(sessionId);
        } catch (e) {
            console.error("Failed to update step", e);
            loadPlan(sessionId); // implementation revert on error
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
        <div className="app-container">
            <header>
                <div className="title-group">
                    <h1>AI Edge Mind</h1>
                    <span className="session-id">ID: {sessionId.slice(0, 8)}...</span>
                </div>
                <div className="actions">
                    <div className="demo-group">
                        <button className="small" onClick={() => runDemo('plan')}>Demo Plan</button>
                        <button className="small" onClick={() => runDemo('chat')}>Demo Chat</button>
                    </div>
                    <div className="separator"></div>
                    <label className="debug-toggle">
                        <input type="checkbox" checked={debugMode} onChange={e => setDebugMode(e.target.checked)} />
                        Debug
                    </label>
                    <button className="secondary" onClick={exportMemory} title="Export JSON">Export</button>
                    <button className="danger" onClick={clearMemory} title="Clear Conversation">Clear</button>
                </div>
            </header>

            <div className="main-content">
                <div className="chat-window">
                    {messages.length === 0 && <div className="placeholder">Start a conversation...<br /><br />Try: "Plan: Build a website"</div>}
                    {messages.map((m, i) => (
                        <div key={i} className={`message ${m.role}`}>
                            <div className="bubble">{m.content}</div>
                        </div>
                    ))}
                    {isLoading && <div className="message assistant"><div className="bubble">Thinking...</div></div>}

                    {debugMode && lastMetrics && (
                        <div className="debug-metrics">
                            <h4>Last Request Metrics</h4>
                            <ul>
                                <li>Total Latency: {lastMetrics.total_ms}ms</li>
                                <li>AI Inference: {lastMetrics.ai_ms}ms</li>
                                <li>DO Read: {lastMetrics.do_read_ms}ms (History: {lastMetrics.history_count} items)</li>
                                <li>DO Write: {lastMetrics.do_write_ms}ms</li>
                            </ul>
                        </div>
                    )}

                    <div ref={messagesEndRef} />
                </div>

                {plan && (
                    <div className="plan-panel">
                        <h3>{plan.title || "Current Plan"}</h3>
                        <div className="steps-list">
                            {plan.steps.map(step => (
                                <div key={step.id} className={`step-item ${step.done ? 'done' : ''}`} onClick={() => toggleStep(step.id, step.done)}>
                                    <div className="checkbox">{step.done ? '✓' : '○'}</div>
                                    <div className="step-text">{step.text}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            <div className="input-area">
                <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                    placeholder="Type a message... (Start with 'Plan:' to create a plan)"
                    disabled={isLoading}
                />
                <button onClick={() => sendMessage()} disabled={isLoading || !input.trim()}>Send</button>
            </div>
        </div>
    )
}

export default App
