import { useState, useEffect, useRef } from 'react'
import { ChatRequest, ChatResponse, ChatMessage, HistoryResponse } from '@cf-ai-edge-mind/shared'

function App() {
    const [messages, setMessages] = useState<ChatMessage[]>([])
    const [input, setInput] = useState("")
    const [sessionId, setSessionId] = useState<string>("")
    const [isLoading, setIsLoading] = useState(false)
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
    }, [])

    // Scroll to bottom
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
    }, [messages])

    const loadHistory = async (id: string) => {
        try {
            const res = await fetch(`/api/memory/${id}`)
            if (res.ok) {
                const data: HistoryResponse = await res.json()
                setMessages(data.messages)
            }
        } catch (e) {
            console.error("Failed to load history", e)
        }
    }

    const sendMessage = async () => {
        if (!input.trim() || isLoading) return

        const userMsgContent = input.trim()
        setInput("")

        // Optimistic update
        const userMsg: ChatMessage = { role: 'user', content: userMsgContent }
        setMessages(prev => [...prev, userMsg])
        setIsLoading(true)

        try {
            const req: ChatRequest = { sessionId, message: userMsgContent }
            const res = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(req)
            })

            if (!res.ok) throw new Error("Failed to send message")

            const data: ChatResponse = await res.json()
            const assistantMsg: ChatMessage = { role: 'assistant', content: data.reply }
            setMessages(prev => [...prev, assistantMsg])
        } catch (err) {
            console.error(err)
            setMessages(prev => [...prev, { role: 'assistant', content: "Error: Could not get response." }])
        } finally {
            setIsLoading(false)
        }
    }

    const clearMemory = async () => {
        if (!confirm("Are you sure you want to clear the conversation memory?")) return;
        try {
            await fetch('/api/memory/clear', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sessionId })
            });
            setMessages([]);
        } catch (e) {
            alert("Failed to clear memory");
        }
    }

    const exportMemory = async () => {
        window.open(`/api/memory/${sessionId}`, '_blank');
    }

    return (
        <div className="app-container">
            <header>
                <div className="title-group">
                    <h1>AI Edge Mind</h1>
                    <span className="session-id">ID: {sessionId.slice(0, 8)}...</span>
                </div>
                <div className="actions">
                    <button className="secondary" onClick={exportMemory} title="Export JSON">Export</button>
                    <button className="danger" onClick={clearMemory} title="Clear Conversation">Clear</button>
                </div>
            </header>

            <div className="chat-window">
                {messages.length === 0 && <div className="placeholder">Start a conversation...</div>}
                {messages.map((m, i) => (
                    <div key={i} className={`message ${m.role}`}>
                        <div className="bubble">{m.content}</div>
                    </div>
                ))}
                {isLoading && <div className="message assistant"><div className="bubble">Thinking...</div></div>}
                <div ref={messagesEndRef} />
            </div>

            <div className="input-area">
                <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                    placeholder="Type a message..."
                    disabled={isLoading}
                />
                <button onClick={sendMessage} disabled={isLoading || !input.trim()}>Send</button>
            </div>
        </div>
    )
}

export default App
