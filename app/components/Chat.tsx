"use client";

import Image from "next/image";
import { useRef, useState, useEffect, useCallback } from "react";
import styles from "./Chat.module.css";
import { useConversations, formatDate } from "./useConversations";
import type { Message } from "./useConversations";

/* ─── Icons ─────────────────────────────────────────────────────────── */

function PlusIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden>
      <path d="M6.5 1v11M1 6.5h11" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden>
      <path
        d="M2 3.5h9M5 3.5V2.5a.5.5 0 01.5-.5h2a.5.5 0 01.5.5v1M10 3.5l-.5 7a.5.5 0 01-.5.5H4a.5.5 0 01-.5-.5L3 3.5"
        stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"
      />
    </svg>
  );
}

function MenuIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
      <path d="M3 4.5h12M3 9h12M3 13.5h12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function SendIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" aria-hidden>
      <path d="M7.5 12V3M7.5 3L3.5 7M7.5 3L11.5 7"
        stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
      />
    </svg>
  );
}

function MicIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
      <rect x="5.5" y="1" width="5" height="8" rx="2.5" stroke="currentColor" strokeWidth="1.4" />
      <path d="M2.5 8a5.5 5.5 0 0011 0" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <line x1="8" y1="13.5" x2="8" y2="15" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

function ShareIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" aria-hidden>
      <path
        d="M10 1l4 4-4 4M14 5H5.5A3.5 3.5 0 002 8.5V14"
        stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
      />
    </svg>
  );
}

function DownloadIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" aria-hidden>
      <path
        d="M7.5 1v9M4 7l3.5 3.5L11 7M1 12h13"
        stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
      />
    </svg>
  );
}

function ClearIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" aria-hidden>
      <path
        d="M2.5 4h10M5 4V2.5A.5.5 0 015.5 2h4a.5.5 0 01.5.5V4M11.5 4l-.6 8.5a.5.5 0 01-.5.5H4.6a.5.5 0 01-.5-.5L3.5 4"
        stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"
      />
    </svg>
  );
}

function BubbleIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
      <path
        d="M2 2h10a1 1 0 011 1v6a1 1 0 01-1 1H8l-3 2v-2H2a1 1 0 01-1-1V3a1 1 0 011-1z"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" aria-hidden>
      <circle cx="6.5" cy="6.5" r="4.5" stroke="currentColor" strokeWidth="1.4" />
      <path d="M10 10l3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

/* ─── Main component ─────────────────────────────────────────────────── */

