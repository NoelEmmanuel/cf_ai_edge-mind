import { useState, useEffect } from 'react'

function App() {
    const [msg, setMsg] = useState("Loading...")

    useEffect(() => {
        fetch('/api')
            .then(res => res.text())
            .then(setMsg)
            .catch(err => setMsg("Error connecting to API"))

        fetch('/api/health')
            .then(res => res.json())
            .then(data => console.log("Health check:", data))
            .catch(err => console.error("Health check failed", err))
    }, [])

    return (
        <div className="app">
            <h1>Cloudflare AI Edge Mind</h1>
            <p>Backend says: {msg}</p>
        </div>
    )
}

export default App
