import { cache } from "react";

export type ReasoningEffortsByEndpoint = {
  chatCompletions: string[];
  responses: string[];
};

export type ModelReasoningCapabilities = ReasoningEffortsByEndpoint & {
  id: string;
};

const REASONING_EFFORT_ORDER = [
  "none",
  "minimal",
  "low",
  "medium",
  "high",
  "xhigh",
  "max",
] as const;

const REASONING_CAPABILITIES_URL =
  "https://api.doubleword.ai/v1/models?group=00000000-0000-0000-0000-000000000000&include_reasoning_capabilities=true";
const REASONING_CAPABILITIES_TIMEOUT_MS = 3_000;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function normalizeEfforts(value: unknown): string[] {
  if (!Array.isArray(value)) return [];

  const efforts = [...new Set(
    value
      .filter((effort): effort is string => typeof effort === "string")
      .map((effort) => effort.trim())
      .filter(Boolean),
  )];
  const rank = new Map<string, number>(
    REASONING_EFFORT_ORDER.map((effort, index) => [effort, index]),
  );

  return efforts.sort((left, right) => {
    const leftRank = rank.get(left);
    const rightRank = rank.get(right);
    if (leftRank === undefined && rightRank === undefined) return 0;
    if (leftRank === undefined) return 1;
    if (rightRank === undefined) return -1;
    return leftRank - rightRank;
  });
}

export function parseReasoningCapabilities(
  payload: unknown,
): ModelReasoningCapabilities[] {
  if (!isRecord(payload) || !Array.isArray(payload.data)) return [];

  return payload.data.flatMap((rawModel): ModelReasoningCapabilities[] => {
    if (!isRecord(rawModel) || typeof rawModel.id !== "string") return [];

    const rawCapabilities = rawModel.supported_reasoning_efforts;
    if (!isRecord(rawCapabilities)) return [];

    const chatCompletions = normalizeEfforts(rawCapabilities.chat_completions);
    const responses = normalizeEfforts(rawCapabilities.responses);
    if (chatCompletions.length === 0 && responses.length === 0) return [];

    return [{
      id: rawModel.id,
      chatCompletions,
      responses,
    }];
  });
}

export async function fetchReasoningCapabilities(): Promise<ModelReasoningCapabilities[]> {
  const apiKey = process.env.DOUBLEWORD_SYSTEM_API_KEY;
  if (!apiKey) {
    console.warn("DOUBLEWORD_SYSTEM_API_KEY not set, returning empty reasoning capabilities");
    return [];
  }

  try {
    const response = await fetch(REASONING_CAPABILITIES_URL, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: "application/json",
      },
      next: {
        revalidate: 300,
        tags: ["reasoning-capabilities"],
      },
      signal: AbortSignal.timeout(REASONING_CAPABILITIES_TIMEOUT_MS),
    });

    if (!response.ok) {
      console.warn(`Failed to fetch reasoning capabilities: ${response.status}`);
      return [];
    }

    return parseReasoningCapabilities(await response.json());
  } catch {
    console.warn("Failed to fetch reasoning capabilities");
    return [];
  }
}

export const fetchReasoningCapabilitiesServer = cache(fetchReasoningCapabilities);