export default function Chat() {
  const {
    conversations,
    activeId,
    setActiveId,
    newConversation,
    deleteConversation,
    refreshConversations,
  } = useConversations();

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Load messages from DB whenever the active conversation changes
  useEffect(() => {
    setMessages([]);
    setInput("");
    if (!activeId) return;
    fetch(`/api/conversations/${activeId}/messages`)
      .then((r) => r.json())
      .then((rows: Message[]) => setMessages(rows))
      .catch(() => {});
  }, [activeId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function autoResize() {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = `${ta.scrollHeight}px`;
  }

  const handleNew = useCallback(async () => {
    await newConversation();
    setSidebarOpen(false);
  }, [newConversation]);

  const handleSelect = useCallback(
    (id: string) => {
      setActiveId(id);
      setSidebarOpen(false);
    },
    [setActiveId]
  );

  async function handleClear() {
    if (!activeId || messages.length === 0) return;
    await fetch(`/api/conversations/${activeId}/messages`, { method: "DELETE" });
    setMessages([]);
    await refreshConversations();
  }

  function handleExport() {
    if (messages.length === 0) return;
    const lines = messages.map(
      (m) => `${m.role === "user" ? "You" : "Ollive"}:\n${m.content}`
    );
    const blob = new Blob([lines.join("\n\n---\n\n")], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ollive-chat-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function send() {
    const text = input.trim();
    if (!text || streaming) return;

    const convId = activeId ?? await newConversation();
    const updated: Message[] = [...messages, { role: "user", content: text }];
    setMessages(updated);
    setInput("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";
    setStreaming(true);

    const aIdx = updated.length;
    setMessages((p) => [...p, { role: "assistant", content: "" }]);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: updated, sessionId: convId }),
      });

      if (!res.body) throw new Error("No body");

      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let done = false;
      let full = "";

      while (!done) {
        const { value, done: d } = await reader.read();
        done = d;
        if (value) {
          full += dec.decode(value, { stream: true });
          setMessages((p) =>
            p.map((m, i) => (i === aIdx ? { ...m, content: full } : m))
          );
        }
      }

      // Refresh sidebar so the derived title appears after the first message
      refreshConversations().catch(() => {});
    } catch {
      setMessages((p) =>
        p.map((m, i) =>
          i === aIdx
            ? { ...m, content: "Something went wrong. Please try again." }
            : m
        )
      );
    } finally {
      setStreaming(false);
    }
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  return (
    <div className={styles.root}>
      {sidebarOpen && (
        <div className={styles.overlay} onClick={() => setSidebarOpen(false)} />
      )}

      {/* ── Sidebar ────────────────────────────────────────────────── */}
      <aside className={`${styles.sidebar} ${sidebarOpen ? styles.sidebarOpen : ""}`}>
        <div className={styles.sidebarHead}>
          <Image
            src="/logo.png"
            alt="Ollive"
            width={26}
            height={26}
            className={styles.sidebarLogo}
          />
          <span className={styles.sidebarWordmark}>Ollive</span>
        </div>

        <div className={styles.sidebarBody}>
          {/* RECENT header row */}
          <div className={styles.recentRow}>
            <span className={styles.recentLabel}>Recents</span>
            <button className={styles.addBtn} onClick={handleNew} aria-label="New chat">
              <PlusIcon />
            </button>
          </div>

          {conversations.length > 0 && (
            <ul className={styles.convList}>
              {conversations.map((c) => (
                <li key={c.id} className={styles.convItem}>
                  <button
                    className={`${styles.convBtn} ${c.id === activeId ? styles.convBtnActive : ""}`}
                    onClick={() => handleSelect(c.id)}
                  >
                    <span className={styles.convIcon}>
                      <BubbleIcon />
                    </span>
                    <span className={styles.convTitle}>{c.title}</span>
                    <span className={styles.convTime}>{formatDate(c.updatedAt)}</span>
                  </button>
                  <button
                    className={styles.deleteBtn}
                    onClick={(e) => { e.stopPropagation(); deleteConversation(c.id); }}
                    aria-label="Delete"
                  >
                    <TrashIcon />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className={styles.sidebarFoot}>
          <span className={styles.modelTag}>GPT-4.1 · 20-turn context</span>
        </div>
      </aside>

      {/* ── Main ───────────────────────────────────────────────────── */}
      <div className={styles.main}>
        {/* Topbar */}
        <header className={styles.topbar}>
          {/* Hamburger — mobile */}
          <button
            className={styles.menuBtn}
            onClick={() => setSidebarOpen((v) => !v)}
            aria-label="Menu"
          >
            <MenuIcon />
          </button>

          {/* Brand — mobile only */}
          <div className={styles.topbarBrand}>
            <Image
              src="/logo.png"
              alt="Ollive"
              width={22}
              height={22}
              className={styles.topbarLogo}
            />
            <span className={styles.topbarWordmark}>Ollive</span>
          </div>

          {/* Right-side actions */}
          <div className={styles.topbarActions}>
            {/* Model pill */}
            <div className={styles.modelPill}>
              <span className={styles.modelDot} />
              GPT-4.1
            </div>

            <div className={styles.topbarDivider} />

            {/* Search in conversation (placeholder) */}
            <button className={styles.iconBtn} data-tip="Search" aria-label="Search conversation">
              <SearchIcon />
            </button>

            {/* Share */}
            <button className={styles.iconBtn} data-tip="Share" aria-label="Share conversation">
              <ShareIcon />
            </button>

            {/* Export */}
            <button
              className={styles.iconBtn}
              data-tip="Export"
              aria-label="Export conversation"
              onClick={handleExport}
            >
              <DownloadIcon />
            </button>

            {/* Clear */}
            <button
              className={`${styles.iconBtn} ${styles.iconBtnDanger}`}
              data-tip="Clear chat"
              aria-label="Clear conversation"
              onClick={handleClear}
            >
              <ClearIcon />
            </button>

            <div className={styles.topbarDivider} />

            {/* New chat CTA */}
            <button className={styles.ctaBtn} onClick={handleNew}>
              New chat
            </button>
          </div>
        </header>

        {/* Messages */}
        <div className={styles.messages}>
          {messages.length === 0 ? (
            <div className={styles.empty}>
              <div className={styles.emptyLogoWrap}>
                <Image
                  src="/logo.png"
                  alt="Ollive"
                  width={34}
                  height={34}
                  className={styles.emptyLogoImg}
                />
              </div>
              <h2 className={styles.emptyHeading}>
                Don&rsquo;t just ship AI,{" "}
                <em className={styles.emptyAccent}>insure it.</em>
              </h2>
              <p className={styles.emptySubtext}>
                Ask anything about AI liability, policy coverage, or risk management.
              </p>
            </div>
          ) : (
            messages.map((msg, i) => {
              const isUser = msg.role === "user";
              const isStreaming = !isUser && i === messages.length - 1 && streaming;

              return (
                <div
                  key={i}
                  className={`${styles.row} ${isUser ? styles.rowUser : styles.rowAssistant}`}
                >
                  {!isUser && (
                    <div className={styles.aAvatar}>
                      <Image
                        src="/logo.png"
                        alt="Ollive"
                        width={18}
                        height={18}
                        className={styles.aAvatarImg}
                      />
                    </div>
                  )}

                  <div className={`${styles.bubble} ${isUser ? styles.bubbleUser : styles.bubbleAssistant}`}>
                    {!isUser && (
                      <div className={styles.bubbleBand}>
                        <span className={styles.withOlliveLabel}>With Ollive</span>
                      </div>
                    )}
                    <div className={styles.bubbleBody}>
                      <p className={styles.bubbleText}>
                        {msg.content}
                        {isStreaming && <span className={styles.cursor} />}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className={styles.inputArea}>
          <div className={styles.inputWrap}>
            <textarea
              ref={textareaRef}
              className={styles.textarea}
              placeholder="Ask anything..."
              value={input}
              rows={1}
              onChange={(e) => { setInput(e.target.value); autoResize(); }}
              onKeyDown={onKeyDown}
              disabled={streaming}
            />
            <button className={styles.micBtn} aria-label="Voice input" tabIndex={-1} type="button">
              <MicIcon />
            </button>
            <button
              className={styles.sendBtn}
              onClick={send}
              disabled={!input.trim() || streaming}
              aria-label="Send"
            >
              <SendIcon />
            </button>
          </div>
          <p className={styles.inputHint}>
            <kbd className={styles.kbd}>Enter</kbd> to send
            <span className={styles.hintDot}>·</span>
            <kbd className={styles.kbd}><span className={styles.shiftArrow}>⇧</span> Enter</kbd> for new line
          </p>
        </div>
      </div>
    </div>
  );
}
