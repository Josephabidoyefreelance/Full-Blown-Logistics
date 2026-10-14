import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 60;

type Provider = "openai" | "claude" | "gemini";
type ChatMessage = { role: "user" | "assistant"; content: string };
type ImageAttachment = { name: string; mediaType: string; base64: string };
const MAX_FILE_BYTES = 8 * 1024 * 1024;
const MAX_FILES = 5;

function fail(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

function imageMediaType(file: File): string | null {
  const name = file.name.toLowerCase();
  const byExtension: Record<string, string> = {
    ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png",
    ".webp": "image/webp", ".gif": "image/gif",
  };
  const ext = Object.keys(byExtension).find((suffix) => name.endsWith(suffix));
  const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif"];
  const declared = (file.type || "").toLowerCase();
  if (allowed.includes(declared)) return declared;
  return ext ? byExtension[ext] : null;
}

async function extractFileText(file: File): Promise<string> {
  if (file.size > MAX_FILE_BYTES) throw new Error(`${file.name} is larger than the 8 MB limit.`);
  const name = file.name.toLowerCase();
  const buffer = Buffer.from(await file.arrayBuffer());

  if (/\.(txt|md|csv|json|log)$/i.test(name)) {
    return `\n\n--- ATTACHED FILE: ${file.name} ---\n${buffer.toString("utf8").slice(0, 100_000)}\n--- END FILE ---\n`;
  }
  if (name.endsWith(".pdf")) {
    const pdfParse = (await import("pdf-parse")).default;
    const parsed = await pdfParse(buffer);
    const text = String(parsed.text || "").trim();
    if (!text) throw new Error(`No readable text was found in ${file.name}. Scanned/image-only PDFs need OCR, which is not enabled in this version.`);
    return `\n\n--- ATTACHED PDF: ${file.name} ---\n${text.slice(0, 100_000)}\n--- END PDF ---\n`;
  }
  if (name.endsWith(".docx")) {
    const mammoth = await import("mammoth");
    const parsed = await mammoth.extractRawText({ buffer });
    return `\n\n--- ATTACHED DOCUMENT: ${file.name} ---\n${String(parsed.value || "").slice(0, 100_000)}\n--- END DOCUMENT ---\n`;
  }
  throw new Error(`Unsupported file type: ${file.name}. Supported: JPG, JPEG, PNG, WEBP, GIF, TXT, MD, CSV, JSON, LOG, PDF and DOCX.`);
}

export async function POST(request: NextRequest) {
  let provider: Provider;
  let messages: ChatMessage[];
  let userText = "";
  let model = "";
  let files: File[] = [];
  let images: ImageAttachment[] = [];

  try {
    const contentType = request.headers.get("content-type") || "";
    if (contentType.includes("multipart/form-data")) {
      const form = await request.formData();
      provider = String(form.get("provider") || "") as Provider;
      userText = String(form.get("message") || "");
      model = String(form.get("model") || "");
      try {
        messages = JSON.parse(String(form.get("messages") || "[]"));
      } catch {
        return fail("Messages must be valid JSON.");
      }
      files = form.getAll("files").filter((item): item is File => item instanceof File && item.size > 0);
    } else {
      const body = await request.json();
      provider = body.provider as Provider;
      userText = typeof body.message === "string" ? body.message : "";
      model = typeof body.model === "string" ? body.model : "";
      messages = Array.isArray(body.messages) ? body.messages : [];
    }
  } catch {
    return fail("Could not read the request. Please try again.");
  }

  if (!["openai", "claude", "gemini"].includes(provider)) return fail("Choose a supported AI provider.");
  if (!model.trim()) return fail("Choose an AI model first.");
  // Validate the selected model against the provider's current model list before sending a request.
  const modelListUrl = new URL("/api/ai-assistant/models", request.url);
  modelListUrl.searchParams.set("provider", provider);
  const modelListResponse = await fetch(modelListUrl, { cache: "no-store" });
  const modelListData = await modelListResponse.json().catch(() => ({}));
  if (!modelListResponse.ok) return fail(modelListData?.error || "Could not validate the selected model.", modelListResponse.status);
  if (!(modelListData?.models || []).some((item: { id?: string }) => item.id === model)) {
    return fail("That model is no longer available to this API account. Refresh the model list and choose another model.", 400);
  }
  if (files.length > MAX_FILES) return fail(`Attach no more than ${MAX_FILES} files per message.`);
  if (files.some((file) => file.size > MAX_FILE_BYTES)) return fail("Each file must be 8 MB or smaller.");

  messages = Array.isArray(messages)
    ? messages.filter((m): m is ChatMessage =>
        !!m &&
        (m.role === "user" || m.role === "assistant") &&
        typeof m.content === "string" &&
        m.content.trim().length > 0
      )
    : [];

  if (!messages.length && userText.trim()) messages.push({ role: "user", content: userText.trim() });
  if (!messages.length && !files.length) return fail("Enter a message or attach a file.");

  try {
    let fileContext = "";
    for (const file of files) {
      const mediaType = imageMediaType(file);
      if (mediaType) {
        const bytes = Buffer.from(await file.arrayBuffer());
        images.push({ name: file.name, mediaType, base64: bytes.toString("base64") });
      } else {
        fileContext += await extractFileText(file);
      }
    }

    if (fileContext || images.length) {
      if (messages.length && messages[messages.length - 1].role === "user") {
        messages[messages.length - 1] = {
          ...messages[messages.length - 1],
          content: `${messages[messages.length - 1].content}${fileContext ? `\n\nPlease use the attached file content below when answering.\n${fileContext}` : ""}${images.length ? `\n\nPlease inspect the attached image${images.length > 1 ? "s" : ""} and use ${images.map((image) => image.name).join(", ")} when answering.` : ""}`,
        };
      } else {
        messages.push({
          role: "user",
          content: `${userText || "Please review the attached files and images."}${fileContext ? `\n${fileContext}` : ""}${images.length ? `\nPlease inspect the attached image${images.length > 1 ? "s" : ""}: ${images.map((image) => image.name).join(", ")}.` : ""}`,
        });
      }
    }

    let reply = "";

    if (provider === "openai") {
      const key = process.env.OPENAI_API_KEY;
      if (!key) return fail("OPENAI_API_KEY is missing from the server environment.", 503);
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model,
          messages: messages.map((m, index) => ({
            role: m.role,
            content: images.length && index === messages.length - 1 && m.role === "user"
              ? [
                  { type: "text", text: m.content },
                  ...images.map((image) => ({ type: "image_url", image_url: { url: `data:${image.mediaType};base64,${image.base64}`, detail: "auto" } })),
                ]
              : m.content,
          })),
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) return fail(data?.error?.message || "OpenAI request failed. Check API key, model and billing.", response.status);
      reply = data?.choices?.[0]?.message?.content || "";
    } else if (provider === "claude") {
      const key = process.env.ANTHROPIC_API_KEY;
      if (!key) return fail("ANTHROPIC_API_KEY is missing from the server environment.", 503);
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json" },
        body: JSON.stringify({
          model,
          max_tokens: 1400,
          messages: messages.map((m, index) => ({
            role: m.role,
            content: images.length && index === messages.length - 1 && m.role === "user"
              ? [
                  { type: "text", text: m.content },
                  ...images.map((image) => ({ type: "image", source: { type: "base64", media_type: image.mediaType, data: image.base64 } })),
                ]
              : m.content,
          })),
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) return fail(data?.error?.message || "Claude request failed. Check API key and account access.", response.status);
      reply = Array.isArray(data?.content)
        ? data.content.filter((part: { type?: string }) => part.type === "text").map((part: { text?: string }) => part.text || "").join("\n")
        : "";
    } else {
      const key = process.env.GEMINI_API_KEY;
      if (!key) return fail("GEMINI_API_KEY is missing from the server environment.", 503);
      const geminiModel = model;
      const contents = messages.map((m, index) => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [
          { text: m.content },
          ...(images.length && index === messages.length - 1 && m.role === "user"
            ? images.map((image) => ({ inlineData: { mimeType: image.mediaType, data: image.base64 } }))
            : []),
        ],
      }));
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(geminiModel)}:generateContent?key=${encodeURIComponent(key)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ contents, generationConfig: { maxOutputTokens: 1400, temperature: 0.7 } }),
        }
      );
      const data = await response.json().catch(() => ({}));
      if (!response.ok) return fail(data?.error?.message || "Gemini request failed. Check API key and account access.", response.status);
      reply = data?.candidates?.[0]?.content?.parts?.map((part: { text?: string }) => part.text || "").join("\n") || "";
    }

    if (!reply.trim()) return fail("The AI provider returned an empty response. Try again.", 502);
    return NextResponse.json({ reply });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected AI server error.";
    return fail(message, 500);
  }
}
