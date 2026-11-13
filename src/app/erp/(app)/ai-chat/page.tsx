"use client";

import React, { FormEvent, useEffect, useRef, useState } from "react";

type Provider = "openai" | "claude" | "gemini";
type Message = { id: string; role: "user" | "assistant"; content: string; createdAt: Date };
type SavedChat = { id: string; title: string; messages: Message[]; updatedAt: string };
type Project = { id: string; name: string; chats: SavedChat[] };

const PROVIDERS: { id: Provider; name: string; subtitle: string; mark: string; color: string }[] = [
  { id: "openai", name: "ChatGPT", subtitle: "OpenAI", mark: "✳", color: "#10a37f" },
  { id: "claude", name: "Claude", subtitle: "Anthropic", mark: "✳", color: "#c46b45" },
  { id: "gemini", name: "Gemini", subtitle: "Google", mark: "✦", color: "#4285f4" },
];

const makeId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

export default function AIAssistantPage() {
  const [provider, setProvider] = useState<Provider>("openai");
  const [models, setModels] = useState<{ id: string; name: string }[]>([]);
  const [selectedModel, setSelectedModel] = useState("");
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeProjectId, setActiveProjectId] = useState<string>("");
  const [activeChatId, setActiveChatId] = useState<string>("");
  const [projectNameInput, setProjectNameInput] = useState("");
  const [showProjectCreator, setShowProjectCreator] = useState(false);
  const [modelsLoading, setModelsLoading] = useState(false);
  const [modelsError, setModelsError] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content:
        "Hello! I’m your JAAD AI Assistant. Ask me a question, get help with a task, or ask me to explain something. You can switch AI providers from the selector above.",
      createdAt: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const currentProvider = PROVIDERS.find((p) => p.id === provider)!;

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem("jaad-ai-projects-v1");
      if (raw) {
        const saved = JSON.parse(raw) as Project[];
        if (Array.isArray(saved) && saved.length) {
          setProjects(saved);
          const firstProject = saved[0];
          setActiveProjectId(firstProject.id);
          const latestChat = [...firstProject.chats].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0];
          if (latestChat) {
            setActiveChatId(latestChat.id);
            setMessages(latestChat.messages.map((m) => ({ ...m, createdAt: new Date(m.createdAt) })));
          } else {
            setActiveChatId("");
          }
          return;
        }
      }
    } catch { /* Ignore invalid local browser data and start a fresh workspace. */ }
    const starter: Project = { id: makeId(), name: "My first project", chats: [] };
    setProjects([starter]);
    setActiveProjectId(starter.id);
  }, []);

  useEffect(() => {
    if (!projects.length) return;
    try { window.localStorage.setItem("jaad-ai-projects-v1", JSON.stringify(projects)); } catch { /* Browser storage may be unavailable. */ }
  }, [projects]);

  useEffect(() => {
    if (!activeProjectId || !projects.length || !messages.length) return;
    const project = projects.find((p) => p.id === activeProjectId);
    if (!project) return;
    const firstUserMessage = messages.find((m) => m.role === "user");
    if (!activeChatId && !firstUserMessage) return;
    const title = firstUserMessage?.content.slice(0, 48) || "New chat";
    const chatId = activeChatId || makeId();
    if (!activeChatId) setActiveChatId(chatId);
    const saved: SavedChat = { id: chatId, title, messages, updatedAt: new Date().toISOString() };
    setProjects((current) => current.map((p) => p.id !== activeProjectId ? p : {
      ...p,
      chats: [...p.chats.filter((c) => c.id !== chatId), saved].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
    }));
  // Message/project changes are persisted to this browser's local storage.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages, activeProjectId]);

  function createProject() {
    const name = projectNameInput.trim();
    if (!name) return;
    const project: Project = { id: makeId(), name, chats: [] };
    setProjects((current) => [project, ...current]);
    setActiveProjectId(project.id);
    setActiveChatId("");
    setMessages([{ id: "welcome", role: "assistant", content: `Welcome to ${name}. Start a conversation to keep its chats organized here.`, createdAt: new Date() }]);
    setProjectNameInput("");
    setShowProjectCreator(false);
    setError("");
  }

  function openProject(project: Project) {
    setActiveProjectId(project.id);
    const latestChat = [...project.chats].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0];
    if (latestChat) {
      setActiveChatId(latestChat.id);
      setMessages(latestChat.messages.map((m) => ({ ...m, createdAt: new Date(m.createdAt) })));
    } else {
      setActiveChatId("");
      setMessages([{ id: "welcome", role: "assistant", content: `Welcome to ${project.name}. Start a conversation to keep its chats organized here.`, createdAt: new Date() }]);
    }
    setError("");
  }

  function openSavedChat(project: Project, chat: SavedChat) {
    setActiveProjectId(project.id);
    setActiveChatId(chat.id);
    setMessages(chat.messages.map((m) => ({ ...m, createdAt: new Date(m.createdAt) })));
    setError("");
  }

  async function loadModels(selectedProvider: Provider, preserveSelection = false) {
    setModelsLoading(true);
    setModelsError("");
    try {
      const response = await fetch(`/api/ai-assistant/models?provider=${encodeURIComponent(selectedProvider)}`, {
        method: "GET",
        cache: "no-store",
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data?.error || "Could not load available models.");
      const available = Array.isArray(data?.models) ? data.models : [];
      if (!available.length) throw new Error("No compatible chat models were returned for this provider.");
      setModels(available);
      setSelectedModel((current) => preserveSelection && available.some((m: { id: string }) => m.id === current) ? current : (data.defaultModel && available.some((m: { id: string }) => m.id === data.defaultModel) ? data.defaultModel : available[0].id));
    } catch (err) {
      setModels([]);
      setSelectedModel("");
      setModelsError(err instanceof Error ? err.message : "Could not load models.");
    } finally {
      setModelsLoading(false);
    }
  }

  useEffect(() => {
    void loadModels(provider);
    // Provider change intentionally reloads its server-discovered model catalog.
  }, [provider]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      void loadModels(provider, true);
    }, 30 * 60 * 1000);
    return () => window.clearInterval(timer);
  }, [provider]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, sending]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  async function sendMessage(event?: FormEvent) {
    event?.preventDefault();
    const text = input.trim() || (selectedFiles.length ? "Please review the attached file(s) and summarize the key information." : "");
    if (!text || sending) return;

    const userMessage: Message = { id: makeId(), role: "user", content: text, createdAt: new Date() };
    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    setInput("");
    setError("");
    setSending(true);

    try {
      // Keep provider credentials on the server. Do not put API keys in this client component.
      const payload = new FormData();
      payload.append("provider", provider);
      payload.append("model", selectedModel);
      payload.append("message", text);
      payload.append(
        "messages",
        JSON.stringify(
          nextMessages
            .filter((m) => m.id !== "welcome")
            .map((m) => ({ role: m.role, content: m.content }))
        )
      );
      selectedFiles.forEach((file) => payload.append("files", file, file.name));

      const response = await fetch("/api/ai-assistant/chat", {
        method: "POST",
        body: payload,
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        const serverError = String(data?.error || "");
        if (serverError.toLowerCase().includes("model is no longer available")) {
          // Refresh the current provider's catalog so stale preview/agent model IDs
          // are removed from the selector. Do not silently send user content to a
          // different model; ask the user to retry after the selector updates.
          await loadModels(provider, false);
          throw new Error("The selected model is no longer available. We refreshed the model list. Choose one of the updated models, then send your message and attachments again.");
        }
        throw new Error(
          data?.error ||
            (response.status === 404
              ? "The AI chat API route is not installed yet. Add /api/ai-assistant/chat on the server to enable live AI responses."
              : "The assistant could not respond. Please try again.")
        );
      }
      const answer = data?.reply || data?.message || data?.content;
      if (typeof answer !== "string" || !answer.trim()) {
        throw new Error("The AI service returned an empty response. Check the server API configuration.");
      }
      setMessages((old) => [...old, { id: makeId(), role: "assistant", content: answer, createdAt: new Date() }]);
      setSelectedFiles([]);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to reach the AI service.";
      setError(message);
      setMessages((old) => [
        ...old,
        {
          id: makeId(),
          role: "assistant",
          content: "I couldn’t reach the AI service just now. Your message is still visible above. Check the connection and try again.",
          createdAt: new Date(),
        },
      ]);
    } finally {
      setSending(false);
      window.setTimeout(() => inputRef.current?.focus(), 0);
    }
  }


  function startNewChat() {
    setActiveChatId(makeId());
    setMessages([
      {
        id: "welcome",
        role: "assistant",
        content: `New chat started with ${currentProvider.name}. What would you like help with?`,
        createdAt: new Date(),
      },
    ]);
    setError("");
    setInput("");
    setSelectedFiles([]);
    if (fileInputRef.current) fileInputRef.current.value = "";
    inputRef.current?.focus();
  }

  return (
    <main className="jaad-ai-page">
      <style jsx global>{`
        .jaad-ai-page{--ai-red:#d90429;--ai-ink:#202124;--ai-muted:#6b7280;--ai-line:#e5e7eb;display:flex;min-height:calc(100vh - 90px);height:calc(100vh - 90px);background:#f7f8fa;color:var(--ai-ink);font-family:Arial,Helvetica,sans-serif;overflow:hidden}
        .jaad-ai-page *{box-sizing:border-box}
        .jaad-ai-sidebar{width:250px;flex:0 0 250px;background:#fff;border-right:1px solid var(--ai-line);padding:18px 14px;display:flex;flex-direction:column;gap:16px}
        .jaad-ai-brand{display:flex;align-items:center;gap:10px;padding:2px 5px 16px;border-bottom:1px solid #f0f1f3;font-weight:700}
        .jaad-ai-brand-icon{height:38px;width:38px;flex:0 0 38px;border-radius:9px;object-fit:contain;background:#000;display:block}.jaad-ai-projects{display:flex;flex-direction:column;gap:5px;min-height:0;overflow:auto}.jaad-ai-project-row{display:flex;flex-direction:column;gap:4px}.jaad-ai-project-btn,.jaad-ai-chat-link{width:100%;border:1px solid transparent;border-radius:8px;background:transparent;color:#374151;text-align:left;padding:8px 9px;cursor:pointer;font-size:12px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.jaad-ai-project-btn.active{background:#fff1f2;border-color:#fecdd3;color:#111827;font-weight:700}.jaad-ai-chat-link{padding-left:22px;color:#6b7280;font-size:11px}.jaad-ai-chat-link.active{color:#b91c1c;background:#fff7f7}.jaad-ai-project-create{border:1px dashed #d1d5db;border-radius:8px;background:#fff;padding:8px;color:#4b5563;text-align:left;font-size:12px;cursor:pointer}.jaad-ai-project-form{display:flex;flex-direction:column;gap:6px}.jaad-ai-project-form input{min-width:0;border:1px solid #d1d5db;border-radius:7px;padding:8px;font-size:12px}.jaad-ai-project-form button{border:0;border-radius:7px;padding:8px;background:#d90429;color:#fff;font-weight:700;cursor:pointer}.jaad-ai-project-form .cancel{background:#f3f4f6;color:#4b5563}.jaad-ai-message-avatar img,.jaad-ai-avatar img{width:100%;height:100%;object-fit:contain;border-radius:inherit}.jaad-ai-message-avatar{overflow:hidden}
        .jaad-ai-new{border:0;border-radius:9px;background:var(--ai-red);color:#fff;font-weight:700;padding:12px 14px;text-align:left;cursor:pointer}
        .jaad-ai-new:hover{background:#b60020}
        .jaad-ai-side-label{font-size:11px;text-transform:uppercase;letter-spacing:.08em;color:#9ca3af;font-weight:700;padding:0 7px}
        .jaad-ai-provider-list{display:flex;flex-direction:column;gap:6px}
        .jaad-ai-provider{display:flex;align-items:center;gap:10px;border:1px solid transparent;border-radius:9px;padding:10px;background:transparent;text-align:left;cursor:pointer;color:#374151}
        .jaad-ai-provider:hover{background:#f8fafc}.jaad-ai-provider.active{background:#fff1f2;border-color:#fecdd3;color:#111827}
        .jaad-ai-provider-mark{width:32px;height:32px;border-radius:9px;display:grid;place-items:center;font-size:19px;font-weight:700;background:#f3f4f6}
        .jaad-ai-provider-text{display:flex;flex-direction:column;gap:3px;flex:1}.jaad-ai-provider-name{font-size:13px;font-weight:700}.jaad-ai-provider-sub{font-size:11px;color:#9ca3af}
        .jaad-ai-status{margin-top:auto;padding:12px;border:1px solid var(--ai-line);border-radius:10px;font-size:12px;color:#6b7280;line-height:1.5}
        .jaad-ai-status-dot{display:inline-block;width:7px;height:7px;border-radius:50%;background:#16a34a;margin-right:7px}
        .jaad-ai-content{min-width:0;flex:1;display:flex;flex-direction:column}
        .jaad-ai-topbar{height:66px;flex:0 0 66px;background:#fff;border-bottom:1px solid var(--ai-line);display:flex;align-items:center;gap:12px;padding:0 22px}
        .jaad-ai-top-title{font-size:16px;font-weight:700}.jaad-ai-top-sub{font-size:12px;color:var(--ai-muted);margin-top:4px}.jaad-ai-model-control{display:flex;align-items:center;gap:7px}.jaad-ai-model-control label{font-size:11px;color:#6b7280}.jaad-ai-model-control select{max-width:220px;min-width:130px;border:1px solid #e5e7eb;border-radius:8px;padding:8px 10px;background:#fff;color:#374151;font-size:12px}.jaad-ai-model-error{font-size:11px;color:#b91c1c;margin:6px auto 0;max-width:900px}
        .jaad-ai-spacer{flex:1}.jaad-ai-iconbtn{height:36px;min-width:36px;border:1px solid var(--ai-line);background:#fff;border-radius:8px;cursor:pointer;color:#4b5563;font-size:16px}
        .jaad-ai-iconbtn:hover{background:#f9fafb}
        .jaad-ai-chat-layout{display:flex;flex:1;min-height:0;padding:22px;gap:18px}
        .jaad-ai-chat-card{display:flex;flex-direction:column;min-width:0;flex:1;max-width:1120px;margin:0 auto;background:#fff;border:1px solid var(--ai-line);border-radius:14px;overflow:hidden;box-shadow:0 4px 20px #11182708}
        .jaad-ai-chat-heading{padding:17px 20px;border-bottom:1px solid #f0f1f3;display:flex;align-items:center;gap:12px}
        .jaad-ai-avatar{width:38px;height:38px;border-radius:12px;display:grid;place-items:center;background:#fff1f2;color:var(--ai-red);font-size:21px}
        .jaad-ai-chat-heading-title{font-size:14px;font-weight:700}.jaad-ai-chat-heading-sub{font-size:12px;color:var(--ai-muted);margin-top:4px}
        .jaad-ai-messages{flex:1;min-height:0;overflow:auto;padding:24px clamp(16px,4vw,54px);display:flex;flex-direction:column;gap:22px}
        .jaad-ai-message{display:flex;align-items:flex-start;gap:11px;max-width:900px;width:100%;min-width:0;margin:0 auto}.jaad-ai-message>div:last-child{min-width:0;max-width:calc(100% - 42px)}
        .jaad-ai-message.user{justify-content:flex-end}
        .jaad-ai-message-avatar{width:30px;height:30px;flex:0 0 30px;border-radius:9px;background:#fff1f2;color:var(--ai-red);display:grid;place-items:center;font-size:14px;font-weight:700}
        .jaad-ai-message.user .jaad-ai-message-avatar{order:2;background:#eef2ff;color:#4f46e5}
        .jaad-ai-bubble{display:block;min-width:0;max-width:min(82%,760px);padding:13px 15px;border-radius:13px;background:#f7f8fa;color:#252a31;font-size:14px;line-height:1.65;white-space:pre-wrap;overflow-wrap:break-word;word-break:normal;hyphens:none}
        .jaad-ai-message.user .jaad-ai-bubble{background:#d90429;color:#fff;border-bottom-right-radius:4px}
        .jaad-ai-message:not(.user) .jaad-ai-bubble{border:1px solid #eef0f3;border-top-left-radius:4px}
        .jaad-ai-message-time{font-size:10px;color:#9ca3af;margin-top:6px}
        .jaad-ai-composer-wrap{padding:14px clamp(14px,4vw,48px) 18px;border-top:1px solid #f0f1f3;background:#fff}
        .jaad-ai-composer{max-width:900px;margin:0 auto;border:1px solid #d1d5db;border-radius:14px;padding:10px;display:flex;align-items:flex-end;gap:8px;box-shadow:0 2px 8px #11182708}.jaad-ai-attach{height:42px;min-width:42px;border:1px solid #e5e7eb;border-radius:10px;background:#fff;color:#4b5563;font-size:19px;cursor:pointer}.jaad-ai-attach:hover{background:#f9fafb;border-color:#d1d5db}.jaad-ai-file-list{max-width:900px;margin:8px auto 0;display:flex;gap:7px;flex-wrap:wrap}.jaad-ai-file-chip{display:flex;align-items:center;gap:7px;max-width:100%;border:1px solid #e5e7eb;border-radius:9px;background:#f9fafb;padding:6px 8px;font-size:11px;color:#374151}.jaad-ai-file-chip span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:220px}.jaad-ai-file-chip button{border:0;background:transparent;cursor:pointer;color:#6b7280;font-size:15px}.jaad-ai-upload-note{max-width:900px;margin:6px auto 0;color:#9ca3af;font-size:10px}
        .jaad-ai-composer:focus-within{border-color:#fda4af;box-shadow:0 0 0 3px #d9042912}
        .jaad-ai-textarea{flex:1;resize:none;max-height:180px;min-height:42px;border:0;outline:0;background:transparent;font:inherit;font-size:14px;line-height:1.5;padding:10px 6px;color:#111827}
        .jaad-ai-send{height:42px;min-width:44px;border:0;border-radius:10px;background:var(--ai-red);color:#fff;font-size:18px;cursor:pointer}.jaad-ai-send:disabled{opacity:.45;cursor:not-allowed}
        .jaad-ai-hint{max-width:900px;margin:8px auto 0;text-align:center;color:#9ca3af;font-size:11px}
        .jaad-ai-error{margin:12px auto 0;max-width:900px;background:#fff1f2;border:1px solid #fecdd3;color:#9f1239;border-radius:9px;padding:10px 12px;font-size:12px;line-height:1.5}
        .jaad-ai-tools{display:none}
        .jaad-ai-tool-card{background:#fff;border:1px solid var(--ai-line);border-radius:12px;padding:16px}
        .jaad-ai-tool-card h3{font-size:13px;margin:0 0 8px}.jaad-ai-tool-card p{font-size:12px;color:#6b7280;line-height:1.6;margin:0}
        .jaad-ai-connect{width:100%;margin-top:12px;border:1px solid var(--ai-line);border-radius:8px;background:#fff;padding:9px 10px;text-align:left;cursor:pointer;font-size:12px;font-weight:600}
        .jaad-ai-connect:hover{background:#f9fafb}.jaad-ai-connect span{float:right;color:#16a34a}
        .jaad-ai-popover{position:fixed;right:24px;bottom:24px;z-index:1000;width:min(410px,calc(100vw - 28px));height:min(650px,calc(100vh - 50px));background:#fff;border:1px solid #e5e7eb;border-radius:16px;box-shadow:0 20px 70px #0003;display:flex;flex-direction:column;overflow:hidden}
        .jaad-ai-popover-head{display:flex;align-items:center;gap:10px;padding:13px 14px;background:#fff;border-bottom:1px solid #eef0f3}.jaad-ai-popover-logo{background:#000;overflow:hidden;flex:0 0 38px}.jaad-ai-popover-logo img{width:100%;height:100%;object-fit:contain;border-radius:inherit}
        .jaad-ai-popover-body{flex:1;overflow:auto;padding:14px;display:flex;flex-direction:column;gap:14px}
        .jaad-ai-popover .jaad-ai-message{gap:7px}.jaad-ai-popover .jaad-ai-message-avatar{width:25px;height:25px;flex-basis:25px;font-size:12px}.jaad-ai-popover .jaad-ai-bubble{font-size:12px;padding:10px 11px;max-width:88%}.jaad-ai-popover .jaad-ai-composer-wrap{padding:10px}.jaad-ai-popover .jaad-ai-composer{padding:6px;border-radius:11px}.jaad-ai-popover .jaad-ai-textarea{font-size:12px;min-height:34px}.jaad-ai-popover .jaad-ai-send{height:36px;min-width:38px}
        @media(max-width:1050px){.jaad-ai-tools{display:none}.jaad-ai-sidebar{width:215px;flex-basis:215px}.jaad-ai-chat-layout{padding:14px}}
        @media(max-width:700px){.jaad-ai-model-control{max-width:100%}.jaad-ai-model-control select{max-width:145px;min-width:95px}.jaad-ai-topbar{height:auto;min-height:66px;flex-wrap:wrap;padding:10px}.jaad-ai-page{height:auto;min-height:calc(100vh - 70px)}.jaad-ai-sidebar{display:none}.jaad-ai-topbar{padding:0 13px}.jaad-ai-chat-layout{padding:9px}.jaad-ai-chat-card{min-height:calc(100vh - 150px)}.jaad-ai-messages{padding:18px 12px}.jaad-ai-bubble{max-width:90%}}
      `}</style>

      {sidebarOpen && (
        <aside className="jaad-ai-sidebar">
          <div className="jaad-ai-brand"><img className="jaad-ai-brand-icon" src="/jaad-logo.jpeg" alt="JAAD Logistics logo" /><span>JAAD Workspace</span></div>
          <button className="jaad-ai-new" onClick={startNewChat}>＋　New chat</button>
          <div className="jaad-ai-side-label">Projects</div>
          <button className="jaad-ai-project-create" onClick={() => setShowProjectCreator((value) => !value)}>＋　New project</button>
          {showProjectCreator && <form className="jaad-ai-project-form" onSubmit={(event) => { event.preventDefault(); createProject(); }}><input autoFocus value={projectNameInput} onChange={(event) => setProjectNameInput(event.target.value)} placeholder="Project name" aria-label="Project name" /><button type="submit">Create project</button><button className="cancel" type="button" onClick={() => { setShowProjectCreator(false); setProjectNameInput(""); }}>Cancel</button></form>}
          <div className="jaad-ai-projects">
            {projects.map((project) => <div className="jaad-ai-project-row" key={project.id}>
              <button className={`jaad-ai-project-btn ${activeProjectId === project.id ? "active" : ""}`} title={project.name} onClick={() => openProject(project)}>▰　{project.name}</button>
              {activeProjectId === project.id && project.chats.slice(0, 5).map((chat) => <button key={chat.id} className={`jaad-ai-chat-link ${activeChatId === chat.id ? "active" : ""}`} title={chat.title} onClick={() => openSavedChat(project, chat)}>• {chat.title}</button>)}
            </div>)}
          </div>
          <div className="jaad-ai-side-label">Choose your AI</div>
          <div className="jaad-ai-provider-list">
            {PROVIDERS.map((item) => (
              <button key={item.id} className={`jaad-ai-provider ${provider === item.id ? "active" : ""}`} onClick={() => setProvider(item.id)}>
                <span className="jaad-ai-provider-mark" style={{ color: item.color }}>{item.mark}</span>
                <span className="jaad-ai-provider-text"><span className="jaad-ai-provider-name">{item.name}</span><span className="jaad-ai-provider-sub">{item.subtitle}</span></span>
                {provider === item.id && <span aria-hidden="true">✓</span>}
              </button>
            ))}
          </div>
          <div className="jaad-ai-side-label">Quick prompts</div>
          <div className="jaad-ai-provider-list">
            {["Help me plan my work", "Summarize this information", "Draft a professional email"].map((prompt) => (
              <button key={prompt} className="jaad-ai-provider" onClick={() => { setInput(prompt); inputRef.current?.focus(); }}>
                <span style={{ color: "#9ca3af" }}>↗</span><span className="jaad-ai-provider-name" style={{ fontWeight: 500 }}>{prompt}</span>
              </button>
            ))}
          </div>
          <div className="jaad-ai-status"><span className="jaad-ai-status-dot" /> JAAD AI workspace<br />Keep your provider API credentials secure on the server.</div>
        </aside>
      )}

      <section className="jaad-ai-content">
        <header className="jaad-ai-topbar">
          <button className="jaad-ai-iconbtn" title={sidebarOpen ? "Hide sidebar" : "Show sidebar"} onClick={() => setSidebarOpen(!sidebarOpen)}>☰</button>
          <div><div className="jaad-ai-top-title">AI Assistant</div><div className="jaad-ai-top-sub">Ask questions and get help without leaving JAAD ERP</div></div>
          <div className="jaad-ai-model-control">
            <label htmlFor="jaad-ai-model-select">Model</label>
            <select id="jaad-ai-model-select" value={selectedModel} disabled={modelsLoading || !models.length} onChange={(e) => setSelectedModel(e.target.value)}>
              {modelsLoading && <option value="">Loading models…</option>}
              {!modelsLoading && !models.length && <option value="">Models unavailable</option>}
              {models.map((model) => <option key={model.id} value={model.id}>{model.name}</option>)}
            </select>
            <button className="jaad-ai-iconbtn" type="button" title="Refresh model list" onClick={() => void loadModels(provider, true)} disabled={modelsLoading}>↻</button>
          </div>
          <div className="jaad-ai-spacer" />
          <button className="jaad-ai-iconbtn" title="Open compact assistant" onClick={() => setSettingsOpen((v) => !v)}>▣</button>
        </header>

        <div className="jaad-ai-chat-layout">
          <section className="jaad-ai-chat-card">
            <div className="jaad-ai-chat-heading">
              <div className="jaad-ai-avatar"><img src="/jaad-logo.jpeg" alt="JAAD Logistics" /></div>
              <div><div className="jaad-ai-chat-heading-title">JAAD AI Assistant</div><div className="jaad-ai-chat-heading-sub">Selected provider · Chat stays inside your ERP</div></div>
              <div className="jaad-ai-spacer" />
              <button className="jaad-ai-iconbtn" title="Start new chat" onClick={startNewChat}>＋</button>
            </div>
            <div className="jaad-ai-messages" aria-live="polite">
              {messages.map((message) => (
                <div key={message.id} className={`jaad-ai-message ${message.role}`}>
                  <div className="jaad-ai-message-avatar">{message.role === "assistant" ? <img src="/jaad-logo.jpeg" alt="JAAD assistant" /> : "J"}</div>
                  <div><div className="jaad-ai-bubble">{message.content}</div><div className="jaad-ai-message-time">{message.createdAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</div></div>
                </div>
              ))}
              {sending && <div className="jaad-ai-message"><div className="jaad-ai-message-avatar"><img src="/jaad-logo.jpeg" alt="JAAD assistant" /></div><div className="jaad-ai-bubble">Thinking…</div></div>}
              <div ref={endRef} />
            </div>
            <div className="jaad-ai-composer-wrap">
              <form className="jaad-ai-composer" onSubmit={sendMessage}>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept="image/jpeg,image/png,image/webp,image/gif,.jpg,.jpeg,.png,.webp,.gif,.txt,.md,.csv,.json,.log,.pdf,.docx"
                  hidden
                  onChange={(e) => {
                    const incoming = Array.from(e.target.files || []);
                    const allowed = new Set(["jpg", "jpeg", "png", "webp", "gif", "txt", "md", "csv", "json", "log", "pdf", "docx"]);
                    const valid = incoming.filter((file) => {
                      const ext = file.name.split(".").pop()?.toLowerCase() || "";
                      return allowed.has(ext) && file.size <= 8 * 1024 * 1024;
                    });
                    setSelectedFiles((current) => [...current, ...valid].slice(0, 5));
                    if (incoming.some((file) => file.size > 8 * 1024 * 1024)) {
                      setError("Each file must be 8 MB or smaller.");
                    } else if (valid.length !== incoming.length) {
                      setError("Supported files: JPG, PNG, WEBP, GIF, TXT, Markdown, CSV, JSON, LOG, PDF and DOCX. Maximum 8 MB per file and 5 files per message.");
                    } else {
                      setError("");
                    }
                    e.currentTarget.value = "";
                  }}
                />
                <button className="jaad-ai-attach" type="button" title="Attach files" aria-label="Attach files" onClick={() => fileInputRef.current?.click()}>＋</button>
                <textarea ref={inputRef} className="jaad-ai-textarea" value={input} onChange={(e) => setInput(e.target.value)} placeholder={`Message ${currentProvider.name}…`} rows={1} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void sendMessage(); } }} />
                <button className="jaad-ai-send" type="submit" disabled={sending || (!input.trim() && selectedFiles.length === 0)} aria-label="Send message">↑</button>
              </form>
              {selectedFiles.length > 0 && (
                <div className="jaad-ai-file-list">
                  {selectedFiles.map((file, index) => (
                    <div className="jaad-ai-file-chip" key={`${file.name}-${file.lastModified}-${index}`}>
                      <span aria-hidden="true">📎</span>
                      <span title={file.name}>{file.name} · {(file.size / 1024).toFixed(0)} KB</span>
                      <button type="button" aria-label={`Remove ${file.name}`} onClick={() => setSelectedFiles((current) => current.filter((_, i) => i !== index))}>×</button>
                    </div>
                  ))}
                </div>
              )}
              <div className="jaad-ai-upload-note">Attach up to 5 files · 8 MB each · Images, PDF, DOCX, TXT, MD, CSV, JSON, LOG</div>
              {error && <div className="jaad-ai-error">{error}</div>}
              {modelsError && <div className="jaad-ai-model-error">{modelsError} Check the provider API key and refresh the model list.</div>}
              <div className="jaad-ai-hint">AI can make mistakes. Check important information before acting on it.</div>
            </div>
          </section>


        </div>
      </section>

      {settingsOpen && (
        <div className="jaad-ai-popover" role="dialog" aria-label="Compact JAAD AI Assistant">
          <div className="jaad-ai-popover-head">
            <div className="jaad-ai-avatar jaad-ai-popover-logo"><img src="/jaad-logo.jpeg" alt="JAAD Logistics logo" /></div>
            <div style={{ flex: 1, minWidth: 0 }}><div className="jaad-ai-chat-heading-title">JAAD AI Assistant</div><div className="jaad-ai-chat-heading-sub">{currentProvider.name}</div></div>
            <select aria-label="AI provider" value={provider} onChange={(e) => setProvider(e.target.value as Provider)} style={{ maxWidth: 112, border: "1px solid #e5e7eb", borderRadius: 7, padding: 7, fontSize: 12 }}>
              {PROVIDERS.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
            <select aria-label="AI model" value={selectedModel} disabled={modelsLoading || !models.length} onChange={(e) => setSelectedModel(e.target.value)} style={{ maxWidth: 130, border: "1px solid #e5e7eb", borderRadius: 7, padding: 7, fontSize: 11 }}>
              {models.map((model) => <option key={model.id} value={model.id}>{model.name}</option>)}
            </select>
            <button className="jaad-ai-iconbtn" aria-label="Close compact assistant" onClick={() => setSettingsOpen(false)}>×</button>
          </div>
          <div className="jaad-ai-popover-body">
            {messages.map((message) => <div key={`pop-${message.id}`} className={`jaad-ai-message ${message.role}`}><div className="jaad-ai-message-avatar">{message.role === "assistant" ? <img src="/jaad-logo.jpeg" alt="JAAD assistant" /> : "J"}</div><div><div className="jaad-ai-bubble">{message.content}</div><div className="jaad-ai-message-time">{message.createdAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</div></div></div>)}
            {sending && <div className="jaad-ai-bubble">Thinking…</div>}
          </div>
          <div className="jaad-ai-composer-wrap">
            <form className="jaad-ai-composer" onSubmit={sendMessage}>
              <button className="jaad-ai-attach" type="button" title="Attach files" aria-label="Attach files" onClick={() => fileInputRef.current?.click()}>＋</button>
              <textarea className="jaad-ai-textarea" value={input} onChange={(e) => setInput(e.target.value)} placeholder="Ask anything…" rows={1} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void sendMessage(); } }} />
              <button className="jaad-ai-send" type="submit" disabled={sending || (!input.trim() && selectedFiles.length === 0)} aria-label="Send message">↑</button>
            </form>
            {selectedFiles.length > 0 && <div className="jaad-ai-file-list">{selectedFiles.map((file, index) => <div className="jaad-ai-file-chip" key={`float-${file.name}-${index}`}><span aria-hidden="true">📎</span><span title={file.name}>{file.name}</span><button type="button" aria-label={`Remove ${file.name}`} onClick={() => setSelectedFiles((current) => current.filter((_, i) => i !== index))}>×</button></div>)}</div>}
            {error && <div className="jaad-ai-error">{error}</div>}
          </div>
        </div>
      )}
    </main>
  );
}
