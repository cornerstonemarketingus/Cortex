"use client";

import React, { useEffect, useRef, useState } from "react";

type Message = { id: string; role: "user" | "ai" | "system"; text: string; createdAt: number };

export default function ChatPage() {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [messages]);

  const sendMessage = async () => {
    const text = input.trim();
    if (!text) return;
    const userMsg: Message = { id: String(Date.now()), role: "user", text, createdAt: Date.now() };
    setMessages((s) => [...s, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/bots", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ botIds: [1], message: text }),
      });

      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error(errBody?.error || res.statusText || "Request failed");
      }

      const data = await res.json();
      const aiText =
        Array.isArray(data.results) && data.results.length
          ? data.results.map((r: any) => r.result).join("\n")
          : String(data.response ?? JSON.stringify(data));

      const aiMsg: Message = { id: String(Date.now()) + "-ai", role: "ai", text: aiText, createdAt: Date.now() };
      setMessages((s) => [...s, aiMsg]);
    } catch (err: any) {
      const sys: Message = { id: String(Date.now()) + "-err", role: "system", text: "Error: " + (err?.message ?? "Unknown"), createdAt: Date.now() };
      setMessages((s) => [...s, sys]);
    } finally {
      setLoading(false);
    }
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (!loading) sendMessage();
    }
  };

  return (
    <div style={{ padding: "1.5rem", maxWidth: 800, margin: "0 auto" }}>
      <h1>Main Chatbot</h1>
      <div ref={containerRef} style={{ height: 320, overflowY: "auto", border: "1px solid #e5e7eb", padding: 12, borderRadius: 8, marginBottom: 12 }}>
        {messages.length === 0 ? <p style={{ color: "#6b7280" }}>No messages yet. Say hi!</p> : null}
        {messages.map((m) => (
          <div key={m.id} style={{ marginBottom: 8 }}>
            <div style={{ fontSize: 12, color: "#374151" }}>{m.role.toUpperCase()}</div>
            <div style={{ whiteSpace: "pre-wrap", background: m.role === "user" ? "#eef2ff" : m.role === "ai" ? "#f1f5f9" : "#fff4f2", padding: 8, borderRadius: 6 }}>
              {m.text}
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", gap: 8 }}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Type your message..."
          style={{ flex: 1, padding: "0.5rem", borderRadius: 6, border: "1px solid #d1d5db" }}
          disabled={loading}
        />
        <button onClick={() => !loading && sendMessage()} style={{ padding: "0.5rem 1rem", borderRadius: 6 }} disabled={loading}>
          {loading ? "Sending..." : "Send"}
        </button>
      </div>
    </div>
  );
}
