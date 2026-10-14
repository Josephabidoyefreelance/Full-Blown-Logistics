import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const revalidate = 0;

type Provider = "openai" | "claude" | "gemini";
type ModelItem = { id: string; name: string };

function fail(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status, headers: { "Cache-Control": "no-store" } });
}

export async function GET(request: NextRequest) {
  const provider = request.nextUrl.searchParams.get("provider") as Provider | null;
  if (!["openai", "claude", "gemini"].includes(provider || "")) {
    return fail("Choose OpenAI, Claude or Gemini.");
  }

  try {
    let models: ModelItem[] = [];
    let defaultModel = "";

    if (provider === "openai") {
      const key = process.env.OPENAI_API_KEY;
      if (!key) return fail("OPENAI_API_KEY is not configured on the server.", 503);
      const response = await fetch("https://api.openai.com/v1/models", {
        headers: { Authorization: `Bearer ${key}` },
        cache: "no-store",
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) return fail(data?.error?.message || "OpenAI could not list models.", response.status);

      // The OpenAI model list can contain embedding, image, speech and other non-chat models.
      // Filter obvious non-chat families; the actual chat request still handles model-specific access errors.
      models = (data?.data || [])
        .map((m: { id?: string }) => String(m?.id || ""))
        .filter((id: string) =>
          id &&
          !/(embedding|whisper|tts|dall-e|davinci|babbage|moderation|transcribe|realtime|image|audio|search-preview|computer-use)/i.test(id) &&
          !/^ft:.*(?:embedding|moderation)/i.test(id)
        )
        .map((id: string) => ({ id, name: id }))
        .sort((a: ModelItem, b: ModelItem) => a.id.localeCompare(b.id));
      defaultModel = process.env.OPENAI_MODEL || "";
    } else if (provider === "claude") {
      const key = process.env.ANTHROPIC_API_KEY;
      if (!key) return fail("ANTHROPIC_API_KEY is not configured on the server.", 503);
      const response = await fetch("https://api.anthropic.com/v1/models?limit=1000", {
        headers: { "x-api-key": key, "anthropic-version": "2023-06-01" },
        cache: "no-store",
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) return fail(data?.error?.message || "Claude could not list models.", response.status);
      models = (data?.data || [])
        .filter((m: { id?: string }) => typeof m?.id === "string" && !!m.id)
        .map((m: { id: string; display_name?: string }) => ({ id: m.id, name: m.display_name || m.id }))
        .sort((a: ModelItem, b: ModelItem) => a.name.localeCompare(b.name));
      defaultModel = process.env.ANTHROPIC_MODEL || "";
    } else {
      const key = process.env.GEMINI_API_KEY;
      if (!key) return fail("GEMINI_API_KEY is not configured on the server.", 503);
      const response = await fetch("https://generativelanguage.googleapis.com/v1beta/models?pageSize=1000", {
        headers: { "x-goog-api-key": key },
        cache: "no-store",
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) return fail(data?.error?.message || "Gemini could not list models.", response.status);
      models = (data?.models || [])
        .filter((m: { name?: string; supportedGenerationMethods?: string[] }) => {
          if (typeof m?.name !== "string") return false;
          const id = m.name.replace(/^models\//, "").toLowerCase();
          // Keep general Gemini chat models. Exclude agent/experimental endpoints and
          // non-chat families that can appear in Google's broader model catalog but
          // are not reliable choices for this generateContent chat UI.
          return id.startsWith("gemini-") &&
            (m?.supportedGenerationMethods || []).includes("generateContent") &&
            !/(embedding|aqa|robotics|antigravity|agent-preview|tts|image-generation)/i.test(id);
        })
        .map((m: { name: string; displayName?: string }) => {
          const id = m.name.replace(/^models\//, "");
          return { id, name: m.displayName ? `${m.displayName} (${id})` : id };
        })
        .sort((a: ModelItem, b: ModelItem) => a.name.localeCompare(b.name));
      defaultModel = process.env.GEMINI_MODEL || "";
    }

    return NextResponse.json(
      { provider, models, defaultModel, fetchedAt: new Date().toISOString() },
      { headers: { "Cache-Control": "no-store, max-age=0" } }
    );
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Could not fetch the provider's model list.", 500);
  }
}
