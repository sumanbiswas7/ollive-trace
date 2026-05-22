"use client";

import { useState, useEffect, useCallback, useRef } from "react";

export type Message = { role: "user" | "assistant"; content: string };

export type Conversation = {
  id: string;
  title: string;
  updatedAt: string; // ISO string from DB
};

export function useConversations() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const initialized = useRef(false);

  const refreshConversations = useCallback(async () => {
    try {
      const res = await fetch("/api/conversations");
      const rows: { id: string; title: string; updated_at: string }[] = await res.json();
      setConversations(
        rows.map((r) => ({ id: r.id, title: r.title, updatedAt: r.updated_at }))
      );
      return rows;
    } catch {
      return [];
    }
  }, []);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    refreshConversations().then((rows) => {
      if (rows.length > 0) setActiveId(rows[0].id);
    });
  }, [refreshConversations]);

  const newConversation = useCallback(async (): Promise<string> => {
    const res = await fetch("/api/conversations", { method: "POST" });
    const { id } = await res.json();
    await refreshConversations();
    setActiveId(id);
    return id;
  }, [refreshConversations]);

  const deleteConversation = useCallback(
    async (id: string) => {
      await fetch(`/api/conversations/${id}`, { method: "DELETE" });
      const rows = await refreshConversations();
      setActiveId((prev) => {
        if (prev !== id) return prev;
        const remaining = rows.filter((r) => r.id !== id);
        return remaining[0]?.id ?? null;
      });
    },
    [refreshConversations]
  );

  return {
    conversations,
    activeId,
    setActiveId,
    newConversation,
    deleteConversation,
    refreshConversations,
  };
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
