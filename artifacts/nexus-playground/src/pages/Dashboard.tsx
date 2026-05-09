import React from "react";
import { Link } from "wouter";
import { useUser } from "@clerk/react";
import { Code2, Bot, Terminal, Activity, ArrowRight, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useListChats, useDeleteChat, getListChatsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import Navbar from "@/components/nexus/Navbar";

export default function Dashboard() {
  const { user } = useUser();
  const queryClient = useQueryClient();
  const { data: chats, isLoading } = useListChats();
  const deleteChat = useDeleteChat();

  const username = user?.username ?? user?.firstName ?? user?.emailAddresses[0]?.emailAddress ?? "Developer";

  const handleDelete = async (e: React.MouseEvent, id: number) => {
    e.preventDefault();
    e.stopPropagation();
    await deleteChat.mutateAsync({ chatId: id });
    queryClient.invalidateQueries({ queryKey: getListChatsQueryKey() });
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans">
      <Navbar />

      <main className="flex-1 max-w-6xl mx-auto w-full p-6 lg:p-12">
        <header className="mb-10">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Welcome back, {username}.</h1>
          <p className="text-muted-foreground mt-2">Pick up where you left off or start a new project.</p>
        </header>

        {/* Quick Actions */}
        <section className="grid md:grid-cols-3 gap-6 mb-12">
          <Link href="/ide">
            <div className="group p-6 rounded-xl border border-border bg-card hover:border-primary/50 hover:shadow-md transition-all cursor-pointer h-full flex flex-col">
              <div className="w-12 h-12 rounded-lg bg-primary/10 text-primary flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
                <Code2 className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-lg mb-1">Open IDE</h3>
              <p className="text-sm text-muted-foreground flex-1">
                Launch the NEXUS programming environment with live reactive evaluation.
              </p>
              <div className="mt-4 text-primary text-sm font-medium flex items-center group-hover:underline">
                Start Coding <ArrowRight className="w-4 h-4 ml-1" />
              </div>
            </div>
          </Link>

          <Link href="/ai">
            <div className="group p-6 rounded-xl border border-border bg-card hover:border-primary/50 hover:shadow-md transition-all cursor-pointer h-full flex flex-col">
              <div className="w-12 h-12 rounded-lg bg-primary/10 text-primary flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
                <Bot className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-lg mb-1">AI Assistant</h3>
              <p className="text-sm text-muted-foreground flex-1">
                Chat with the NEXUS assistant for help with syntax, physical modelling, and predictions.
              </p>
              <div className="mt-4 text-primary text-sm font-medium flex items-center group-hover:underline">
                New Chat <ArrowRight className="w-4 h-4 ml-1" />
              </div>
            </div>
          </Link>

          <Link href="/ide">
            <div className="group p-6 rounded-xl border border-border bg-card hover:border-primary/50 hover:shadow-md transition-all cursor-pointer h-full flex flex-col">
              <div className="w-12 h-12 rounded-lg bg-primary/10 text-primary flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
                <Terminal className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-lg mb-1">Python REPL</h3>
              <p className="text-sm text-muted-foreground flex-1">
                Drop into the Pyodide environment for rapid prototyping with Python.
              </p>
              <div className="mt-4 text-primary text-sm font-medium flex items-center group-hover:underline">
                Open Python <ArrowRight className="w-4 h-4 ml-1" />
              </div>
            </div>
          </Link>
        </section>

        {/* Chat History */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold tracking-tight">Recent Conversations</h2>
          </div>

          {isLoading ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-32 bg-muted rounded-xl animate-pulse" />
              ))}
            </div>
          ) : chats && chats.length > 0 ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {chats.map(chat => (
                <Link key={chat.id} href="/ai">
                  <div className="p-5 rounded-xl border border-border bg-card hover:bg-muted transition-colors group relative cursor-pointer flex flex-col h-full">
                    <div className="flex items-start justify-between mb-3">
                      <span className="inline-flex px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-secondary text-secondary-foreground">
                        {chat.language || "General"}
                      </span>
                      <button 
                        onClick={(e) => handleDelete(e, chat.id)}
                        className="text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    <h4 className="font-semibold text-foreground leading-tight mb-2 line-clamp-2">
                      {chat.title}
                    </h4>
                    <div className="mt-auto pt-4 flex items-center text-xs text-muted-foreground font-medium">
                      <Activity className="w-3.5 h-3.5 mr-1.5 opacity-70" />
                      {new Date(chat.updatedAt).toLocaleDateString(undefined, { 
                        month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit'
                      })}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-16 px-6 rounded-xl border border-dashed border-border bg-card">
              <Bot className="w-12 h-12 mx-auto text-muted-foreground mb-4 opacity-50" />
              <h3 className="text-lg font-bold text-foreground mb-2">No conversations yet</h3>
              <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                Start a chat with the NEXUS AI to get help building reactive engineering models.
              </p>
              <Link href="/ai">
                <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
                  Start your first conversation
                </Button>
              </Link>
            </div>
          )}
        </section>

      </main>
    </div>
  );
}
