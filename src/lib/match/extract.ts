import { parseRequirementText } from "@/lib/match/parse-text";
import type { EquipmentNeed } from "@/lib/match/types";

export function llmConfigured() {
  return Boolean(process.env.OPENAI_API_KEY);
}

export function llmSettings() {
  return {
    apiKey: process.env.OPENAI_API_KEY ?? "",
    baseUrl: (process.env.OPENAI_BASE_URL || "https://api.openai.com/v1").replace(/\/$/, ""),
    model: process.env.OPENAI_MODEL || "gpt-4o-mini",
  };
}

const systemPrompt = `You extract a bill of electrical equipment from a data center single-line diagram or a written requirement.
Return JSON only: {"items":[{"label":"","category":"","voltage":"","kw":null,"kva":null,"amps":null,"phase":null,"quantity":null,"manufacturer":null,"configuration":"","notes":""}]}
category must be one of: switchgear, transformers, ups, batteries, pdus, generators, paralleling, transfer-switches, busway, switchboards, breakers, related, or "".
phase is "3", "1", or null. Use null when a number is unknown. configuration can mention indoor/outdoor, NEMA/IEC, pad-mount, substation, or dry-type.`;

export async function extractEquipment(input: { text: string; image?: { mime: string; base64: string } }): Promise<{
  items: EquipmentNeed[];
  source: "model" | "parser";
  warning?: string;
}> {
  const fallback = () => {
    const items = parseRequirementText(input.text);
    return {
      items,
      source: "parser" as const,
      warning: llmConfigured()
        ? undefined
        : "No LLM key is configured. These lines were read from the text. Edit them before matching.",
    };
  };

  if (!llmConfigured()) return fallback();

  const { apiKey, baseUrl, model } = llmSettings();
  const userContent: Array<Record<string, unknown>> = [];
  if (input.text.trim()) userContent.push({ type: "text", text: input.text.slice(0, 20000) });
  if (input.image) {
    userContent.push({
      type: "image_url",
      image_url: { url: `data:${input.image.mime};base64,${input.image.base64}` },
    });
  }
  if (userContent.length === 0) return { items: [], source: "parser", warning: "Add a description or a file." };

  try {
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        temperature: 0,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userContent },
        ],
      }),
    });
    if (!response.ok) {
      const detail = await response.text();
      const parsed = fallback();
      return { ...parsed, warning: `The model request failed (${response.status}). ${parsed.warning ?? ""} ${detail.slice(0, 180)}`.trim() };
    }
    const payload = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const content = payload.choices?.[0]?.message?.content ?? "";
    const parsed = JSON.parse(content) as { items?: EquipmentNeed[] };
    const items = (parsed.items ?? [])
      .filter((item) => item && (item.label || item.category))
      .map((item) => ({
        label: String(item.label ?? "").slice(0, 180),
        category: String(item.category ?? ""),
        voltage: String(item.voltage ?? ""),
        kw: numberOrNull(item.kw),
        kva: numberOrNull(item.kva),
        amps: numberOrNull(item.amps),
        phase: item.phase === "1" || item.phase === "3" ? item.phase : null,
        quantity: numberOrNull(item.quantity),
        manufacturer: item.manufacturer ? String(item.manufacturer) : null,
        configuration: String(item.configuration ?? ""),
        notes: String(item.notes ?? ""),
      }));
    if (items.length === 0) return fallback();
    return { items, source: "model" };
  } catch (error) {
    const parsed = fallback();
    return { ...parsed, warning: `Could not read the model response. ${parsed.warning ?? ""} ${error instanceof Error ? error.message : ""}`.trim() };
  }
}

function numberOrNull(value: unknown) {
  if (value == null || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}
