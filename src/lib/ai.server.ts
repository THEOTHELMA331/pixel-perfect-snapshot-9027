import { createOpenAI } from "@ai-sdk/openai";
import { streamText } from "ai";

const MODEL = "openai/gpt-6-astra";

/** Runs one streamed Responses call and returns the final text. */
export async function runAI(instructions: string, prompt: string): Promise<string> {
  const apiKey = process.env.LOVABLE_API_KEY;
  if (!apiKey) throw new Error("AI is not configured for this app.");
  const provider = createOpenAI({
    baseURL: "https://ai.gateway.lovable.dev/v1",
    apiKey,
    headers: { "Lovable-API-Key": apiKey, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
  });
  let failure: unknown;
  const result = streamText({
    model: provider.responses(MODEL),
    instructions,
    prompt,
    onError: ({ error }) => {
      failure = error;
    },
    providerOptions: {
      openai: {
        forceReasoning: true,
        reasoningEffort: "low",
        reasoningSummary: "auto",
        store: false,
        include: ["reasoning.encrypted_content"],
      },
    },
  });
  let text = "";
  try {
    text = await result.text;
  } catch (e) {
    failure = failure ?? e;
  }
  if (failure || !text.trim()) throw new Error(friendlyError(failure));
  return text;
}

function friendlyError(e: unknown): string {
  const status = (e as { statusCode?: number })?.statusCode;
  if (status === 429) return "The AI is busy right now. Please wait a moment and try again.";
  if (status === 402) return "AI credits have run out for this workspace. Add credits to keep using AI features.";
  if (status === 403) return "AI access is currently blocked for this workspace.";
  if (!e) return "The AI returned an empty response. Please try again.";
  return "Something went wrong while contacting the AI. Please try again.";
}

export function extractJson<T>(text: string): T {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end < 0) throw new Error("The AI response could not be read. Please try again.");
  return JSON.parse(text.slice(start, end + 1)) as T;
}
