"use client";

import { useState, useRef, useEffect, KeyboardEvent, ChangeEvent } from "react";
import { Send, Bot, Loader2 } from "lucide-react";
import { format } from "date-fns";

interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

function renderAssistantContent(content: string) {
  const blocks: React.ReactNode[] = [];
  const lines = content.split("\n");
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Code block
    if (line.trim().startsWith("```")) {
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith("```")) {
        codeLines.push(lines[i]);
        i++;
      }
      i++; // skip closing ```
      blocks.push(
        <pre
          key={`code-${i}`}
          className="bg-surface p-3 rounded font-mono text-sm overflow-x-auto my-2"
        >
          <code>{codeLines.join("\n")}</code>
        </pre>
      );
      continue;
    }

    // Table detection: lines with | separators
    if (line.includes("|") && line.trim().startsWith("|")) {
      const tableLines: string[] = [line];
      i++;
      while (
        i < lines.length &&
        lines[i].includes("|") &&
        lines[i].trim().startsWith("|")
      ) {
        tableLines.push(lines[i]);
        i++;
      }

      // Parse table
      const rows = tableLines
        .filter((l) => !l.replace(/[|\-\s]/g, "").length === false)
        .filter((l) => !/^\|[\s\-:|]+\|$/.test(l.trim()))
        .map((l) =>
          l
            .split("|")
            .filter((_, idx, arr) => idx > 0 && idx < arr.length - 1)
            .map((cell) => cell.trim())
        );

      if (rows.length > 0) {
        const headerRow = rows[0];
        const bodyRows = rows.slice(1);
        blocks.push(
          <div key={`table-${i}`} className="overflow-x-auto my-2">
            <table className="w-full border border-border text-sm">
              <thead>
                <tr className="bg-surface">
                  {headerRow.map((cell, ci) => (
                    <th
                      key={ci}
                      className="border border-border px-3 py-1.5 text-left font-medium text-text"
                    >
                      {cell}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {bodyRows.map((row, ri) => (
                  <tr key={ri} className="hover:bg-surface/50">
                    {row.map((cell, ci) => (
                      <td key={ci} className="border border-border px-3 py-1.5">
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
        continue;
      }
    }

    // Header lines
    if (line.startsWith("# ")) {
      blocks.push(
        <h1 key={`h-${i}`} className="text-lg font-bold text-text mt-3 mb-1">
          {renderInlineFormatting(line.slice(2))}
        </h1>
      );
      i++;
      continue;
    }
    if (line.startsWith("## ")) {
      blocks.push(
        <h2 key={`h-${i}`} className="text-base font-bold text-text mt-3 mb-1">
          {renderInlineFormatting(line.slice(3))}
        </h2>
      );
      i++;
      continue;
    }
    if (line.startsWith("### ")) {
      blocks.push(
        <h3 key={`h-${i}`} className="text-sm font-bold text-text mt-2 mb-1">
          {renderInlineFormatting(line.slice(4))}
        </h3>
      );
      i++;
      continue;
    }

    // List items
    if (/^[\-\*]\s/.test(line.trim())) {
      blocks.push(
        <li key={`li-${i}`} className="ml-4 list-disc text-text">
          {renderInlineFormatting(line.trim().slice(2))}
        </li>
      );
      i++;
      continue;
    }

    // Empty line
    if (line.trim() === "") {
      blocks.push(<br key={`br-${i}`} />);
      i++;
      continue;
    }

    // Regular paragraph
    blocks.push(
      <p key={`p-${i}`} className="text-text">
        {renderInlineFormatting(line)}
      </p>
    );
    i++;
  }

  return <div className="space-y-0.5">{blocks}</div>;
}

function renderInlineFormatting(text: string): React.ReactNode {
  // Handle **bold** text
  const parts: React.ReactNode[] = [];
  const regex = /\*\*(.+?)\*\*/g;
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    parts.push(
      <strong key={match.index} className="font-bold text-text">
        {match[1]}
      </strong>
    );
    lastIndex = regex.lastIndex;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts.length === 1 ? parts[0] : <>{parts}</>;
}

export default function KyotoPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [isLoadingToday, setIsLoadingToday] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Auto-dismiss toast
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // Auto-grow textarea
  const handleInputChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    const el = e.target;
    el.style.height = "auto";
    const maxHeight = 4 * 24; // ~4 lines
    el.style.height = Math.min(el.scrollHeight, maxHeight) + "px";
  };

  const sendMessage = async (content: string) => {
    if (!content.trim() || isStreaming) return;

    const userMessage: Message = {
      role: "user",
      content: content.trim(),
      timestamp: new Date(),
    };

    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInput("");
    setIsStreaming(true);

    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }

    // Prepare messages for API (no timestamps)
    const apiMessages = updatedMessages.map(({ role, content }) => ({
      role,
      content,
    }));

    try {
      const res = await fetch("/api/kyoto", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: apiMessages }),
      });

      if (!res.ok) {
        throw new Error("Failed to get response");
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error("No reader available");

      const decoder = new TextDecoder();
      let assistantContent = "";

      // Add empty assistant message
      const assistantMessage: Message = {
        role: "assistant",
        content: "",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, assistantMessage]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        assistantContent += chunk;

        setMessages((prev) => {
          const updated = [...prev];
          updated[updated.length - 1] = {
            ...updated[updated.length - 1],
            content: assistantContent,
            timestamp: new Date(),
          };
          return updated;
        });
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Erro ao conectar com a API. Verifique a configuração.",
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsStreaming(false);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const handleAnalisarHoje = async () => {
    if (isStreaming || isLoadingToday) return;
    setIsLoadingToday(true);

    const today = format(new Date(), "yyyy-MM-dd");

    try {
      const res = await fetch(`/api/metrics/${today}`);
      if (res.status === 404) {
        setToast(
          "Nenhum registro encontrado para hoje. Preencha a planilha primeiro."
        );
        setIsLoadingToday(false);
        return;
      }
      if (!res.ok) throw new Error("Fetch failed");

      const data = await res.json();

      let message = `Kyoto, analisa os dados de hoje:\n\nCONTA:\n- Data: ${data.date}\n- Gasto: R$ ${data.gastoTotal}\n- Receita: R$ ${data.receitaTotal}\n- MER: ${data.mer}x\n- EMQ: ${data.emq}\n- Conversões: ${data.convTotal}`;

      // Campaigns
      if (data.campaigns && data.campaigns.length > 0) {
        message += "\n\nCAMPANHAS:";
        for (const c of data.campaigns) {
          message += `\n${c.name} · ${c.region} · CPMr R$${c.cpmr} · Frequency ${c.frequency} · Hook ${c.hookRate}% · Hold ${c.holdRate}% · CPA R$${c.cpa} · Status: ${c.status}`;
        }
      }

      // Funnel
      if (data.funnel) {
        const f = data.funnel;
        message += `\n\nFUNIL:\n- Cliques → TypeBot: ${f.cliques} → ${f.tbInicio} (${f.taxaEntrada}%)\n- TypeBot → Checkout: ${f.tbInicio} → ${f.checkouts} (${f.taxaCheckout}%)\n- Checkout → Compra: ${f.checkouts} → ${f.compras} (${f.taxaConv}%)`;
      }

      // Creatives
      if (data.creatives && data.creatives.length > 0) {
        message += "\n\nCRIATIVOS ATIVOS:";
        for (const cr of data.creatives) {
          message += `\n${cr.name} · ${cr.daysRunning}d · Hook ${cr.hookRate}% · Hold ${cr.holdRate}% · ${cr.conversions} conv · CPA R$${cr.cpa} · ${cr.status}`;
        }
      }

      // Geo
      if (
        data.geo &&
        (data.geo.top1 || data.geo.top2 || data.geo.top3)
      ) {
        message += `\n\nGEO: ${data.geo.top1} / ${data.geo.top2} / ${data.geo.top3}`;
      }

      // Decisions obs
      if (data.decisions && data.decisions.obs) {
        message += `\n\nOBSERVAÇÃO: ${data.decisions.obs}`;
      }

      message += "\n\nDiagnóstico completo em 3 camadas.";

      setIsLoadingToday(false);
      await sendMessage(message);
    } catch {
      setToast("Erro ao buscar dados de hoje.");
      setIsLoadingToday(false);
    }
  };

  return (
    <div className="flex flex-col" style={{ height: "calc(100vh - 48px)" }}>
      {/* Toast */}
      {toast && (
        <div className="fixed top-4 right-4 z-50 bg-card border border-accent-yellow text-text px-4 py-3 rounded-lg shadow-lg text-sm max-w-sm">
          {toast}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-card">
        <div className="flex items-center gap-3">
          <span className="font-mono text-xl text-accent">Kyoto</span>
          <span className="relative flex h-2 w-2">
            <span className="animate-pulse absolute inline-flex h-full w-full rounded-full bg-accent-green opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-accent-green"></span>
          </span>
        </div>
        <button
          onClick={handleAnalisarHoje}
          disabled={isStreaming || isLoadingToday}
          className="flex items-center gap-2 px-3 py-1.5 bg-accent/20 border border-accent/30 rounded-lg text-sm text-accent hover:bg-accent/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoadingToday ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : null}
          Analisar hoje
        </button>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-muted">
            <Bot className="w-12 h-12 mb-3 opacity-30" />
            <p className="text-sm font-mono">
              Envie uma mensagem para começar a análise.
            </p>
          </div>
        )}

        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`flex ${
              msg.role === "user" ? "justify-end" : "justify-start"
            }`}
          >
            <div
              className={
                msg.role === "user"
                  ? "bg-accent/20 border border-accent/30 rounded-xl px-4 py-3 max-w-[70%]"
                  : "bg-card border border-border rounded-xl px-4 py-3 max-w-[80%] font-mono text-sm"
              }
            >
              {msg.role === "assistant" ? (
                renderAssistantContent(msg.content)
              ) : (
                <p className="whitespace-pre-wrap">{msg.content}</p>
              )}

              {/* Typing indicator */}
              {msg.role === "assistant" &&
                msg.content === "" &&
                isStreaming &&
                idx === messages.length - 1 && (
                  <div className="flex items-center gap-1 py-1">
                    <span className="w-1.5 h-1.5 bg-accent rounded-full animate-pulse" />
                    <span
                      className="w-1.5 h-1.5 bg-accent rounded-full animate-pulse"
                      style={{ animationDelay: "0.2s" }}
                    />
                    <span
                      className="w-1.5 h-1.5 bg-accent rounded-full animate-pulse"
                      style={{ animationDelay: "0.4s" }}
                    />
                  </div>
                )}

              <p className="text-xs text-muted mt-1.5">
                {format(msg.timestamp, "HH:mm")}
              </p>
            </div>
          </div>
        ))}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Bar */}
      <div
        className="flex items-end gap-3 px-4 bg-surface border-t border-border"
        style={{ minHeight: "80px" }}
      >
        <textarea
          ref={textareaRef}
          value={input}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          disabled={isStreaming}
          placeholder="Envie dados ou faça uma pergunta técnica..."
          rows={1}
          className="flex-1 bg-card border border-border rounded-lg px-4 py-3 text-text text-sm resize-none placeholder:text-muted focus:outline-none focus:border-accent/50 disabled:opacity-50 my-auto"
          style={{ maxHeight: `${4 * 24}px` }}
        />
        <button
          onClick={() => sendMessage(input)}
          disabled={isStreaming || !input.trim()}
          className="bg-accent rounded-lg p-3 text-white hover:bg-accent/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed my-auto"
        >
          {isStreaming ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Send className="w-5 h-5" />
          )}
        </button>
      </div>
    </div>
  );
}
