import React, { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { Send, Bot, Sparkles, Loader2, User, Plus, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import Navbar from "@/components/nexus/Navbar";
import { useUser } from "@clerk/react";
import { useListChats, useCreateChat, useAddMessage, useGetChat, getListChatsQueryKey, getGetChatQueryKey } from "@workspace/api-client-react";

interface UIMessage {
  role: "user" | "assistant";
  content: string;
  pending?: boolean;
}

const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";

export default function AIPage() {
  const { isSignedIn } = useUser();
  const [messages, setMessages] = useState<UIMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [activeChatId, setActiveChatId] = useState<number | null>(null);
  
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Queries
  const { data: chats, refetch: refetchChats } = useListChats({ query: { enabled: !!isSignedIn, queryKey: getListChatsQueryKey() } });
  const { data: activeChat, isFetching: isLoadingChat } = useGetChat(activeChatId as number, { 
    query: { enabled: !!activeChatId, queryKey: getGetChatQueryKey(activeChatId as number) } 
  });

  // Mutations
  const createChat = useCreateChat();
  const addMessage = useAddMessage();

  // Load chat history when active chat changes
  useEffect(() => {
    if (activeChat?.messages) {
      setMessages(activeChat.messages.map(m => ({
        role: m.role as "user" | "assistant",
        content: m.content
      })));
    } else if (!activeChatId) {
      setMessages([{
        role: "assistant",
        content: "Hi! I'm the NEXUS AI assistant. I can help you write NEXUS code, understand dimensional typing, or build reactive systems. How can I help you today?"
      }]);
    }
  }, [activeChat, activeChatId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleNewChat = () => {
    setActiveChatId(null);
    setMessages([{
      role: "assistant",
      content: "Hi! I'm the NEXUS AI assistant. I can help you write NEXUS code, understand dimensional typing, or build reactive systems. How can I help you today?"
    }]);
  };

  const sendMessage = async (text?: string) => {
    const msg = (text ?? input).trim();
    if (!msg || loading) return;

    setInput("");
    setLoading(true);

    let currentChatId = activeChatId;

    // Create chat if signed in and no active chat
    if (isSignedIn && !currentChatId) {
      try {
        const newChat = await createChat.mutateAsync({
          data: { title: msg.slice(0, 30) + (msg.length > 30 ? "..." : ""), language: "general" }
        });
        currentChatId = newChat.id;
        setActiveChatId(newChat.id);
        refetchChats();
      } catch (err) {
        console.error("Failed to create chat", err);
      }
    }

    // Save user message to DB
    if (isSignedIn && currentChatId) {
      try {
        await addMessage.mutateAsync({
          chatId: currentChatId,
          data: { role: "user", content: msg }
        });
      } catch (err) {
        console.error("Failed to save message", err);
      }
    }

    const history = messages.map(m => ({ role: m.role, content: m.content }));
    setMessages(prev => [
      ...prev,
      { role: "user", content: msg },
      { role: "assistant", content: "", pending: true },
    ]);

    let accumulated = "";

    try {
      const res = await fetch(`${BASE}/api/ai/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: msg, code: "", history }),
      });

      if (!res.ok || !res.body) throw new Error("AI service unavailable");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.content) {
                accumulated += data.content;
                setMessages(prev => {
                  const next = [...prev];
                  next[next.length - 1] = { role: "assistant", content: accumulated, pending: true };
                  return next;
                });
              }
              if (data.done) break;
            } catch { /* skip malformed */ }
          }
        }
      }

      setMessages(prev => {
        const next = [...prev];
        next[next.length - 1] = { role: "assistant", content: accumulated };
        return next;
      });

      // Save assistant message to DB
      if (isSignedIn && currentChatId) {
        await addMessage.mutateAsync({
          chatId: currentChatId,
          data: { role: "assistant", content: accumulated }
        });
      }

    } catch (e) {
      setMessages(prev => {
        const next = [...prev];
        next[next.length - 1] = { role: "assistant", content: `Error: ${String(e)}` };
        return next;
      });
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="h-screen w-full flex flex-col bg-background text-foreground font-sans overflow-hidden">
      <Navbar />

      {!isSignedIn && (
        <div className="bg-primary/10 border-b border-primary/20 py-2 px-4 text-center text-sm font-medium text-primary">
          Sign in to save your chat history and access context-aware features.
        </div>
      )}

      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar History (Only if signed in) */}
        {isSignedIn && (
          <div className="w-64 border-r border-border bg-card flex flex-col shrink-0">
            <div className="p-4 border-b border-border">
              <Button onClick={handleNewChat} className="w-full bg-primary text-primary-foreground hover:bg-primary/90 font-medium">
                <Plus className="w-4 h-4 mr-2" /> New Chat
              </Button>
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {chats?.map(chat => (
                <button
                  key={chat.id}
                  onClick={() => setActiveChatId(chat.id)}
                  className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors flex items-start gap-2 ${
                    activeChatId === chat.id
                      ? "bg-secondary text-secondary-foreground font-medium"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  <MessageSquare className="w-4 h-4 mt-0.5 shrink-0" />
                  <span className="truncate leading-tight">{chat.title}</span>
                </button>
              ))}
              {chats?.length === 0 && (
                <p className="text-xs text-muted-foreground text-center p-4">No chat history yet.</p>
              )}
            </div>
          </div>
        )}

        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col bg-background max-w-4xl mx-auto w-full relative shadow-sm border-x border-border">
          
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {isLoadingChat ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : (
              messages.map((msg, i) => (
                <div key={i} className={`flex gap-4 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
                  <div className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center mt-1 border
                    ${msg.role === "assistant"
                      ? "bg-primary/10 text-primary border-primary/20"
                      : "bg-muted text-muted-foreground border-border"}`}>
                    {msg.role === "assistant" ? <Bot className="w-4 h-4" /> : <User className="w-4 h-4" />}
                  </div>
                  <div className={`max-w-[80%] rounded-xl px-5 py-3 text-[15px] leading-relaxed shadow-sm
                    ${msg.role === "assistant"
                      ? "bg-card border border-border text-foreground"
                      : "bg-primary text-primary-foreground"}`}>
                    {msg.pending && !msg.content ? (
                      <Loader2 className="w-4 h-4 animate-spin my-1" />
                    ) : (
                      <div className="whitespace-pre-wrap font-sans">{msg.content}</div>
                    )}
                  </div>
                </div>
              ))
            )}
            <div ref={bottomRef} className="h-4" />
          </div>

          {/* Input Box */}
          <div className="p-6 bg-background">
            <div className="relative shadow-md rounded-xl overflow-hidden border border-border bg-card focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary/50 transition-all">
              <textarea
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask anything about NEXUS, hardware integration, or Python..."
                className="w-full bg-transparent px-4 py-4 text-[15px] text-foreground placeholder:text-muted-foreground resize-none focus:outline-none min-h-[100px] max-h-[300px]"
                rows={3}
              />
              <div className="absolute bottom-3 right-3 flex items-center gap-2">
                <span className="text-[11px] text-muted-foreground mr-2 font-medium">Shift + Enter for new line</span>
                <Button
                  onClick={() => sendMessage()}
                  disabled={loading || !input.trim()}
                  size="icon"
                  className="h-10 w-10 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm disabled:opacity-50"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4 ml-0.5" />}
                </Button>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
