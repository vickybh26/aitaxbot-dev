import type { SavedResultPayload } from "@/hooks/useTrackToolUse";

interface ToolUsageRequest {
  token: string;
  tool: string;
  route: string;
  summary?: string;
  saved?: SavedResultPayload;
}

/** Transport only: callers decide auth, debounce and how to show failures. */
export async function postToolUsage(input: ToolUsageRequest, request: typeof fetch = fetch): Promise<void> {
  const response = await request("/api/tool-usage", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${input.token}` },
    body: JSON.stringify({
      tool: input.tool, route: input.route, summary: input.summary ?? null,
      ...(input.saved ? { saved: { ...input.saved, toolName: input.tool } } : {}),
    }),
  });
  if (!response.ok) throw new Error(`Tool usage rejected (${response.status})`);
}
