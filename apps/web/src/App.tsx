import { useState, useEffect, useRef } from 'react'
import { ChatRequest, ChatResponse } from '@cf-ai-edge-mind/shared'

type Message = {
    role: 'user' | 'assistant';
    content: string;
}

function App() {
    const [messages, setMessages] = useState<Message[]>([])
    const [input, setInput] = useState("")
    const [sessionId, setSessionId] = useState<string>("")
    const [isLoading, setIsLoading] = useState(false)
    const messagesEndRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        // Initialize session ID
        let storedSessionId = localStorage.getItem('chat_session_id')
        if (!storedSessionId) {
            storedSessionId = crypto.randomUUID()
            localStorage.setItem('chat_session_id', storedSessionId)
        }
        setSessionId(storedSessionId)
    }, [])

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
    }, [messages])

    const sendMessage = async () => {
        if (!input.trim() || isLoading) return

        const userMsg = input.trim()
        setInput("")
        setMessages(prev => [...prev, { role: 'user', content: userMsg }])
        setIsLoading(true)

        try {
            const req: ChatRequest = { sessionId, message: userMsg }
            const res = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(req)
            })

            if (!res.ok) throw new Error("Failed to send message")

            const data: ChatResponse = await res.json()
            setMessages(prev => [...prev, { role: 'assistant', content: data.reply }])
        } catch (err) {
            console.error(err)
            setMessages(prev => [...prev, { role: 'assistant', content: "Error: Could not get response." }])
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="app-container">
            <header>
                <h1>AI Edge Mind</h1>
                <span className="session-id">Session: {sessionId.slice(0, 8)}...</span>
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
