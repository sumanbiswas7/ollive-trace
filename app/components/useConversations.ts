"use client";

import { useState, useEffect, useCallback } from "react";

export type Message = { role: "user" | "assistant"; content: string };

export type Conversation = {
  id: string;
  title: string;
  messages: Message[];
  updatedAt: number;
};

const KEY = "ollive-conversations";

function load(): Conversation[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "[]");
  } catch {
    return [];
  }
}

function persist(convs: Conversation[]) {
  localStorage.setItem(KEY, JSON.stringify(convs));
}

export function useConversations() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => {
    const saved = load();
    setConversations(saved);
    if (saved.length > 0) setActiveId(saved[0].id);
  }, []);

  const active = conversations.find((c) => c.id === activeId) ?? null;

  const newConversation = useCallback((): string => {
    const id = crypto.randomUUID();
    const conv: Conversation = {
      id,
      title: "New chat",
      messages: [],
      updatedAt: Date.now(),
    };
    setConversations((prev) => {
      const updated = [conv, ...prev];
      persist(updated);
      return updated;
    });
    setActiveId(id);
    return id;
  }, []);

  const updateMessages = useCallback((id: string, messages: Message[]) => {
    setConversations((prev) => {
      const updated = prev.map((c) => {
        if (c.id !== id) return c;
        const firstUser = messages.find((m) => m.role === "user")?.content ?? "";
        const title = firstUser.slice(0, 42) + (firstUser.length > 42 ? "…" : "") || "New chat";
        return { ...c, messages, title, updatedAt: Date.now() };
      });
      persist(updated);
      return updated;
    });
  }, []);

  const deleteConversation = useCallback(
    (id: string) => {
      setConversations((prev) => {
        const updated = prev.filter((c) => c.id !== id);
        persist(updated);
        return updated;
      });
      setActiveId((prev) => {
        if (prev !== id) return prev;
        const remaining = conversations.filter((c) => c.id !== id);
        return remaining[0]?.id ?? null;
      });
    },
    [conversations]
  );

  return {
    conversations,
    active,
    activeId,
    setActiveId,
    newConversation,
    updateMessages,
    deleteConversation,
  };
}

export function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function relativeTime(ts: number): string {
  const diff = Date.now() - ts;
  const m = Math.floor(diff / 60_000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}
