"use client";

import { useState, useEffect, useRef } from "react";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
}

export default function ChatPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) fetchHistory();
  }, [open]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, sending]);

  async function fetchHistory() {
    const res = await fetch("/api/chat");
    if (res.ok) setMessages((await res.json()).messages);
  }

  function formatTime(dateStr: string) {
    if (!dateStr) return "";
    return new Date(dateStr).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  }

  async function sendMessage() {
    if (!input.trim() || sending) return;
    const text = input;
    setInput("");
    setSending(true);
    setMessages((prev) => [
      ...prev,
      { id: "temp-" + Date.now(), role: "user", content: text, createdAt: new Date().toISOString() },
    ]);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text }),
      });
      const data = await res.json();
      setMessages((prev) => [
        ...prev,
        { id: "temp-" + Date.now(), role: "assistant", content: data.reply, createdAt: new Date().toISOString() },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: "temp-" + Date.now(),
          role: "assistant",
          content: "Sorry, something went wrong. Please try again.",
          createdAt: new Date().toISOString(),
        },
      ]);
    } finally {
      setSending(false);
    }
  }

  return (
    <aside className={`chat-panel ${open ? "chat-panel-open" : ""}`}>
      <div className="chat-panel-header">
        <div className="chat-panel-title">
          <div className="chat-panel-title-icon">💬</div>
          <div>
            <div className="chat-panel-title-text">AI Chat</div>
            <div className="chat-panel-subtitle">Your health assistant</div>
          </div>
        </div>
        <button className="chat-panel-close" onClick={onClose}>×</button>
      </div>

      <div className="chat-panel-body">
        {messages.map((m, i) => (
          <div key={m.id + i} className={`chat-message chat-message-${m.role}`}>
            {m.role === "assistant" && <div className="chat-avatar">AI</div>}
            <div className="chat-message-content">
              <div className={`chat-bubble chat-bubble-${m.role}`}>{m.content}</div>
              {m.createdAt && <div className="chat-timestamp">{formatTime(m.createdAt)}</div>}
            </div>
          </div>
        ))}

        {sending && (
          <div className="chat-message chat-message-assistant">
            <div className="chat-avatar">AI</div>
            <div className="chat-typing">
              <span></span><span></span><span></span>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      <div className="chat-panel-input">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && sendMessage()}
          placeholder="Ask about your health data..."
        />
        <button className="chat-send-btn" onClick={sendMessage} disabled={sending}>
          <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="22" y1="2" x2="11" y2="13"></line>
            <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
          </svg>
        </button>
      </div>
    </aside>
  );
}